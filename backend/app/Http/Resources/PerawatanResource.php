<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Models\Lahan
 */
class PerawatanResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $aktivitas = $this->aktivitas;

        $pemupukan = $aktivitas->filter(fn ($a) => strtolower($a->tipe) === 'pemupukan');
        $pestisida = $aktivitas->filter(fn ($a) => strtolower($a->tipe) === 'pestisida');

        $lastPupuk = $pemupukan->first();
        $lastPestisida = $pestisida->first();

        return [
            'lahan_id' => $this->id,
            'nomor_bed' => $this->nomor_bed,
            'komoditas' => $this->komoditas,
            'status' => $this->status,
            'terakhir_dipupuk' => $lastPupuk ? [
                'tanggal' => $lastPupuk->tanggal->toDateString(),
                'jenis_pupuk' => $lastPupuk->jenis_pupuk,
            ] : null,
            'terakhir_dipestisida' => $lastPestisida ? [
                'tanggal' => $lastPestisida->tanggal->toDateString(),
                'jenis_pestisida' => $lastPestisida->jenis_pestisida,
            ] : null,
            'riwayat_pemupukan' => $pemupukan->map(fn ($a) => [
                'tanggal' => $a->tanggal->toDateString(),
                'jenis_pupuk' => $a->jenis_pupuk,
                'catatan' => $a->catatan,
            ])->values(),
            'riwayat_pestisida' => $pestisida->map(fn ($a) => [
                'tanggal' => $a->tanggal->toDateString(),
                'jenis_pestisida' => $a->jenis_pestisida,
                'catatan' => $a->catatan,
            ])->values(),
        ];
    }
}
