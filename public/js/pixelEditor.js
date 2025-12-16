// Pixel Editor - Image/Video Pixelation Generator

let seedValue = 12345;
let seedText = '';
let params = {
  posterW: 500,
  posterH: 750,
  pixelSize: 10,
  hue: 0,
  hueEnabled: false,
  // removed bgHue
};

let isAnimating = true;
let isRecording = false;
let frames = [];
let startFrame = 0;
let sourceMedia = null;
let mediaType = null; // 'image' or 'video'
let videoElement = null;

function setup() {
  const c = createCanvas(params.posterW, params.posterH);
  c.parent('canvasContainer');
  colorMode(HSB, 360, 100, 100, 100);
  noLoop(); // Start paused until media is loaded
}

function draw() {
  background(0);
  
  if (sourceMedia) {
    if (mediaType === 'video' && videoElement) {
      // Draw current video frame
      videoElement.loadPixels();
      applyPixelation(videoElement);
    } else if (mediaType === 'image') {
      applyPixelation(sourceMedia);
    }
  } else {
    // Show placeholder
    fill(150);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(16);
    text('Carica un\'immagine o video', width/2, height/2);
  }
  
  // GIF recording
  if (isRecording) {
    const f = frameCount - startFrame;
    if (f <= 150) {
      frames.push(get());
      const btn = document.getElementById('downloadGIF');
      if (btn) btn.textContent = `Registrando... ${f}/150`;
      if (f === 150) finishGif();
    }
  }
}

function applyPixelation(img) {
  const px = params.pixelSize;
  const cols = Math.ceil(width / px);
  const rows = Math.ceil(height / px);
  
  img.loadPixels();
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Sample pixel from source at scaled position
      const srcX = floor(map(x, 0, cols, 0, img.width));
      const srcY = floor(map(y, 0, rows, 0, img.height));
      const idx = (srcY * img.width + srcX) * 4;
      
      const r = img.pixels[idx];
      const g = img.pixels[idx + 1];
      const b = img.pixels[idx + 2];
      
      // Keep original color by default
      let rr = r, gg = g, bb = b;
      
      // Optional hue tint: only when enabled
      if (params.hueEnabled && params.hue > 0 && params.hue < 360) {
        const c = color(r, g, b);
        const s = 80;
        const br = brightness(c);
        const tinted = color(params.hue, s, br);
        rr = red(tinted);
        gg = green(tinted);
        bb = blue(tinted);
      }
      
      // No brightness quantization to keep page lighter and colors natural
      
      // Animation wobble on brightness
      if (params.animate) {
        const t = frameCount * (params.animationSpeed || 0.02);
        const wob = sin(x*0.3 + y*0.25 + t) * (params.animationAmount || 0.12);
        rr = constrain(rr*(1+wob), 0, 255);
        gg = constrain(gg*(1+wob), 0, 255);
        bb = constrain(bb*(1+wob), 0, 255);
      }
      
      // Draw pixel block in RGB to preserve original colors
      push();
      colorMode(RGB, 255);
      noStroke();
      fill(rr, gg, bb);
      rect(x * px, y * px, px, px);
      pop();
    }
  }
}

// removed background hue function

