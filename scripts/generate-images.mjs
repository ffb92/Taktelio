import {readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

// Regenerates the illustrative design assets in public/images with fal AI (Recraft V3).
// Requires FAL_KEY in the environment or in .env.local. Never commit the key.
//
// The login hero photograph (auth-hero-photo.webp) was generated separately with
// fal-ai/flux/dev, 1024x1408, seed 3392, and this prompt:
// "Photorealistic wide shot of a youth football team training on a green pitch in
// the evening, floodlights beginning to glow, a coach in a dark jacket demonstrating
// a pass, kids in bibs listening, training cones and footballs scattered on the grass,
// slightly misty air, cinematic and warm, authentic German amateur club, no text,
// no logos, no watermarks."
// The result was resized to 1400 px wide and saved as WebP (quality 84).

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/images');

const PALETTE = [
  {r: 0, g: 88, b: 0},
  {r: 176, g: 248, b: 0},
  {r: 255, g: 255, b: 255}
];

const BASE = 'Minimalist editorial line illustration for a football coaching app, pure white background. ';
const TAIL = ' Clean deep forest-green outlines with flat fills only in white and vivid lime green, no gradients, no shading, no texture, no extra colors. Modern sports club visual identity, generous negative space, centered composition. No text, no letters, no numbers, no logos, no watermark.';

const ASSETS = [
  {
    name: 'empty-plan',
    size: 'square_hd',
    prompt: BASE + 'A football coach stands beside a tactical board showing a simple passing drill with three arrows; a whistle, three training cones and a football lie at his feet.' + TAIL
  },
  {
    name: 'social-soon',
    size: 'square_hd',
    prompt: BASE + 'A large megaphone with a football flying out of it, and a few simple social media symbols around it: a heart, a speech bubble and a play button.' + TAIL
  },
  {
    name: 'scouting-soon',
    size: 'square_hd',
    prompt: BASE + 'A football scout looking through binoculars at a tactical football pitch, with a magnifying glass and a single star beside him.' + TAIL
  }
];

async function readKey() {
  if (process.env.FAL_KEY) return process.env.FAL_KEY;
  try {
    const text = await readFile(path.join(ROOT, '.env.local'), 'utf8');
    const match = text.match(/^\s*FAL_KEY\s*=\s*(.+?)\s*$/m);
    if (match) return match[1].replace(/^["']|["']$/g, '');
  } catch {}
  throw new Error('FAL_KEY fehlt. Lege ihn in .env.local ab oder setze ihn als Umgebungsvariable.');
}

const only = process.argv.slice(2);
const wanted = only.length ? ASSETS.filter(asset => only.includes(asset.name)) : ASSETS;
if (!wanted.length) throw new Error(`Unbekannte Bildnamen: ${only.join(', ')}`);

const key = await readKey();
await mkdir(OUT, {recursive: true});

for (const asset of wanted) {
  process.stdout.write(`generating ${asset.name} … `);
  const response = await fetch('https://fal.run/fal-ai/recraft/v3/text-to-image', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'Authorization': 'Key ' + key},
    body: JSON.stringify({
      prompt: asset.prompt,
      image_size: asset.size,
      style: 'vector_illustration/line_art',
      colors: PALETTE,
      enable_safety_checker: true
    })
  });
  const text = await response.text();
  if (!response.ok) {
    console.log('FEHLGESCHLAGEN');
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  const imageUrl = JSON.parse(text).images?.[0]?.url;
  if (!imageUrl) throw new Error('Antwort enthielt kein Bild.');
  const download = await fetch(imageUrl);
  if (!download.ok) throw new Error(`Download fehlgeschlagen: HTTP ${download.status}`);
  const buffer = Buffer.from(await download.arrayBuffer());
  const head = buffer.subarray(0, 200).toString('utf8').trimStart();
  const type = download.headers.get('content-type') || '';
  const extension = head.startsWith('<svg') || type.includes('svg') ? 'svg' : type.includes('png') ? 'png' : 'webp';
  const file = path.join(OUT, `${asset.name}.${extension}`);
  await writeFile(file, buffer);
  console.log(`${path.relative(ROOT, file)} (${(buffer.length / 1024).toFixed(0)} KB)`);
}
