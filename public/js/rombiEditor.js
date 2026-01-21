// Rombi editor - p5 sketch
// Preview canvas and controls. Export PNG (500x750) and short GIF if gif.js present.

const BASE_WIDTH = 500;  // Base export width
const BASE_HEIGHT = 750; // Base export height

let seedValue = 12345;
let seedText = '';
let rotation = 0;

function stringToSeed(str) {
  if (!str) return 12345;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

let params = {
  rotationSpeed: 0.0,
  lineCount: 60,
  strokeWeight: 1,
  scale: 1,
  hue: 190,
  bgHue: 0,
  pulseSpeed: 1,
  pulseAmount: 0.25,
  mouseForce: 15,
  mouseRadius: 150
};

// Mouse interaction
let warpTrail = [];
const WARP_FADE_MS = 250;

// Download helper to keep PNG exports reliable across repeated clicks
function downloadCanvas(canvas, filename, mime = 'image/png') {
  const link = document.createElement('a');
  link.download = filename;
  if (canvas.toBlob) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }, mime, 0.95);
  } else {
    const dataURL = canvas.toDataURL(mime, 0.95);
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

function setup() {
  const canvas = createCanvas(500, 750);
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
  const bgCol = getBgColor();
  background(bgCol);
  
  // Update mouse warp trail
  const now = millis();
  updateWarpTrail(now);
  const activeTrail = getWarpTrail(now);
  
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
  const maxSize = min(width, height) * 0.65; // Reduced from 0.95 to fit properly
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

    // Draw diamond with optional warp
    beginShape();
    const p0 = warpPoint(-sz / 2, 0, activeTrail);
    vertex(p0.x, p0.y);
    const p1 = warpPoint(0, -sz / 2, activeTrail);
    vertex(p1.x, p1.y);
    const p2 = warpPoint(sz / 2, 0, activeTrail);
    vertex(p2.x, p2.y);
    const p3 = warpPoint(0, sz / 2, activeTrail);
    vertex(p3.x, p3.y);
    endShape(CLOSE);
  }

  pop();
}

function updateWarpTrail(now) {
  if (!mouseIsPressed) {
    warpTrail = [];
    return;
  }
  const mx = mouseX - width / 2;
  const my = mouseY - height / 2;
  warpTrail.push({ x: mx, y: my, time: now });
  if (warpTrail.length > 120) warpTrail.shift();
  warpTrail = warpTrail.filter(w => now - w.time <= WARP_FADE_MS);
}

function getWarpTrail(now) {
  return warpTrail.map(w => {
    const age = now - w.time;
    const intensity = max(0, 1 - age / WARP_FADE_MS);
    return { x: w.x, y: w.y, intensity };
  }).filter(w => w.intensity > 0);
}

function warpPoint(x, y, sources) {
  if (!sources || sources.length === 0 || params.mouseForce <= 0 || params.mouseRadius <= 0) {
    return { x, y };
  }
  let bestForce = 0;
  let bestDx = 0;
  let bestDy = 0;
  for (const s of sources) {
    const dx = x - s.x;
    const dy = y - s.y;
    const dist = sqrt(dx * dx + dy * dy);
    if (dist > params.mouseRadius || dist < 1e-6) continue;
    const falloff = 1 - dist / params.mouseRadius;
    const force = params.mouseForce * falloff * falloff * s.intensity;
    const normForce = force / dist;
    if (normForce > bestForce) {
      bestForce = normForce;
      bestDx = dx;
      bestDy = dy;
    }
  }
  if (bestForce === 0) {
    return { x, y };
  }
  return { x: x + bestDx * bestForce, y: y + bestDy * bestForce };
}

function min(a, b) { return a < b ? a : b; }

function getBgColor() {
  const h = params.bgHue;
  if (h === 0) return color(0, 0, 0); // black
  if (h === 360) return color(0, 0, 100); // white
  return color(h, 60, 30); // color with lower saturation/brightness
}

function setupControls() {
  const ids = ['rotationSpeed','lineCount','strokeWeight','scale','hue','bgHue','pulseSpeed','pulseAmount','mouseForce','mouseRadius'];
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

  // Seed controls
  const seedEl = document.getElementById('seed');
  if (seedEl) {
    seedEl.addEventListener('change', (e) => {
      seedText = e.target.value;
      seedValue = stringToSeed(seedText);
    });
  }

  const regenEl = document.getElementById('regenerate');
  if (regenEl) {
    regenEl.addEventListener('click', () => {
      seedValue = Math.floor(Math.random() * 999999);
      seedText = seedValue.toString();
      if (seedEl) seedEl.value = seedText;
    });
  }
}

function drawPosterInfo(pg, exportWidth, exportHeight, scale, editorName) {
  const textCol = 255; // White text
  pg.fill(textCol);
  pg.noStroke();
  pg.textFont('monospace');
  
  // Top left: Program.A logo
  pg.textAlign(pg.LEFT, pg.TOP);
  pg.textSize(16 * scale);
  pg.text('Program.A', 20 * scale, 20 * scale);
  
  // Top right: Date
  pg.textAlign(pg.RIGHT, pg.TOP);
  pg.textSize(12 * scale);
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  pg.text(dateStr, exportWidth - 20 * scale, 20 * scale);
  
  // Bottom left: Seed info
  pg.textAlign(pg.LEFT, pg.BOTTOM);
  pg.textSize(10 * scale);
  const userLabel = (seedText && seedText.trim()) ? seedText.trim() : seedValue.toString();
  pg.text(userLabel, 20 * scale, exportHeight - 20 * scale);
  
  // Bottom right: Editor name
  pg.textAlign(pg.RIGHT, pg.BOTTOM);
  pg.textSize(14 * scale);
  pg.text(editorName.toUpperCase(), exportWidth - 20 * scale, exportHeight - 20 * scale);
}



