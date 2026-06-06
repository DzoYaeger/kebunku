import { create } from 'zustand';
import { db } from '../db';

interface SyncState {
  pendingCount: number;
  failedCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  setOnline: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  markSynced: () => void;
  refreshCounts: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  failedCount: 0,
  isOnline: navigator.onLine,
  isSyncing: false,
  lastSyncedAt: null,
  setOnline: (online) => set({ isOnline: online }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
  markSynced: () => set({ lastSyncedAt: new Date().toISOString() }),
  refreshCounts: async () => {
    const pending = await db.sync_queue.where('status').equals('pending').count();
    const failed = await db.sync_queue.where('status').equals('failed').count();
    set({ pendingCount: pending, failedCount: failed });
  },
}));
