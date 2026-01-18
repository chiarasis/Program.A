export default function createSketch(container) {

  // Choose the p5 constructor - prefer global window.p5 (loaded by the boot script)
  const P5Constructor = (typeof window !== 'undefined' && window.p5) ? window.p5 : (typeof p5 !== 'undefined' ? p5 : undefined);
  if (!P5Constructor) {
    throw new Error('p5 library not found - ensure p5 is loaded before creating the sketch');
  }

  return new P5Constructor((p) => {
    // 3D box grid sketch adapted from provided code
    let spacing = 57;
    let boxSize = 57;
    let cols = 0, rows = 0;
    let t = 0;

    const influenceRadius = 200; // pixels
    const maxPush = 220; // z push in pixels

    p.setup = () => {
      p.createCanvas(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight, p.WEBGL);
      p.pixelDensity(Math.max(1, Math.floor(window.devicePixelRatio || 1)));
      p.smooth();
      resizeGrid();
    };

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
      resizeGrid();
    };

    function resizeGrid(){
      cols = Math.floor(p.width / spacing) + 1;
      rows = Math.floor(p.height / spacing) + 1;
    }

    p.draw = () => {
      p.clear();
      p.background(8);

      // ambient/directional lighting
      // Lighting: low ambient to keep shadows pronounced, a small white directional light,
      // and a blue point light positioned below the grid (toward the bottom of the canvas)
      p.ambientLight(10000); // low general light -> stronger shadows
      p.directionalLight(255,255,255, p.mouseX - p.width/16, p.mouseY - p.height/16, 20);
        // white light under the grid (toward the viewer) - stronger intensity so the cubes
        // appear black overall but catch a bright white rim from below
        const lightX = p.width / 2;
        const lightY = p.height + Math.max(200, Math.floor(p.height * 0.2)); // place below the bottom edge
        const lightZ = -350; // toward camera
        // bright white point light (under the grid)
        p.pointLight(255, 255, 255, lightX, lightY, lightZ);

      // center origin to top-left so coordinates are similar to 2D
      p.push();
      p.translate(-p.width/2, -p.height/2, 0);

      t += 0.009;

      for(let iy=0; iy<rows; iy++){
        for(let ix=0; ix<cols; ix++){
          const x = ix*spacing + spacing/2;
          const y = iy*spacing + spacing/2;

          // base height from p.noise (replacing custom perlin for simplicity and stability)
          const n = p.noise(x*0.03, y*0.03, t);
          const baseZ = p.map(n, 0, 1, -12, 12);

          // distance from mouse in screen coordinates
          const dx = p.mouseX - x;
          const dy = p.mouseY - y;
          const dist = Math.sqrt(dx*dx + dy*dy);

          let push = 0;
          if(dist < influenceRadius){
            const k = 1 - dist / influenceRadius;
            push = Math.pow(k, 2) * maxPush; // eased push
          }

          p.push();
          p.translate(x, y, baseZ + push);

          const rot = p.noise(x*0.01, y*0.01, t+10)*p.PI/44;
          p.rotateZ(rot);

          const shade = p.map(push, 0, maxPush, 50, 255);
            // Make the cube appear black but still pick up blue highlights from the pointLight
            // Black ambient base
              const baseR = 6;
              const baseG = 6;
              const baseB = 6;
            p.ambientMaterial(baseR, baseG, baseB);

              // White specular highlight so the light underneath creates a bright sheen
              const specR = 255;
              const specG = 255;
              const specB = 255; // white specular
            p.specularMaterial(specR, specG, specB);
            // shininess controls specular highlight tightness
              // shininess controls specular highlight tightness — higher = tighter, crisper edge
              p.shininess(800);

          p.box(boxSize);
          p.pop();
        }
      }

      p.pop();
    };
  }, container);
}
