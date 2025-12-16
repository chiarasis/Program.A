// Infinite Gallery Navigation System
// Pan with smooth momentum, double-click to overview
// Loads user-generated posters from IndexedDB

console.log('infiniteGallery.js script loaded');

let canvas;
let container;
let isDragging = false;
let startX = 0;
let startY = 0;
let translateX = 0;
let translateY = 0;
let scale = 1;
let currentX = 0;
let currentY = 0;

// Momentum/inertia
let velocityX = 0;
let velocityY = 0;
let lastMoveX = 0;
let lastMoveY = 0;
let lastMoveTime = 0;
const FRICTION = 0.92;
const VELOCITY_THRESHOLD = 0.5;

// Double click to toggle overview
let clickCount = 0;
let clickTimer = null;
const CLICK_DELAY = 400; // ms
let isOverviewMode = false;
let savedViewState = { x: 0, y: 0, scale: 1 };

const MIN_SCALE = 0.3;
const MAX_SCALE = 2;
const ZOOM_AMOUNT = 0.5;

async function init() {
  console.log('init() called');
  canvas = document.getElementById('canvas');
  container = document.getElementById('postersContainer');
  
  console.log('canvas:', canvas, 'container:', container);
  
  if (!canvas || !container) {
    console.error('Canvas or container not found!');
    return;
  }

  // Load posters from IndexedDB
  await loadUserPosters();

  // Center view on start
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  translateX = centerX - 1200;
  translateY = centerY - 600;
  updateTransform();

  console.log('About to setupEventListeners');
  setupEventListeners();
  console.log('Event listeners setup complete');
  startMomentumLoop();
}

async function loadUserPosters() {
  try {
    // Initialize storage and get all posters
    if (!window.PosterStorage) {
      console.error('PosterStorage not available');
      showEmptyState();
      return;
    }

    await window.PosterStorage.initDB();
    const posters = await window.PosterStorage.getAllPosters();
    
    console.log('Loaded posters from IndexedDB:', posters);
    
    if (!posters || posters.length === 0) {
      console.log('No posters found, showing empty state');
      showEmptyState();
      updatePosterCount(0);
      return;
    }

    // Hide empty state
    const emptyState = document.getElementById('emptyGallery');
    if (emptyState) emptyState.style.display = 'none';

    // Randomize layout for posters across a large space
    // Jittered grid layout: evenly spaced cells with random offsets
    const count = posters.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const cellW = 480; // base horizontal spacing
    const cellH = 600; // base vertical spacing
    const jitterX = 180; // random horizontal jitter
    const jitterY = 180; // random vertical jitter

    // Center the grid around (0,0)
    const totalW = cols * cellW;
    const totalH = rows * cellH;
    const originX = -totalW / 2;
    const originY = -totalH / 2;

    posters.forEach((poster, index) => {
      const c = index % cols;
      const r = Math.floor(index / cols);
      const baseX = originX + c * cellW;
      const baseY = originY + r * cellH;

      const randX = baseX + (Math.random() * 2 - 1) * jitterX;
      const randY = baseY + (Math.random() * 2 - 1) * jitterY;

      console.log(`Creating poster card ${index} at (${Math.round(randX)}, ${Math.round(randY)}):`, poster);
      createPosterCard(poster, Math.round(randX), Math.round(randY));
    });

    updatePosterCount(posters.length);
  } catch (error) {
    console.error('Failed to load posters:', error);
    showEmptyState();
  }
}

function createPosterCard(poster, x, y) {
  const card = document.createElement('div');
  card.className = 'poster-card';
  card.dataset.id = poster.id;
  card.dataset.editor = poster.editor;
  card.style.left = `${x}px`;
  card.style.top = `${y}px`;

  const editorName = poster.editor.charAt(0).toUpperCase() + poster.editor.slice(1);
  const date = new Date(poster.timestamp).toLocaleDateString('it-IT');

  card.innerHTML = `
    <div class="poster-preview">
      <img 
        src="${poster.dataURL}"
        alt="${poster.filename}"
        loading="lazy"
        class="poster-image"
      />
    </div>
    <div class="poster-info">
      <h3>${editorName}</h3>
      <p>${date}</p>
        ${poster.seed ? `<p class="poster-seed">Seed: ${poster.seed}</p>` : ''}
      <button class="delete-btn" data-poster-id="${poster.id}">Elimina</button>
    </div>
  `;

  // Add delete handler
  const deleteBtn = card.querySelector('.delete-btn');
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    deletePoster(poster.id);
  });

  container.appendChild(card);
}

