<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AktivitasRequest extends FormRequest
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
            // lahan_id wajib ada DAN milik user yang sama (cegah IDOR).
            'lahan_id' => [
                'required',
                Rule::exists('lahan', 'id')->where(fn ($q) => $q->where('user_id', $userId)),
            ],
            'tipe' => ['required', Rule::in(['semai', 'pindah_tanam', 'pemupukan', 'pestisida'])],
            'tanggal' => ['required', 'date'],
            'jenis_pupuk' => ['nullable', 'required_if:tipe,pemupukan', 'string', 'max:255'],
            'jenis_pestisida' => ['nullable', 'required_if:tipe,pestisida', 'string', 'max:255'],
            'catatan' => ['nullable', 'string'],
        ];
    }
}
