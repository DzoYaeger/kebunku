<?php

namespace App\Services;

use App\Models\CarePlan;
use App\Models\Lahan;
use App\Models\PlantFeedback;
use App\Models\PupukInventory;
use App\Models\UserSetting;

class CarePlanService
{
    public function __construct(private GroqService $groq) {}

    private function getUserContext(int $userId): array
    {
        $settings = UserSetting::firstOrCreate(
            ['user_id' => $userId],
            ['takaran_pupuk' => 'ember 25L', 'takaran_pestisida' => 'tangki 14L', 'takaran_benam' => 'per tanaman'],
        );

        $inventory = PupukInventory::where('user_id', $userId)->get();
        $pupukList = $inventory->where('tipe', 'pupuk')->pluck('nama')->toArray();
        $pestisidaList = $inventory->where('tipe', 'pestisida')->pluck('nama')->toArray();

        return [
            'takaran_pupuk' => $settings->takaran_pupuk,
            'takaran_pestisida' => $settings->takaran_pestisida,
            'takaran_benam' => $settings->takaran_benam,
            'luas_lahan' => $settings->luas_lahan,
            'pupuk_tersedia' => $pupukList,
            'pestisida_tersedia' => $pestisidaList,
        ];
    }

    /**
     * Generate a full care plan for a lahan (from current state to harvest).
     */
    public function generatePlan(Lahan $lahan): CarePlan
    {
        CarePlan::where('lahan_id', $lahan->id)
            ->where('status', 'active')
            ->update(['status' => 'superseded']);

        $userCtx = $this->getUserContext($lahan->user_id);

        $context = [
            'komoditas' => $lahan->komoditas,
            'nomor_bed' => $lahan->nomor_bed,
            'status' => $lahan->status,
            'tanggal_tanam' => $lahan->tanggal_tanam,
            'umur_hari' => $lahan->tanggal_tanam ? now()->diffInDays($lahan->tanggal_tanam) : 0,
            'pengaturan_user' => $userCtx,
        ];

        $pupukInfo = !empty($userCtx['pupuk_tersedia'])
            ? "Pupuk yang TERSEDIA milik petani: " . implode(', ', $userCtx['pupuk_tersedia']) . ". WAJIB gunakan kombinasi dari pupuk ini."
            : "Petani belum mendaftarkan pupuk. Rekomendasikan pupuk umum yang mudah didapat.";

        $pestisidaInfo = !empty($userCtx['pestisida_tersedia'])
            ? "Pestisida yang TERSEDIA: " . implode(', ', $userCtx['pestisida_tersedia']) . ". Gunakan dari daftar ini."
            : "Rekomendasikan pestisida umum.";

        $prompt = "Kamu adalah ahli pertanian Indonesia. Tanaman berikut baru ditanam:\n"
            . json_encode($context, JSON_PRETTY_PRINT) . "\n\n"
            . "Hari ini: " . now()->toDateString() . "\n\n"
            . "PENTING:\n"
            . "- Petani punya alat kocor: {$userCtx['takaran_pupuk']}. Ini adalah wadah tempat mencampur pupuk dengan air untuk dikocorkan ke tanaman.\n"
            . "- Petani juga melakukan BENAM (membenamkan pupuk padat ke tanah). Takaran benam: {$userCtx['takaran_benam']}.\n"
            . "- Alat semprot pestisida: {$userCtx['takaran_pestisida']}.\n"
            . "- {$pupukInfo}\n"
            . "- {$pestisidaInfo}\n"
            . "- Setiap jadwal pemupukan WAJIB berikan DUA rekomendasi:\n"
            . "  1. KOCOR: campuran pupuk yang dilarutkan dalam {$userCtx['takaran_pupuk']} (berikan dosis per ember/wadah)\n"
            . "  2. BENAM: pupuk padat yang ditaburkan/dibenamkan ke tanah dekat akar ({$userCtx['takaran_benam']})\n"
            . "- Gunakan KOMBINASI 2-4 jenis pupuk per metode.\n\n"
            . "ATURAN FIELD \"aktivitas\":\n"
            . "- Untuk PEMUPUKAN: isi dengan \"Pemupukan\" saja.\n"
            . "- Untuk PESTISIDA: isi dengan NAMA PESTISIDA SPESIFIK + DOSIS per {$userCtx['takaran_pestisida']}. Contoh: \"Prevathon 1ml/L + Antracol 2g/L per {$userCtx['takaran_pestisida']}\"\n"
            . "- JANGAN tulis kata \"Pestisida\" saja! Harus berisi nama bahan dan dosisnya.\n"
            . "- Field \"detail\" berisi ALASAN/PENJELASAN mengapa bahan itu diberikan pada minggu tersebut.\n\n"
            . "Buatkan jadwal perawatan dalam format JSON (HANYA JSON, tanpa markdown):\n"
            . "{\n"
            . "  \"summary\": \"ringkasan singkat rencana\",\n"
            . "  \"estimasi_panen\": \"YYYY-MM-DD\",\n"
            . "  \"jadwal\": [\n"
            . "    {\"minggu\": 1, \"tanggal\": \"YYYY-MM-DD\", \"aktivitas\": \"nama bahan + dosis (untuk pestisida) atau 'Pemupukan' (untuk pupuk)\", \"detail\": \"alasan/penjelasan mengapa diberikan\", \"kocor\": \"campuran + dosis per {$userCtx['takaran_pupuk']}\", \"benam\": \"pupuk padat + dosis {$userCtx['takaran_benam']}\", \"catatan\": \"tips\"}\n"
            . "  ]\n"
            . "}\n\n"
            . "Untuk jadwal pestisida, field kocor dan benam harus null. Minimal 8 entry.";

        $response = $this->groq->chat([
            'model' => 'llama-3.3-70b-versatile',
            'messages' => [['role' => 'user', 'content' => $prompt]],
            'temperature' => 0.7,
            'max_tokens' => 2048,
        ]);

        $raw = $response->json('choices.0.message.content', '{}');
        $parsed = json_decode(preg_replace('/```json?\s*|\s*```/', '', $raw), true) ?? [];

        return CarePlan::create([
            'user_id' => $lahan->user_id,
            'lahan_id' => $lahan->id,
            'schedule' => $parsed['jadwal'] ?? [],
            'summary' => $parsed['summary'] ?? 'Rencana perawatan telah dibuat.',
            'status' => 'active',
        ]);
    }

