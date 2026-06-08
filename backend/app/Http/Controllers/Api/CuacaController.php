<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Aktivitas;
use App\Models\Lahan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class CuacaController extends Controller
{
    /**
     * GET /api/cuaca — prakiraan cuaca hari ini (Open-Meteo, gratis tanpa key).
     * Default lokasi: Palopo, Sulawesi Selatan (-2.99, 121.13).
     */
    public function index(Request $request): JsonResponse
    {
        $lat = $request->query('lat', '-2.99');
        $lon = $request->query('lon', '121.13');

        $data = Cache::remember("cuaca_{$lat}_{$lon}", 1800, function () use ($lat, $lon) {
            $response = Http::timeout(10)->get('https://api.open-meteo.com/v1/forecast', [
                'latitude' => $lat,
                'longitude' => $lon,
                'current' => 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
                'daily' => 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max',
                'timezone' => 'Asia/Makassar',
                'forecast_days' => 3,
            ]);

            if ($response->failed()) {
                return null;
            }

            return $response->json();
        });

        if (!$data) {
            return response()->json(['message' => 'Gagal mengambil data cuaca.'], 502);
        }

        $current = $data['current'] ?? [];
        $daily = $data['daily'] ?? [];

        $weatherDescriptions = [
            0 => 'Cerah', 1 => 'Cerah Berawan', 2 => 'Berawan Sebagian', 3 => 'Berawan',
            45 => 'Berkabut', 48 => 'Berkabut Tebal',
            51 => 'Gerimis Ringan', 53 => 'Gerimis', 55 => 'Gerimis Lebat',
            61 => 'Hujan Ringan', 63 => 'Hujan Sedang', 65 => 'Hujan Lebat',
            80 => 'Hujan Singkat', 81 => 'Hujan Sedang', 82 => 'Hujan Sangat Lebat',
            95 => 'Badai Petir', 96 => 'Badai + Hujan Es', 99 => 'Badai Berat',
        ];

        $code = $current['weather_code'] ?? 0;
        $akanHujan = in_array($code, [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99])
            || ($daily['precipitation_probability_max'][0] ?? 0) >= 60;

        return response()->json([
            'data' => [
                'suhu' => $current['temperature_2m'] ?? null,
                'kelembaban' => $current['relative_humidity_2m'] ?? null,
                'angin' => $current['wind_speed_10m'] ?? null,
                'kode_cuaca' => $code,
                'deskripsi' => $weatherDescriptions[$code] ?? 'Tidak diketahui',
                'akan_hujan' => $akanHujan,
                'probabilitas_hujan' => $daily['precipitation_probability_max'][0] ?? 0,
                'prakiraan_3_hari' => array_map(function ($i) use ($daily, $weatherDescriptions) {
                    return [
                        'tanggal' => $daily['time'][$i] ?? null,
                        'suhu_max' => $daily['temperature_2m_max'][$i] ?? null,
                        'suhu_min' => $daily['temperature_2m_min'][$i] ?? null,
                        'curah_hujan' => $daily['precipitation_sum'][$i] ?? 0,
                        'prob_hujan' => $daily['precipitation_probability_max'][$i] ?? 0,
                        'deskripsi' => $weatherDescriptions[$daily['weather_code'][$i] ?? 0] ?? '-',
                    ];
                }, [0, 1, 2]),
            ],
        ]);
    }

    /**
     * GET /api/saran-harian — AI analisis cuaca + data tanaman, beri saran harian.
     */
    public function saranHarian(Request $request): JsonResponse
    {
        $user = $request->user();

        // Ambil cuaca
        $cuacaResponse = $this->index($request);
        $cuacaData = json_decode($cuacaResponse->getContent(), true)['data'] ?? null;

        if (!$cuacaData) {
            return response()->json(['message' => 'Gagal mengambil data cuaca.'], 502);
        }

        // Ambil ringkasan tanaman + perawatan terakhir
        $lahan = Lahan::where('user_id', $user->id)
            ->where('status', '!=', 'selesai')
            ->get();

        $ringkasan = $lahan->map(function ($l) {
            $lastPupuk = Aktivitas::where('lahan_id', $l->id)
                ->whereRaw("LOWER(tipe) = 'pemupukan'")
                ->orderByDesc('tanggal')->first();
            $lastPest = Aktivitas::where('lahan_id', $l->id)
                ->whereRaw("LOWER(tipe) = 'pestisida'")
                ->orderByDesc('tanggal')->first();

            return [
                'komoditas' => $l->komoditas,
                'bed' => $l->nomor_bed,
                'status' => $l->status,
                'terakhir_pupuk' => $lastPupuk?->tanggal?->toDateString(),
                'terakhir_pestisida' => $lastPest?->tanggal?->toDateString(),
            ];
        })->toArray();

        if (empty($ringkasan)) {
            return response()->json([
                'data' => [
                    'cuaca' => $cuacaData,
                    'saran' => 'Belum ada tanaman aktif. Tambahkan tanaman untuk mendapat saran perawatan.',
                ],
            ]);
        }

        $prompt = "Kamu adalah asisten pertanian cerdas. Hari ini " . now()->toDateString() . ".\n\n"
            . "CUACA HARI INI:\n"
            . "- Suhu: {$cuacaData['suhu']}°C, Kelembaban: {$cuacaData['kelembaban']}%\n"
            . "- Kondisi: {$cuacaData['deskripsi']}\n"
            . "- Akan hujan: " . ($cuacaData['akan_hujan'] ? 'Ya' : 'Tidak') . " (probabilitas {$cuacaData['probabilitas_hujan']}%)\n\n"
            . "DATA TANAMAN AKTIF:\n" . json_encode($ringkasan, JSON_PRETTY_PRINT) . "\n\n"
            . "Berikan saran harian dalam bahasa Indonesia (singkat, 3-5 poin):\n"
            . "1. Apakah hari ini cocok untuk menyiram/memupuk/menyemprot?\n"
            . "2. Tanaman mana yang perlu perhatian segera?\n"
            . "3. Tips berdasarkan cuaca hari ini.\n"
            . "Jawab langsung tanpa basa-basi.";

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('services.groq.api_key'),
            'Content-Type' => 'application/json',
        ])->timeout(30)->post('https://api.groq.com/openai/v1/chat/completions', [
            'model' => 'llama-3.3-70b-versatile',
            'messages' => [['role' => 'user', 'content' => $prompt]],
            'temperature' => 0.7,
            'max_tokens' => 512,
        ]);

        if ($response->failed()) {
            return response()->json([
                'data' => [
                    'cuaca' => $cuacaData,
                    'saran' => 'Gagal mendapatkan saran AI saat ini.',
                ],
            ], $response->status() === 429 ? 429 : 502);
        }

        $saran = $response->json('choices.0.message.content', 'Tidak ada saran tersedia.');

        return response()->json([
            'data' => [
                'cuaca' => $cuacaData,
                'saran' => $saran,
            ],
        ]);
    }
}
