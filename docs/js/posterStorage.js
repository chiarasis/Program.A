// Poster Storage Utility - IndexedDB for user-generated posters
// Stores poster images and metadata for display in gallery
// Falls back to localStorage if IndexedDB is unavailable

const DB_NAME = 'ProgramAPosters';
const DB_VERSION = 1;
const STORE_NAME = 'userPosters';
const LOCALSTORAGE_KEY = 'programAPosters';

let db = null;
let useIndexedDB = true;

// Initialize IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    console.log('initDB called, db is:', db);
    
    // Check if IndexedDB is available
    if (!window.indexedDB) {
      console.warn('IndexedDB not available, falling back to localStorage');
      useIndexedDB = false;
      resolve(null);
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('initDB open error:', request.error);
      console.warn('Falling back to localStorage');
      useIndexedDB = false;
      resolve(null);
    };
    request.onsuccess = () => {
      db = request.result;
      console.log('initDB success, db opened:', DB_NAME);
      useIndexedDB = true;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      console.log('onupgradeneeded called');
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('editor', 'editor', { unique: false });
        console.log('Created objectStore:', STORE_NAME);
      }
    };
  });
}

// Save poster to IndexedDB (or localStorage as fallback)
async function savePoster(dataURL, metadata = {}) {
  if (!db && useIndexedDB) await initDB();
  
  const poster = {
    id: Date.now(), // Use timestamp as simple ID
    dataURL,
    editor: metadata.editor || 'unknown',
    seed: metadata.seed || null,
    timestamp: Date.now(),
    filename: metadata.filename || `poster-${Date.now()}.png`,
    width: metadata.width || 1000,
    height: metadata.height || 1500
  };
  
  console.log('Saving poster:', {
    editor: poster.editor,
    filename: poster.filename,
    storageMethod: useIndexedDB ? 'IndexedDB' : 'localStorage'
  });
  
  if (useIndexedDB && db) {
    // Use IndexedDB
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(poster);
      
      request.onsuccess = () => {
        console.log('Poster saved to IndexedDB with ID:', request.result);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('Failed to save poster to IndexedDB:', request.error);
        // Fallback to localStorage
        saveToLocalStorage(poster);
        resolve(poster.id);
      };
    });
  } else {
    // Use localStorage
    saveToLocalStorage(poster);
    return Promise.resolve(poster.id);
  }
}

function saveToLocalStorage(poster) {
  try {
    const posters = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) || '[]');
    posters.push(poster);
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(posters));
    console.log('Poster saved to localStorage');
  } catch (error) {
    console.error('Failed to save poster to localStorage:', error);
  }
}

// Get all user posters
async function getAllPosters() {
  if (!db && useIndexedDB) await initDB();
  
  if (useIndexedDB && db) {
    // Use IndexedDB
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        
        request.onsuccess = () => {
          console.log('getAllPosters from IndexedDB:', request.result.length, 'posters found');
          resolve(request.result);
        };
        request.onerror = () => {
          console.error('getAllPosters request error:', request.error);
          // Fallback to localStorage
          const posters = getFromLocalStorage();
          resolve(posters);
        };
        
        transaction.onerror = () => {
          console.error('getAllPosters transaction error:', transaction.error);
          const posters = getFromLocalStorage();
          resolve(posters);
        };
      } catch (error) {
        console.error('getAllPosters exception:', error);
        const posters = getFromLocalStorage();
        resolve(posters);
      }
    });
  } else {
    // Use localStorage
    return Promise.resolve(getFromLocalStorage());
  }
}

function getFromLocalStorage() {
  try {
    const posters = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) || '[]');
    console.log('getAllPosters from localStorage:', posters.length, 'posters found');
    return posters;
  } catch (error) {
    console.error('Failed to get posters from localStorage:', error);
    return [];
  }
}

// Get recent posters (last N)
async function getRecentPosters(count = 10) {
  const allPosters = await getAllPosters();
  return allPosters.sort((a, b) => b.timestamp - a.timestamp).slice(0, count);
}

// Delete a poster
async function deletePoster(id) {
  if (!db && useIndexedDB) await initDB();
  
  if (useIndexedDB && db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log('Poster deleted from IndexedDB');
        resolve();
      };
      request.onerror = () => {
        console.error('Failed to delete from IndexedDB:', request.error);
        // Fallback to localStorage
        deleteFromLocalStorage(id);
        resolve();
      };
    });
  } else {
    // Use localStorage
    deleteFromLocalStorage(id);
    return Promise.resolve();
  }
}

function deleteFromLocalStorage(id) {
  try {
    const posters = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) || '[]');
    const filtered = posters.filter(p => p.id !== id);
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(filtered));
    console.log('Poster deleted from localStorage');
  } catch (error) {
    console.error('Failed to delete from localStorage:', error);
  }
}

// Clear all posters
async function clearAllPosters() {
  if (!db && useIndexedDB) await initDB();
  
  if (useIndexedDB && db) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      
      request.onsuccess = () => {
        console.log('All posters cleared from IndexedDB');
        localStorage.removeItem(LOCALSTORAGE_KEY);
        resolve();
      };
      request.onerror = () => {
        console.error('Failed to clear IndexedDB:', request.error);
        localStorage.removeItem(LOCALSTORAGE_KEY);
        resolve();
      };
    });
  } else {
    // Use localStorage
    localStorage.removeItem(LOCALSTORAGE_KEY);
    return Promise.resolve();
  }
}

// Export for use in other scripts
window.PosterStorage = {
  initDB,
  savePoster,
  getAllPosters,
  getRecentPosters,
  deletePoster,
  clearAllPosters
};
