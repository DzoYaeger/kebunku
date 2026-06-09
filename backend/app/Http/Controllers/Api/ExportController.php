<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function exportTransaksi(Request $request): StreamedResponse
    {
        $transaksi = $request->user()->transaksi()
            ->with('lahan')
            ->orderByDesc('tanggal')
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="export_transaksi_kebunku.csv"',
        ];

        $callback = function () use ($transaksi) {
            $file = fopen('php://output', 'w');

            // Header CSV
            fputcsv($file, ['ID', 'Tipe', 'Kategori', 'Komoditas', 'Nominal', 'Tanggal', 'Lahan (Nomor Bed)', 'Catatan']);

            foreach ($transaksi as $row) {
                fputcsv($file, [
                    $row->id,
                    $row->tipe,
                    $row->kategori,
                    $row->komoditas ?? '',
                    $row->nominal,
                    $row->tanggal?->format('Y-m-d'),
                    $row->lahan ? $row->lahan->nomor_bed : '',
                    $row->catatan ?? '',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function exportPanen(Request $request): StreamedResponse
    {
        $panen = $request->user()->panen()
            ->with('lahan')
            ->orderByDesc('tanggal')
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="export_panen_kebunku.csv"',
        ];

        $callback = function () use ($panen) {
            $file = fopen('php://output', 'w');

            // Header CSV
            fputcsv($file, ['ID', 'Lahan (Nomor Bed)', 'Komoditas', 'Tanggal Panen', 'Berat (Kg)', 'Grade', 'Harga Jual', 'Total Pendapatan', 'Pembeli', 'Catatan']);

            foreach ($panen as $row) {
                $total = $row->harga_jual !== null ? ((float)$row->harga_jual * (float)$row->berat) : 0;
                fputcsv($file, [
                    $row->id,
                    $row->lahan ? $row->lahan->nomor_bed : '',
                    $row->lahan ? $row->lahan->komoditas : '',
                    $row->tanggal?->format('Y-m-d'),
                    $row->berat,
                    $row->grade ?? '',
                    $row->harga_jual ?? 0,
                    $total,
                    $row->pembeli ?? '',
                    $row->catatan ?? '',
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
