// Sand Editor - Kinetic sand art simulation
// Click to move obstacles and watch sand fall and accumulate

let seedValue = 12345;
let rng;
let sandParticles = [];
let obstacles = [];
let cellSize = 4;
let cols, rows;
let grid = [];

// Parameters
let params = {
  sandAmount: 5000,
  obstacleCount: 8,
  gravity: 1,
  particleSize: 4,
  colorMode: 'gradient',
  hue: 30,
  saturation: 70,
  sandFlow: 0.8
};

// For GIF recording
let isRecording = false;
let frames = [];
let recordStartFrame = 0;

function setup() {
  const canvas = createCanvas(1000, 1500);
  canvas.parent('canvasContainer');
  colorMode(HSB, 360, 100, 100);
  
  cols = floor(width / cellSize);
  rows = floor(height / cellSize);
  
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('seed')) {
    seedValue = parseInt(urlParams.get('seed'));
    document.getElementById('seed').value = seedValue;
  }
  
  setupControls();
  initSimulation();
  frameRate(30);
}

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function initSimulation() {
  rng = mulberry32(seedValue);
  sandParticles = [];
  obstacles = [];
  initGrid();
  
  // Create obstacles (platforms/shelves)
  for (let i = 0; i < params.obstacleCount; i++) {
    obstacles.push(createObstacle());
  }
  
  // Create sand particles - start from top
  for (let i = 0; i < params.sandAmount; i++) {
    let x = rng() * width;
    let y = rng() * (height * 0.3);
    sandParticles.push({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      settled: false,
      hueOffset: (rng() - 0.5) * 40
    });
  }
  
  // Let particles fall and settle on obstacles
  for (let i = 0; i < 300; i++) {
    updateSand();
  }
}

function createObstacle() {
  let width_obstacle = rng() * 250 + 150;
  let x = rng() * (width - width_obstacle);
  let y = rng() * (height - 400) + 250;
  
  return {
    x: x,
    y: y,
    width: width_obstacle,
    height: 12,
    angle: (rng() - 0.5) * 0.4,
    curve: rng() * 30 + 20,
    pivotX: x,
    pivotY: y,
    rotating: false,
    targetAngle: (rng() - 0.5) * 0.4
  };
}

function initGrid() {
  grid = [];
  for (let i = 0; i < cols; i++) {
    grid[i] = [];
    for (let j = 0; j < rows; j++) {
      grid[i][j] = null;
    }
  }
}

function draw() {
  background(0);
  
  // Update sand physics
  updateSand();
  
  // Draw obstacles
  push();
  for (let obs of obstacles) {
    // Rotate obstacle to target angle
    if (obs.rotating) {
      obs.angle = lerp(obs.angle, obs.targetAngle, 0.08);
      obs.x = obs.pivotX;
      obs.y = obs.pivotY;
      
      if (abs(obs.angle - obs.targetAngle) < 0.01) {
        obs.rotating = false;
      }
    }
    
    // Draw curved obstacle
    push();
    translate(obs.pivotX, obs.pivotY);
    rotate(obs.angle);
    
    // Draw thick curved line
    noFill();
    stroke(40, 20, 60);
    strokeWeight(obs.height);
    strokeCap(ROUND);
    
    beginShape();
    for (let i = 0; i <= 20; i++) {
      let t = i / 20;
      let x = (t - 0.5) * obs.width;
      let y = sin(t * PI) * obs.curve;
      vertex(x, y);
    }
    endShape();
    
    pop();
  }
  pop();
  
  // Draw sand
  noStroke();
  for (let particle of sandParticles) {
    let col = getParticleColor(particle);
    fill(col);
    circle(particle.x, particle.y, params.particleSize);
  }
  
  // Record frame if recording GIF
  if (isRecording) {
    let currentFrame = frameCount - recordStartFrame;
    if (currentFrame <= 150) {
      frames.push(get());
      const downloadGifBtn = document.getElementById('downloadGIF');
      downloadGifBtn.textContent = `Registrando... ${currentFrame}/150`;
      
      if (currentFrame === 150) {
        stopRecording();
      }
    }
  }
}

