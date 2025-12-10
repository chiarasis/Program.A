// Moiré Pattern Generator - Optical interference inspired by Alberto Biasi
// Creates dynamic moiré effects with overlapping line patterns

let seedValue = 12345;
let rng;

// Parameters
let params = {
  lineCount: 80,
  lineSpacing: 8,
  rotation1: 0,
  rotation2: 15,
  waveAmplitude: 30,
  waveFrequency: 2,
  colorMode: 'bw',
  hue: 200
};

function setup() {
  const canvas = createCanvas(600, 900); // 2:3 ratio
  canvas.parent('canvasContainer');
  colorMode(HSB, 360, 100, 100, 100);
  
  // Load seed from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('seed')) {
    seedValue = parseInt(urlParams.get('seed'));
    document.getElementById('seed').value = seedValue;
  }
  
  setupControls();
  drawPattern();
  noLoop();
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
  rng = mulberry32(seedValue);
  background(255);
  
  push();
  translate(width / 2, height / 2);
  
  // Draw first layer
  drawLinePattern(params.rotation1, 0);
  
  // Draw second layer with blend mode
  blendMode(MULTIPLY);
  drawLinePattern(params.rotation2, params.waveAmplitude);
  blendMode(BLEND);
  
  pop();
}

function drawLinePattern(rotation, waveAmp) {
  push();
  rotate(radians(rotation));
  
  const spacing = params.lineSpacing;
  const totalLines = params.lineCount;
  const range = totalLines * spacing;
  
  for (let i = -totalLines / 2; i < totalLines / 2; i++) {
    const y = i * spacing;
    
    // Color calculation
    let col;
    if (params.colorMode === 'bw') {
      col = color(0, 0, 0);
    } else if (params.colorMode === 'gradient') {
      const t = map(i, -totalLines / 2, totalLines / 2, 0, 1);
      col = color(params.hue, 70, 100 - t * 50);
    } else { // interference
      const t = map(i, -totalLines / 2, totalLines / 2, 0, 360);
      col = color((params.hue + t) % 360, 80, 80);
    }
    
    stroke(col);
    strokeWeight(2);
    noFill();
    
    // Draw wavy line
    beginShape();
    for (let x = -width; x < width; x += 5) {
      const wave = sin((x + y) * 0.01 * params.waveFrequency) * waveAmp;
      vertex(x, y + wave);
    }
    endShape();
  }
  
  pop();
}

function setupControls() {
  // Link all controls
  const controls = ['lineCount', 'lineSpacing', 'rotation1', 'rotation2', 
                   'waveAmplitude', 'waveFrequency', 'hue'];
  
  controls.forEach(id => {
    const input = document.getElementById(id);
    const display = document.getElementById(id + 'Value');
    
    if (input) {
      input.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        params[id] = value;
        if (display) {
          display.textContent = id.includes('rotation') ? value + '°' : value;
        }
        drawPattern();
      });
    }
  });
  
  // Color mode selector
  const colorModeEl = document.getElementById('colorMode');
  if (colorModeEl) {
    colorModeEl.addEventListener('change', (e) => {
      params.colorMode = e.target.value;
      drawPattern();
    });
  }
  
  // Seed input
  const seedEl = document.getElementById('seed');
  if (seedEl) {
    seedEl.addEventListener('change', (e) => {
      seedValue = parseInt(e.target.value);
      drawPattern();
      updateURL();
    });
  }
  
  // Regenerate button
  const regenEl = document.getElementById('regenerate');
  if (regenEl) {
    regenEl.addEventListener('click', () => {
      seedValue = Math.floor(Math.random() * 999999);
      document.getElementById('seed').value = seedValue;
      drawPattern();
      updateURL();
    });
  }
  
  // Download button
  const downloadEl = document.getElementById('download');
  if (downloadEl) {
    downloadEl.addEventListener('click', () => {
      exportHighRes();
    });
  }
}

function updateURL() {
  const url = new URL(window.location);
  url.searchParams.set('seed', seedValue);
  window.history.replaceState({}, '', url);
}

function exportHighRes() {
  const scale = 3;
  const pg = createGraphics(width * scale, height * scale);
  
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.background(255);
  
  pg.push();
  pg.translate(pg.width / 2, pg.height / 2);
  pg.scale(scale);
  
  drawLayerToGraphics(pg, params.rotation1, 0);
  pg.blendMode(MULTIPLY);
  drawLayerToGraphics(pg, params.rotation2, params.waveAmplitude);
  pg.blendMode(BLEND);
  
  pg.pop();
  
  save(pg, `moire-pattern-${seedValue}.jpg`);
}

function drawLayerToGraphics(pg, rotation, waveAmp) {
  pg.push();
  pg.rotate(radians(rotation));
  
  const spacing = params.lineSpacing;
  const totalLines = params.lineCount;
  
  for (let i = -totalLines / 2; i < totalLines / 2; i++) {
    const y = i * spacing;
    
    let col;
    if (params.colorMode === 'bw') {
      col = color(0, 0, 0);
    } else if (params.colorMode === 'gradient') {
      const t = map(i, -totalLines / 2, totalLines / 2, 0, 1);
      col = color(params.hue, 70, 100 - t * 50);
    } else {
      const t = map(i, -totalLines / 2, totalLines / 2, 0, 360);
      col = color((params.hue + t) % 360, 80, 80);
    }
    
    pg.stroke(col);
    pg.strokeWeight(2);
    pg.noFill();
    
    pg.beginShape();
    for (let x = -pg.width / 2; x < pg.width / 2; x += 5) {
      const wave = sin((x + y) * 0.01 * params.waveFrequency) * waveAmp;
      pg.vertex(x, y + wave);
    }
    pg.endShape();
  }
  
  pg.pop();
}
