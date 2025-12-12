// Rombi editor - p5 sketch
// Preview canvas and controls. Export PNG (1000x1500) and short GIF if gif.js present.

let rotation = 0;
let params = {
  rotationSpeed: 0.0,
  lineCount: 120,
  strokeWeight: 1,
  scale: 1,
  colorMode: 'rgb',
  hue: 190
};

// pulsing gradient parameters
let pulse = 0;
params.pulseSpeed = 1;
params.pulseAmount = 0.25;

function setup() {
  const canvas = createCanvas(600, 900);
  canvas.parent('canvasContainer');
  colorMode(HSB, 360, 100, 100, 100);
  angleMode(DEGREES);

  setupControls();
}

function windowResized() {
  const container = document.getElementById('canvasContainer');
  const w = Math.min(900, Math.max(320, container.clientWidth || 600));
  const h = Math.round(w * 1.5);
  resizeCanvas(w, h);
}

function draw() {
  // black background (HSB: hue=0,sat=0,bright=0)
  background(0, 0, 0);
  push();
  translate(width / 2, height / 2);
  scale(params.scale);
  // compute pulse value in range [1 - pulseAmount, 1 + pulseAmount]
  pulse = map(sin(frameCount * params.pulseSpeed * 0.08), -1, 1, 1 - params.pulseAmount, 1 + params.pulseAmount);

  const total = params.lineCount;

  // hue shift over time for subtle animation of gradient
  const hueShift = (frameCount * 0.15) % 360;

  // Draw concentric filled diamond bands (outer to inner). Pulse affects size only.
  noStroke();
  // compute min/max sizes and per-band step (bands spacing independent from strokeWeight)
  const minSize = width * 0.02;
  const maxSize = min(width, height) * 0.95;
  const step = (maxSize - minSize) / Math.max(1, total);

  for (let i = total - 1; i >= 0; i--) {
    const t = i / total;
    const baseSize = minSize + i * step;
    const sz = baseSize * pulse; // pulsing expansion/contraction

    // RGB vibrant stroke for band (strokeWeight controls line thickness)
    const oscill = map(sin(i * 0.08 + frameCount * 0.02), -1, 1, -30, 30);
    const h = (params.hue + (1 - t) * 120 + oscill * pulse + hueShift) % 360;
    stroke(h, 100, 100);
    strokeWeight(params.strokeWeight);
    noFill();

    // draw diamond outline
    beginShape();
    vertex(-sz / 2, 0);
    vertex(0, -sz / 2);
    vertex(sz / 2, 0);
    vertex(0, sz / 2);
    endShape(CLOSE);
  }

  pop();
}

function min(a, b) { return a < b ? a : b; }

function setupControls() {
  const ids = ['rotationSpeed','lineCount','strokeWeight','scale','hue','pulseSpeed','pulseAmount'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    const disp = document.getElementById(id + 'Value');
    if (!el) return;
    const update = () => {
      const val = parseFloat(el.value);
      params[id] = val;
      if (disp) disp.textContent = val;
    };
    el.addEventListener('input', update);
    update();
  });

  const colorModeEl = document.getElementById('colorMode');
  if (colorModeEl) {
    colorModeEl.addEventListener('change', (e) => { params.colorMode = e.target.value; });
  }

  const toggle = document.getElementById('toggleAnimate');
  if (toggle) {
    toggle.addEventListener('click', () => {
      if (isLooping()) { noLoop(); toggle.textContent = 'Play'; }
      else { loop(); toggle.textContent = 'Pause'; }
    });
  }

  const pngBtn = document.getElementById('downloadPNG');
  if (pngBtn) pngBtn.addEventListener('click', exportPNG);

  const gifBtn = document.getElementById('downloadGIF');
  if (gifBtn) gifBtn.addEventListener('click', exportGIF);
}

