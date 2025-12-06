// Poster Editor with p5.js - Programmed Art Generator
// Inspired by Gruppo T and Gruppo N

// Seedable random number generator (Mulberry32)
function mulberry32(seed) {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Get DOM elements
const getEl = (id) => document.getElementById(id);

const controls = {
  seed: getEl('seed'),
  shapeCount: getEl('shapeCount'),
  minSize: getEl('minSize'),
  maxSize: getEl('maxSize'),
  hue: getEl('hue'),
  saturation: getEl('saturation'),
  bgColor: getEl('bgColor'),
  shapeType: getEl('shapeType'),
  rotation: getEl('rotation'),
  composition: getEl('composition'),
  exportScale: getEl('exportScale'),
  randomSeed: getEl('randomSeed'),
  regenerate: getEl('regenerate'),
  download: getEl('download')
};

const outputs = {
  shapeCount: getEl('shapeCountValue'),
  minSize: getEl('minSizeValue'),
  maxSize: getEl('maxSizeValue'),
  hue: getEl('hueValue'),
  saturation: getEl('saturationValue'),
  rotation: getEl('rotationValue')
};

// Read parameters from controls
function getParams() {
  return {
    seed: parseInt(controls.seed.value) || 42,
    shapeCount: parseInt(controls.shapeCount.value),
    minSize: parseInt(controls.minSize.value),
    maxSize: parseInt(controls.maxSize.value),
    hue: parseInt(controls.hue.value),
    saturation: parseInt(controls.saturation.value),
    bgColor: controls.bgColor.value,
    shapeType: controls.shapeType.value,
    rotation: parseInt(controls.rotation.value),
    composition: controls.composition.value
  };
}

// Update output displays
function updateOutputs() {
  outputs.shapeCount.textContent = controls.shapeCount.value;
  outputs.minSize.textContent = controls.minSize.value;
  outputs.maxSize.textContent = controls.maxSize.value;
  outputs.hue.textContent = controls.hue.value;
  outputs.saturation.textContent = controls.saturation.value;
  outputs.rotation.textContent = controls.rotation.value;
}

// Check for seed parameter in URL
function loadSeedFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const seedParam = urlParams.get('seed');
  if (seedParam) {
    controls.seed.value = seedParam;
  }
}

// Drawing function
function drawPoster(ctx, w, h, params) {
  const rng = mulberry32(params.seed);
  
  ctx.clear();
  ctx.background(params.bgColor);
  ctx.colorMode(ctx.HSB, 360, 100, 100, 1);
  ctx.noStroke();

  // Generate shapes based on composition
  const shapes = [];
  
  for (let i = 0; i < params.shapeCount; i++) {
    let x, y;
    
    switch (params.composition) {
      case 'grid':
        const cols = Math.ceil(Math.sqrt(params.shapeCount));
        const rows = Math.ceil(params.shapeCount / cols);
        const col = i % cols;
        const row = Math.floor(i / cols);
        x = (w / (cols + 1)) * (col + 1) + (rng() - 0.5) * 50;
        y = (h / (rows + 1)) * (row + 1) + (rng() - 0.5) * 50;
        break;
        
      case 'radial':
        const angle = (i / params.shapeCount) * Math.PI * 2;
        const radius = (h / 3) * (0.3 + rng() * 0.7);
        x = w / 2 + Math.cos(angle) * radius;
        y = h / 2 + Math.sin(angle) * radius;
        break;
        
      case 'diagonal':
        const progress = i / params.shapeCount;
        x = w * progress + (rng() - 0.5) * 100;
        y = h * progress + (rng() - 0.5) * 100;
        break;
        
      default: // random
        x = rng() * w;
        y = rng() * h;
    }
    
    const size = ctx.lerp(params.minSize, params.maxSize, rng());
    const hue = (params.hue + (rng() - 0.5) * 60 + 360) % 360;
    const sat = Math.min(100, Math.max(0, params.saturation + (rng() - 0.5) * 30));
    const bri = 40 + rng() * 50;
    const alpha = 0.7 + rng() * 0.3;
    const rot = (rng() - 0.5) * params.rotation * (Math.PI / 180);
    
    let type = params.shapeType;
    if (type === 'mixed') {
      const types = ['ellipse', 'rect', 'triangle'];
      type = types[Math.floor(rng() * types.length)];
    }
    
    shapes.push({ x, y, size, hue, sat, bri, alpha, rot, type });
  }
  
  // Draw shapes
  shapes.forEach(s => {
    ctx.push();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.fill(s.hue, s.sat, s.bri, s.alpha);
    
    switch (s.type) {
      case 'ellipse':
        ctx.ellipse(0, 0, s.size, s.size * (0.7 + rng() * 0.6));
        break;
      case 'rect':
        ctx.rectMode(ctx.CENTER);
        ctx.rect(0, 0, s.size, s.size * (0.6 + rng() * 0.8));
        break;
      case 'triangle':
        const h = s.size;
        ctx.triangle(-h/2, h/2, 0, -h/2, h/2, h/2);
        break;
    }
    
    ctx.pop();
  });
}

// p5.js sketch
const sketch = (p) => {
  let params = getParams();
  
  p.setup = () => {
    const container = document.getElementById('canvasContainer');
    const w = Math.min(600, container.clientWidth || 600);
    const h = w * 1.5; // 2:3 ratio
    
    p.createCanvas(w, h).parent(container);
    p.pixelDensity(1);
    p.noLoop();
    
    redraw();
  };
  
  function redraw() {
    params = getParams();
    updateOutputs();
    drawPoster(p, p.width, p.height, params);
  }
  
  p.windowResized = () => {
    const container = document.getElementById('canvasContainer');
    const w = Math.min(600, container.clientWidth || 600);
    const h = w * 1.5;
    p.resizeCanvas(w, h);
    redraw();
  };
  
  // Export high-res
  p.exportHighRes = (scale = 2) => {
    const baseW = 1000;
    const baseH = 1500;
    const exportW = baseW * scale;
    const exportH = baseH * scale;
    
    const g = p.createGraphics(exportW, exportH);
    g.pixelDensity(1);
    
    const scaledParams = {
      ...params,
      minSize: params.minSize * scale,
      maxSize: params.maxSize * scale
    };
    
    drawPoster(g, exportW, exportH, scaledParams);
    
    try {
      const dataURL = g.canvas.toDataURL('image/jpeg', 0.95);
      const a = document.createElement('a');
      a.href = dataURL;
      a.download = `poster-seed${params.seed}-${exportW}x${exportH}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export fallito: ' + err.message);
    }
  };
  
  // Event listeners
  Object.values(controls).forEach(ctrl => {
    if (!ctrl || ctrl.tagName === 'BUTTON') return;
    ctrl.addEventListener('input', redraw);
  });
  
  if (controls.randomSeed) {
    controls.randomSeed.addEventListener('click', () => {
      controls.seed.value = Math.floor(Math.random() * 100000);
      redraw();
    });
  }
  
  if (controls.regenerate) {
    controls.regenerate.addEventListener('click', () => {
      controls.seed.value = parseInt(controls.seed.value) + 1;
      redraw();
    });
  }
  
  if (controls.download) {
    controls.download.addEventListener('click', () => {
      const scale = parseInt(controls.exportScale.value) || 2;
      p.exportHighRes(scale);
    });
  }
};

// Initialize
window.addEventListener('load', () => {
  loadSeedFromURL();
  updateOutputs();
  new p5(sketch);
});
