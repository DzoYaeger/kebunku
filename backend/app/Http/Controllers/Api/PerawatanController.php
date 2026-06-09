<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PerawatanResource;
use App\Models\AiSaranCache;
use App\Models\Lahan;
use App\Models\MusimTanam;
use App\Models\Panen;
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
            ->where('tipe', 'perawatan')
            ->orderByDesc('created_at')
            ->get(['id', 'saran', 'created_at']);

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

        $prompt = "Kamu adalah ahli pertanian. Berikut data lengkap tanaman dalam JSON:\n"
            . json_encode($context, JSON_PRETTY_PRINT) . "\n\n"
            . "Hari ini tanggal: " . now()->toDateString() . "\n\n"
            . "Berikan jawaban dalam format JSON (HANYA JSON, tanpa markdown) dengan struktur:\n"
            . "{\n"
            . "  \"saran\": \"(saran lengkap dalam bahasa Indonesia, praktis dan actionable, mencakup: prioritas tindakan hari ini, rekomendasi pupuk & pestisida, risiko)\",\n"
            . "  \"jadwal_pupuk\": {\"tanggal\": \"YYYY-MM-DD\", \"jenis\": \"nama pupuk yang direkomendasikan\"},\n"
            . "  \"jadwal_pestisida\": {\"tanggal\": \"YYYY-MM-DD\", \"jenis\": \"nama pestisida yang direkomendasikan\"}\n"
            . "}\n\n"
            . "Tentukan tanggal jadwal pupuk dan pestisida berikutnya berdasarkan riwayat dan umur tanam. Jawab singkat, operasional.";

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
        ]);

        $lahan = Lahan::where('user_id', $request->user()->id)
            ->where('id', $request->lahan_id)
            ->firstOrFail();

        $context = [
            'komoditas' => $lahan->komoditas,
            'nomor_bed' => $lahan->nomor_bed,
            'status' => $lahan->status,
            'umur_tanam_hari' => $lahan->tanggal_tanam ? now()->diffInDays($lahan->tanggal_tanam) : null,
        ];

        $keluhanText = $request->input('keluhan', '');
        $promptText = "Kamu adalah ahli pertanian & penyakit tanaman. Data tanaman:\n"
            . json_encode($context, JSON_PRETTY_PRINT) . "\n\n"
            . ($keluhanText ? "Keluhan petani: \"{$keluhanText}\"\n\n" : "Petani mengirim foto tanaman yang bermasalah.\n\n")
            . "Berikan diagnosis dan solusi dalam bahasa Indonesia:\n"
            . "1. Kemungkinan penyakit atau masalah.\n"
            . "2. Solusi/penanganan yang bisa dilakukan segera.\n"
            . "3. Pencegahan ke depan.\n"
            . "Jawab singkat, praktis, dan actionable.";

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
            'saran' => "KELUHAN: " . ($keluhanText ?: '[Foto]') . "\n\nSOLUSI:\n" . $solusi,
            'hash_key' => md5(($keluhanText ?: 'image') . now()->timestamp),
        ]);

        return response()->json([
            'data' => [
                'id' => $record->id,
                'keluhan' => $keluhanText ?: '[Foto tanaman]',
                'solusi' => $solusi,
                'image_url' => $imagePath ? asset('storage/' . $imagePath) : null,
                'created_at' => $record->created_at->toISOString(),
            ],
        ]);
    }
}