function exportPNG() {
  // create high-res graphics 1000x1500
  const W = 1000;
  const H = 1500;
  const pg = createGraphics(W, H);
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.angleMode(DEGREES);
  pg.background(0, 0, 0);
  pg.push();
  pg.translate(W/2, H/2);
  pg.scale(params.scale * (W / width));

  // compute pulse for export using current time
  const now = Date.now();
  const pulseLocal = map(Math.sin(now * 0.001 * params.pulseSpeed), -1, 1, 1 - params.pulseAmount, 1 + params.pulseAmount);
  const hueShiftLocal = (now * 0.00015) % 360;

  for (let i = params.lineCount - 1; i >= 0; i--) {
    const t = i / params.lineCount;
    const maxSize = Math.min(W, H) * 0.95;
    const minSize = W * 0.02;
    const stepLocal = (maxSize - minSize) / Math.max(1, params.lineCount);
    const baseSize = minSize + i * stepLocal;
    const sz = baseSize * pulseLocal;

    pg.push();
    const oscill = Math.sin(i * 0.08 + now * 0.001 * 0.02) * 30;
    const h = (params.hue + (1 - t) * 120 + oscill * pulseLocal + hueShiftLocal) % 360;
    pg.stroke(h, 100, 100);
    pg.strokeWeight(params.strokeWeight * (W / width));
    pg.noFill();
    pg.beginShape();
    pg.vertex(-sz / 2, 0);
    pg.vertex(0, -sz / 2);
    pg.vertex(sz / 2, 0);
    pg.vertex(0, sz / 2);
    pg.endShape(CLOSE);
    pg.pop();
  }
  // restore default blend mode
  pg.blendMode(pg.BLEND);

  pg.pop();
  // save the graphics
  save(pg, `rombi-poster-${Date.now()}.png`);
}

function exportGIF() {
  // try to use gif.js if available; otherwise fallback to PNG
  if (typeof GIF === 'undefined') {
    // try to load gif.js dynamically
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/gif.js.optimized/dist/gif.min.js';
    s.onload = () => createGIF();
    s.onerror = () => { alert('GIF library failed to load — exporting PNG instead'); exportPNG(); };
    document.head.appendChild(s);
  } else {
    createGIF();
  }

  function createGIF() {
    const frames = 36; // short loop
    const w = 500; const h = 750; // smaller to keep size reasonable
    const off = createGraphics(w, h);
    off.colorMode(HSB, 360, 100, 100, 100);
    off.angleMode(DEGREES);

    const gif = new GIF({ workers: 2, quality: 10, width: w, height: h });

    let savedRotation = rotation;
    for (let f = 0; f < frames; f++) {
      off.push();
      off.background(0,0,0);
      off.translate(w/2, h/2);

      // pulse for this frame
      const pulseF = map(Math.sin((f / frames) * Math.PI * 2 * params.pulseSpeed), -1, 1, 1 - params.pulseAmount, 1 + params.pulseAmount);
      const hueF = (f * 0.5) % 360;

      for (let i = params.lineCount - 1; i >= 0; i--) {
        const t = i / params.lineCount;
        const maxSize = Math.min(w, h) * 0.95;
        const minSize = w * 0.02;
        const stepFrame = (maxSize - minSize) / Math.max(1, params.lineCount);
        const baseSize = minSize + i * stepFrame;
        const sz = baseSize * pulseF;

        off.push();
        const baseH = (params.hue + (1 - t) * 120 + hueF * 0.5) % 360;
        const oscill = Math.sin(i * 0.08 + f * 0.02) * 30;
        const h = (baseH + oscill * pulseF) % 360;
        off.stroke(h, 100, 100);
        off.strokeWeight(params.strokeWeight);
        off.noFill();
        off.beginShape();
        off.vertex(-sz / 2, 0);
        off.vertex(0, -sz / 2);
        off.vertex(sz / 2, 0);
        off.vertex(0, sz / 2);
        off.endShape(CLOSE);
        off.pop();
      }
      off.pop();
      off.blendMode(off.BLEND);
      gif.addFrame(off.canvas, {copy: true, delay: 30});
    }

    gif.on('finished', function(blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rombi-${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);
    });

    gif.render();
  }
}
