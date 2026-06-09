<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aktivitas;
use App\Models\CarePlan;
use App\Models\Lahan;
use App\Models\PlantFeedback;
use App\Models\PlanTemplate;
use App\Services\CarePlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CarePlanController extends Controller
{
    public function __construct(private CarePlanService $service) {}

    /**
     * GET /api/care-plans?lahan_id=X — get active care plan for a lahan.
     */
    public function index(Request $request): JsonResponse
    {
        $query = CarePlan::where('user_id', $request->user()->id);

        if ($request->has('lahan_id')) {
            $query->where('lahan_id', $request->lahan_id);
        }

        $plans = $query->where('status', 'active')
            ->with('lahan:id,nomor_bed,komoditas')
            ->latest()
            ->get();

        return response()->json(['data' => $plans]);
    }

    /**
     * POST /api/care-plans/generate — generate care plan for a lahan.
     */
    public function generate(Request $request): JsonResponse
    {
        $request->validate(['lahan_id' => 'required|exists:lahan,id']);

        $lahan = Lahan::where('user_id', $request->user()->id)
            ->where('id', $request->lahan_id)
            ->firstOrFail();

        $plan = $this->service->generatePlan($lahan);

        return response()->json(['data' => $plan->load('lahan:id,nomor_bed,komoditas')], 201);
    }

    /**
     * GET /api/care-plans/{carePlan} — show a specific care plan.
     */
    public function show(Request $request, CarePlan $carePlan): JsonResponse
    {
        abort_if($carePlan->user_id !== $request->user()->id, 404);

        return response()->json([
            'data' => $carePlan->load('lahan:id,nomor_bed,komoditas'),
        ]);
    }

    /**
     * GET /api/care-plans/{carePlan}/feedback — list feedback for a care plan.
     */
    public function feedbackList(Request $request, CarePlan $carePlan): JsonResponse
    {
        abort_if($carePlan->user_id !== $request->user()->id, 404);

        $feedback = PlantFeedback::where('care_plan_id', $carePlan->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $feedback]);
    }

    /**
     * POST /api/plant-feedback — submit feedback (progress or keluhan) for a lahan.
     */
    public function submitFeedback(Request $request): JsonResponse
    {
        $request->validate([
            'lahan_id' => 'required|exists:lahan,id',
            'tipe' => 'required|in:progress,keluhan',
            'content' => 'required|string|max:2000',
            'image' => 'nullable|image|max:5120',
        ]);

        $lahan = Lahan::where('user_id', $request->user()->id)
            ->where('id', $request->lahan_id)
            ->firstOrFail();

        $activePlan = CarePlan::where('lahan_id', $lahan->id)
            ->where('status', 'active')
            ->latest()
            ->first();

        $imagePath = $request->hasFile('image')
            ? $request->file('image')->store('feedback', 'public')
            : null;

        $feedback = PlantFeedback::create([
            'user_id' => $request->user()->id,
            'lahan_id' => $lahan->id,
            'care_plan_id' => $activePlan?->id,
            'tipe' => $request->tipe,
            'content' => $request->content,
            'image_path' => $imagePath,
        ]);

        // Generate AI response
        $aiResponse = $this->service->processFeedback($lahan, $feedback, $activePlan);
        $feedback->update(['ai_response' => $aiResponse]);

        return response()->json([
            'data' => [
                'id' => $feedback->id,
                'tipe' => $feedback->tipe,
                'content' => $feedback->content,
                'ai_response' => $aiResponse,
                'image_url' => $imagePath ? asset('storage/' . $imagePath) : null,
                'created_at' => $feedback->created_at->toISOString(),
            ],
        ], 201);
    }

    /**
     * GET /api/plant-feedback?lahan_id=X — list all feedback for a lahan.
     */
    public function feedbackByLahan(Request $request): JsonResponse
    {
        $request->validate(['lahan_id' => 'required|exists:lahan,id']);

        $lahan = Lahan::where('user_id', $request->user()->id)
            ->where('id', $request->lahan_id)
            ->firstOrFail();

        $feedback = PlantFeedback::where('lahan_id', $lahan->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($f) => [
                'id' => $f->id,
                'tipe' => $f->tipe,
                'content' => $f->content,
                'ai_response' => $f->ai_response,
                'image_url' => $f->image_path ? asset('storage/' . $f->image_path) : null,
                'created_at' => $f->created_at->toISOString(),
            ]);

        return response()->json(['data' => $feedback]);
    }

    /**
     * PUT /api/care-plans/{carePlan}/toggle — toggle a schedule item completed.
     * When checking a pemupukan/pestisida item, auto-record an aktivitas entry.
     */
    public function toggleItem(Request $request, CarePlan $carePlan): JsonResponse
    {
        abort_if($carePlan->user_id !== $request->user()->id, 404);
        $request->validate(['index' => 'required|integer|min:0']);

        $completed = $carePlan->completed_items ?? [];
        $idx = $request->index;
        $schedule = $carePlan->schedule ?? [];
        $item = $schedule[$idx] ?? null;

        if (in_array($idx, $completed)) {
            // Uncheck
            $completed = array_values(array_diff($completed, [$idx]));
        } else {
            // Check — auto-record aktivitas
            $completed[] = $idx;

            if ($item && $carePlan->lahan_id) {
                $aktivitas = strtolower($item['aktivitas'] ?? '');
                $tipe = null;
                $jenisPupuk = null;
                $jenisPestisida = null;

                if (str_contains($aktivitas, 'pupuk') || str_contains($aktivitas, 'pemupukan')) {
                    $tipe = 'pemupukan';
                    $jenisPupuk = $item['kocor'] ?? $item['detail'] ?? null;
                } elseif (str_contains($aktivitas, 'pestisida') || str_contains($aktivitas, 'semprot')) {
                    $tipe = 'pestisida';
                    $jenisPestisida = $item['detail'] ?? null;
                }

                if ($tipe) {
                    Aktivitas::create([
                        'user_id' => $request->user()->id,
                        'lahan_id' => $carePlan->lahan_id,
                        'client_uuid' => Str::uuid()->toString(),
                        'tipe' => $tipe,
                        'tanggal' => now()->toDateString(),
                        'jenis_pupuk' => $jenisPupuk,
                        'jenis_pestisida' => $jenisPestisida,
                        'catatan' => '✅ Dari rencana perawatan (Minggu ' . ($item['minggu'] ?? '?') . ')',
                    ]);
                }
            }
        }

        $carePlan->update(['completed_items' => $completed]);

        return response()->json(['data' => ['completed_items' => $completed]]);
    }

    /**
     * POST /api/plan-templates — save current plan as reusable template.
     */
    public function saveTemplate(Request $request): JsonResponse
    {
        $request->validate([
            'care_plan_id' => 'required|exists:care_plans,id',
            'nama' => 'required|string|max:255',
        ]);

        $plan = CarePlan::where('user_id', $request->user()->id)
            ->where('id', $request->care_plan_id)
            ->firstOrFail();

        $template = PlanTemplate::create([
            'user_id' => $request->user()->id,
            'nama' => $request->nama,
            'komoditas' => $plan->lahan->komoditas ?? 'Umum',
            'schedule' => $plan->schedule,
            'summary' => $plan->summary,
        ]);

        return response()->json(['data' => $template], 201);
    }

    /**
     * GET /api/plan-templates — list user's saved templates.
     */
    public function listTemplates(Request $request): JsonResponse
    {
        $templates = PlanTemplate::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $templates]);
    }

    /**
     * POST /api/plan-templates/{planTemplate}/apply — apply template to a lahan.
     */
    public function applyTemplate(Request $request, PlanTemplate $planTemplate): JsonResponse
    {
        abort_if($planTemplate->user_id !== $request->user()->id, 404);
        $request->validate(['lahan_id' => 'required|exists:lahan,id']);

        $lahan = Lahan::where('user_id', $request->user()->id)
            ->where('id', $request->lahan_id)
            ->firstOrFail();

        CarePlan::where('lahan_id', $lahan->id)->where('status', 'active')
            ->update(['status' => 'superseded']);

        $plan = CarePlan::create([
            'user_id' => $request->user()->id,
            'lahan_id' => $lahan->id,
            'schedule' => $planTemplate->schedule,
            'summary' => $planTemplate->summary,
            'status' => 'active',
        ]);

        return response()->json(['data' => $plan], 201);
    }

    /**
     * DELETE /api/plan-templates/{planTemplate}
     */
    public function deleteTemplate(Request $request, PlanTemplate $planTemplate): JsonResponse
    {
        abort_if($planTemplate->user_id !== $request->user()->id, 404);
        $planTemplate->delete();

        return response()->json(null, 204);
    }
}
