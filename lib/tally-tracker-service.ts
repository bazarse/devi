export interface TallyStatus {
  billId: string;
  isUploaded: boolean;
  uploadedAt?: string;
  uploadedBy?: string;
}

const TALLY_EVENT_NAME = 'devi_tally_updated';
const TALLY_STORAGE_KEY = 'devi_tally_statuses_cache';

function getStoredTallyCache(): Record<string, TallyStatus> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(TALLY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredTallyCache(cache: Record<string, TallyStatus>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TALLY_STORAGE_KEY, JSON.stringify(cache));
  } catch {}
}

export function getAllTallyStatuses(): Record<string, TallyStatus> {
  return getStoredTallyCache();
}

export function getTallyStatus(billId: string): TallyStatus {
  const cache = getStoredTallyCache();
  return cache[billId] || { billId, isUploaded: false };
}

export function syncTallyStatusesFromDeals(
  deals: Array<{ id: string; isTallyUploaded?: boolean; tallyUploadedAt?: string; tallyUploadedBy?: string }>
): Record<string, TallyStatus> {
  const cache = getStoredTallyCache();
  for (const d of deals) {
    if (d.isTallyUploaded) {
      cache[d.id] = {
        billId: d.id,
        isUploaded: true,
        uploadedAt: d.tallyUploadedAt,
        uploadedBy: d.tallyUploadedBy
      };
    } else if (cache[d.id] && !d.isTallyUploaded) {
      cache[d.id] = {
        billId: d.id,
        isUploaded: false
      };
    }
  }
  saveStoredTallyCache(cache);
  return cache;
}

/**
 * Toggle Tally status directly in Supabase Cloud
 */
export async function toggleTallyStatus(
  billId: string, 
  userName: string, 
  currentStatus: boolean
): Promise<TallyStatus> {
  const nextUploaded = !currentStatus;

  const updated: TallyStatus = {
    billId,
    isUploaded: nextUploaded,
    uploadedAt: nextUploaded ? new Date().toISOString() : undefined,
    uploadedBy: nextUploaded ? userName : undefined
  };

  // Update local cache
  const cache = getStoredTallyCache();
  cache[billId] = updated;
  saveStoredTallyCache(cache);

  // 1. Update in Cloud Supabase via Server API
  try {
    await fetch('/api/deals/tally', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dealId: billId,
        isUploaded: nextUploaded,
        userName
      })
    });
  } catch (err) {
    console.error('Cloud tally update error:', err);
  }

  // 2. Broadcast to UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TALLY_EVENT_NAME, { detail: updated }));
    if ('BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('devi_tally_channel');
        bc.postMessage({ type: 'TALLY_UPDATED', detail: updated });
        bc.close();
      } catch (e) {}
    }
  }

  return updated;
}

export function subscribeToTallyUpdates(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = () => callback();
  window.addEventListener(TALLY_EVENT_NAME, handleCustom);

  let bc: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      bc = new BroadcastChannel('devi_tally_channel');
      bc.onmessage = () => callback();
    } catch (e) {}
  }

  return () => {
    window.removeEventListener(TALLY_EVENT_NAME, handleCustom);
    if (bc) bc.close();
  };
}

export function deleteTallyStatus(billId: string): void {
  const cache = getStoredTallyCache();
  delete cache[billId];
  saveStoredTallyCache(cache);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(TALLY_EVENT_NAME));
  }
}
