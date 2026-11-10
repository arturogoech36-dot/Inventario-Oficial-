/**
 * Attachment Storage & Quota Management Utility
 * 
 * Uses IndexedDB for persisting full attachments (PDFs, images) without 5MB localStorage limits,
 * while maintaining an in-memory cache for synchronous operations and sanitizing localStorage
 * payloads to completely prevent QuotaExceededError.
 */

export interface AttachmentRecord {
  id: string;
  nombre: string;
  tipo: string;
  data: string;
  fecha?: string;
  tamano?: number;
}

const DB_NAME = 'hah_storage_v1';
const DB_VERSION = 1;
const STORE_NAME = 'attachments';

// In-memory cache for ultra-fast sync lookups
const memoryCache = new Map<string, AttachmentRecord>();

/**
 * Opens or initializes the IndexedDB store.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves an attachment to IndexedDB and memory cache.
 */
export async function saveAttachmentToDB(attachment: AttachmentRecord): Promise<void> {
  if (!attachment || !attachment.id) return;
  
  // Update memory cache
  memoryCache.set(attachment.id, attachment);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(attachment);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not save attachment to IndexedDB:', err);
  }
}

/**
 * Retrieves an attachment by ID from memory cache or IndexedDB.
 */
export async function getAttachmentFromDB(id: string): Promise<AttachmentRecord | null> {
  if (!id) return null;

  // Check memory cache first
  if (memoryCache.has(id)) {
    return memoryCache.get(id)!;
  }

  try {
    const db = await openDB();
    return await new Promise<AttachmentRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const result = req.result as AttachmentRecord;
        if (result) {
          memoryCache.set(result.id, result);
        }
        resolve(result || null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not retrieve attachment from IndexedDB:', err);
    return null;
  }
}

/**
 * Deletes an attachment from IndexedDB and memory cache.
 */
export async function deleteAttachmentFromDB(id: string): Promise<void> {
  if (!id) return;
  memoryCache.delete(id);

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not delete attachment from IndexedDB:', err);
  }
}

/**
 * Sets attachment in memory cache synchronously.
 */
export function setMemoryAttachment(id: string, record: AttachmentRecord) {
  if (id && record) {
    memoryCache.set(id, record);
  }
}

/**
 * Gets attachment from memory cache synchronously.
 */
export function getMemoryAttachment(id: string): AttachmentRecord | undefined {
  return memoryCache.get(id);
}

/**
 * Sanitizes an array of items to remove heavy base64 payloads (>300 chars) before storing in localStorage.
 * Retains id, fileId, nombre, tipo so metadata persists without blowing the 5MB quota.
 */
export function sanitizeItemsForStorage<T>(items: T[]): T[] {
  if (!Array.isArray(items)) return items;

  return items.map((item: any) => {
    if (!item || typeof item !== 'object') return item;

    const copy = { ...item };

    // Sanitize single adjunto
    if (copy.adjunto && typeof copy.adjunto === 'object') {
      const adj = { ...copy.adjunto };
      const id = adj.id || adj.fileId || `att_${item.id || item.codigo || Date.now()}`;
      adj.id = id;
      adj.fileId = id;
      if (adj.data && adj.data.length > 300) {
        // Cache heavy data in memory & IndexedDB
        setMemoryAttachment(id, {
          id,
          nombre: adj.nombre,
          tipo: adj.tipo,
          data: adj.data,
        });
        saveAttachmentToDB({
          id,
          nombre: adj.nombre,
          tipo: adj.tipo,
          data: adj.data,
        }).catch(() => {});
        delete adj.data;
      }
      copy.adjunto = adj;
    }

    // Sanitize adjuntos list
    if (Array.isArray(copy.adjuntos)) {
      copy.adjuntos = copy.adjuntos.map((a: any, idx: number) => {
        if (!a || typeof a !== 'object') return a;
        const adj = { ...a };
        const id = adj.id || adj.fileId || `att_${item.id || item.codigo || Date.now()}_${idx}`;
        adj.id = id;
        adj.fileId = id;
        if (adj.data && adj.data.length > 300) {
          setMemoryAttachment(id, {
            id,
            nombre: adj.nombre,
            tipo: adj.tipo,
            data: adj.data,
          });
          saveAttachmentToDB({
            id,
            nombre: adj.nombre,
            tipo: adj.tipo,
            data: adj.data,
          }).catch(() => {});
          delete adj.data;
        }
        return adj;
      });
    }

    return copy;
  });
}