    /**
     * Process user feedback and generate updated AI advice.
     */
    public function processFeedback(Lahan $lahan, PlantFeedback $feedback, ?CarePlan $activePlan): string
    {
        $userCtx = $this->getUserContext($lahan->user_id);

        $context = [
            'komoditas' => $lahan->komoditas,
            'nomor_bed' => $lahan->nomor_bed,
            'umur_hari' => $lahan->tanggal_tanam ? now()->diffInDays($lahan->tanggal_tanam) : null,
            'tipe_feedback' => $feedback->tipe,
            'feedback' => $feedback->content,
            'rencana_aktif' => $activePlan?->schedule,
            'pengaturan_user' => $userCtx,
        ];

        $promptType = $feedback->tipe === 'keluhan'
            ? "Petani melaporkan KELUHAN/MASALAH pada tanaman."
            : "Petani memberikan UPDATE KEMAJUAN tanaman.";

        $pupukInfo = !empty($userCtx['pupuk_tersedia'])
            ? "Pupuk tersedia: " . implode(', ', $userCtx['pupuk_tersedia'])
            : "Pupuk umum";

        $prompt = "Kamu adalah ahli pertanian Indonesia.\n"
            . $promptType . "\n\n"
            . "Data:\n" . json_encode($context, JSON_PRETTY_PRINT) . "\n\n"
            . "PENTING:\n"
            . "- Takaran pupuk petani: {$userCtx['takaran_pupuk']}. Dosis harus dalam satuan ini.\n"
            . "- Takaran pestisida: {$userCtx['takaran_pestisida']}.\n"
            . "- {$pupukInfo}\n"
            . "- Berikan KOMBINASI beberapa pupuk (bukan hanya 1 jenis).\n\n"
            . "Berikan saran praktis dan actionable:\n"
            . "1. Analisis kondisi berdasarkan feedback\n"
            . "2. KOMBINASI pupuk yang harus diberikan (nama + dosis per {$userCtx['takaran_pupuk']})\n"
            . "3. Pestisida yang perlu diberikan (nama + dosis per {$userCtx['takaran_pestisida']} + kapan)\n"
            . "4. Langkah selanjutnya\n\n"
            . "Jawab dalam bahasa Indonesia, singkat dan operasional.";

        $response = $this->groq->chat([
            'model' => 'llama-3.3-70b-versatile',
            'messages' => [['role' => 'user', 'content' => $prompt]],
            'temperature' => 0.7,
            'max_tokens' => 1024,
        ]);

        if ($response->failed()) {
            return 'Gagal mendapatkan saran AI. Coba lagi nanti.';
        }

        return $response->json('choices.0.message.content', 'Tidak ada saran tersedia.');
    }
}