async function deletePoster(posterId) {
  if (!confirm('Eliminare questo poster?')) return;
  
  try {
    await window.PosterStorage.deletePoster(posterId);
    
    // Remove from DOM
    const card = container.querySelector(`[data-id="${posterId}"]`);
    if (card) card.remove();
    
    // Update count
    const remainingCards = container.querySelectorAll('.poster-card');
    updatePosterCount(remainingCards.length);
    
    if (remainingCards.length === 0) {
      showEmptyState();
    }
  } catch (error) {
    console.error('Failed to delete poster:', error);
    alert('Errore durante l\'eliminazione del poster');
  }
}

function showEmptyState() {
  const emptyState = document.getElementById('emptyGallery');
  if (emptyState) emptyState.style.display = 'flex';
}

function updatePosterCount(count) {
  const countEl = document.getElementById('posterCount');
  if (countEl) {
    countEl.textContent = `${count} generazioni`;
  }
}

function setupEventListeners() {
  console.log('setupEventListeners() called');
  
  // Mouse drag (for mouse users)
  console.log('Attaching mouse events to canvas:', canvas);
  canvas.addEventListener('mousedown', handleDragStart);
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);

  // Double click for overview toggle
  canvas.addEventListener('click', handleDoubleClick);

  // Touch support (mobile)
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleDragEnd);

  // Trackpad/wheel scroll for panning (no click needed)
  canvas.addEventListener('wheel', handleWheelPan, { passive: false });

  // UI Controls
  document.getElementById('resetView')?.addEventListener('click', resetView);
  document.getElementById('zoomIn')?.addEventListener('click', () => zoomIn());
  document.getElementById('zoomOut')?.addEventListener('click', () => zoomOut());

  // Prevent context menu
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleDoubleClick(e) {
  clickCount++;
  
  if (clickTimer) clearTimeout(clickTimer);
  
  if (clickCount === 2) {
    // Double click detected - toggle overview
    toggleOverview();
    clickCount = 0;
  } else {
    clickTimer = setTimeout(() => {
      clickCount = 0;
    }, CLICK_DELAY);
  }
}

function toggleOverview() {
  if (isOverviewMode) {
    // Return to saved view
    translateX = savedViewState.x;
    translateY = savedViewState.y;
    scale = savedViewState.scale;
    isOverviewMode = false;
  } else {
    // Save current view
    savedViewState = {
      x: translateX,
      y: translateY,
      scale: scale
    };
    
    // Calculate overview: fit all posters in view
    const viewWidth = window.innerWidth;
    const viewHeight = window.innerHeight;
    
    // Posters span approximately 8 columns × 7 rows (50 posters)
    const contentWidth = 6400;
    const contentHeight = 5600;
    
    const scaleX = viewWidth / (contentWidth + 800);
    const scaleY = viewHeight / (contentHeight + 800);
    const targetScale = Math.min(scaleX, scaleY, 0.3);
    
    const centerX = viewWidth / 2;
    const centerY = viewHeight / 2;
    
    translateX = centerX - (contentWidth / 2) * targetScale;
    translateY = centerY - (contentHeight / 2) * targetScale;
    scale = targetScale;
    
    isOverviewMode = true;
  }
  
  velocityX = 0;
  velocityY = 0;
  container.style.transition = 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
  updateTransform();
  updatePositionDisplay();
  
  setTimeout(() => {
    container.style.transition = '';
  }, 600);
}

function handleDragStart(e) {
  isDragging = true;
  startX = e.clientX - translateX;
  startY = e.clientY - translateY;
  lastMoveX = e.clientX;
  lastMoveY = e.clientY;
  lastMoveTime = Date.now();
  velocityX = 0;
  velocityY = 0;
  canvas.style.cursor = 'grabbing';
  document.body.classList.add('dragging');
}

function handleTouchStart(e) {
  if (e.touches.length === 1) {
    e.preventDefault();
    isDragging = true;
    const touch = e.touches[0];
    startX = touch.clientX - translateX;
    startY = touch.clientY - translateY;
    lastMoveX = touch.clientX;
    lastMoveY = touch.clientY;
    lastMoveTime = Date.now();
    velocityX = 0;
    velocityY = 0;
  }
}