function updateSand() {
  // Clear grid
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      grid[i][j] = null;
    }
  }
  
  // Update each sand particle
  for (let i = 0; i < sandParticles.length; i++) {
    let p = sandParticles[i];
    
    if (p.settled) {
      let col = floor(p.x / cellSize);
      let row = floor(p.y / cellSize);
      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        grid[col][row] = p;
      }
      continue;
    }
    
    // Apply gravity
    p.vy += params.gravity * params.sandFlow;
    p.vx *= 0.95;
    p.vy *= 0.98;
    
    // Try to move
    let nextX = p.x + p.vx;
    let nextY = p.y + p.vy;
    
    // Check collision with obstacles
    let collided = false;
    for (let obs of obstacles) {
      if (checkObstacleCollision(nextX, nextY, obs)) {
        collided = true;
        
        // Determine which side hit
        let dx = p.x - obs.pivotX;
        
        // Check if on the sides
        let localX = p.x - obs.pivotX;
        let cos_a = cos(-obs.angle);
        let sin_a = sin(-obs.angle);
        let rotatedX = localX * cos_a - (p.y - obs.pivotY) * sin_a;
        
        if (abs(rotatedX) > obs.width / 2 - 20) {
          // Slide off the sides
          p.vx = rotatedX > 0 ? 1 : -1;
          p.vy *= 0.5;
        } else {
          // Land on top
          p.vy = 0;
          p.vx *= 0.8;
          
          if (abs(p.vx) < 0.5 && rng() > 0.7) {
            p.settled = true;
            p.vx = 0;
          }
        }
        break;
      }
    }
    
    if (!collided) {
      // Check collision with other sand
      let col = floor(nextX / cellSize);
      let row = floor(nextY / cellSize);
      
      if (row >= rows - 1) {
        p.y = (rows - 1) * cellSize;
        p.settled = true;
        p.vx = 0;
        p.vy = 0;
      } else if (col >= 0 && col < cols && row >= 0 && row < rows) {
        if (grid[col][row + 1] !== null) {
          let leftCol = col - 1;
          let rightCol = col + 1;
          
          let canMoveLeft = leftCol >= 0 && grid[leftCol][row + 1] === null;
          let canMoveRight = rightCol < cols && grid[rightCol][row + 1] === null;
          
          if (canMoveLeft && canMoveRight) {
            p.vx = rng() > 0.5 ? -1 : 1;
          } else if (canMoveLeft) {
            p.vx = -1;
          } else if (canMoveRight) {
            p.vx = 1;
          } else {
            p.settled = true;
            p.vx = 0;
            p.vy = 0;
          }
        } else {
          p.x = nextX;
          p.y = nextY;
        }
      } else {
        p.x = nextX;
        p.y = nextY;
      }
    }
    
    // Keep in bounds
    if (p.x < 0) p.x = 0;
    if (p.x > width) p.x = width;
  }
}

function checkObstacleCollision(x, y, obs) {
  // Transform point to obstacle's local space
  let localX = x - obs.pivotX;
  let localY = y - obs.pivotY;
  
  // Rotate point
  let cos_a = cos(-obs.angle);
  let sin_a = sin(-obs.angle);
  let rotatedX = localX * cos_a - localY * sin_a;
  let rotatedY = localX * sin_a + localY * cos_a;
  
  // Check if within width bounds
  if (abs(rotatedX) > obs.width / 2 + params.particleSize) {
    return false;
  }
  
  // Calculate curve height at this x position
  let t = (rotatedX / obs.width) + 0.5;
  if (t < 0 || t > 1) return false;
  
  let curveY = sin(t * PI) * obs.curve;
  
  // Check if particle is near the curved surface
  return abs(rotatedY - curveY) < obs.height / 2 + params.particleSize;
}

function mousePressed() {
  // Find which obstacle was clicked
  let clickedObs = null;
  let minDist = Infinity;
  
  for (let obs of obstacles) {
    // Check distance to obstacle in its local space
    let localX = mouseX - obs.pivotX;
    let localY = mouseY - obs.pivotY;
    
    let cos_a = cos(-obs.angle);
    let sin_a = sin(-obs.angle);
    let rotatedX = localX * cos_a - localY * sin_a;
    let rotatedY = localX * sin_a + localY * cos_a;
    
    // Check if click is on the obstacle
    if (abs(rotatedX) < obs.width / 2 + 30) {
      let t = (rotatedX / obs.width) + 0.5;
      if (t >= 0 && t <= 1) {
        let curveY = sin(t * PI) * obs.curve;
        let d = abs(rotatedY - curveY);
        
        if (d < obs.height + 30 && d < minDist) {
          minDist = d;
          clickedObs = obs;
        }
      }
    }
  }
  
  if (clickedObs) {
    // Calculate new angle: pivot stays fixed, opposite end points toward mouse
    let dx = mouseX - clickedObs.pivotX;
    let dy = mouseY - clickedObs.pivotY;
    let newAngle = atan2(dy, dx);
    
    clickedObs.targetAngle = newAngle;
    clickedObs.rotating = true;
    
    // Unsettle sand on and near this obstacle
    for (let p of sandParticles) {
      if (checkObstacleCollision(p.x, p.y, clickedObs)) {
        p.settled = false;
        p.vx = (rng() - 0.5) * 2;
        p.vy = -1;
      }
    }
  }
}

function getParticleColor(p) {
  if (params.colorMode === 'mono') {
    return color(0, 0, 95);
  } else if (params.colorMode === 'gradient') {
    let hueVal = (params.hue + p.hueOffset) % 360;
    return color(hueVal, params.saturation, 90);
  } else if (params.colorMode === 'depth') {
    let depthHue = (params.hue + map(p.y, 0, height, -60, 60)) % 360;
    return color(depthHue, params.saturation, 88);
  } else if (params.colorMode === 'warm') {
    let hueVal = map(noise(p.x * 0.01, p.y * 0.01), 0, 1, 15, 45);
    return color(hueVal, 80, 92);
  }
  return color(params.hue, params.saturation, 90);
}

