import { api } from './client';
import type {
  ChatSession,
  SendMessageResponse,
  ApiResource,
  ApiCollection,
} from '../types';

export async function listSessions(): Promise<ChatSession[]> {
  const res = await api.get<ApiCollection<ChatSession>>('/chat/sessions');
  return res.data.data;
}

export async function listKeluhanSessions(lahanId: number): Promise<ChatSession[]> {
  const res = await api.get<ApiCollection<ChatSession>>('/chat/sessions', {
    params: { lahan_id: lahanId, is_keluhan: 1 },
  });
  return res.data.data;
}

export async function createSession(lahanId?: number | null, isKeluhan = false): Promise<ChatSession> {
  const res = await api.post<ApiResource<ChatSession>>('/chat/sessions', {
    lahan_id: lahanId ?? null,
    is_keluhan: isKeluhan,
  });
  return res.data.data;
}

export async function getSession(id: number): Promise<ChatSession> {
  const res = await api.get<ApiResource<ChatSession>>(`/chat/sessions/${id}`);
  return res.data.data;
}

export async function deleteSession(id: number): Promise<void> {
  await api.delete(`/chat/sessions/${id}`);
}

export async function toggleKeluhanSession(id: number, isKeluhan: boolean, lahanId?: number | null): Promise<ChatSession> {
  const res = await api.put<ApiResource<ChatSession>>(`/chat/sessions/${id}/keluhan`, {
    is_keluhan: isKeluhan,
    lahan_id: lahanId ?? undefined,
  });
  return res.data.data;
}

export async function sendMessage(
  sessionId: number,
  content: string,
  image: File | null,
  lahanId?: number | null,
): Promise<SendMessageResponse> {
  const form = new FormData();
  if (content) form.append('content', content);
  if (image) form.append('image', image);
  if (lahanId) form.append('lahan_id', String(lahanId));

  const res = await api.post<ApiResource<SendMessageResponse>>(
    `/chat/sessions/${sessionId}/messages`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return res.data.data;
}
