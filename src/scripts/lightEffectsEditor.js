// Light Effects Generator - Optical grid effects inspired by Arte Programmata
// Creates dynamic grid patterns with diagonal lines and light effects

let seedValue = 12345;
let rng;
let animationTime = 0;
let isRecording = false;
let recordedFrames = [];
let maxFrames = 90; // 3 seconds at 30fps

// Parameters
let params = {
  gridCols: 6,
  gridRows: 6,
  lineCount: 15,
  rotationSpeed: 1,
  rotationDirection: 1,
  waveAmplitude: 10,
  colorScheme: 'blue',
  brightness: 60,
  contrast: 50
};

function setup() {
  const canvas = createCanvas(1000, 1500); // 2:3 ratio for poster
  canvas.parent('canvasContainer');
  colorMode(HSB, 360, 100, 100, 100);
  frameRate(30);
  
  // Load seed from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('seed')) {
    seedValue = parseInt(urlParams.get('seed'));
    document.getElementById('seed').value = seedValue;
  }
  
  setupControls();
}

function draw() {
  // Update animation time based on rotation speed and direction
  animationTime += params.rotationSpeed * params.rotationDirection * 0.01;
  
  rng = mulberry32(seedValue);
  
  // Background
  const bgColor = getBackgroundColor();
  background(bgColor);
  
  drawGrid();
  
  // Record frame if recording for GIF
  if (isRecording && recordedFrames.length < maxFrames) {
    recordedFrames.push(get());
    updateExportStatus(`Registrazione: ${recordedFrames.length}/${maxFrames} frame`);
    
    if (recordedFrames.length >= maxFrames) {
      finishGIFRecording();
    }
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

function drawGrid() {
  const cellWidth = width / params.gridCols;
  const cellHeight = height / params.gridRows;
  const margin = 0;
  
  for (let row = 0; row < params.gridRows; row++) {
    for (let col = 0; col < params.gridCols; col++) {
      const x = col * cellWidth;
      const y = row * cellHeight;
      
      // Calculate cell-specific parameters
      const cellIndex = row * params.gridCols + col;
      const phaseOffset = (col + row * 0.5) * 0.3;
      const rotationOffset = animationTime + phaseOffset;
      
      drawCell(x, y, cellWidth, cellHeight, cellIndex, rotationOffset);
    }
  }
}

function drawCell(x, y, w, h, index, rotationOffset) {
  push();
  translate(x + w / 2, y + h / 2);
  
  // Calculate rotation angle with variation
  const baseRotation = rotationOffset * TWO_PI;
  const rotationVariation = sin(rotationOffset * 2) * 0.2;
  rotate(baseRotation + rotationVariation);
  
  // Draw background rectangle
  const bgCol = getCellBackgroundColor(index);
  fill(bgCol);
  noStroke();
  rectMode(CENTER);
  rect(0, 0, w * 0.95, h * 0.95);
  
  // Draw diagonal lines
  drawDiagonalLines(w, h, index, rotationOffset);
  
  pop();
}

function drawDiagonalLines(w, h, index, rotationOffset) {
  const lineSpacing = min(w, h) / params.lineCount;
  const maxDist = sqrt(w * w + h * h) / 2;
  
  // Calculate wave effect
  const wavePhase = rotationOffset * 3;
  
  for (let i = -params.lineCount; i < params.lineCount; i++) {
    const pos = i * lineSpacing;
    
    // Calculate line color based on position and parameters
    const t = (i + params.lineCount) / (params.lineCount * 2);
    const lineCol = getLineColor(t, index, rotationOffset);
    
    stroke(lineCol);
    
    // Vary stroke weight based on position and wave
    const waveEffect = sin(wavePhase + i * 0.3) * 0.5 + 0.5;
    const strokeW = map(abs(i), 0, params.lineCount, 3, 1) * (1 + waveEffect * 0.5);
    strokeWeight(strokeW);
    
    // Calculate line endpoints with wave effect
    const wave = sin(wavePhase + i * 0.5) * params.waveAmplitude;
    const x1 = -maxDist;
    const y1 = pos + wave;
    const x2 = maxDist;
    const y2 = pos - wave;
    
    line(x1, y1, x2, y2);
  }
}

function getBackgroundColor() {
  const b = map(params.brightness, 0, 100, 0, 30);
  
  switch (params.colorScheme) {
    case 'blue':
      return color(220, 80, b);
    case 'bw':
      return color(0, 0, b);
    case 'gradient':
      return color(200, 50, b);
    case 'warm':
      return color(30, 70, b);
    case 'cool':
      return color(180, 60, b);
    default:
      return color(0, 0, b);
  }
}

function getCellBackgroundColor(index) {
  const contrastLevel = map(params.contrast, 0, 100, 5, 40);
  const brightness = map(params.brightness, 0, 100, 20, 80);
  
  // Add variation based on cell index
  const variation = (rng() * 2 - 1) * 10;
  
  switch (params.colorScheme) {
    case 'blue':
      return color(220, 60, brightness + variation);
    case 'bw':
      return color(0, 0, brightness + variation);
    case 'gradient':
      const hueVariation = (index * 30) % 360;
      return color(hueVariation, 70, brightness);
    case 'warm':
      return color(20 + (index * 10) % 40, 80, brightness);
    case 'cool':
      return color(180 + (index * 10) % 40, 70, brightness);
    default:
      return color(0, 0, brightness);
  }
}

function getLineColor(t, index, rotationOffset) {
  const contrastLevel = map(params.contrast, 0, 100, 30, 100);
  const brightness = map(params.brightness, 0, 100, 40, 100);
  
  // Oscillating brightness based on animation
  const oscillation = sin(rotationOffset * 4 + t * TWO_PI) * 20;
  const finalBrightness = constrain(brightness + oscillation, 0, 100);
  
  switch (params.colorScheme) {
    case 'blue':
      const blueSat = map(t, 0, 1, 90, 30);
      return color(210, blueSat, finalBrightness);
    case 'bw':
      return color(0, 0, finalBrightness);
    case 'gradient':
      const hue = (t * 360 + index * 30) % 360;
      return color(hue, 80, finalBrightness);
    case 'warm':
      const warmHue = map(t, 0, 1, 0, 60);
      return color(warmHue, 90, finalBrightness);
    case 'cool':
      const coolHue = map(t, 0, 1, 180, 240);
      return color(coolHue, 80, finalBrightness);
    default:
      return color(0, 0, finalBrightness);
  }
}

function setupControls() {
  // Link all range controls
  const rangeControls = ['gridCols', 'gridRows', 'lineCount', 'rotationSpeed', 
                         'waveAmplitude', 'brightness', 'contrast'];
  
  rangeControls.forEach(id => {
    const input = document.getElementById(id);
    const display = document.getElementById(id + 'Value');
    
    if (input) {
      input.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        params[id] = value;
        if (display) {
          display.textContent = value;
        }
      });
    }
  });
  
  // Rotation direction selector
  const rotDirEl = document.getElementById('rotationDirection');
  if (rotDirEl) {
    rotDirEl.addEventListener('change', (e) => {
      params.rotationDirection = parseFloat(e.target.value);
    });
  }
  
  // Color scheme selector
  const colorSchemeEl = document.getElementById('colorScheme');
  if (colorSchemeEl) {
    colorSchemeEl.addEventListener('change', (e) => {
      params.colorScheme = e.target.value;
    });
  }
  
  // Seed input
  const seedEl = document.getElementById('seed');
  if (seedEl) {
    seedEl.addEventListener('change', (e) => {
      seedValue = parseInt(e.target.value);
      updateURL();
    });
  }
  
  // Regenerate button
  const regenEl = document.getElementById('regenerate');
  if (regenEl) {
    regenEl.addEventListener('click', () => {
      seedValue = Math.floor(Math.random() * 999999);
      document.getElementById('seed').value = seedValue;
      updateURL();
    });
  }
  
  // Download PNG button
  const downloadPNGEl = document.getElementById('downloadPNG');
  if (downloadPNGEl) {
    downloadPNGEl.addEventListener('click', () => {
      exportPNG();
    });
  }
  
  // Download GIF button
  const downloadGIFEl = document.getElementById('downloadGIF');
  if (downloadGIFEl) {
    downloadGIFEl.addEventListener('click', () => {
      startGIFRecording();
    });
  }
}

