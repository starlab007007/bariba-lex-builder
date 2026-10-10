export type DunyaStoredSource = { title: string; ref?: string };
export type DunyaStoredMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: DunyaStoredSource[];
  createdAt: number;
};

const DB_NAME = 'fitila_dunya';
const DB_VERSION = 1;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function openDb(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) throw new Error('IndexedDB unavailable');
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('messages')) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('memories')) {
        const store = db.createObjectStore('memories', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('knowledge_packs')) {
        db.createObjectStore('knowledge_packs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('model_registry')) {
        db.createObjectStore('model_registry', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('outbox')) {
        const store = db.createObjectStore('outbox', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('audit_events')) {
        const store = db.createObjectStore('audit_events', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(name: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(name, mode);
    const result = await fn(tx.objectStore(name));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return result;
  } finally {
    db.close();
  }
}

export async function ensureDunyaFoundation() {
  await withStore('knowledge_packs', 'readwrite', async (store) => {
    const existing = await requestToPromise(store.get('fitila-core'));
    if (!existing) {
      await requestToPromise(store.put({
        id: 'fitila-core',
        name: 'DUNYA FITILA Core',
        version: '1',
        status: 'installed',
        sources: ['apprendre', 'scenes'],
        offline: true,
        installedAt: Date.now(),
      }));
    }
  });
  await withStore('model_registry', 'readwrite', async (store) => {
    const existing = await requestToPromise(store.get('dunya-fallback'));
    if (!existing) {
      await requestToPromise(store.put({
        id: 'dunya-fallback',
        family: 'deterministic-rag',
        profile: 'fallback',
        state: 'ready',
        networkRequired: false,
        updatedAt: Date.now(),
      }));
    }
  });
}

export async function loadMessages(): Promise<DunyaStoredMessage[]> {
  return withStore('messages', 'readonly', async (store) => {
    const all = await requestToPromise(store.getAll());
    return (all as DunyaStoredMessage[]).sort((a, b) => a.createdAt - b.createdAt).slice(-300);
  });
}

export async function appendMessages(messages: DunyaStoredMessage[]) {
  await withStore('messages', 'readwrite', async (store) => {
    for (const message of messages) {
      await requestToPromise(store.put(message));
    }
  });
}

export async function loadMemories(): Promise<string[]> {
  return withStore('memories', 'readonly', async (store) => {
    const all = await requestToPromise(store.getAll());
    return (all as { content: string; createdAt: number }[])
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100)
      .map((x) => x.content);
  });
}

export async function saveMemory(content: string) {
  await withStore('memories', 'readwrite', async (store) => {
    const all = await requestToPromise(store.getAll());
    const duplicate = (all as { content: string }[]).some((x) => x.content === content);
    if (!duplicate) {
      await requestToPromise(store.put({
        id: crypto.randomUUID(),
        content,
        type: 'semantic',
        provenance: 'assistant',
        createdAt: Date.now(),
      }));
    }
  });
}

export async function audit(eventType: string, detail: Record<string, unknown>) {
  await withStore('audit_events', 'readwrite', async (store) => {
    await requestToPromise(store.put({
      id: crypto.randomUUID(),
      eventType,
      detail,
      createdAt: Date.now(),
    }));
  });
}