function setupControls() {
  const q = id => document.getElementById(id);
  const bindRange = (id, cb, fmt=(v)=>v) => {
    const el = q(id), val = q(id+"Value");
    if (!el) return;
    el.addEventListener('input', e=>{
      const v=parseFloat(e.target.value); 
      cb(v); 
      if(val) val.textContent = fmt(v);
      if (isAnimating || mediaType === 'image') redraw();
    });
  };
  
  bindRange('pixelSize', v=>params.pixelSize=v);
  // removed colorDepth control for lighter processing
  bindRange('hue', v=>params.hue=v);
  // removed bgHue binding
  bindRange('animationSpeed', v=>params.animationSpeed=v, v=>v.toFixed(2));
  bindRange('animationAmount', v=>params.animationAmount=v, v=>v.toFixed(2));
  const hueToggle = q('hueEnabled');
  if (hueToggle) hueToggle.addEventListener('change', e=>{ params.hueEnabled = e.target.checked; if (mediaType==='image') redraw(); });
  const animateToggle = q('animate');
  if (animateToggle) animateToggle.addEventListener('change', e=>{ params.animate = e.target.checked; if (params.animate) loop(); else if(mediaType!=='video') noLoop(); });
  
  const fileInput = q('fileInput');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileUpload);
  }
  
  const playBtn = q('playPause');
  if (playBtn) {
    playBtn.addEventListener('click', ()=>{
      if (mediaType === 'video') {
        isAnimating=!isAnimating; 
        playBtn.textContent = isAnimating? 'Pausa':'Play'; 
        if(isAnimating) {
          if (videoElement) videoElement.play();
          loop();
        } else {
          if (videoElement) videoElement.pause();
          noLoop();
        }
      }
    });
  }
  
  const resetBtn = q('reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', ()=>{
      sourceMedia = null;
      mediaType = null;
      if (videoElement) {
        videoElement.pause();
        videoElement.remove();
        videoElement = null;
      }
      noLoop();
      redraw();
    });
  }
  
  const pngBtn = q('downloadPNG');
  if (pngBtn) pngBtn.addEventListener('click', ()=>{
    if (!sourceMedia) return;
    const filename = 'pixel.png';
    const dataURL = canvas.toDataURL('image/png');
    
    if (window.PosterStorage) {
      window.PosterStorage.savePoster(dataURL, {
        editor: 'pixel',
          seed: seedText || seedValue.toString(),
        filename: filename,
        width: params.posterW,
        height: params.posterH
      }).then(() => {
        if (window.showDownloadSuccess) window.showDownloadSuccess('Pixel');
      }).catch(err => console.error('Failed to save poster:', err));
    }
    
    save(filename);
  });
  
  const gifBtn = q('downloadGIF');
  if (gifBtn) gifBtn.addEventListener('click', ()=>{
    if (!sourceMedia) return;
    if (mediaType === 'video') {
      startVideoRecording();
    } else {
      startGif();
    }
  });

  // Seed controls
  const seedEl = q('seed');
  if (seedEl) {
    seedEl.addEventListener('change', (e) => {
      seedText = e.target.value;
      seedValue = stringToSeed(seedText);
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

function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const fileType = file.type.split('/')[0];
  
  if (fileType === 'image') {
    loadImage(URL.createObjectURL(file), img => {
      sourceMedia = img;
      mediaType = 'image';
      redraw();
    });
  } else if (fileType === 'video') {
    if (videoElement) {
      videoElement.pause();
      videoElement.remove();
    }
    
    videoElement = createVideo(URL.createObjectURL(file), () => {
      videoElement.hide();
      videoElement.loop();
      videoElement.volume(0);
      sourceMedia = videoElement;
      mediaType = 'video';
      loop();
    });
  }
}

function startGif(){
  if (!sourceMedia) return;
  frames=[]; isRecording=true; startFrame=frameCount;
  const gifBtn = document.getElementById('downloadGIF');
  if (gifBtn){ gifBtn.textContent='Registrando... 0/150'; gifBtn.disabled=true; }
  if (mediaType === 'image') {
    // For images, just capture multiple frames with slight variations
    loop();
  }
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
      a.download='pixel.gif'; 
      a.click();
      URL.revokeObjectURL(url);
      if (gifBtn){ gifBtn.textContent='Scarica GIF'; gifBtn.disabled=false; }
      frames=[];
    });
    gif.render();
  },100);
  
  if (mediaType === 'image') {
    noLoop();
  }
}

window.addEventListener('load', setupControls);

// Video export via MediaRecorder on canvas stream
let mediaRecorder = null;
let recordedChunks = [];

function startVideoRecording(){
  const btn = document.getElementById('downloadGIF');
  if (btn){ btn.textContent='Registrando Video...'; btn.disabled=true; }
  const canvasEl = document.querySelector('canvas');
  if (!canvasEl) return;
  const stream = canvasEl.captureStream(30); // 30 fps
  recordedChunks = [];
  try {
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
  } catch(e) {
    mediaRecorder = new MediaRecorder(stream);
  }
  mediaRecorder.ondataavailable = (e)=>{ if (e.data.size > 0) recordedChunks.push(e.data); };
  mediaRecorder.onstop = ()=>{
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='pixel.webm'; a.click();
    URL.revokeObjectURL(url);
    if (btn){ btn.textContent='Scarica Video'; btn.disabled=false; }
  };
  mediaRecorder.start();
  // Auto-stop after 5 seconds
  setTimeout(()=>{ if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop(); }, 5000);
}
