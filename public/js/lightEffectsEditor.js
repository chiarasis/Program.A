
let seedText = '';
let seedValue = 12345;
let rng;

// Parameters
let params = {
  patternType: 'diagonal-grid',
  gridRows: 8,
  gridCols: 7,
  lineCount: 20,
  rotationAngle: 45,
  hue: 120,
  bgHue: 0,
  depth: 50,
  animationSpeed: 0.3,
  perspective: 40
};

function setup() {
  const canvas = createCanvas(500, 750);
  canvas.parent('canvasContainer');
  colorMode(HSB, 360, 100, 100, 100);
  frameRate(30);
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('seed')) {
    seedText = urlParams.get('seed');
    seedValue = stringToSeed(seedText);
    document.getElementById('seed').value = seedText;
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
  
  const bgCol = getBgColor();
  background(bgCol);
  
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
  pg.text(`SEED: ${seedValue}`, 20 * scale, exportHeight - 20 * scale);
  
  // Bottom right: Editor name
  pg.textAlign(pg.RIGHT, pg.BOTTOM);
  pg.textSize(14 * scale);
  pg.text(editorName.toUpperCase(), exportWidth - 20 * scale, exportHeight - 20 * scale);
}

function drawDiagonalGrid(time) {
  const baseHue = params.hue;
  const cellW = width / params.gridCols;
  const cellH = height / params.gridRows;
  
  blendMode(BLEND);
  
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
        const brightness = 80;
        
        // Draw lines
        stroke(baseHue, 80, brightness);
        strokeWeight(0.8);
        line(-cellW, pos, cellW, pos);
      }
      
      pop();
    }
  }
}

function drawMoireGrid(time) {
  const baseHue = params.hue;
  const cellW = width / params.gridCols;
  const cellH = height / params.gridRows;
  
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
        const brightness1 = 80;
        
        stroke(0, 0, brightness1);
        strokeWeight(2);
        line(-cellW/2, pos, cellW/2, pos);
      }
      
      // Second layer - vertical with rotation and animation
      push();
      rotate(radians(params.rotationAngle) + time * 0.5);
      
      for (let i = -numLines/2; i < numLines/2; i++) {
        const pos = i * spacing;
        const brightness2 = 80;
        
        stroke(baseHue, 70, brightness2);
        strokeWeight(2);
        line(-cellW/2, pos, cellW/2, pos);
      }
      
      pop();
      pop();
    }
  }
}

function getColorHue() {
  return params.hue;
}

function getBgColor() {
  const h = params.bgHue;
  if (h === 0) return color(0, 0, 0); // black
  if (h === 360) return color(0, 0, 100); // white
  return color(h, 60, 30); // color with lower saturation/brightness
}

