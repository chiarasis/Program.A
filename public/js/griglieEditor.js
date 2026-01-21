
// Griglie Editor - Animated overlapping line grids inspired by Italian Programmed Art
// Creates continuously animated line patterns that form moiré interference

let seedValue = 12345;
let seedText = '';
let rng;
let angle = 0;

function getUserLabel() {
  const t = (seedText || '').trim();
  return t || seedValue.toString();
}

// Parameters
let params = {
  rotationSpeed: 1,
  rotationDirection: 1,
  hue: 200,
  bgHue: 0,
  lineSpacing: 15,
  layerCount: 4,
  layerRotation: 45,
  gridSize: 1,
  mouseForce: 12,
  mouseRadius: 200
};

const WARP_FADE_MS = 250;
let warpTrail = [];

// GIF recording
let gifRecorder;
let isRecordingGIF = false;
let gifFrames = [];
let gifFrameCount = 0;
const GIF_DURATION = 4; // seconds - reduced for faster generation
const GIF_FPS = 15; // Reduced FPS for smoother animation

function setup() {
  const canvas = createCanvas(500, 750); // 2:3 ratio, fits viewport
  canvas.parent('canvasContainer');
  colorMode(HSB, 360, 100, 100, 100);
  
  // Load seed from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('seed')) {
    seedText = urlParams.get('seed');
    seedValue = stringToSeed(seedText);
    document.getElementById('seed').value = seedText;
  }
  
  setupControls();
}

