<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MusimTanamRequest extends FormRequest
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
            'lahan_id' => [
                'required',
                Rule::exists('lahan', 'id')->where(fn ($q) => $q->where('user_id', $userId)),
            ],
            'komoditas' => ['required', 'string', 'max:255'],
            'tanggal_mulai' => ['required', 'date'],
            'tanggal_selesai' => ['nullable', 'date', 'after_or_equal:tanggal_mulai'],
            'status' => ['sometimes', Rule::in(['aktif', 'selesai', 'gagal'])],
            'catatan' => ['nullable', 'string'],
        ];
    }
}
