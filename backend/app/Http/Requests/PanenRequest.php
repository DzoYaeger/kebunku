<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PanenRequest extends FormRequest
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
            'tanggal' => ['required', 'date'],
            'berat' => ['required', 'numeric', 'gt:0'],
            'grade' => ['nullable', 'string', 'max:255'],
            'harga_jual' => ['nullable', 'numeric', 'gte:0'],
            'pembeli' => ['nullable', 'string', 'max:255'],
            'catatan' => ['nullable', 'string'],
        ];
    }
}
