// Pixel Editor - Image/Video Pixelation Generator

let seedValue = 12345;
let seedText = '';
let params = {
  posterW: 500,
  posterH: 750,
  pixelSize: 10,
  hue: 0,
  bgHue: 0,
  animate: true,
  animationSpeed: 0.02,
  animationAmount: 0.12
};

let isAnimating = true;
let isRecording = false;
let frames = [];
let startFrame = 0;
let sourceMedia = null;
let mediaType = null; // 'image' or 'video'
let videoElement = null;

// Bulge effect variables (for click interaction - deforms entire image)
let bulgePoints = []; // Array of {x, y, radius, strength, decay}
const MAX_BULGE_RADIUS = 180;
const BULGE_STRENGTH = 0.4;

// Download helper to avoid duplicate download triggers and stay stable across browsers
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

function setup() {
  const c = createCanvas(params.posterW, params.posterH);
  c.parent('canvasContainer');
  colorMode(HSB, 360, 100, 100, 100);
  noLoop(); // Start paused until media is loaded
  
  // Add click handler for bulge effect (animated deformation)
  c.mousePressed(() => {
    if (sourceMedia && mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
      bulgePoints.push({
        x: mouseX,
        y: mouseY,
        radius: MAX_BULGE_RADIUS,
        strength: BULGE_STRENGTH,
        time: 0,
        maxTime: 200
      });
      
      // Start loop for animation
      loop();
    }
    return false; // Prevent default
  });
}

function draw() {
  const bgCol = getBgColor();
  background(bgCol);
  
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
  
  // Update bulge points - fade out over time
  if (bulgePoints.length > 0) {
    bulgePoints = bulgePoints.filter(p => {
      p.time++;
      return p.time < p.maxTime;
    });
    
    // Stop looping only if no more bulge points AND no animation AND no video
    if (bulgePoints.length === 0 && mediaType === 'image' && !params.animate) {
      noLoop();
    }
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

function getBgColor() {
  const h = params.bgHue;
  if (h === 0) return color(0, 0, 0); // black
  if (h === 360) return color(0, 0, 100); // white
  return color(h, 50, 90); // vivid background so the change is clearly visible
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

function applyPixelation(img) {
  const px = params.pixelSize;
  const cols = Math.ceil(width / px);
  const rows = Math.ceil(height / px);
  
  img.loadPixels();
  
  // Calculate crop dimensions to match poster aspect ratio without stretching
  const posterAspect = width / height;
  const imgAspect = img.width / img.height;
  
  let cropX = 0, cropY = 0, cropW = img.width, cropH = img.height;
  
  if (imgAspect > posterAspect) {
    // Image is wider: crop width
    cropW = img.height * posterAspect;
    cropX = (img.width - cropW) / 2;
  } else {
    // Image is taller: crop height
    cropH = img.width / posterAspect;
    cropY = (img.height - cropH) / 2;
  }
  
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Calculate pixel position
      let pixelX = x * px;
      let pixelY = y * px;
      let pixelSz = px;
      
      // Calculate source position
      let sampleX = x;
      let sampleY = y;
      let maxBulgeFactor = 0; // Track maximum bulge effect for pixel size
      
      // ANIMATION: Vertical stripe movement when animation is enabled
      if (params.animate) {
        const t = frameCount * (params.animationSpeed || 0.02);
        const stripeWidth = 8; // Width of each stripe
        const stripeIndex = floor(x / stripeWidth);
        
        // Alternate stripes move up/down based on stripe index
        const direction = (stripeIndex % 2 === 0) ? 1 : -1;
        const verticalOffset = sin(t + stripeIndex * 0.5) * (params.animationAmount || 0.12) * 10;
        
        sampleY += verticalOffset * direction;
      }
      
      // CLICK BULGE: Apply animated spherical bulge distortion from click points
      for (let bulge of bulgePoints) {
        const centerX = pixelX + px/2;
        const centerY = pixelY + px/2;
        const distance = sqrt(pow(centerX - bulge.x, 2) + pow(centerY - bulge.y, 2));
        
        if (distance < bulge.radius) {
          // Animation curve: starts at 0, expands to 1, then retracts to 0
          const progress = bulge.time / bulge.maxTime; // 0 to 1
          let animCurve;
          
          if (progress < 0.5) {
            // First half: expansion (0 to 1)
            animCurve = sin(progress * PI);
          } else {
            // Second half: retraction (1 to 0)
            animCurve = sin((1 - progress) * PI);
          }
          
          // Spherical bulge - pulls image outward from center like a lens
          const normalizedDist = distance / bulge.radius;
          const bulgeFactor = (1 - normalizedDist * normalizedDist) * bulge.strength * animCurve;
          
          // Track maximum bulge factor
          maxBulgeFactor = max(maxBulgeFactor, bulgeFactor);
          
          // Calculate displacement direction (outward from bulge center)
          const angle = atan2(centerY - bulge.y, centerX - bulge.x);
          
          // Displace the sampling position (creates the "lens" effect)
          const displacement = bulgeFactor * bulge.radius * 0.5;
          sampleX -= cos(angle) * displacement / px;
          sampleY -= sin(angle) * displacement / px;
        }
      }
      
      // Enlarge pixels based on maximum bulge effect
      pixelSz = px * (1 + maxBulgeFactor * 3);
      pixelX -= (pixelSz - px) / 2;
      pixelY -= (pixelSz - px) / 2;
      
      // Sample pixel from cropped area using displaced coordinates
      let srcX = floor(map(sampleX, 0, cols, cropX, cropX + cropW));
      let srcY = floor(map(sampleY, 0, rows, cropY, cropY + cropH));
      
      // Clamp to image bounds
      srcX = constrain(srcX, 0, img.width - 1);
      srcY = constrain(srcY, 0, img.height - 1);
      
      const idx = (srcY * img.width + srcX) * 4;
      
      const r = img.pixels[idx];
      const g = img.pixels[idx + 1];
      const b = img.pixels[idx + 2];
      
      // Keep original color by default
      let rr = r, gg = g, bb = b;
      
      // Apply hue tint when hue is not 0
      if (params.hue > 0 && params.hue < 360) {
        const c = color(r, g, b);
        const s = 80;
        const br = brightness(c);
        const tinted = color(params.hue, s, br);
        rr = red(tinted);
        gg = green(tinted);
        bb = blue(tinted);
      }
      
      // No brightness quantization to keep page lighter and colors natural
      
      // Draw pixel block in RGB to preserve original colors
      push();
      colorMode(RGB, 255);
      noStroke();
      fill(rr, gg, bb);
      rect(pixelX, pixelY, pixelSz, pixelSz);
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
  bindRange('bgHue', v=>params.bgHue=v);
  bindRange('animationSpeed', v=>params.animationSpeed=v, v=>v.toFixed(2));
  bindRange('animationAmount', v=>params.animationAmount=v, v=>v.toFixed(2));
  
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
      bulgePoints = []; // Clear bulge deformations
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
    const filename = `pixel-${seedValue}.png`;

    // Snapshot current canvas
    const snapshot = get(0, 0, width, height);

    // Create graphics and paste snapshot
    const pg = createGraphics(params.posterW, params.posterH);
    pg.image(snapshot, 0, 0, params.posterW, params.posterH);
    drawPosterInfo(pg, params.posterW, params.posterH, 1, 'pixel');
    const dataURL = pg.canvas.toDataURL('image/png');
    
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
    
    // Single, reliable download trigger
    downloadCanvas(pg.canvas, filename, 'image/png');
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
