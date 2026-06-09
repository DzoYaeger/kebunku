<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChatMessageResource;
use App\Http\Resources\ChatSessionResource;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Lahan;
use App\Services\GroqService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

class ChatController extends Controller
{
    private const TEXT_MODEL = 'llama-3.3-70b-versatile';
    private const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

    /** List sesi chat milik user (terbaru dulu). */
    public function index(Request $request): AnonymousResourceCollection
    {
        $sessions = ChatSession::where('user_id', $request->user()->id)
            ->with('lahan')
            ->orderByDesc('updated_at')
            ->get();

        return ChatSessionResource::collection($sessions);
    }

    /** Buat sesi baru (opsional pilih lahan). */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lahan_id' => 'nullable|exists:lahan,id',
            'judul' => 'nullable|string|max:255',
        ]);

        $session = ChatSession::create([
            'user_id' => $request->user()->id,
            'lahan_id' => $validated['lahan_id'] ?? null,
            'judul' => $validated['judul'] ?? 'Konsultasi Baru',
        ]);

        return response()->json([
            'data' => new ChatSessionResource($session->load('lahan', 'messages')),
        ], 201);
    }

    /** Detail sesi + seluruh pesan. */
    public function show(Request $request, ChatSession $chatSession): JsonResponse
    {
        $this->authorizeSession($request, $chatSession);

        return response()->json([
            'data' => new ChatSessionResource(
                $chatSession->load(['lahan', 'messages' => fn ($q) => $q->orderBy('created_at')])
            ),
        ]);
    }

    /** Hapus sesi. */
    public function destroy(Request $request, ChatSession $chatSession): JsonResponse
    {
        $this->authorizeSession($request, $chatSession);
        $chatSession->delete();

        return response()->json(['message' => 'Sesi dihapus.']);
    }

    /** Kirim pesan ke AI dalam sebuah sesi. */
    public function sendMessage(Request $request, ChatSession $chatSession): JsonResponse
    {
        $this->authorizeSession($request, $chatSession);

        $request->validate([
            'content' => 'required_without:image|nullable|string|max:4000',
            'image' => 'nullable|image|max:5120', // max 5MB
            'lahan_id' => 'nullable|exists:lahan,id',
        ]);

        // Update konteks lahan sesi bila dikirim & berbeda.
        if ($request->filled('lahan_id') && (int) $request->input('lahan_id') !== $chatSession->lahan_id) {
            $lahan = Lahan::where('user_id', $request->user()->id)->find($request->input('lahan_id'));
            if ($lahan) {
                $chatSession->update(['lahan_id' => $lahan->id]);
                $chatSession->refresh();
            }
        }

        // Simpan gambar bila ada.
        $imagePath = null;
        if ($request->hasFile('image')) {
            $imagePath = $request->file('image')->store('chat', 'public');
        }

        $userContent = (string) ($request->input('content') ?? '');

        // Simpan pesan user.
        $userMessage = ChatMessage::create([
            'chat_session_id' => $chatSession->id,
            'role' => 'user',
            'content' => $userContent !== '' ? $userContent : '[Mengirim gambar]',
            'image_path' => $imagePath,
        ]);

        // Set judul sesi dari pesan pertama.
        if ($chatSession->messages()->count() === 1 && $userContent !== '') {
            $chatSession->update([
                'judul' => mb_substr($userContent, 0, 50),
            ]);
        }

        // Bangun konteks AI.
        $aiResponse = $this->callGroq($chatSession, $userContent, $imagePath);

        $assistantMessage = ChatMessage::create([
            'chat_session_id' => $chatSession->id,
            'role' => 'assistant',
            'content' => $aiResponse,
        ]);

        $chatSession->touch();

        return response()->json([
            'data' => [
                'user_message' => new ChatMessageResource($userMessage),
                'assistant_message' => new ChatMessageResource($assistantMessage),
            ],
        ], 201);
    }

    private function authorizeSession(Request $request, ChatSession $session): void
    {
        abort_if($session->user_id !== $request->user()->id, 403, 'Bukan sesi Anda.');
    }

    private function callGroq(ChatSession $session, string $userContent, ?string $imagePath): string
    {
        // Konteks tanaman bila sesi terkait lahan.
        $context = 'Kamu adalah konsultan pertanian ahli bernama "Asisten Kebunku". '
            . 'Jawab pertanyaan petani dengan ramah, praktis, dan dalam bahasa Indonesia.';

        if ($session->lahan_id) {
            $lahan = Lahan::find($session->lahan_id);
            if ($lahan) {
                $context .= "\n\nKonteks tanaman yang dikonsultasikan:\n"
                    . "- Komoditas: {$lahan->komoditas}\n"
                    . "- Nomor Bed: {$lahan->nomor_bed}\n"
                    . "- Status: {$lahan->status}\n"
                    . '- Tanggal tanam: ' . ($lahan->tanggal_tanam ?? 'tidak diketahui');
            }
        }

        // Riwayat percakapan (maks 20 pesan terakhir).
        $history = $session->messages()
            ->orderBy('created_at')
            ->get()
            ->slice(-20)
            ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
            ->values()
            ->toArray();

        $messages = [['role' => 'system', 'content' => $context]];

        // Bila ada gambar pada pesan terakhir, pakai vision model dengan format multimodal.
        $useVision = $imagePath !== null;

        if ($useVision) {
            // Riwayat sebelumnya (tanpa pesan user terakhir yang baru disimpan).
            $previous = array_slice($history, 0, -1);
            foreach ($previous as $h) {
                $messages[] = $h;
            }

            $imageData = base64_encode(Storage::disk('public')->get($imagePath));
            $mime = Storage::disk('public')->mimeType($imagePath) ?: 'image/jpeg';

            $messages[] = [
                'role' => 'user',
                'content' => [
                    ['type' => 'text', 'text' => $userContent !== '' ? $userContent : 'Tolong analisis gambar tanaman ini dan beri saran.'],
                    ['type' => 'image_url', 'image_url' => ['url' => "data:{$mime};base64,{$imageData}"]],
                ],
            ];
        } else {
            foreach ($history as $h) {
                $messages[] = $h;
            }
        }

        $response = app(GroqService::class)->chat([
            'model' => $useVision ? self::VISION_MODEL : self::TEXT_MODEL,
            'messages' => $messages,
            'temperature' => 0.7,
            'max_tokens' => 1024,
        ], 45);

        if ($response->failed()) {
            return $response->status() === 429
                ? 'Maaf, kuota AI sedang penuh. Coba lagi beberapa saat lagi.'
                : 'Maaf, terjadi kendala saat menghubungi AI. Silakan coba lagi.';
        }

        return $response->json('choices.0.message.content', 'Maaf, tidak ada jawaban.');
    }
}
