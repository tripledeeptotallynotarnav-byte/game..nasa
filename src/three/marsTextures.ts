import * as THREE from 'three';

export function createMarsRegolithTextures(maxAnisotropy: number): {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 256;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bCtx = bumpCanvas.getContext('2d')!;

  ctx.fillStyle = '#9E472D';
  ctx.fillRect(0, 0, size, size);
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, size, size);

  // Deterministic pseudo-random craters & dust ripples (zero external assets)
  let seed = 42;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  for (let i = 0; i < 650; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1.5 + rand() * 8;
    const warm = rand() > 0.45;
    ctx.fillStyle = warm ? 'rgba(194, 92, 56, 0.28)' : 'rgba(104, 42, 26, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    const shade = Math.floor(95 + rand() * 75);
    bCtx.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.35)`;
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.fill();
  }

  // Subtle wind-blown dune striations
  ctx.strokeStyle = 'rgba(218, 118, 76, 0.16)';
  ctx.lineWidth = 2;
  for (let y = 12; y < size; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.33, y - 5, size * 0.66, y + 5, size, y);
    ctx.stroke();
  }

  const heightData = bCtx.getImageData(0, 0, size, size);
  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = size;
  normalCanvas.height = size;
  const normalContext = normalCanvas.getContext('2d')!;
  const normalData = normalContext.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const index = (y * size + x) * 4;
      const left = heightData.data[(y * size + ((x + size - 1) % size)) * 4] / 255;
      const right = heightData.data[(y * size + ((x + 1) % size)) * 4] / 255;
      const up = heightData.data[(((y + size - 1) % size) * size + x) * 4] / 255;
      const down = heightData.data[(((y + 1) % size) * size + x) * 4] / 255;
      const nx = (left - right) * 2.2;
      const ny = (up - down) * 2.2;
      const length = Math.hypot(nx, ny, 1);
      normalData.data[index] = ((nx / length) * 0.5 + 0.5) * 255;
      normalData.data[index + 1] = ((ny / length) * 0.5 + 0.5) * 255;
      normalData.data[index + 2] = ((1 / length) * 0.5 + 0.5) * 255;
      normalData.data[index + 3] = 255;
    }
  }
  normalContext.putImageData(normalData, 0, 0);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(10, 10);
  map.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(10, 10);
  bumpMap.anisotropy = maxAnisotropy;

  const normalMap = new THREE.CanvasTexture(normalCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(10, 10);
  normalMap.anisotropy = maxAnisotropy;

  return { map, bumpMap, normalMap };
}

export function createSolarCellTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0A1E3F';
  ctx.fillRect(0, 0, size, size);

  // Cell grid
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  const cols = 6;
  const rows = 4;
  const cw = size / cols;
  const ch = size / rows;

  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cw, 0);
    ctx.lineTo(c * cw, size);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * ch);
    ctx.lineTo(size, r * ch);
    ctx.stroke();
  }

  // Subtle cell sheen lines
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.25)';
  ctx.lineWidth = 1;
  for (let c = 0; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cw + cw * 0.5, 0);
    ctx.lineTo(c * cw + cw * 0.5, size);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 8, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(10, 6, 8, 0.72)');
  grad.addColorStop(0.6, 'rgba(10, 6, 8, 0.28)');
  grad.addColorStop(1, 'rgba(10, 6, 8, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDustOverlayTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  let seed = 808;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // Mottled iron-oxide dust patches & fine grit
  for (let i = 0; i < 480; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 2 + rand() * 11;
    const alpha = 0.08 + rand() * 0.24;
    ctx.fillStyle = rand() > 0.4 ? `rgba(184, 75, 43, ${alpha})` : `rgba(138, 52, 28, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wind-swept red dust streaks
  ctx.strokeStyle = 'rgba(196, 88, 52, 0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 24; i++) {
    const y = rand() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.quadraticCurveTo(size * 0.5, y + (rand() - 0.5) * 14, size, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

