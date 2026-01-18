import { getStore } from '@netlify/blobs';

const STORE = getStore({ name: 'posters' });
const BLOB_KEY = 'posters.json';
const MAX_POSTERS = 200;

async function readPosters() {
  const existing = await STORE.get(BLOB_KEY, { type: 'json' });
  return Array.isArray(existing) ? existing : [];
}

async function writePosters(posters) {
  await STORE.setJSON(BLOB_KEY, posters);
}

export default async function handler(request) {
  try {
    const method = request.method;

    if (method === 'OPTIONS') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET') {
      const posters = await readPosters();
      const sorted = posters.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return new Response(JSON.stringify({ posters: sorted }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'POST') {
      const bodyText = await request.text();
      const payload = bodyText ? JSON.parse(bodyText) : {};
      if (!payload.dataURL) {
        return new Response(JSON.stringify({ error: 'Missing dataURL' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const posters = await readPosters();
      const id = crypto.randomUUID();
      const entry = {
        id,
        dataURL: payload.dataURL,
        editor: payload.editor || 'unknown',
        seed: payload.seed || null,
        timestamp: payload.timestamp || Date.now(),
        filename: payload.filename || `poster-${Date.now()}.png`,
        width: payload.width || 1000,
        height: payload.height || 1500,
      };

      const updated = [entry, ...posters].slice(0, MAX_POSTERS);
      await writePosters(updated);
      return new Response(JSON.stringify({ id }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'DELETE') {
      const bodyText = await request.text();
      const payload = bodyText ? JSON.parse(bodyText) : {};
      if (!payload.id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const posters = await readPosters();
      const filtered = posters.filter((p) => p.id !== payload.id);
      await writePosters(filtered);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Poster function error', err);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