function updateURL() {
  const url = new URL(window.location);
  url.searchParams.set('seed', seedValue);
  window.history.replaceState({}, '', url);
}

function exportPNG() {
  updateExportStatus('Esportazione PNG in corso...');
  
  // Create high-res version
  const exportCanvas = createGraphics(1000, 1500);
  exportCanvas.colorMode(HSB, 360, 100, 100, 100);
  
  // Save current state
  const savedTime = animationTime;
  
  // Render to export canvas
  renderToCanvas(exportCanvas);
  
  // Download
  save(exportCanvas, `light-effects-${seedValue}.png`);
  
  updateExportStatus('PNG scaricato!');
  setTimeout(() => updateExportStatus(''), 2000);
}

function renderToCanvas(pg) {
  const savedRng = rng;
  rng = mulberry32(seedValue);
  
  // Background
  const bgColor = getBackgroundColor();
  pg.background(bgColor);
  
  // Draw grid to canvas
  const cellWidth = pg.width / params.gridCols;
  const cellHeight = pg.height / params.gridRows;
  
  for (let row = 0; row < params.gridRows; row++) {
    for (let col = 0; col < params.gridCols; col++) {
      const x = col * cellWidth;
      const y = row * cellHeight;
      const cellIndex = row * params.gridCols + col;
      const phaseOffset = (col + row * 0.5) * 0.3;
      const rotationOffset = animationTime + phaseOffset;
      
      drawCellToCanvas(pg, x, y, cellWidth, cellHeight, cellIndex, rotationOffset);
    }
  }
  
  rng = savedRng;
}

