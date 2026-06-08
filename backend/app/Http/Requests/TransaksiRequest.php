<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class TransaksiRequest extends FormRequest
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

        return [
            'client_uuid' => ['required', 'uuid'],
            'tipe' => ['sometimes', Rule::in(['kas_keluar', 'kas_masuk'])],
            'kategori' => ['required', 'string', 'max:255'],
            'komoditas' => ['nullable', 'required_if:tipe,kas_masuk', 'string', 'max:255'],
            'nominal' => ['required', 'numeric', 'gt:0'],
            'tanggal' => ['required', 'date'],
            'lahan_id' => [
                'nullable',
                Rule::exists('lahan', 'id')->where(fn ($q) => $q->where('user_id', $userId)),
            ],
            'catatan' => ['nullable', 'string'],
        ];
    }
}
