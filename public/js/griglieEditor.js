
// Griglie Editor - Animated overlapping line grids inspired by Italian Programmed Art
// Creates continuously animated line patterns that form moiré interference

let seedValue = 12345;
let seedText = '';
let rng;
let angle = 0;

// Parameters
let params = {
  rotationSpeed: 1,
  rotationDirection: 1,
  bgColor: 'black',
  lineColor: 'white',
  hue: 200,
  lineSpacing: 15,
  layerCount: 4,
  layerRotation: 45,
  gridSize: 1
};

// GIF recording
let gifRecorder;
let isRecordingGIF = false;
let gifFrames = [];
let gifFrameCount = 0;
const GIF_DURATION = 5; // seconds
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
  const bgCol = params.bgColor === 'black' ? color(0) : color(255);
  background(bgCol);
  
  // Line colors
  let lineCol;
  if (params.lineColor === 'black') {
    lineCol = color(0);
  } else if (params.lineColor === 'white') {
    lineCol = color(255);
  } else { // color
    lineCol = color(params.hue, 80, 90);
  }
  
  stroke(lineCol);
  strokeWeight(1.5);
  noFill();
  
  // Draw overlapping line layers
  push();
  translate(width / 2, height / 2);
  
  for (let layer = 0; layer < params.layerCount; layer++) {
    const baseOffset = layer * params.layerRotation * PI / 180;
    const randomOffset = (rng() - 0.5) * 0.3; // Random variation up to ±0.15 radians (~±8.6°)
    const layerAngle = angle + baseOffset + randomOffset;
    
    push();
    rotate(layerAngle);
    // Pass layer index for mixed mode pattern selection
    window.currentLayerIndex = layer;
    drawLineGrid();
    pop();
  }
  
  pop();
}

function drawLineGrid() {
  const maxDim = max(width, height);
  const spacing = params.lineSpacing * params.gridSize;
  
  // Mixed mode: first layer is circles, rest are lines
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
        line(-maxDim/2, pos, maxDim/2, pos);
      } else {
        // Vertical lines
        line(pos, -maxDim/2, pos, maxDim/2);
      }
    }
  }
  
  if (drawCircles) {
    // Circular/concentric lines
    const maxRadius = maxDim * 0.8;
    const count = floor(maxRadius / spacing);
    
    for (let i = 1; i <= count; i++) {
      const radius = i * spacing;
      ellipse(0, 0, radius * 2, radius * 2);
    }
  }
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
    hue: { display: true },
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
  
  // Background color
  const bgColorEl = document.getElementById('bgColor');
  if (bgColorEl) {
    bgColorEl.addEventListener('change', (e) => {
      params.bgColor = e.target.value;
    });
  }
  
  // Line color
  const lineColorEl = document.getElementById('lineColor');
  if (lineColorEl) {
    lineColorEl.addEventListener('change', (e) => {
      params.lineColor = e.target.value;
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
  btn.textContent = 'Recording...';
  btn.disabled = true;
  
  isRecordingGIF = true;
  gifFrames = [];
  gifFrameCount = 0;
  
  // Initialize GIF recorder - lower resolution for better performance
  gifRecorder = new GIF({
    workers: 1,
    quality: 20,
    width: 300,
    height: 450,
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
  // Capture frame at lower resolution
  if (isRecordingGIF && gifRecorder) {
    try {
      // Create a smaller canvas (300x450) from the main canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 300;
      tempCanvas.height = 450;
      const ctx = tempCanvas.getContext('2d');
      
      // Draw the p5 canvas onto the temp canvas (will scale automatically)
      const p5Canvas = canvas.elt || canvas.canvas || canvas;
      ctx.drawImage(p5Canvas, 0, 0, 300, 450);
      
      // Add the frame
      gifRecorder.addFrame(tempCanvas, {delay: 1000 / GIF_FPS});
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
  
  // Background
  const bgCol = params.bgColor === 'black' ? posterCanvas.color(0) : posterCanvas.color(255);
  posterCanvas.background(bgCol);
  
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
  const textCol = params.bgColor === 'black' ? 255 : 0; // Text color opposite of bg
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
  posterCanvas.text(`SEED: ${seedValue}`, 20 * scale, exportHeight - 20 * scale);
  
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
    }).catch(err => {
      console.error('Failed to save poster:', err);
    });
  }
  
  // Save the poster
  save(posterCanvas, filename);
}