
let seedText = '';
let seedValue = 12345;
let rng;

// Download helper to ensure stable, single download per click
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
  perspective: 40,
  mouseForce: 12,
  mouseRadius: 200
};

// Mouse interaction
let warpTrail = [];
const WARP_FADE_MS = 250;

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
  
  // Update mouse warp trail
  const now = millis();
  updateWarpTrail(now);
  const activeTrail = getWarpTrail(now);
  
  const time = frameCount * 0.01 * params.animationSpeed;
  
  switch(params.patternType) {
    case 'diagonal-grid':
      drawDiagonalGrid(time, activeTrail);
      break;
    case 'moire':
      drawMoireGrid(time, activeTrail);
      break;
  }
}

function updateWarpTrail(now) {
  if (!mouseIsPressed) {
    warpTrail = [];
    return;
  }
  warpTrail.push({ x: mouseX, y: mouseY, time: now });
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

function drawDiagonalGrid(time, activeTrail) {
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
        
        // Apply warp to line endpoints (convert to canvas coords for warp calc)
        const worldX1 = x + cellW/2 - cellW;
        const worldY1 = y + cellH/2 + pos;
        const worldX2 = x + cellW/2 + cellW;
        const worldY2 = y + cellH/2 + pos;
        
        const p1 = warpPoint(worldX1, worldY1, activeTrail);
        const p2 = warpPoint(worldX2, worldY2, activeTrail);
        
        // Convert back to local coordinates
        const localX1 = p1.x - (x + cellW/2);
        const localY1 = p1.y - (y + cellH/2);
        const localX2 = p2.x - (x + cellW/2);
        const localY2 = p2.y - (y + cellH/2);
        
        // Draw lines
        stroke(baseHue, 80, brightness);
        strokeWeight(0.8);
        line(localX1, localY1, localX2, localY2);
      }
      
      pop();
    }
  }
}

function drawMoireGrid(time, activeTrail) {
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
        
        // Apply warp to line endpoints (convert to canvas coords)
        const worldX1 = x + cellW/2 - cellW/2;
        const worldY1 = y + cellH/2 + pos;
        const worldX2 = x + cellW/2 + cellW/2;
        const worldY2 = y + cellH/2 + pos;
        
        const p1 = warpPoint(worldX1, worldY1, activeTrail);
        const p2 = warpPoint(worldX2, worldY2, activeTrail);
        
        // Convert back to local coordinates
        const localX1 = p1.x - (x + cellW/2);
        const localY1 = p1.y - (y + cellH/2);
        const localX2 = p2.x - (x + cellW/2);
        const localY2 = p2.y - (y + cellH/2);
        
        stroke(0, 0, brightness1);
        strokeWeight(2);
        line(localX1, localY1, localX2, localY2);
      }
      
      // Second layer - vertical with rotation and animation
      push();
      rotate(radians(params.rotationAngle) + time * 0.5);
      
      for (let i = -numLines/2; i < numLines/2; i++) {
        const pos = i * spacing;
        const brightness2 = 80;
        
        // For rotated layer, warp is applied in local rotated space
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
                         'depth', 'animationSpeed', 'perspective', 'hue', 'bgHue', 'mouseForce', 'mouseRadius'];
  
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
  
  const downloadGIFEl = document.getElementById('downloadGIF');
  if (downloadGIFEl) {
    downloadGIFEl.addEventListener('click', () => {
      exportGIF();
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
  // Status message disabled (avoids overlay text in canvas area)
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
    }).catch(err => {
      console.error('Failed to save poster:', err);
    });
  } else {
    // no-op
  }
  
  // Single, reliable download trigger
  downloadCanvas(pg.canvas, filename, 'image/png');
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

// Status updates disabled to avoid overlay text appearing in the editor view
function updateExportStatus(_) {}

function exportGIF() {
  const btn = document.getElementById('downloadGIF');
  if (btn) {
    btn.textContent = 'Generando GIF...';
    btn.disabled = true;
  }
  
  setTimeout(() => {
    const frames = 60; // 2 seconds at 30fps
    const w = 800;
    const h = 1200;
    const pg = createGraphics(w, h);
    pg.colorMode(HSB, 360, 100, 100, 100);
    
    const gif = new GIF({
      workers: 2,
      quality: 5,
      width: w,
      height: h,
      workerScript: '/gif.worker.js'
    });
    
    // Temporarily override for redraw
    let rngLocal = mulberry32(seedValue);
    window.rngForExport = rngLocal;
    
    for (let f = 0; f < frames; f++) {
      const time = f * 0.01 * params.animationSpeed;
      pg.background(getBgColorForExport(pg));
      
      if (params.patternType === 'diagonal-grid') {
        drawDiagonalGridForExport(pg, time);
      } else {
        drawMoireGridForExport(pg, time);
      }
      
      // Add info overlay to every frame
      drawPosterInfo(pg, w, h, 1, 'luce');
      
      gif.addFrame(pg.canvas, { delay: 33, copy: true });
    }
    
    gif.on('finished', (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `light-effects-${seedValue}.gif`;
      a.click();
      URL.revokeObjectURL(url);
      
      if (btn) {
        btn.textContent = 'Scarica GIF';
        btn.disabled = false;
      }
    });
    
    gif.render();
  }, 100);
}

function getBgColorForExport(pg) {
  const h = params.bgHue;
  if (h === 0) return pg.color(0, 0, 0);
  if (h === 360) return pg.color(0, 0, 100);
  return pg.color(h, 60, 30);
}

window.addEventListener('load', setupControls);