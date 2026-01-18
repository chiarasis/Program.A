import createSketch from '/js/p5-sketch.mjs';

// Ensure script runs only in browser and that p5 library is loaded before creating sketch
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    const container = document.getElementById('p5-root');
    if (!container) return;

    // full size container - confined to hero section
    container.style.position = 'absolute';
    container.style.left = '0';
    container.style.top = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '0';
    container.style.pointerEvents = 'auto';

    function runSketch() {
      try {
        window.__p5Instance = createSketch(container);
      } catch (err) {
        // fail silently but log to console for debugging
        // eslint-disable-next-line no-console
        console.error('Failed to start p5 sketch:', err);
      }
    }

    // If p5 already loaded globally, just run
    if (window.p5) {
      runSketch();
      return;
    }

    // Otherwise inject p5 script and run after load
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/p5@1.6.0/lib/p5.min.js';
    script.async = false;
    script.defer = false;
    script.onload = () => runSketch();
    script.onerror = (e) => console.error('Failed to load p5 library', e);
    document.head.appendChild(script);
  });
}
