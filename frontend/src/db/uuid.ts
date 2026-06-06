import { v4 as uuidv4 } from 'uuid';

// client_uuid v4 untuk idempotensi sync.
export function newClientUuid(): string {
  return uuidv4();
}

export function nowIso(): string {
  return new Date().toISOString();
}
