// Poster Storage Utility - Netlify Functions + Blobs backend
// Drop-in replacement for previous Supabase client

const API_ENDPOINT = '/.netlify/functions/posters';

async function apiRequest(method, body) {
  const res = await fetch(API_ENDPOINT, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    console.error('Poster API error', res.status, await res.text());
    throw new Error('Poster API request failed');
  }

  return res.json();
}

async function initDB() {
  // No-op kept for compatibility
  return Promise.resolve();
}

async function savePoster(dataURL, metadata = {}) {
  const payload = {
    dataURL,
    editor: metadata.editor || 'unknown',
    seed: metadata.seed || null,
    timestamp: Date.now(),
    filename: metadata.filename || `poster-${Date.now()}.png`,
    width: metadata.width || 1000,
    height: metadata.height || 1500,
  };

  const { id } = await apiRequest('POST', payload);
  return id;
}

async function getAllPosters() {
  const { posters } = await apiRequest('GET');
  return posters || [];
}

async function getRecentPosters(count = 10) {
  const { posters } = await apiRequest('GET');
  return (posters || []).slice(0, count);
}

async function deletePoster(id) {
  await apiRequest('DELETE', { id });
}

window.PosterStorage = {
  initDB,
  savePoster,
  getAllPosters,
  getRecentPosters,
  deletePoster,
};
