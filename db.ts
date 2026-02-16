
import { ApiCard, LedgerEvent } from './types';

const DB_NAME = 'nokeypedia_v1';
const STORE_APIS = 'api_cards';
const STORE_LEDGER = 'ledger';

class NoKeyDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_APIS)) {
          db.createObjectStore(STORE_APIS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_LEDGER)) {
          db.createObjectStore(STORE_LEDGER, { keyPath: 'id' });
        }
      };
      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllApis(): Promise<ApiCard[]> {
    return this.getAll<ApiCard>(STORE_APIS);
  }

  async saveApi(api: ApiCard): Promise<void> {
    await this.put(STORE_APIS, api);
  }

  async getAllLedger(): Promise<LedgerEvent[]> {
    const events = await this.getAll<LedgerEvent>(STORE_LEDGER);
    return events.sort((a, b) => b.ts - a.ts);
  }

  async addLedgerEvent(event: LedgerEvent): Promise<void> {
    await this.put(STORE_LEDGER, event);
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async put(storeName: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject('DB not initialized');
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const db = new NoKeyDB();
