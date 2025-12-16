// Poster Storage Utility - IndexedDB for user-generated posters
// Stores poster images and metadata for display in gallery

const DB_NAME = 'ProgramAPosters';
const DB_VERSION = 1;
const STORE_NAME = 'userPosters';

let db = null;

// Initialize IndexedDB
async function initDB() {
  return new Promise((resolve, reject) => {
    console.log('initDB called, db is:', db);
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => {
      console.error('initDB open error:', request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      db = request.result;
      console.log('initDB success, db opened:', DB_NAME);
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

// Save poster to IndexedDB
async function savePoster(dataURL, metadata = {}) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const poster = {
      dataURL,
      editor: metadata.editor || 'unknown',
      seed: metadata.seed || null,
      timestamp: Date.now(),
      filename: metadata.filename || `poster-${Date.now()}.png`,
      width: metadata.width || 1000,
      height: metadata.height || 1500
    };
    
    console.log('Saving poster to IndexedDB:', {
      editor: poster.editor,
      filename: poster.filename,
      dataURLLength: dataURL.length
    });
    
    const request = store.add(poster);
    
    request.onsuccess = () => {
      console.log('Poster saved successfully with ID:', request.result);
      resolve(request.result);
    };
    request.onerror = () => {
      console.error('Failed to save poster:', request.error);
      reject(request.error);
    };
  });
}

// Get all user posters
async function getAllPosters() {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        console.log('getAllPosters request.result:', request.result);
        console.log('Number of posters found:', request.result.length);
        resolve(request.result);
      };
      request.onerror = () => {
        console.error('getAllPosters request error:', request.error);
        reject(request.error);
      };
      
      transaction.onerror = () => {
        console.error('getAllPosters transaction error:', transaction.error);
        reject(transaction.error);
      };
    } catch (error) {
      console.error('getAllPosters exception:', error);
      reject(error);
    }
  });
}

// Get recent posters (last N)
async function getRecentPosters(count = 10) {
  const allPosters = await getAllPosters();
  return allPosters.sort((a, b) => b.timestamp - a.timestamp).slice(0, count);
}

// Delete a poster
async function deletePoster(id) {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Clear all posters
async function clearAllPosters() {
  if (!db) await initDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
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
