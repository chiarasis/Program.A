// board.js - generates random poster images and provides pannable infinite board
const DEFAULT_COUNT = 200;

document.addEventListener('DOMContentLoaded', () => {
  const board = document.getElementById('board');
  const regenerateBtn = document.getElementById('regenerate-btn');
  const countInput = document.getElementById('count-input');
  const coordX = document.getElementById('coord-x');
  const coordY = document.getElementById('coord-y');

  let isDown = false;
  let startX = 0, startY = 0;
  let offsetX = 0, offsetY = 0;
  // initial center position (board is centered), so offsets start at 0

  // helper: set transform on board container
  function setBoardTransform(x, y) {
    board.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    coordX.textContent = Math.round(x);
    coordY.textContent = Math.round(y);
  }

  // pointer events for dragging
  const container = document.getElementById('board-container');
  container.addEventListener('pointerdown', (e) => {
    isDown = true;
    container.setPointerCapture(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    container.style.cursor = 'grabbing';
  });
  container.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setBoardTransform(offsetX + dx, offsetY + dy);
  });
  container.addEventListener('pointerup', (e) => {
    if (!isDown) return;
    isDown = false;
    offsetX = offsetX + (e.clientX - startX);
    offsetY = offsetY + (e.clientY - startY);
    container.releasePointerCapture(e.pointerId);
    container.style.cursor = 'default';
  });
  // pointercancel
  container.addEventListener('pointercancel', (e) => {
    isDown = false; container.style.cursor = 'default';
  });

  // wheel to pan vertically (and horizontally with shift)
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY || e.detail || e.wheelDelta;
    offsetY -= delta;
    if (e.shiftKey) { offsetX -= delta; }
    setBoardTransform(offsetX, offsetY);
  }, { passive: false });

  // keyboard navigation
  window.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 80 : 24;
    if (e.key === 'ArrowLeft' || e.key === 'a') { offsetX += step; }
    if (e.key === 'ArrowRight' || e.key === 'd') { offsetX -= step; }
    if (e.key === 'ArrowUp' || e.key === 'w') { offsetY += step; }
    if (e.key === 'ArrowDown' || e.key === 's') { offsetY -= step; }
    setBoardTransform(offsetX, offsetY);
  });

  // Create N posters randomly distributed across board area
  function generatePosters(count = DEFAULT_COUNT) {
    board.innerHTML = '';
    const boardRect = board.getBoundingClientRect();
    const bw = boardRect.width;
    const bh = boardRect.height;

    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'poster';
      // random position within the board
      const x = Math.floor(Math.random() * (bw - 300)) + 50;
      const y = Math.floor(Math.random() * (bh - 400)) + 50;
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;

      // generate poster image via canvas
      const img = document.createElement('img');
      img.alt = `Poster ${i + 1}`;
      // create a canvas and draw a randomized poster
      img.src = createPosterDataURL(680, 920, i);

      el.appendChild(img);
      board.appendChild(el);
    }
  }

  // Random poster generator - simple algorithmic posters (colors, rectangles, circles, random text)
  function createPosterDataURL(w = 400, h = 600, seed = 0) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');

    // deterministic-ish random using seed
    let s = (seed + Date.now()) % 100000;
    function rnd() { s = (s * 9301 + 49297) % 233280; return s / 233280; }

    // background
    const bgHue = Math.floor(rnd() * 360);
    ctx.fillStyle = `hsl(${bgHue} ${40 + Math.floor(rnd()*40)}% ${20 + Math.floor(rnd()*30)}%)`;
    ctx.fillRect(0,0,w,h);

    // layered shapes
    const shapes = 6 + Math.floor(rnd()*8);
    for (let i=0;i<shapes;i++){
      const type = Math.floor(rnd()*3);
      const rw = 40 + Math.floor(rnd()*(w*0.9));
      const rh = 20 + Math.floor(rnd()*(h*0.6));
      const rx = Math.floor(rnd()*(w - rw));
      const ry = Math.floor(rnd()*(h - rh));
      const hue = (bgHue + Math.floor(rnd()*180) + 30) % 360;
      const alpha = 0.12 + rnd()*0.6;
      ctx.fillStyle = `hsla(${hue}, ${30+Math.floor(rnd()*60)}%, ${40+Math.floor(rnd()*30)}%, ${alpha})`;
      if (type === 0) ctx.fillRect(rx,ry,rw,rh);
      else if (type === 1) { ctx.beginPath(); ctx.ellipse(rx+rw/2, ry+rh/2, rw/2, rh/2, 0, 0, Math.PI*2); ctx.fill(); }
      else { ctx.save(); ctx.translate(rx+rw/2, ry+rh/2); ctx.rotate(rnd()*Math.PI); ctx.fillRect(-rw/2, -rh/2, rw, rh); ctx.restore(); }
    }

    // add some noise lines
    for (let i=0;i<10;i++){
      ctx.strokeStyle = `hsla(${Math.floor(rnd()*360)},60%,70%,${0.06 + rnd()*0.12})`;
      ctx.lineWidth = 1 + rnd()*3;
      ctx.beginPath(); ctx.moveTo(rnd()*w, rnd()*h); ctx.lineTo(rnd()*w, rnd()*h); ctx.stroke();
    }

    // headline text
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `${36 + Math.floor(rnd()*28)}px serif`;
    ctx.textBaseline = 'top';
    const words = ['ARCHIVIO','PROGRAMMATO','POSTER','SERIE','FORMA','MOTO','CODICE','VISUAL'];
    const t = words[Math.floor(rnd()*words.length)];
    ctx.fillText(t, 20 + Math.floor(rnd()*40), 20 + Math.floor(rnd()*120));

    return c.toDataURL('image/jpeg', 0.85);
  }

  // initial generation
  generatePosters(parseInt(countInput.value || DEFAULT_COUNT, 10));

  // wire regenerate
  regenerateBtn.addEventListener('click', () => {
    offsetX = 0; offsetY = 0; setBoardTransform(0,0);
    const n = Math.max(20, Math.min(2000, parseInt(countInput.value || DEFAULT_COUNT,10)));
    generatePosters(n);
  });

  // small helper to center board on load
  setTimeout(()=> setBoardTransform(0,0), 60);
});
