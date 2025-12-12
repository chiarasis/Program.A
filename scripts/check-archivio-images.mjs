import fs from 'node:fs';
import path from 'node:path';
import opere from '../src/data/opere.json' assert { type: 'json' };

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const publicDir = path.resolve(process.cwd(), 'public', 'drive-opere');

const expected = opere.map(o => ({
  artist: o.artist,
  title: o.title,
  filenameJpg: `${slugify(o.artist)}-${slugify(o.title)}.jpg`,
  filenamePng: `${slugify(o.artist)}-${slugify(o.title)}.png`
}));

let missing = [];
let present = [];

for (const e of expected) {
  const jpgPath = path.join(publicDir, e.filenameJpg);
  const pngPath = path.join(publicDir, e.filenamePng);
  const hasJpg = fs.existsSync(jpgPath);
  const hasPng = fs.existsSync(pngPath);
  if (hasJpg || hasPng) {
    present.push({ ...e, found: hasJpg ? e.filenameJpg : e.filenamePng });
  } else {
    missing.push(e);
  }
}

console.log(`Present: ${present.length} / ${expected.length}`);
if (present.length) {
  console.log('Examples of present files:');
  console.log(present.slice(0, 10).map(p => ` - ${p.found}`).join('\n'));
}

if (missing.length) {
  console.log(`\nMissing (${missing.length}):`);
  console.log(missing.map(m => ` - ${m.filenameJpg} | ${m.filenamePng}`).join('\n'));
  console.log(`\nPlace images into: ${publicDir}`);
} else {
  console.log('\nAll images found.');
}
