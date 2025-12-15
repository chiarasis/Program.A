// CrashClock-inspired kinetic editor
// Rotating bands and dynamic type-like elements with user controls

let params = {
  posterW: 500,
  posterH: 750,
  rotationSpeed: 0.02,
  wobbleAmp: 10,
  wobbleFreq: 0.5,
  hue: 0,
  bgHue: 360,
  noiseFlow: 0.12,
  particleSize: 6,
  particleSizeJitter: 8,
  particleCount: 2200,
  mouseForce: 18,
  mouseRadius: 140,
  mouseMode: 'repel', // 'repel' | 'attract'
  friction: 0.92
};

let isAnimating = true;
let isRecording = false;
let frames = [];
let startFrame = 0;
let particles = [];
let dragging = false;

function setup() {
  const c = createCanvas(params.posterW, params.posterH);
  c.parent('canvasContainer');
  colorMode(HSB, 360, 100, 100, 100);
  initParticles();
}

function draw() {
  background(getBgColor());
  
  // Capture frame for GIF before translate
  if (isRecording) {
    const f = frameCount - startFrame;
    if (f <= 150) {
      frames.push(get());
      const btn = document.getElementById('downloadGIF');
      if (btn) btn.textContent = `Registrando... ${f}/150`;
      if (f === 150) finishGif();
    }
  }
  
  translate(width/2, height/2);
  
  const t = frameCount * params.rotationSpeed;

  // Mouse interaction force field
  const mx = mouseX - width/2;
  const my = mouseY - height/2;
  const mActive = dragging || mouseIsPressed;

  // Update and draw particles (persistent positions)
  noStroke();
  for (let p of particles) {
    const n = noise(p.x*0.003, p.y*0.003, frameCount*0.01);
    const flow = (n-0.5) * params.noiseFlow;
    p.vx += flow;
    p.vy += sin((p.x+p.y)*0.002 + t) * (params.wobbleAmp*0.01);

    // Mouse push/pull (persistent displacement via velocity)
    if (mActive) {
      const dx = p.x - mx;
      const dy = p.y - my;
      const d = sqrt(dx*dx + dy*dy);
      if (d < params.mouseRadius) {
        const force = (1 - d/params.mouseRadius) * params.mouseForce;
        const nx = dx / (d+1e-6);
        const ny = dy / (d+1e-6);
        if (params.mouseMode === 'repel') {
          p.vx += nx * force;
          p.vy += ny * force;
        } else {
          p.vx -= nx * force;
          p.vy -= ny * force;
        }
      }
    }
    // Integrate
    p.vx *= params.friction;
    p.vy *= params.friction;
    p.x += p.vx;
    p.y += p.vy;
    const halfW = width/2, halfH = height/2;
    p.x = constrain(p.x, -halfW+5, halfW-5);
    p.y = constrain(p.y, -halfH+5, halfH-5);

    const col = getColor(p.group);
    fill(col);
    circle(p.x, p.y, p.size);
  }
}

function initParticles(){
  particles = [];
  const halfW = width/2, halfH = height/2;
  for (let i = 0; i < params.particleCount; i++) {
    const x = random(-halfW*0.85, halfW*0.85);
    const y = random(-halfH*0.85, halfH*0.85);
    const size = max(2, params.particleSize + (random()-0.5)*params.particleSizeJitter);
    const group = floor(random(0,3));
    particles.push({x, y, vx: 0, vy: 0, size, group});
  }
}

function getColor(idx) {
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

function setupControls() {
  const q = id => document.getElementById(id);
  const bindRange = (id, cb, fmt=(v)=>v) => {
    const el = q(id), val = q(id+"Value");
    el.addEventListener('input', e=>{const v=parseFloat(e.target.value); cb(v); if(val) val.textContent = fmt(v)});
  };
  
  bindRange('wobbleAmp', v=>params.wobbleAmp=v);
  bindRange('noiseFlow', v=>params.noiseFlow=v, v=>v.toFixed(2));
  bindRange('hue', v=>params.hue=v);
  bindRange('bgHue', v=>params.bgHue=v);
  bindRange('particleSize', v=>{params.particleSize=v; particles.forEach(p=>p.size=max(2, params.particleSize + (random()-0.5)*params.particleSizeJitter));});
  bindRange('particleSizeJitter', v=>{params.particleSizeJitter=v; particles.forEach(p=>p.size=max(2, params.particleSize + (random()-0.5)*params.particleSizeJitter));});
  bindRange('particleCount', v=>{params.particleCount=v; initParticles();});
  bindRange('mouseForce', v=>params.mouseForce=v);
  bindRange('mouseRadius', v=>params.mouseRadius=v);
  
  const mouseModeSel = q('mouseMode');
  if (mouseModeSel) mouseModeSel.addEventListener('change', e=>params.mouseMode=e.target.value);
  
  const playBtn = q('playPause');
  if (playBtn) playBtn.addEventListener('click', ()=>{isAnimating=!isAnimating; playBtn.textContent = isAnimating? 'Pausa':'Play'; if(isAnimating) loop(); else noLoop();});
  
  const pngBtn = q('downloadPNG');
  if (pngBtn) pngBtn.addEventListener('click', ()=>{
    const filename = 'crashclock.png';
    const dataURL = canvas.toDataURL('image/png');
    
    if (window.PosterStorage) {
      window.PosterStorage.savePoster(dataURL, {
        editor: 'crashclock',
        filename: filename,
        width: 1000,
        height: 1500
      }).then(() => {
        if (window.showDownloadSuccess) window.showDownloadSuccess('Crash Clock');
      }).catch(err => console.error('Failed to save poster:', err));
    }
    
    save(filename);
  });
  
  const gifBtn = q('downloadGIF');
  if (gifBtn) gifBtn.addEventListener('click', ()=>startGif());
}

function mousePressed(){ dragging = true; }
function mouseReleased(){ dragging = false; }

function startGif(){
  frames=[]; isRecording=true; startFrame=frameCount;
  const gifBtn = document.getElementById('downloadGIF');
  if (gifBtn){ gifBtn.textContent='Registrando... 0/150'; gifBtn.disabled=true; }
}

function finishGif(){
  isRecording=false;
  const gifBtn = document.getElementById('downloadGIF');
  if (gifBtn) gifBtn.textContent='Generando GIF...';
  setTimeout(()=>{
    const gif = new GIF({
      workers:2, 
      quality:10, 
      width:params.posterW, 
      height:params.posterH,
      workerScript:'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js'
    });
    for (let f of frames) {
      gif.addFrame(f.canvas, {delay:33, copy:true});
    }
    gif.on('finished', (blob)=>{
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); 
      a.href=url; 
      a.download='crashclock.gif'; 
      a.click();
      URL.revokeObjectURL(url);
      if (gifBtn){ gifBtn.textContent='Scarica GIF'; gifBtn.disabled=false; }
      frames=[];
    });
    gif.render();
  },100);
}

window.addEventListener('load', setupControls);
