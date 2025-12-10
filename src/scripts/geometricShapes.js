// geometricShapes.js
const compositions = [
  [
    { w: 450, h: 280, t: 20, l: 100, c: 'text-light' },
    { w: 380, h: 320, t: 80, l: 350, c: 'acc-color' },
    { w: 200, h: 400, t: 40, l: 600, c: 'text-light' },
    { w: 280, h: 180, t: 200, l: 200, c: 'acc-color' },
    { w: 320, h: 220, t: 180, l: 500, c: 'text-light' },
    { w: 150, h: 250, t: 100, l: 450, c: 'bg-dark' }
  ],
  [
    { w: 400, h: 350, t: 30, l: 150, c: 'acc-color' },
    { w: 350, h: 280, t: 90, l: 400, c: 'text-light' },
    { w: 220, h: 380, t: 60, l: 620, c: 'acc-color' },
    { w: 300, h: 200, t: 220, l: 250, c: 'text-light' },
    { w: 180, h: 280, t: 140, l: 520, c: 'bg-dark' },
    { w: 260, h: 160, t: 260, l: 450, c: 'acc-color' }
  ]
];

document.querySelectorAll('.geo-container').forEach((c, i) => {
  compositions[i % 2].forEach(s => {
    const d = document.createElement('div');
    d.className = `geo-shape ${s.c}`;
    d.style.cssText = `width:${s.w}px;height:${s.h}px;top:${s.t}px;left:${s.l}px`;
    c.appendChild(d);
  });
});