function handleDragMove(e) {
  if (!isDragging) return;
  
  e.preventDefault();
  const now = Date.now();
  const dt = now - lastMoveTime;
  
  currentX = e.clientX - startX;
  currentY = e.clientY - startY;
  
  if (dt > 0) {
    velocityX = (e.clientX - lastMoveX) / dt * 16;
    velocityY = (e.clientY - lastMoveY) / dt * 16;
  }
  
  translateX = currentX;
  translateY = currentY;
  
  lastMoveX = e.clientX;
  lastMoveY = e.clientY;
  lastMoveTime = now;
  
  updateTransform();
  updatePositionDisplay();
}

function handleTouchMove(e) {
  if (!isDragging || e.touches.length !== 1) return;
  
  e.preventDefault();
  const touch = e.touches[0];
  const now = Date.now();
  const dt = now - lastMoveTime;
  
  currentX = touch.clientX - startX;
  currentY = touch.clientY - startY;
  
  if (dt > 0) {
    velocityX = (touch.clientX - lastMoveX) / dt * 16;
    velocityY = (touch.clientY - lastMoveY) / dt * 16;
  }
  
  translateX = currentX;
  translateY = currentY;
  
  lastMoveX = touch.clientX;
  lastMoveY = touch.clientY;
  lastMoveTime = now;
  
  updateTransform();
  updatePositionDisplay();
}

function handleDragEnd() {
  isDragging = false;
  canvas.style.cursor = 'grab';
  document.body.classList.remove('dragging');
}

function handleWheelPan(e) {
  e.preventDefault();

  // Pinch-zoom on macOS trackpads triggers wheel events with ctrlKey=true
  if (e.ctrlKey) {
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const zoomDelta = -e.deltaY * 0.005; // invert: pinch-out -> zoom in
    zoomToPoint(mouseX, mouseY, zoomDelta);
    return;
  }
  
  const deltaX = e.deltaX;
  const deltaY = e.deltaY;
  
  translateX -= deltaX;
  translateY -= deltaY;
  
  velocityX = -deltaX * 0.5;
  velocityY = -deltaY * 0.5;
  
  updateTransform();
  updatePositionDisplay();
}

function startMomentumLoop() {
  function animate() {
    if (!isDragging && (Math.abs(velocityX) > VELOCITY_THRESHOLD || Math.abs(velocityY) > VELOCITY_THRESHOLD)) {
      translateX += velocityX;
      translateY += velocityY;
      
      velocityX *= FRICTION;
      velocityY *= FRICTION;
      
      updateTransform();
      updatePositionDisplay();
    }
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

function zoomToPoint(pointX, pointY, delta) {
  const beforeX = (pointX - translateX) / scale;
  const beforeY = (pointY - translateY) / scale;
  
  const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale + delta));
  
  if (newScale !== scale) {
    scale = newScale;
    translateX = pointX - beforeX * scale;
    translateY = pointY - beforeY * scale;
    
    updateTransform();
    updatePositionDisplay();
  }
}

function zoomIn() {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  zoomToPoint(centerX, centerY, ZOOM_AMOUNT);
}

function zoomOut() {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  zoomToPoint(centerX, centerY, -ZOOM_AMOUNT);
}

function resetView() {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  
  translateX = centerX - 1200;
  translateY = centerY - 600;
  scale = 1;
  velocityX = 0;
  velocityY = 0;
  
  container.style.transition = 'transform 0.5s ease-out';
  updateTransform();
  
  setTimeout(() => {
    container.style.transition = '';
  }, 500);
  
  updatePositionDisplay();
}

function updateTransform() {
  if (!container) return;
  container.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
}

function updatePositionDisplay() {
  const posDisplay = document.getElementById('position');
  if (posDisplay) {
    const x = Math.round(-translateX / scale);
    const y = Math.round(-translateY / scale);
    posDisplay.textContent = `X: ${x}, Y: ${y} • Zoom: ${Math.round(scale * 100)}%`;
  }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  const step = 50;
  
  switch(e.key) {
    case 'ArrowLeft':
      translateX += step;
      velocityX = 0;
      break;
    case 'ArrowRight':
      translateX -= step;
      velocityX = 0;
      break;
    case 'ArrowUp':
      translateY += step;
      velocityY = 0;
      break;
    case 'ArrowDown':
      translateY -= step;
      velocityY = 0;
      break;
    case '+':
    case '=':
      zoomIn();
      return;
    case '-':
      zoomOut();
      return;
    case '0':
      resetView();
      return;
    default:
      return;
  }
  
  updateTransform();
  updatePositionDisplay();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
