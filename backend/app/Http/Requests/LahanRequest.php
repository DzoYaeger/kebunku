<?php

namespace App\Http\Requests;

use App\Models\Lahan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LahanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $userId = $this->user()->id;

        // Tentukan record yang harus diabaikan saat cek unik nomor_bed:
        // - pada update: lahan dari route binding
        // - pada create idempoten: lahan existing dengan client_uuid sama (replay sync)
        $ignoreId = null;
        $routeLahan = $this->route('lahan');
        if ($routeLahan instanceof Lahan) {
            $ignoreId = $routeLahan->id;
        } elseif ($this->filled('client_uuid')) {
            $ignoreId = Lahan::where('user_id', $userId)
                ->where('client_uuid', $this->input('client_uuid'))
                ->value('id');
        }

        $uniqueBed = Rule::unique('lahan', 'nomor_bed')
            ->where(fn ($q) => $q->where('user_id', $userId));

        if ($ignoreId !== null) {
            $uniqueBed->ignore($ignoreId);
        }

        $rules = [
            'nomor_bed' => ['required', 'string', 'max:255', $uniqueBed],
            'komoditas' => ['required', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(['semai', 'aktif', 'selesai'])],
            'tanggal_tanam' => ['nullable', 'date'],
            'catatan' => ['nullable', 'string'],
        ];

        // client_uuid wajib hanya pada create (POST), untuk idempotensi sync.
        if ($this->isMethod('post')) {
            $rules['client_uuid'] = ['required', 'uuid'];
        }

        return $rules;
    }
}