function draw() {
  rng = mulberry32(seedValue);
  
  // Continuous rotation
  angle += params.rotationSpeed * params.rotationDirection * 0.01;
  
  drawPattern();
  
  // GIF recording
  if (isRecordingGIF && gifFrameCount < GIF_FPS * GIF_DURATION) {
    captureGIFFrame();
  } else if (isRecordingGIF && gifFrameCount >= GIF_FPS * GIF_DURATION) {
    finishGIF();
  }
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function drawPattern() {
  // Background
  const bgCol = getBgColor();
  background(bgCol);
  
  // Line colors
  const lineCol = getColor();
  
  stroke(lineCol);
  strokeWeight(1.5);
  noFill();
  
  // Draw overlapping line layers
  push();
  translate(width / 2, height / 2);

  // Mouse position relative to center
  const mx = mouseX - width / 2;
  const my = mouseY - height / 2;

  const now = millis();
  updateWarpTrail(mx, my, now);
  const activeTrail = getWarpTrail(now);
  
  for (let layer = 0; layer < params.layerCount; layer++) {
    const baseOffset = layer * params.layerRotation * PI / 180;
    const randomOffset = (rng() - 0.5) * 0.3; // Random variation up to ±0.15 radians (~±8.6°)
    const layerAngle = angle + baseOffset + randomOffset;
    
    // Rotate mouse into layer space to keep interaction aligned after rotation
    const layerTrail = activeTrail.map(w => rotatePointWithIntensity(w, -layerAngle));
    push();
    rotate(layerAngle);
    // Pass layer index for mixed mode pattern selection
    window.currentLayerIndex = layer;
    drawLineGrid(layerTrail);
    pop();
  }
  
  pop();
}

function rotatePoint(x, y, angle) {
  const cosA = cos(angle);
  const sinA = sin(angle);
  return {
    x: x * cosA - y * sinA,
    y: x * sinA + y * cosA
  };
}

function rotatePointWithIntensity(pt, angle) {
  const rotated = rotatePoint(pt.x, pt.y, angle);
  return { x: rotated.x, y: rotated.y, intensity: pt.intensity };
}

function updateWarpTrail(mx, my, now) {
  if (!mouseIsPressed) {
    warpTrail = [];
    return;
  }
  warpTrail.push({ x: mx, y: my, time: now });
  if (warpTrail.length > 120) warpTrail.shift();
  // Drop expired points
  warpTrail = warpTrail.filter(w => now - w.time <= WARP_FADE_MS);
}

function getWarpTrail(now) {
  return warpTrail.map(w => {
    const age = now - w.time;
    const intensity = max(0, 1 - age / WARP_FADE_MS);
    return { x: w.x, y: w.y, intensity };
  }).filter(w => w.intensity > 0);
}

function getColor() {
  const h = params.hue;
  if (h === 0) return color(0, 0, 0); // black
  if (h === 360) return color(0, 0, 100); // white
  return color(h, 80, 90); // color with saturation
}

function getBgColor() {
  const h = params.bgHue;
  if (h === 0) return color(0, 0, 0); // black
  if (h === 360) return color(0, 0, 100); // white
  return color(h, 60, 30); // color with lower saturation/brightness
}

function drawLineGrid(warpSources) {
  const maxDim = max(width, height);
  const spacing = params.lineSpacing * params.gridSize;
  const segment = max(6, spacing * 0.5);

  const layerIndex = window.currentLayerIndex || 0;
  const drawCircles = (layerIndex === 0);
  const drawLines = (layerIndex !== 0);
  
  if (drawLines) {
    // Lines: horizontal or vertical
    const linePattern = floor(rng() * 2); // 0=horizontal, 1=vertical
    const count = floor(maxDim / spacing) + 2;
    const offset = -maxDim / 2;
    
    for (let i = 0; i < count; i++) {
      const pos = offset + i * spacing;
      if (linePattern === 0) {
        // Horizontal lines
        beginShape();
        for (let x = -maxDim/2; x <= maxDim/2; x += segment) {
          const offsetY = liquifyOffsetAt(x, pos, warpSources, 'y');
          vertex(x, pos + offsetY);
        }
        // Ensure the endpoint lands on the canvas edge
        const offsetEdgeY = liquifyOffsetAt(maxDim/2, pos, warpSources, 'y');
        vertex(maxDim/2, pos + offsetEdgeY);
        endShape();
      } else {
        // Vertical lines
        beginShape();
        for (let y = -maxDim/2; y <= maxDim/2; y += segment) {
          const offsetX = liquifyOffsetAt(pos, y, warpSources, 'x');
          vertex(pos + offsetX, y);
        }
        const offsetEdgeX = liquifyOffsetAt(pos, maxDim/2, warpSources, 'x');
        vertex(pos + offsetEdgeX, maxDim/2);
        endShape();
      }
    }
  }
  
  if (drawCircles) {
    // Circular/concentric lines
    const maxRadius = maxDim * 0.8;
    const count = floor(maxRadius / spacing);
    
    for (let i = 1; i <= count; i++) {
      const radius = i * spacing;
      const steps = max(32, floor((TWO_PI * radius) / segment));
      beginShape();
      for (let s = 0; s <= steps; s++) {
        const a = (s / steps) * TWO_PI;
        const px = cos(a) * radius;
        const py = sin(a) * radius;
        const offset = liquifyOffsetAt(px, py, warpSources, 'both');
        const ox = px + offset.x;
        const oy = py + offset.y;
        vertex(ox, oy);
      }
      endShape();
    }
  }
}

function liquifyOffsetAt(x, y, sources, axis) {
  if (!sources || sources.length === 0 || params.mouseForce <= 0 || params.mouseRadius <= 0) {
    if (axis === 'both') return { x: 0, y: 0 };
    return 0;
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
    if (axis === 'both') return { x: 0, y: 0 };
    return 0;
  }
  if (axis === 'x') return bestDx * bestForce;
  if (axis === 'y') return bestDy * bestForce;
  return { x: bestDx * bestForce, y: bestDy * bestForce };
}

function drawLineGridToGraphics(pg, w, h) {
  // Normalize to preview size to maintain consistent pattern
  const previewHeight = 750;
  const scale = h / previewHeight;
  const spacing = params.lineSpacing * params.gridSize * scale;
  
  const maxDim = max(w, h);
  
  // Mixed mode: first layer is circles, rest are lines
  const layerIndex = window.currentLayerIndexGIF || 0;
  const drawCircles = (layerIndex === 0);
  const drawLines = (layerIndex !== 0);
  
  if (drawLines) {
    // Lines: horizontal or vertical
    const linePattern = floor(rng() * 2); // 0=horizontal, 1=vertical
    const count = floor(maxDim / spacing) + 2;
    const offset = -maxDim / 2;
    
    for (let i = 0; i < count; i++) {
      const pos = offset + i * spacing;
      if (linePattern === 0) {
        // Horizontal lines
        pg.line(-maxDim/2, pos, maxDim/2, pos);
      } else {
        // Vertical lines
        pg.line(pos, -maxDim/2, pos, maxDim/2);
      }
    }
  }
  
  if (drawCircles) {
    // Circular/concentric lines
    const maxRadius = maxDim * 0.8;
    const count = floor(maxRadius / spacing);
    
    for (let i = 1; i <= count; i++) {
      const radius = i * spacing;
      pg.ellipse(0, 0, radius * 2, radius * 2);
    }
  }
}

function setupControls() {
  // Link all controls
  const controls = {
    gridSize: { display: true, decimals: 1 },
    rotationSpeed: { display: true, decimals: 1 },
    mouseForce: { display: true },
    mouseRadius: { display: true },
    hue: { display: true },
    bgHue: { display: true },
    lineSpacing: { display: true },
    layerCount: { display: true },
    layerRotation: { display: true }
  };
  
  Object.keys(controls).forEach(id => {
    const input = document.getElementById(id);
    const display = document.getElementById(id + 'Value');
    
    if (input) {
      input.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        params[id] = value;
        if (display) {
          const decimals = controls[id].decimals || 0;
          display.textContent = value.toFixed(decimals);
        }
      });
    }
  });
  // Pattern type select
  const patternTypeEl = document.getElementById('patternType');
  if (patternTypeEl) {
    patternTypeEl.addEventListener('change', (e) => {
      params.patternType = e.target.value;
    });
  }
  
  // Rotation direction
  const directionEl = document.getElementById('rotationDirection');
  if (directionEl) {
    directionEl.addEventListener('change', (e) => {
      params.rotationDirection = parseInt(e.target.value);
    });
  }
  
  // Seed input (accepts text, converts to number)
  const seedEl = document.getElementById('seed');
  if (seedEl) {
    seedEl.addEventListener('change', (e) => {
      seedText = e.target.value;
      seedValue = stringToSeed(seedText);
      updateURL();
    });
  }
  
  // Regenerate button
  const regenEl = document.getElementById('regenerate');
  if (regenEl) {
    regenEl.addEventListener('click', () => {
      seedValue = Math.floor(Math.random() * 999999);
      seedText = seedValue.toString();
      document.getElementById('seed').value = seedText;
      updateURL();
    });
  }
  
  // Download PNG button
  const downloadPNGEl = document.getElementById('downloadPNG');
  if (downloadPNGEl) {
    downloadPNGEl.addEventListener('click', () => {
      exportPosterWithFrame();
    });
  }
  
  // Download GIF button
  const downloadGIFEl = document.getElementById('downloadGIF');
  if (downloadGIFEl) {
    downloadGIFEl.addEventListener('click', startGIFRecording);
  }
}