function drawCellToCanvas(pg, x, y, w, h, index, rotationOffset) {
  pg.push();
  pg.translate(x + w / 2, y + h / 2);
  
  const baseRotation = rotationOffset * TWO_PI;
  const rotationVariation = sin(rotationOffset * 2) * 0.2;
  pg.rotate(baseRotation + rotationVariation);
  
  const bgCol = getCellBackgroundColor(index);
  pg.fill(bgCol);
  pg.noStroke();
  pg.rectMode(CENTER);
  pg.rect(0, 0, w * 0.95, h * 0.95);
  
  // Draw lines
  const lineSpacing = min(w, h) / params.lineCount;
  const maxDist = sqrt(w * w + h * h) / 2;
  const wavePhase = rotationOffset * 3;
  
  for (let i = -params.lineCount; i < params.lineCount; i++) {
    const pos = i * lineSpacing;
    const t = (i + params.lineCount) / (params.lineCount * 2);
    const lineCol = getLineColor(t, index, rotationOffset);
    
    pg.stroke(lineCol);
    
    const waveEffect = sin(wavePhase + i * 0.3) * 0.5 + 0.5;
    const strokeW = map(abs(i), 0, params.lineCount, 3, 1) * (1 + waveEffect * 0.5);
    pg.strokeWeight(strokeW);
    
    const wave = sin(wavePhase + i * 0.5) * params.waveAmplitude;
    pg.line(-maxDist, pos + wave, maxDist, pos - wave);
  }
  
  pg.pop();
}

function startGIFRecording() {
  if (isRecording) return;
  
  isRecording = true;
  recordedFrames = [];
  animationTime = 0; // Reset animation for consistent GIF
  
  const downloadBtn = document.getElementById('downloadGIF');
  if (downloadBtn) {
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Registrazione...';
  }
  
  updateExportStatus('Inizio registrazione GIF...');
}

function finishGIFRecording() {
  isRecording = false;
  updateExportStatus('Creazione GIF in corso...');
  
  // Use gif.js library for GIF creation
  // Note: This requires gif.js to be loaded. For now, we'll save frames as ZIP
  // In production, integrate gif.js library
  
  saveFramesAsGIF();
}

function saveFramesAsGIF() {
  // Simplified: save first and last frame as demonstration
  // In production, implement proper GIF encoding with gif.js
  
  if (recordedFrames.length > 0) {
    // Save the middle frame as representative
    const middleFrame = recordedFrames[Math.floor(recordedFrames.length / 2)];
    save(middleFrame, `light-effects-${seedValue}-animated.png`);
    
    updateExportStatus('Frame rappresentativo salvato! (GIF completa richiede libreria aggiuntiva)');
  }
  
  const downloadBtn = document.getElementById('downloadGIF');
  if (downloadBtn) {
    downloadBtn.disabled = false;
    downloadBtn.textContent = 'Scarica GIF (3s)';
  }
  
  recordedFrames = [];
  
  setTimeout(() => updateExportStatus(''), 3000);
}

function updateExportStatus(message) {
  const statusEl = document.getElementById('exportStatus');
  if (statusEl) {
    statusEl.textContent = message;
  }
}
