/**
 * IndexedDB Wrapper for encrypted offline storage with zero-knowledge keys.
 * Provides offline capabilities for sensitive user data, chat sessions, and audit entries.
 */

const DB_NAME = 'kluisai_encrypted_vault';
const DB_VERSION = 1;

export interface StoredSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  model: string;
  systemInstruction?: string;
  sourceLanguage: string;
  targetLanguage: string;
  encryptedMessages: string; // JSON stringified EncryptedPayload
}

export interface StoredFile {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
  uploader: string;
  encryptedData: string; // Base64 ciphertext
  iv: string;           // Base64 IV
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  eventType: 'AUTH' | 'KEY_ROTATION' | 'ENCRYPTION' | 'SYNC' | 'ADMIN_ACCESS' | 'CLEAR_HISTORY' | 'EXPORT_DATA' | 'CONFIG_CHANGE';
  severity: 'INFO' | 'WARNING' | 'ALERT';
  description: string;
  actor: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export function openVaultDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('encrypted_files')) {
        db.createObjectStore('encrypted_files', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('audit_logs')) {
        const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
        auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        auditStore.createIndex('severity', 'severity', { unique: false });
      }
      if (!db.objectStoreNames.contains('user_settings')) {
        db.createObjectStore('user_settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generic IndexedDB CRUD helpers
export async function dbPut<T>(storeName: string, item: T): Promise<void> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbClear(storeName: string): Promise<void> {
  const db = await openVaultDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
