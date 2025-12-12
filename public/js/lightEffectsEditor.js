
let seedValue = 12345;
let rng;

// Parameters
let params = {
  patternType: 'diagonal-grid',
  gridRows: 8,
  gridCols: 7,
  lineCount: 20,
  rotationAngle: 45,
  brightness: 85,
  depth: 50,
  colorScheme: 'green',
  animationSpeed: 0.3,
  perspective: 40
};

function setup() {
  const canvas = createCanvas(1000, 1500);
  canvas.parent('canvasContainer');
  colorMode(HSB, 360, 100, 100, 100);
  frameRate(30);
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('seed')) {
    seedValue = parseInt(urlParams.get('seed'));
    document.getElementById('seed').value = seedValue;
  }
  
  setupControls();
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function draw() {
  rng = mulberry32(seedValue);
  background(0);
  
  const time = frameCount * 0.01 * params.animationSpeed;
  
  switch(params.patternType) {
    case 'diagonal-grid':
      drawDiagonalGrid(time);
      break;
    case 'moire':
      drawMoireGrid(time);
      break;
  }
}

function drawDiagonalGrid(time) {
  const baseHue = getColorHue();
  const cellW = width / params.gridCols;
  const cellH = height / params.gridRows;
  
  blendMode(ADD);
  
  for (let row = 0; row < params.gridRows; row++) {
    for (let col = 0; col < params.gridCols; col++) {
      const x = col * cellW;
      const y = row * cellH;
      
      push();
      translate(x + cellW/2, y + cellH/2);
      
      // Animated rotation
      const rotationOffset = sin(time + row * 0.3 + col * 0.3) * 0.2;
      rotate(radians(params.rotationAngle + rotationOffset * 30));
      
      // Draw diagonal lines in cell
      const numLines = params.lineCount;
      const spacing = min(cellW, cellH) / numLines;
      
      for (let i = -numLines/2; i < numLines/2; i++) {
        const pos = i * spacing;
        const brightness = map(params.brightness, 0, 100, 40, 100);
        
        // Multiple layers for glow
        for (let layer = 2; layer >= 0; layer--) {
          const thickness = 1 + layer;
          const alpha = map(params.brightness, 0, 100, 8, 20) / (layer + 1);
          
          stroke(baseHue, 80, brightness, alpha);
          strokeWeight(thickness);
          line(-cellW, pos, cellW, pos);
        }
      }
      
      pop();
    }
  }
  
  blendMode(BLEND);
}

function drawMoireGrid(time) {
  const baseHue = getColorHue();
  const cellW = width / params.gridCols;
  const cellH = height / params.gridRows;
  
  background(0, 0, 10);
  
  for (let row = 0; row < params.gridRows; row++) {
    for (let col = 0; col < params.gridCols; col++) {
      const x = col * cellW;
      const y = row * cellH;
      
      push();
      translate(x + cellW/2, y + cellH/2);
      
      // Draw two overlapping line patterns
      const numLines = params.lineCount;
      const spacing = min(cellW, cellH) / numLines;
      
      // First layer - horizontal
      for (let i = -numLines/2; i < numLines/2; i++) {
        const pos = i * spacing;
        const brightness1 = map(params.brightness, 0, 100, 60, 100);
        
        stroke(0, 0, brightness1, 30);
        strokeWeight(2);
        line(-cellW/2, pos, cellW/2, pos);
      }
      
      // Second layer - vertical with rotation and animation
      push();
      rotate(radians(params.rotationAngle) + time * 0.5);
      
      for (let i = -numLines/2; i < numLines/2; i++) {
        const pos = i * spacing;
        const brightness2 = map(params.brightness, 0, 100, 60, 100);
        
        stroke(baseHue, 70, brightness2, 30);
        strokeWeight(2);
        line(-cellW/2, pos, cellW/2, pos);
      }
      
      pop();
      pop();
    }
  }
  
  // Add subtle glow where lines intersect
  blendMode(ADD);
  for (let row = 0; row < params.gridRows; row++) {
    for (let col = 0; col < params.gridCols; col++) {
      const x = col * cellW + cellW/2;
      const y = row * cellH + cellH/2;
      
      const glowSize = params.depth;
      for (let layer = 3; layer > 0; layer--) {
        const size = glowSize * (layer / 3);
        const alpha = 5 / layer;
        
        noStroke();
        fill(baseHue, 60, map(params.brightness, 0, 100, 70, 100), alpha);
        ellipse(x, y, size, size);
      }
    }
  }
  blendMode(BLEND);
}

function getColorHue() {
  switch (params.colorScheme) {
    case 'green': return 140;
    case 'blue': return 210;
    case 'cyan': return 180;
    case 'white': return 0;
    case 'yellow': return 60;
    case 'orange': return 30;
    default: return 140;
  }
}

function setupControls() {
  const rangeControls = ['gridRows', 'gridCols', 'lineCount', 'rotationAngle', 
                         'brightness', 'depth', 'animationSpeed', 'perspective'];
  
  rangeControls.forEach(id => {
    const input = document.getElementById(id);
    const display = document.getElementById(id + 'Value');
    
    if (input) {
      input.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        params[id] = value;
        if (display) {
          display.textContent = id === 'rotationAngle' ? value + '°' : value;
        }
      });
    }
  });
  
  const patternTypeEl = document.getElementById('patternType');
  if (patternTypeEl) {
    patternTypeEl.addEventListener('change', (e) => {
      params.patternType = e.target.value;
    });
  }
  
  const colorSchemeEl = document.getElementById('colorScheme');
  if (colorSchemeEl) {
    colorSchemeEl.addEventListener('change', (e) => {
      params.colorScheme = e.target.value;
    });
  }
  
  const seedEl = document.getElementById('seed');
  if (seedEl) {
    seedEl.addEventListener('change', (e) => {
      seedValue = parseInt(e.target.value);
      updateURL();
    });
  }
  
  const regenEl = document.getElementById('regenerate');
  if (regenEl) {
    regenEl.addEventListener('click', () => {
      seedValue = Math.floor(Math.random() * 999999);
      document.getElementById('seed').value = seedValue;
      updateURL();
    });
  }
  
  const downloadPNGEl = document.getElementById('downloadPNG');
  if (downloadPNGEl) {
    downloadPNGEl.addEventListener('click', () => {
      exportPNG();
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
  save(canvas, `light-effects-${seedValue}.png`);
  updateExportStatus('PNG scaricato!');
  setTimeout(() => updateExportStatus(''), 2000);
}

function updateExportStatus(message) {
  const statusEl = document.getElementById('exportStatus');
  if (statusEl) {
    statusEl.textContent = message;
  }
}