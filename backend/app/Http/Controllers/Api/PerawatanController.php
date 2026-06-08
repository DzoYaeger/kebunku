<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PerawatanResource;
use App\Models\Lahan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Http;

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

        $prompt = "Kamu adalah ahli pertanian. Berikut data tanaman:\n"
            . "- Komoditas: {$lahan->komoditas}\n"
            . "- Nomor Bed: {$lahan->nomor_bed}\n"
            . "- Tanggal tanam: " . ($lahan->tanggal_tanam ?? 'tidak diketahui') . "\n"
            . "- Riwayat perawatan (pupuk & pestisida):\n"
            . json_encode($riwayat, JSON_PRETTY_PRINT) . "\n\n"
            . "Hari ini tanggal: " . now()->toDateString() . "\n\n"
            . "Berikan saran dalam bahasa Indonesia:\n"
            . "1. Kapan sebaiknya pemberian pupuk berikutnya dan pupuk apa yang direkomendasikan?\n"
            . "2. Kapan sebaiknya penyemprotan pestisida berikutnya dan pestisida apa yang direkomendasikan?\n"
            . "Jawab singkat dan praktis.";

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('services.groq.api_key'),
            'Content-Type' => 'application/json',
        ])->timeout(30)->post('https://api.groq.com/openai/v1/chat/completions', [
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

        $text = $response->json('choices.0.message.content', 'Tidak ada saran tersedia.');

        return response()->json([
            'data' => [
                'lahan_id' => $lahan->id,
                'komoditas' => $lahan->komoditas,
                'nomor_bed' => $lahan->nomor_bed,
                'saran' => $text,
            ],
        ]);
    }
}
