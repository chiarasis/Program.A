// gallery.js - lightweight filter + lightbox
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.gallery-grid');
  const cards = Array.from(document.querySelectorAll('.gallery-card'));
  const filterBtns = Array.from(document.querySelectorAll('.filter-btn'));
  const searchInput = document.getElementById('gallery-search');

  // Filter behavior
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tag = btn.dataset.filter;
      cards.forEach(card => {
        if (tag === '*' || card.dataset.tags.includes(tag)) card.style.display = '';
        else card.style.display = 'none';
      });
    });
  });

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      cards.forEach(card => {
        const title = (card.dataset.title || '').toLowerCase();
        const tags = (card.dataset.tags || '').toLowerCase();
        if (!q || title.includes(q) || tags.includes(q)) card.style.display = '';
        else card.style.display = 'none';
      });
    });
  }

  // Interactive viewer / lightbox
  // We'll open a full-screen viewer that allows scrubbing through visible images by moving the mouse horizontally
  const lightbox = document.getElementById('gallery-lightbox');
  const lbImg = document.getElementById('lightbox-image');
  const lbTitle = document.getElementById('lightbox-title');
  const lbDesc = document.getElementById('lightbox-desc');
  const lbClose = document.querySelector('.lightbox-close');

  // Build viewer elements (viewer is separate visual layer; keep existing lightbox for fallback)
  const viewer = document.createElement('div');
  viewer.className = 'viewer';
  viewer.setAttribute('aria-hidden', 'true');
  viewer.innerHTML = `
    <div class="viewer-inner">
      <img id="viewer-image" class="viewer-image" src="" alt="">
      <div class="viewer-hint">Sposta il mouse orizzontalmente per sfogliare</div>
    </div>
  `;
  document.body.appendChild(viewer);
  const viewerImage = document.getElementById('viewer-image');

  let visibleCards = cards.slice();
  let images = visibleCards.map(c => c.dataset.large || c.querySelector('img')?.src);
  let currentIndex = 0;
  let raf = null;

  function refreshVisible() {
    visibleCards = cards.filter(c => c.style.display !== 'none');
    images = visibleCards.map(c => c.dataset.large || c.querySelector('img')?.src);
  }

  function openViewer(startCard) {
    refreshVisible();
    const startIdx = visibleCards.indexOf(startCard);
    currentIndex = startIdx >= 0 ? startIdx : 0;
    setIndex(currentIndex);
    viewer.setAttribute('aria-hidden', 'false');
    // attach mousemove handler
    viewer.addEventListener('mousemove', onViewerMove);
    viewer.addEventListener('click', onViewerClick);
    document.addEventListener('keydown', onKey);
  }

  function closeViewer() {
    viewer.setAttribute('aria-hidden', 'true');
    viewerImage.src = '';
    viewer.removeEventListener('mousemove', onViewerMove);
    viewer.removeEventListener('click', onViewerClick);
    document.removeEventListener('keydown', onKey);
  }

  function setIndex(i) {
    if (!images || images.length === 0) return;
    const idx = Math.max(0, Math.min(images.length - 1, Math.floor(i)));
    if (idx === currentIndex) return;
    currentIndex = idx;
    viewerImage.src = images[currentIndex];
    // also update existing lightbox fields for accessibility
    const c = visibleCards[currentIndex];
    if (c) {
      lbTitle.textContent = c.dataset.title || '';
      lbDesc.textContent = c.dataset.caption || '';
    }
  }

  function onViewerMove(e) {
    // throttle via rAF
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      const rect = viewer.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const pct = x / rect.width;
      const idx = Math.floor(pct * images.length);
      if (idx !== currentIndex) {
        viewerImage.src = images[idx];
        currentIndex = idx;
      }
    });
  }

  function onViewerClick(e) {
    // click toggles close if clicked near top-right close area, otherwise nothing
    // we keep simple: clicking outside image closes
    if (e.target === viewer) closeViewer();
  }

  function onKey(e) {
    if (e.key === 'Escape') closeViewer();
    if (e.key === 'ArrowRight') { setIndex(currentIndex + 1); }
    if (e.key === 'ArrowLeft') { setIndex(currentIndex - 1); }
  }

  // Fallback lightbox (click a card to open viewer)
  cards.forEach(card => {
    card.addEventListener('click', (ev) => {
      ev.preventDefault();
      openViewer(card);
    });
  });

  // keep the existing close button behavior attached to the lightbox DOM if present
  if (lbClose) {
    lbClose.addEventListener('click', () => {
      closeViewer();
      lightbox.setAttribute('aria-hidden', 'true');
    });
  }

  // clicking outside image in old lightbox closes it
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) lightbox.setAttribute('aria-hidden', 'true');
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (viewer.getAttribute('aria-hidden') === 'false') closeViewer();
    }
  });
});