/**
 * Safe localStorage.setItem wrapper that never throws QuotaExceededError.
 * If quota is exceeded, automatically prunes bloat from known keys and retries.
 */
export function safeLocalStorageSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    localStorage.removeItem(key);
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    console.warn(`[Storage] Quota error setting ${key}. Pruning bloated storage keys...`, err);
    try {
      cleanupBloatedLocalStorage();
      localStorage.removeItem(key);
      localStorage.setItem(key, value);
      return true;
    } catch (retryErr) {
      console.warn(`[Storage] Still exceeded quota for ${key} after pruning. Saving compact fallback...`);
      // Fallback: If it's an array of objects with attachments, strip them completely
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const stripped = parsed.map((item: any) => {
            if (!item || typeof item !== 'object') return item;
            const c = { ...item };
            if (c.adjunto) c.adjunto = { id: c.adjunto.id || c.adjunto.fileId, nombre: c.adjunto.nombre, tipo: c.adjunto.tipo };
            if (Array.isArray(c.adjuntos)) {
              c.adjuntos = c.adjuntos.map((a: any) => ({ id: a.id || a.fileId, nombre: a.nombre, tipo: a.tipo }));
            }
            return c;
          });
          localStorage.removeItem(key);
          localStorage.setItem(key, JSON.stringify(stripped));
          return true;
        }
      } catch (stripErr) {
        console.error(`[Storage] Failed fallback save for ${key}:`, stripErr);
      }
      return false;
    }
  }
}

/**
 * Cleans up large base64 strings from existing localStorage entries to recover space immediately.
 */
export function cleanupBloatedLocalStorage(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;

        // If string contains base64 data patterns or is very large, sanitize and re-save
        if (raw.includes('data:application/pdf') || raw.includes('data:image/') || raw.length > 100000) {
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const sanitized = sanitizeItemsForStorage(parsed);
              localStorage.removeItem(key);
              localStorage.setItem(key, JSON.stringify(sanitized));
              console.info(`[Storage] Reclaimed space by pruning base64 payloads from ${key}`);
            }
          } catch (jsonErr) {
            // If it's not JSON but huge base64, remove it if it starts with data:
            if (raw.startsWith('data:')) {
              localStorage.removeItem(key);
            }
          }
        }
      } catch (keyErr) {
        console.warn(`[Storage] Error inspecting ${key}:`, keyErr);
      }
    });
  } catch (e) {
    console.warn(`[Storage] Failed during cleanup:`, e);
  }
}

// Auto-run cleanup as soon as script executes in browser
if (typeof window !== 'undefined' && window.localStorage) {
  try {
    cleanupBloatedLocalStorage();
  } catch (e) {}
}

/**
 * Rehydrates items with heavy attachment data from IndexedDB or memory cache.
 */
export async function rehydrateAttachments<T>(items: T[]): Promise<T[]> {
  if (!Array.isArray(items)) return items;

  const hydrated = await Promise.all(
    items.map(async (item: any) => {
      if (!item || typeof item !== 'object') return item;
      const copy = { ...item };

      if (copy.adjunto && (!copy.adjunto.data || copy.adjunto.data.length < 50)) {
        const id = copy.adjunto.id || copy.adjunto.fileId;
        if (id) {
          const full = await getAttachmentFromDB(id);
          if (full && full.data) {
            copy.adjunto = { ...copy.adjunto, data: full.data };
          }
        }
      }

      if (Array.isArray(copy.adjuntos)) {
        copy.adjuntos = await Promise.all(
          copy.adjuntos.map(async (a: any) => {
            if (!a || typeof a !== 'object') return a;
            if (!a.data || a.data.length < 50) {
              const id = a.id || a.fileId;
              if (id) {
                const full = await getAttachmentFromDB(id);
                if (full && full.data) {
                  return { ...a, data: full.data };
                }
              }
            }
            return a;
          })
        );
      }

      return copy;
    })
  );

  return hydrated;
}