function stringToSeed(str) {
  // Convert any string to a numeric seed
  if (!str) return 12345;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function updateURL() {
  const url = new URL(window.location);
  url.searchParams.set('seed', seedText || seedValue);
  window.history.replaceState({}, '', url);
}

function startGIFRecording() {
  if (isRecordingGIF) return;
  
  const btn = document.getElementById('downloadGIF');
  btn.textContent = 'Registrando... Interagisci con il mouse!';
  btn.disabled = true;
  
  isRecordingGIF = true;
  gifFrames = [];
  gifFrameCount = 0;
  
  // Initialize GIF recorder with balanced quality
  gifRecorder = new GIF({
    workers: 2,
    quality: 5,
    width: 800,
    height: 1200,
    workerScript: '/gif.worker.js'
  });
  
  gifRecorder.on('finished', function(blob) {
    console.log('GIF ready, downloading');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `griglie-${seedValue}.gif`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Save current canvas as PNG (GIF too large)
    if (window.PosterStorage) {
      const snapshot = get();
      const pg = createGraphics(800, 1200);
      pg.image(snapshot, 0, 0, 800, 1200);
      
      // Add overlay
      const scale = 800 / 500;
      pg.fill(255);
      pg.noStroke();
      pg.textFont('monospace');
      pg.textAlign(LEFT, TOP);
      pg.textSize(16 * scale);
      pg.text('Program.A', 20 * scale, 20 * scale);
      pg.textAlign(RIGHT, TOP);
      pg.textSize(12 * scale);
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      pg.text(dateStr, 800 - 20 * scale, 20 * scale);
      pg.textAlign(LEFT, BOTTOM);
      pg.textSize(10 * scale);
      const userLabel = (seedText && seedText.trim()) ? seedText.trim() : seedValue.toString();
      pg.text(userLabel, 20 * scale, 1200 - 20 * scale);
      pg.textAlign(RIGHT, BOTTOM);
      pg.textSize(14 * scale);
      pg.text('GRIGLIE', 800 - 20 * scale, 1200 - 20 * scale);
      
      const dataURL = pg.canvas.toDataURL('image/png');
      window.PosterStorage.savePoster(dataURL, {
        editor: 'griglie',
        seed: seedText || seedValue.toString(),
        filename: `griglie-${Date.now()}.png`,
        width: 800,
        height: 1200
      }).then(() => {
        if (window.showDownloadSuccess) window.showDownloadSuccess('Griglie GIF');
        setTimeout(() => { window.location.href = '/public-work/'; }, 2000);
      }).catch(err => console.error('Failed to save poster:', err));
    }
    
    setTimeout(() => {
      URL.revokeObjectURL(url);
      btn.textContent = 'Scarica GIF (5s)';
      btn.disabled = false;
    }, 500);
  });
  
  gifRecorder.on('error', function(error) {
    console.error('GIF Error:', error);
    btn.textContent = 'Errore GIF';
    btn.disabled = false;
    isRecordingGIF = false;
  });
}

function captureGIFFrame() {
  // Capture frame at balanced resolution
  if (isRecordingGIF && gifRecorder) {
    try {
      // Create a canvas (800x1200) from the main canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 800;
      tempCanvas.height = 1200;
      const ctx = tempCanvas.getContext('2d');
      
      // Draw the p5 canvas onto the temp canvas (will scale automatically)
      const p5Canvas = canvas.elt || canvas.canvas || canvas;
      ctx.drawImage(p5Canvas, 0, 0, 800, 1200);
      
      // Add poster info overlay
      const scale = 800 / 500;
      ctx.fillStyle = 'white';
      ctx.font = `${16 * scale}px monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Program.A', 20 * scale, 20 * scale);
      
      // Date
      ctx.textAlign = 'right';
      ctx.font = `${12 * scale}px monospace`;
      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
      ctx.fillText(dateStr, 800 - 20 * scale, 20 * scale);
      
      // Bottom left: Seed
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.font = `${10 * scale}px monospace`;
      const userLabel = (seedText && seedText.trim()) ? seedText.trim() : seedValue.toString();
      ctx.fillText(userLabel, 20 * scale, 1200 - 20 * scale);
      
      // Bottom right: Editor name
      ctx.textAlign = 'right';
      ctx.font = `${14 * scale}px monospace`;
      ctx.fillText('GRIGLIE', 800 - 20 * scale, 1200 - 20 * scale);
      
      // Add the frame with 30ms delay for faster playback
      gifRecorder.addFrame(tempCanvas, {delay: 30});
      gifFrameCount++;
    } catch (e) {
      console.error('Error capturing frame:', e);
    }
  }
}

function finishGIF() {
  if (isRecordingGIF && gifRecorder) {
    console.log('Rendering GIF with', gifFrameCount, 'frames');
    isRecordingGIF = false;
    gifRecorder.render();
  }
}

function exportPosterWithFrame() {
  // Export at 2x resolution (1000x1500) showing same content as preview (500x750)
  const exportWidth = 1000;
  const exportHeight = 1500;
  const scale = exportWidth / 500; // Scale factor
  
  const posterCanvas = createGraphics(exportWidth, exportHeight);
  posterCanvas.colorMode(HSB, 360, 100, 100, 100);
  
  // Background (match preview hue control)
  if (params.bgHue === 0) {
    posterCanvas.background(0, 0, 0);
  } else if (params.bgHue === 360) {
    posterCanvas.background(0, 0, 100);
  } else {
    posterCanvas.background(params.bgHue, 60, 30);
  }
  
  // Line colors
  let lineCol;
  if (params.lineColor === 'black') {
    lineCol = posterCanvas.color(0);
  } else if (params.lineColor === 'white') {
    lineCol = posterCanvas.color(255);
  } else {
    lineCol = posterCanvas.color(params.hue, 80, 90);
  }
  
  posterCanvas.stroke(lineCol);
  posterCanvas.strokeWeight(1.5 * scale);
  posterCanvas.noFill();
  
  // Draw overlapping line layers
  posterCanvas.push();
  posterCanvas.translate(exportWidth / 2, exportHeight / 2);
  
  for (let layer = 0; layer < params.layerCount; layer++) {
    const baseOffset = layer * params.layerRotation * PI / 180;
    const randomOffset = (rng() - 0.5) * 0.3;
    const layerAngle = baseOffset + randomOffset;
    
    posterCanvas.push();
    posterCanvas.rotate(layerAngle);
    // Pass layer index for mixed mode pattern selection
    window.currentLayerIndexGIF = layer;
    drawLineGridToGraphics(posterCanvas, exportWidth, exportHeight);
    posterCanvas.pop();
  }
  
  posterCanvas.pop();
  
  // Add overlaid text information
  // Text color: choose contrast based on background hue
  const textCol = (params.bgHue === 0) ? 255 : (params.bgHue === 360 ? 0 : 255);
  posterCanvas.fill(textCol);
  posterCanvas.noStroke();
  posterCanvas.textAlign(LEFT, TOP);
  posterCanvas.textSize(12 * scale);
  posterCanvas.textFont('monospace');
  
  // Top left: Program.A logo
  posterCanvas.textAlign(LEFT, TOP);
  posterCanvas.textSize(16 * scale);
  posterCanvas.text('Program.A', 20 * scale, 20 * scale);
  
  // Top right: Date
  posterCanvas.textAlign(RIGHT, TOP);
  posterCanvas.textSize(12 * scale);
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  posterCanvas.text(dateStr, exportWidth - 20 * scale, 20 * scale);
  
  // Bottom left: Seed info
  posterCanvas.textAlign(LEFT, BOTTOM);
  posterCanvas.textSize(10 * scale);
  posterCanvas.text(getUserLabel(), 20 * scale, exportHeight - 20 * scale);
  
  // Bottom right: Griglie
  posterCanvas.textAlign(RIGHT, BOTTOM);
  posterCanvas.textSize(14 * scale);
  posterCanvas.text('GRIGLIE', exportWidth - 20 * scale, exportHeight - 20 * scale);
  
  // Get canvas data URL for storage
  const dataURL = posterCanvas.canvas.toDataURL('image/png');
  const filename = `griglie-poster-${seedValue}.png`;
  
  // Save to IndexedDB
  if (window.PosterStorage) {
    window.PosterStorage.savePoster(dataURL, {
      editor: 'griglie',
      seed: seedText || seedValue.toString(),
      filename: filename,
      width: exportWidth,
      height: exportHeight
    }).then(() => {
      // Show success notification with gallery link
      if (window.showDownloadSuccess) {
        window.showDownloadSuccess('Griglie');
      }
      // Redirect to gallery after 2 seconds
      setTimeout(() => {
        window.location.href = '/public-work/';
      }, 2000);
    }).catch(err => {
      console.error('Failed to save poster:', err);
    });
  }
  
  // Save the poster
  save(posterCanvas, filename);
}