function setupControls() {
  const rangeControls = ['gridRows', 'gridCols', 'lineCount', 'rotationAngle', 
                         'depth', 'animationSpeed', 'perspective', 'hue', 'bgHue'];
  
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
  
  const seedEl = document.getElementById('seed');
  if (seedEl) {
    seedEl.addEventListener('change', (e) => {
      seedText = e.target.value;
      seedValue = stringToSeed(seedText);
      updateURL();
    });
  }
  
  const regenEl = document.getElementById('regenerate');
  if (regenEl) {
    regenEl.addEventListener('click', () => {
      seedValue = Math.floor(Math.random() * 999999);
      seedText = seedValue.toString();
      document.getElementById('seed').value = seedText;
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

function updateURL() {
  const url = new URL(window.location);
  url.searchParams.set('seed', seedText || seedValue);
  window.history.replaceState({}, '', url);
}

function exportPNG() {
  updateExportStatus('Esportazione PNG in corso...');
  const filename = `light-effects-${seedValue}.png`;
  
  // Create high-res graphics
  const pg = createGraphics(500, 750);
  pg.colorMode(HSB, 360, 100, 100, 100);
  pg.background(getBgColor());
  
  // Re-seed and redraw pattern at high resolution
  let rngLocal = mulberry32(seedValue);
  const time = frameCount * 0.01 * params.animationSpeed;
  
  // Temporarily override for redraw
  window.rngForExport = rngLocal;
  
  // Draw pattern based on current selection
  if (params.patternType === 'diagonal-grid') {
    drawDiagonalGridForExport(pg, time);
  } else {
    drawMoireGridForExport(pg, time);
  }
  
  drawPosterInfo(pg, 500, 750, 1, 'luce');
  const dataURL = pg.canvas.toDataURL('image/png');
  
  if (window.PosterStorage) {
    window.PosterStorage.savePoster(dataURL, {
      editor: 'luce',
      seed: seedText || seedValue.toString(),
      filename: filename,
      width: 500,
      height: 750
    }).then(() => {
      if (window.showDownloadSuccess) window.showDownloadSuccess('Effetti di Luce');
      updateExportStatus('PNG scaricato!');
      setTimeout(() => updateExportStatus(''), 2000);
    }).catch(err => {
      console.error('Failed to save poster:', err);
      updateExportStatus('PNG scaricato!');
      setTimeout(() => updateExportStatus(''), 2000);
    });
  } else {
    updateExportStatus('PNG scaricato!');
    setTimeout(() => updateExportStatus(''), 2000);
  }
  
  // Save using p5.js save function
  save(pg, filename);
}

function drawDiagonalGridForExport(pg, time) {
  const baseHue = params.hue;
  const cellW = 500 / params.gridCols;
  const cellH = 750 / params.gridRows;
  
  pg.blendMode(pg.ADD);
  
  for (let row = 0; row < params.gridRows; row++) {
    for (let col = 0; col < params.gridCols; col++) {
      const x = col * cellW;
      const y = row * cellH;
      
      pg.push();
      pg.translate(x + cellW/2, y + cellH/2);
      
      const rotationOffset = Math.sin(time + row * 0.3 + col * 0.3) * 0.2;
      const angleRad = (params.rotationAngle + rotationOffset * 30) * Math.PI / 180;
      pg.rotate(angleRad);
      
      const numLines = params.lineCount;
      const spacing = Math.min(cellW, cellH) / numLines;
      
      for (let i = -numLines/2; i < numLines/2; i++) {
        const pos = i * spacing;
        const brightness = 80;
        
        for (let layer = 2; layer >= 0; layer--) {
          const thickness = 1 + layer;
          const alpha = 15 / (layer + 1);
          
          pg.stroke(baseHue, 80, brightness, alpha);
          pg.strokeWeight(thickness);
          pg.line(-cellW, pos, cellW, pos);
        }
      }
      
      pg.pop();
    }
  }
  
  pg.blendMode(pg.BLEND);
}

function drawMoireGridForExport(pg, time) {
  const baseHue = params.hue;
  const cellW = 500 / params.gridCols;
  const cellH = 750 / params.gridRows;
  
  for (let row = 0; row < params.gridRows; row++) {
    for (let col = 0; col < params.gridCols; col++) {
      const x = col * cellW;
      const y = row * cellH;
      
      pg.push();
      pg.translate(x + cellW/2, y + cellH/2);
      
      const numLines = params.lineCount;
      const spacing = Math.min(cellW, cellH) / numLines;
      
      for (let i = -numLines/2; i < numLines/2; i++) {
        const pos = i * spacing;
        const brightness1 = 80;
        
        pg.stroke(0, 0, brightness1, 30);
        pg.strokeWeight(2);
        pg.line(-cellW/2, pos, cellW/2, pos);
      }
      
      pg.push();
      const rotAngleRad = params.rotationAngle * Math.PI / 180;
      pg.rotate(rotAngleRad + time * 0.5);
      
      for (let i = -numLines/2; i < numLines/2; i++) {
        const pos = i * spacing;
        const brightness2 = 80;
        
        pg.stroke(baseHue, 70, brightness2, 30);
        pg.strokeWeight(2);
        pg.line(-cellW/2, pos, cellW/2, pos);
      }
      
      pg.pop();
      pg.pop();
    }
  }
  
  pg.blendMode(pg.ADD);
  for (let row = 0; row < params.gridRows; row++) {
    for (let col = 0; col < params.gridCols; col++) {
      const x = col * cellW + cellW/2;
      const y = row * cellH + cellH/2;
      
      const glowSize = params.depth;
      for (let layer = 3; layer > 0; layer--) {
        const size = glowSize * (layer / 3);
        const alpha = 5 / layer;
        
        pg.noStroke();
        pg.fill(baseHue, 60, 85, alpha);
        pg.ellipse(x, y, size, size);
      }
    }
  }
  pg.blendMode(pg.BLEND);
}

function updateExportStatus(message) {
  const statusEl = document.getElementById('exportStatus');
  if (statusEl) {
    statusEl.textContent = message;
  }
}

window.addEventListener('load', setupControls);