function setupControls() {
  // Seed
  const seedInput = document.getElementById('seed');
  seedInput.addEventListener('change', () => {
    seedValue = parseInt(seedInput.value);
    initSimulation();
  });
  
  // Sand amount
  const sandAmountSlider = document.getElementById('sandAmount');
  const sandAmountValue = document.getElementById('sandAmountValue');
  sandAmountSlider.addEventListener('input', (e) => {
    params.sandAmount = parseInt(e.target.value);
    sandAmountValue.textContent = params.sandAmount;
  });
  
  // Obstacle count
  const obstacleCountSlider = document.getElementById('obstacleCount');
  const obstacleCountValue = document.getElementById('obstacleCountValue');
  obstacleCountSlider.addEventListener('input', (e) => {
    params.obstacleCount = parseInt(e.target.value);
    obstacleCountValue.textContent = params.obstacleCount;
  });
  
  // Gravity
  const gravitySlider = document.getElementById('gravity');
  const gravityValue = document.getElementById('gravityValue');
  gravitySlider.addEventListener('input', (e) => {
    params.gravity = parseFloat(e.target.value);
    gravityValue.textContent = params.gravity.toFixed(1);
  });
  
  // Sand flow
  const sandFlowSlider = document.getElementById('sandFlow');
  const sandFlowValue = document.getElementById('sandFlowValue');
  sandFlowSlider.addEventListener('input', (e) => {
    params.sandFlow = parseFloat(e.target.value);
    sandFlowValue.textContent = params.sandFlow.toFixed(2);
  });
  
  // Particle size
  const particleSizeSlider = document.getElementById('particleSize');
  const particleSizeValue = document.getElementById('particleSizeValue');
  particleSizeSlider.addEventListener('input', (e) => {
    params.particleSize = parseFloat(e.target.value);
    particleSizeValue.textContent = params.particleSize.toFixed(1);
  });
  
  // Color mode
  const colorModeSelect = document.getElementById('colorMode');
  colorModeSelect.addEventListener('change', (e) => {
    params.colorMode = e.target.value;
  });
  
  // Hue
  const hueSlider = document.getElementById('hue');
  const hueValue = document.getElementById('hueValue');
  hueSlider.addEventListener('input', (e) => {
    params.hue = parseInt(e.target.value);
    hueValue.textContent = params.hue;
  });
  
  // Saturation
  const saturationSlider = document.getElementById('saturation');
  const saturationValue = document.getElementById('saturationValue');
  saturationSlider.addEventListener('input', (e) => {
    params.saturation = parseInt(e.target.value);
    saturationValue.textContent = params.saturation;
  });
  
  // Reset button
  const resetBtn = document.getElementById('reset');
  resetBtn.addEventListener('click', () => {
    initSimulation();
  });
  
  // Shuffle obstacles
  const shuffleBtn = document.getElementById('shuffle');
  shuffleBtn.addEventListener('click', () => {
    for (let obs of obstacles) {
      obs.pivotX = rng() * width;
      obs.pivotY = rng() * (height - 400) + 250;
      obs.targetAngle = (rng() - 0.5) * PI;
      obs.rotating = true;
    }
    for (let p of sandParticles) {
      p.settled = false;
    }
  });
  
  // Download PNG
  const downloadBtn = document.getElementById('downloadPNG');
  downloadBtn.addEventListener('click', () => {
    save(`sand-kinetic-${seedValue}.png`);
  });
  
  // Download GIF
  const downloadGifBtn = document.getElementById('downloadGIF');
  downloadGifBtn.addEventListener('click', () => {
    if (!isRecording) {
      startRecording();
    }
  });
}

function startRecording() {
  frames = [];
  isRecording = true;
  recordStartFrame = frameCount;
  const downloadGifBtn = document.getElementById('downloadGIF');
  downloadGifBtn.textContent = 'Registrando... 0/150';
  downloadGifBtn.disabled = true;
  
  // Trigger some movement for recording
  for (let i = 0; i < 3; i++) {
    let obs = obstacles[floor(rng() * obstacles.length)];
    obs.targetAngle = obs.angle + (rng() - 0.5) * PI / 2;
    obs.rotating = true;
  }
  for (let p of sandParticles) {
    if (rng() > 0.7) {
      p.settled = false;
    }
  }
}

function stopRecording() {
  isRecording = false;
  const downloadGifBtn = document.getElementById('downloadGIF');
  downloadGifBtn.textContent = 'Generando GIF...';
  
  setTimeout(() => {
    const gif = new GIF({
      workers: 2,
      quality: 10,
      width: width,
      height: height,
      workerScript: 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
    });
    
    for (let frame of frames) {
      gif.addFrame(frame.canvas, {delay: 33});
    }
    
    gif.on('finished', (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sand-kinetic-${seedValue}.gif`;
      link.click();
      
      downloadGifBtn.textContent = 'Scarica GIF';
      downloadGifBtn.disabled = false;
      frames = [];
    });
    
    gif.render();
  }, 100);
}
