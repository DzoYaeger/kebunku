<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PerawatanResource;
use App\Models\AiSaranCache;
use App\Models\CarePlan;
use App\Models\Lahan;
use App\Models\MusimTanam;
use App\Models\Panen;
use App\Models\PupukInventory;
use App\Models\UserSetting;
use App\Services\GroqService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PerawatanController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $lahan = Lahan::where('user_id', $request->user()->id)
            ->with(['aktivitas' => function ($query) {
                $query->whereRaw("LOWER(tipe) IN ('pemupukan', 'pestisida')")
                    ->orderByDesc('tanggal');
            }])
            ->get();

        return PerawatanResource::collection($lahan);
    }

    /**
     * GET /api/perawatan/saran-ai/{lahan} — riwayat semua saran AI per lahan.
     */
    public function riwayatSaran(Request $request, Lahan $lahan): \Illuminate\Http\JsonResponse
    {
        abort_if($lahan->user_id !== $request->user()->id, 403);

        $riwayat = AiSaranCache::where('user_id', $request->user()->id)
            ->where('lahan_id', $lahan->id)
            ->where('tipe', 'keluhan')
            ->orderByDesc('created_at')
            ->get(['id', 'session_id', 'keluhan_text', 'saran', 'outcome', 'created_at']);

        return response()->json([
            'data' => $riwayat,
        ]);
    }

    /**
     * POST /api/perawatan/saran-ai — generate saran baru (selalu create, simpan riwayat).
     */
    public function saranAi(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'lahan_id' => 'required|exists:lahan,id',
        ]);

        $lahan = Lahan::where('user_id', $request->user()->id)
            ->where('id', $request->lahan_id)
            ->with(['aktivitas' => function ($query) {
                $query->whereRaw("LOWER(tipe) IN ('pemupukan', 'pestisida')")
                    ->orderByDesc('tanggal')
                    ->limit(10);
            }])
            ->firstOrFail();

        $riwayat = $lahan->aktivitas->map(fn ($a) => [
            'tipe' => $a->tipe,
            'tanggal' => $a->tanggal->toDateString(),
            'jenis_pupuk' => $a->jenis_pupuk,
            'jenis_pestisida' => $a->jenis_pestisida,
        ])->toArray();

        $musimAktif = MusimTanam::where('lahan_id', $lahan->id)
            ->where('status', 'aktif')
            ->orderByDesc('tanggal_mulai')
            ->first();
        $riwayatPanen = Panen::where('lahan_id', $lahan->id)
            ->orderByDesc('tanggal')
            ->limit(5)
            ->get(['tanggal', 'berat', 'grade', 'harga_jual'])
            ->map(fn ($p) => [
                'tanggal' => $p->tanggal?->toDateString(),
                'berat' => $p->berat,
                'grade' => $p->grade,
                'harga_jual' => $p->harga_jual,
            ])
            ->toArray();

        $settings = UserSetting::firstOrCreate(
            ['user_id' => $request->user()->id],
            ['takaran_pupuk' => 'ember 25L', 'takaran_pestisida' => 'tangki 14L'],
        );
        $inventory = PupukInventory::where('user_id', $request->user()->id)->get();
        $pupukList = $inventory->where('tipe', 'pupuk')->pluck('nama')->toArray();
        $pestisidaList = $inventory->where('tipe', 'pestisida')->pluck('nama')->toArray();

        $context = [
            'komoditas' => $lahan->komoditas,
            'nomor_bed' => $lahan->nomor_bed,
            'status' => $lahan->status,
            'tanggal_tanam' => $lahan->tanggal_tanam,
            'umur_tanam_hari' => $lahan->tanggal_tanam ? now()->diffInDays($lahan->tanggal_tanam) : null,
            'musim_aktif' => $musimAktif ? [
                'tanggal_mulai' => $musimAktif->tanggal_mulai?->toDateString(),
                'komoditas' => $musimAktif->komoditas,
                'status' => $musimAktif->status,
            ] : null,
            'riwayat_perawatan' => $riwayat,
            'riwayat_panen_terakhir' => $riwayatPanen,
        ];

        $pupukInfo = !empty($pupukList) ? "Pupuk TERSEDIA: " . implode(', ', $pupukList) . ". WAJIB kombinasi dari ini." : "";
        $pestInfo = !empty($pestisidaList) ? "Pestisida TERSEDIA: " . implode(', ', $pestisidaList) . "." : "";

        $prompt = "Kamu adalah ahli pertanian Indonesia. Data tanaman:\n"
            . json_encode($context, JSON_PRETTY_PRINT) . "\n\n"
            . "Hari ini: " . now()->toDateString() . "\n\n"
            . "PENTING:\n"
            . "- Takaran pupuk petani: {$settings->takaran_pupuk}. Dosis harus dalam satuan ini.\n"
            . "- Takaran pestisida: {$settings->takaran_pestisida}.\n"
            . ($pupukInfo ? "- {$pupukInfo}\n" : "")
            . ($pestInfo ? "- {$pestInfo}\n" : "")
            . "- Berikan KOMBINASI 2-4 jenis pupuk per jadwal (bukan hanya 1 jenis).\n\n"
            . "Berikan jawaban dalam format JSON (HANYA JSON, tanpa markdown):\n"
            . "{\n"
            . "  \"saran\": \"(saran lengkap: prioritas hari ini, KOMBINASI pupuk & dosis per {$settings->takaran_pupuk}, pestisida & dosis per {$settings->takaran_pestisida}, risiko)\",\n"
            . "  \"jadwal_pupuk\": {\"tanggal\": \"YYYY-MM-DD\", \"jenis\": \"KOMBINASI pupuk + dosis\"},\n"
            . "  \"jadwal_pestisida\": {\"tanggal\": \"YYYY-MM-DD\", \"jenis\": \"nama pestisida + dosis\"}\n"
            . "}\n\n"
            . "Jawab singkat, operasional.";

        $response = app(GroqService::class)->chat([
            'model' => 'llama-3.3-70b-versatile',
            'messages' => [
                ['role' => 'user', 'content' => $prompt],
            ],
            'temperature' => 0.7,
            'max_tokens' => 1024,
        ]);

        if ($response->status() === 429) {
            return response()->json([
                'message' => 'Quota AI habis, coba lagi dalam beberapa saat.',
            ], 429);
        }

        if ($response->failed()) {
            return response()->json([
                'message' => 'Gagal mendapatkan saran dari AI.',
                'error' => $response->json('error.message', 'Unknown error'),
            ], 502);
        }

        $raw = $response->json('choices.0.message.content', '');

        // Parse JSON response from AI
        $parsed = json_decode(preg_replace('/```json?\s*|\s*```/', '', $raw), true);
        $text = $parsed['saran'] ?? $raw;
        $jadwalPupuk = $parsed['jadwal_pupuk'] ?? null;
        $jadwalPestisida = $parsed['jadwal_pestisida'] ?? null;

        // Simpan sebagai record baru (riwayat, bukan replace)
        $record = AiSaranCache::create([
            'user_id' => $request->user()->id,
            'lahan_id' => $lahan->id,
            'tipe' => 'perawatan',
            'saran' => $text,
            'hash_key' => md5($text . now()->timestamp),
        ]);

        return response()->json([
            'data' => [
                'id' => $record->id,
                'lahan_id' => $lahan->id,
                'komoditas' => $lahan->komoditas,
                'nomor_bed' => $lahan->nomor_bed,
                'saran' => $text,
                'jadwal_pupuk' => $jadwalPupuk,
                'jadwal_pestisida' => $jadwalPestisida,
                'created_at' => $record->created_at->toISOString(),
            ],
        ]);
    }

    /**
     * POST /api/perawatan/keluhan — lapor keluhan/penyakit tanaman, dapatkan solusi AI.
     */
    public function keluhan(Request $request): \Illuminate\Http\JsonResponse
    {
        $request->validate([
            'lahan_id' => 'required|exists:lahan,id',
            'keluhan' => 'required_without:image|nullable|string|max:1000',
            'image' => 'nullable|image|max:5120',
            'session_id' => 'nullable|uuid',
        ]);

        // Use existing session or create new one
        $sessionId = $request->input('session_id') ?: (string) \Illuminate\Support\Str::uuid();

        $lahan = Lahan::where('user_id', $request->user()->id)
            ->where('id', $request->lahan_id)
            ->firstOrFail();

        $context = [
            'komoditas' => $lahan->komoditas,
            'nomor_bed' => $lahan->nomor_bed,
            'status' => $lahan->status,
            'umur_tanam_hari' => $lahan->tanggal_tanam ? now()->diffInDays($lahan->tanggal_tanam) : null,
        ];

        // User's inventory for targeted recommendations
        $inventory = PupukInventory::where('user_id', $request->user()->id)->get();
        $pupukUser = $inventory->where('tipe', 'pupuk')->pluck('nama')->toArray();
        $pestisidaUser = $inventory->where('tipe', 'pestisida')->pluck('nama')->toArray();
        $settings = UserSetting::where('user_id', $request->user()->id)->first();

        // AI learning: include past successful solutions
        $pastSuccess = AiSaranCache::where('user_id', $request->user()->id)
            ->where('tipe', 'keluhan')
            ->where('outcome', 'success')
            ->orderByDesc('created_at')
            ->limit(3)
            ->pluck('saran')
            ->toArray();

        // Previous conversation context for this lahan
        $prevMessages = AiSaranCache::where('user_id', $request->user()->id)
            ->where('lahan_id', $lahan->id)
            ->where('tipe', 'keluhan')
            ->orderByDesc('created_at')
            ->limit(3)
            ->get(['saran', 'outcome'])
            ->reverse()
            ->values();

        $keluhanText = $request->input('keluhan', '');
        $learningContext = !empty($pastSuccess)
            ? "\nSOLUSI YANG PERNAH BERHASIL di kebun ini:\n" . implode("\n---\n", array_map(fn ($s) => mb_substr($s, 0, 200), $pastSuccess))
            : '';

        $prevContext = $prevMessages->isNotEmpty()
            ? "\nRIWAYAT KELUHAN SEBELUMNYA pada tanaman ini:\n" . $prevMessages->map(fn ($m) => mb_substr($m->saran, 0, 150) . ($m->outcome !== 'pending' ? " [Hasil: {$m->outcome}]" : ''))->implode("\n---\n")
            : '';

        $inventoryInfo = '';
        if (!empty($pestisidaUser)) $inventoryInfo .= "\nPESTISIDA yang DIMILIKI petani: " . implode(', ', $pestisidaUser) . ". UTAMAKAN dari daftar ini.";
        if (!empty($pupukUser)) $inventoryInfo .= "\nPUPUK yang DIMILIKI petani: " . implode(', ', $pupukUser) . ". UTAMAKAN dari daftar ini.";
        $takaranInfo = $settings ? "\nTakaran kocor: {$settings->takaran_pupuk}. Takaran semprot: {$settings->takaran_pestisida}." : '';

        $promptText = "Kamu adalah ahli pertanian & konsultan penyakit tanaman. Data tanaman:\n"
            . json_encode($context, JSON_PRETTY_PRINT) . "\n"
            . $inventoryInfo . $takaranInfo . $learningContext . $prevContext . "\n\n"
            . ($keluhanText ? "Keluhan petani: \"{$keluhanText}\"\n\n" : "Petani mengirim foto tanaman yang bermasalah.\n\n")
            . "INSTRUKSI:\n"
            . "- Jika terdeteksi serangan HAMA/PENYAKIT, langsung berikan nama obat/pestisida SPESIFIK + dosis.\n"
            . "- UTAMAKAN pestisida/pupuk yang DIMILIKI petani (lihat daftar di atas). Jika miliknya cocok, sarankan itu PERTAMA.\n"
            . "- Jika butuh obat lain yang tidak dimiliki, sarankan untuk DIBELI dengan nama produk spesifik.\n"
            . "- Jika informasi kurang jelas, TANYAKAN BALIK ke petani untuk memperjelas (misal: 'Apakah ada bercak hitam? Apakah di bagian bawah daun ada kutu?').\n"
            . "- Berikan solusi dengan format:\n"
            . "  1. DIAGNOSIS: (apa masalahnya)\n"
            . "  2. TINDAKAN SEGERA: (obat/pestisida spesifik + dosis per takaran)\n"
            . "  3. PUPUK PENDUKUNG: (jika perlu, kombinasi pupuk + dosis)\n"
            . "  4. PENCEGAHAN: (langkah ke depan)\n"
            . "- Jawab dalam bahasa Indonesia, singkat, langsung ke inti.";

        // Build messages - use vision model if image present
        $imagePath = null;
        $useVision = $request->hasFile('image');

        if ($useVision) {
            $imagePath = $request->file('image')->store('keluhan', 'public');
            $imageData = base64_encode(\Illuminate\Support\Facades\Storage::disk('public')->get($imagePath));
            $mime = \Illuminate\Support\Facades\Storage::disk('public')->mimeType($imagePath) ?: 'image/jpeg';

            $messages = [
                ['role' => 'user', 'content' => [
                    ['type' => 'text', 'text' => $promptText],
                    ['type' => 'image_url', 'image_url' => ['url' => "data:{$mime};base64,{$imageData}"]],
                ]],
            ];
        } else {
            $messages = [['role' => 'user', 'content' => $promptText]];
        }

        $response = app(GroqService::class)->chat([
            'model' => $useVision ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile',
            'messages' => $messages,
            'temperature' => 0.7,
            'max_tokens' => 1024,
        ], $useVision ? 45 : 30);

        if ($response->status() === 429) {
            return response()->json(['message' => 'Quota AI habis, coba lagi.'], 429);
        }

        if ($response->failed()) {
            return response()->json(['message' => 'Gagal mendapatkan solusi AI.'], 502);
        }

        $solusi = $response->json('choices.0.message.content', 'Tidak ada solusi tersedia.');

        // Simpan ke riwayat
        $record = AiSaranCache::create([
            'user_id' => $request->user()->id,
            'lahan_id' => $lahan->id,
            'tipe' => 'keluhan',
            'session_id' => $sessionId,
            'keluhan_text' => $keluhanText ?: '[Foto]',
            'saran' => $solusi,
            'hash_key' => md5(($keluhanText ?: 'image') . now()->timestamp),
        ]);

        // Adjust active care plan: add keluhan treatment to unchecked items
        $activePlan = CarePlan::where('lahan_id', $lahan->id)->where('status', 'active')->first();
        if ($activePlan) {
            $schedule = $activePlan->schedule ?? [];
            $completed = $activePlan->completed_items ?? [];
            // Insert a new treatment item after the last completed item
            $insertAt = count($completed) > 0 ? max($completed) + 1 : 0;
            $newItem = [
                'minggu' => 0,
                'tanggal' => now()->toDateString(),
                'aktivitas' => 'penanganan keluhan',
                'detail' => mb_substr($solusi, 0, 200),
                'kocor' => null,
                'benam' => null,
                'catatan' => '⚠️ Ditambahkan dari keluhan: ' . mb_substr($keluhanText ?: '[Foto]', 0, 50),
            ];
            array_splice($schedule, $insertAt, 0, [$newItem]);
            // Shift completed indices that are >= insertAt
            $adjusted = array_map(fn ($i) => $i >= $insertAt ? $i + 1 : $i, $completed);
            $activePlan->update(['schedule' => $schedule, 'completed_items' => $adjusted]);
        }

        return response()->json([
            'data' => [
                'id' => $record->id,
                'session_id' => $sessionId,
                'keluhan' => $keluhanText ?: '[Foto tanaman]',
                'solusi' => $solusi,
                'image_url' => $imagePath ? asset('storage/' . $imagePath) : null,
                'created_at' => $record->created_at->toISOString(),
            ],
        ]);
    }

    /**
     * PUT /api/perawatan/saran-ai/{aiSaranCache}/outcome — update outcome (success/failed).
     */
    public function updateOutcome(Request $request, AiSaranCache $aiSaranCache): \Illuminate\Http\JsonResponse
    {
        abort_if($aiSaranCache->user_id !== $request->user()->id, 404);

        $request->validate([
            'outcome' => 'required|in:success,failed',
            'outcome_note' => 'nullable|string|max:500',
        ]);

        $aiSaranCache->update([
            'outcome' => $request->outcome,
            'outcome_note' => $request->outcome_note,
        ]);

        return response()->json(['data' => ['id' => $aiSaranCache->id, 'outcome' => $request->outcome]]);
    }
}