function exportPNG() {
  // create high-res graphics 500x750
  const W = 500;
  const H = 750;
  const pg = createGraphics(W, H);
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.angleMode(DEGREES);
  // Match preview background (HSB): 0 = black, 360 = white, else hue with low saturation/brightness
  if (params.bgHue === 0) {
    pg.background(0, 0, 0);
  } else if (params.bgHue === 360) {
    pg.background(0, 0, 100);
  } else {
    pg.background(params.bgHue, 60, 30);
  }
  pg.push();
  pg.translate(W/2, H/2);
  const pngScaleFactor = W / width;
  pg.scale(params.scale * pngScaleFactor);

  // compute pulse for export using current time
  const now = Date.now();
  const pulseLocal = map(Math.sin(now * 0.001 * params.pulseSpeed), -1, 1, 1 - params.pulseAmount, 1 + params.pulseAmount);
  const hueShiftLocal = (now * 0.00015) % 360;

  for (let i = params.lineCount - 1; i >= 0; i--) {
    const t = i / params.lineCount;
    const maxSize = Math.min(W, H) * 0.65;
    const minSize = W * 0.02;
    const stepLocal = (maxSize - minSize) / Math.max(1, params.lineCount);
    const baseSize = minSize + i * stepLocal;
    const sz = baseSize * pulseLocal;

    pg.push();
    const oscill = Math.sin(i * 0.08 + now * 0.001 * 0.02) * 30;
    const h = (params.hue + (1 - t) * 120 + oscill * pulseLocal + hueShiftLocal) % 360;
    pg.stroke(h, 100, 100);
    pg.strokeWeight(params.strokeWeight * pngScaleFactor);
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
  
  // Add info overlay
  drawPosterInfo(pg, W, H, 1, 'rombi');
  
  // Get canvas data URL for storage
  const dataURL = pg.canvas.toDataURL('image/png');
  const filename = `rombi-poster-${seedValue}.png`;
  
  // Save to IndexedDB
  if (window.PosterStorage) {
    window.PosterStorage.savePoster(dataURL, {
      editor: 'rombi',
      seed: seedText || seedValue.toString(),
      filename: filename,
      width: W,
      height: H
    }).then(() => {
      // Show success notification with gallery link
      if (window.showDownloadSuccess) {
        window.showDownloadSuccess('Rombi');
      }
    }).catch(err => {
      console.error('Failed to save poster:', err);
    });
  }

  // Single, reliable download trigger
  downloadCanvas(pg.canvas, filename);
}

function exportGIF() {
  console.log('exportGIF chiamata');
  const btn = document.getElementById('downloadGIF');
  if (btn) {
    btn.textContent = 'Generando GIF...';
    btn.disabled = true;
  }
  
  // Check if GIF library is available
  if (typeof GIF === 'undefined') {
    console.error('GIF library non definita');
    alert('Libreria GIF non disponibile');
    if (btn) {
      btn.textContent = 'Scarica GIF';
      btn.disabled = false;
    }
    return;
  }
  
  console.log('Creazione GIF avviata');
  createGIF();

  function createGIF() {
    console.log('createGIF interno avviato');
    const frames = 60;
    const W = 500; 
    const H = 750;
    const off = createGraphics(W, H);
    off.colorMode(HSB, 360, 100, 100, 100);
    off.angleMode(DEGREES);

    const gif = new GIF({ workers: 2, quality: 5, width: W, height: H, workerScript: '/gif.worker.js' });
    console.log('GIF instance creata');

    for (let f = 0; f < frames; f++) {
      // Background color (match preview)
      const bgCol = getBgColor();
      if (params.bgHue === 0) {
        off.background(0, 0, 0);
      } else if (params.bgHue === 360) {
        off.background(0, 0, 100);
      } else {
        off.background(params.bgHue, 60, 30);
      }
      
      off.push();
      off.translate(W/2, H/2);
      off.scale(params.scale);

      // pulse for this frame
      const pulseF = map(Math.sin((f / frames) * Math.PI * 2 * params.pulseSpeed), -1, 1, 1 - params.pulseAmount, 1 + params.pulseAmount);
      const hueF = (f * 0.5) % 360;

      // Use same size calculations as preview (based on canvas dimensions)
      const minSize = W * 0.02;
      const maxSize = Math.min(W, H) * 0.65;
      const stepFrame = (maxSize - minSize) / Math.max(1, params.lineCount);

      for (let i = params.lineCount - 1; i >= 0; i--) {
        const t = i / params.lineCount;
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
      
      // Add poster info overlay to each frame
      drawPosterInfo(off, W, H, 1, 'rombi');
      
      gif.addFrame(off.canvas, {copy: true, delay: 33});
    }

    gif.on('finished', function(blob) {
      console.log('GIF completata, download in corso');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rombi-${Date.now()}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      
      const btn = document.getElementById('downloadGIF');
      if (btn) {
        btn.textContent = 'Scarica GIF';
        btn.disabled = false;
      }
    });
    
    gif.on('error', function(error) {
      console.error('Errore GIF:', error);
      const btn = document.getElementById('downloadGIF');
      if (btn) {
        btn.textContent = 'Errore - Riprova';
        btn.disabled = false;
      }
    });

    console.log('Rendering GIF...');
    gif.render();
  }
}
