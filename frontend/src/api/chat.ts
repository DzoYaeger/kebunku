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

export async function createSession(lahanId?: number | null): Promise<ChatSession> {
  const res = await api.post<ApiResource<ChatSession>>('/chat/sessions', {
    lahan_id: lahanId ?? null,
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
