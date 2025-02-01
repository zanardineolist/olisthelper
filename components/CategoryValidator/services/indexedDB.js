// components/CategoryValidator/services/indexedDB.js
export class CategoryCache {
    constructor() {
      this.dbName = 'CategoryValidatorDB';
      this.dbVersion = 1;
      this.storeName = 'categories';
      this.init();
    }
  
    init() {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(this.dbName, this.dbVersion);
  
        request.onerror = () => {
          console.error('Error opening IndexedDB');
          reject(request.error);
        };
  
        request.onsuccess = (event) => {
          const db = event.target.result;
          resolve(db);
        };
  
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
            
            // Índice para busca por texto
            store.createIndex('searchTerms', 'searchTerms', { unique: false });
          }
        };
      });
    }
  
    async getDb() {
      return await this.dbPromise;
    }
  
    async saveCategory(category) {
      try {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
  
        // Adiciona campos para busca e cache
        const categoryToSave = {
          ...category,
          searchTerms: [
            category.id.toLowerCase(),
            category.hierarquia_completa.toLowerCase()
          ].join(' '),
          updatedAt: new Date().getTime()
        };
  
        await store.put(categoryToSave);
        await tx.complete;
        return true;
      } catch (error) {
        console.error('Error saving to IndexedDB:', error);
        return false;
      }
    }
  
    async getCategory(id) {
      try {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const category = await store.get(id);
  
        // Verifica se o cache está atualizado (24 horas)
        if (category && (new Date().getTime() - category.updatedAt) < 24 * 60 * 60 * 1000) {
          return category;
        }
        return null;
      } catch (error) {
        console.error('Error reading from IndexedDB:', error);
        return null;
      }
    }
  
    async searchCategories(query) {
      try {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readonly');
        const store = tx.objectStore(this.storeName);
        const index = store.index('searchTerms');
  
        const results = [];
        const searchQuery = query.toLowerCase();
  
        // Busca usando um cursor para permitir busca parcial
        const cursor = await index.openCursor();
        
        while (cursor) {
          if (cursor.value.searchTerms.includes(searchQuery)) {
            results.push(cursor.value);
          }
          await cursor.continue();
        }
  
        return results;
      } catch (error) {
        console.error('Error searching in IndexedDB:', error);
        return [];
      }
    }
  
    async clearOldCache() {
      try {
        const db = await this.getDb();
        const tx = db.transaction(this.storeName, 'readwrite');
        const store = tx.objectStore(this.storeName);
        const index = store.index('updatedAt');
  
        const oldDate = new Date().getTime() - (24 * 60 * 60 * 1000); // 24 horas
        const range = IDBKeyRange.upperBound(oldDate);
  
        await store.delete(range);
        await tx.complete;
      } catch (error) {
        console.error('Error clearing old cache:', error);
      }
    }
  }