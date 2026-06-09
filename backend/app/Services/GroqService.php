<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class GroqService
{
    /** @var string[] */
    private array $apiKeys;

    public function __construct()
    {
        // Ambil semua key dari env (comma-separated) atau fallback ke single key
        $keys = config('services.groq.api_keys', []);
        if (empty($keys)) {
            $single = config('services.groq.api_key', '');
            $keys = $single ? [$single] : [];
        }
        $this->apiKeys = $keys;
    }

    /**
     * Kirim request ke Groq API dengan rotation key.
     * Jika key pertama kena 429, coba key berikutnya.
     */
    public function chat(array $payload, int $timeout = 30): Response
    {
        $lastResponse = null;

        foreach ($this->getOrderedKeys() as $key) {
            $response = Http::withHeaders([
                'Authorization' => 'Bearer ' . $key,
                'Content-Type' => 'application/json',
            ])->timeout($timeout)->post('https://api.groq.com/openai/v1/chat/completions', $payload);

            if ($response->status() !== 429) {
                return $response;
            }

            // Mark key sebagai rate-limited (cooldown 60 detik)
            Cache::put('groq_limited_' . md5($key), true, 60);
            $lastResponse = $response;
        }

        // Semua key kena limit, kembalikan response terakhir
        return $lastResponse ?? Http::withHeaders([
            'Authorization' => 'Bearer ' . ($this->apiKeys[0] ?? ''),
            'Content-Type' => 'application/json',
        ])->timeout($timeout)->post('https://api.groq.com/openai/v1/chat/completions', $payload);
    }

    /**
     * Urutkan keys: yang tidak rate-limited didahulukan.
     * @return string[]
     */
    private function getOrderedKeys(): array
    {
        $available = [];
        $limited = [];

        foreach ($this->apiKeys as $key) {
            if (Cache::has('groq_limited_' . md5($key))) {
                $limited[] = $key;
            } else {
                $available[] = $key;
            }
        }

        return array_merge($available, $limited);
    }
}
