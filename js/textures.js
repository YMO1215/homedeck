// 캔버스로 만드는 절차적 텍스처. 전부 밝은 회색조라 material.color 로 틴트된다.
import * as THREE from 'three';

const cache = new Map();

function cv(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }

function noise(ctx, size, amp, cells = 4) {
  const img = ctx.getImageData(0, 0, size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amp;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  // 큰 얼룩
  for (let k = 0; k < cells * cells; k++) {
    const g = ctx.createRadialGradient(Math.random() * size, Math.random() * size, 0, Math.random() * size, Math.random() * size, size / cells);
    const a = (Math.random() * 0.06).toFixed(3);
    g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  }
}

const GEN = {
  tile(size = 512) {                       // 1 유닛 = 타일 1장
    const c = cv(size), x = c.getContext('2d');
    x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, size, size);
    noise(x, size, 26, 3);
    x.strokeStyle = '#5a5a5a'; x.lineWidth = size * 0.012;
    x.strokeRect(0, 0, size, size);
    return c;
  },
  wood(size = 512) {                       // 1 유닛 = 1m, 판 폭 0.125m
    const c = cv(size), x = c.getContext('2d');
    x.fillStyle = '#e4d9c8'; x.fillRect(0, 0, size, size);
    const pw = size / 8;
    for (let p = 0; p < 8; p++) {
      const off = (p * 0.37 * size) % size;
      x.fillStyle = `rgba(0,0,0,${(Math.random() * 0.08).toFixed(3)})`;
      x.fillRect(p * pw, 0, pw, size);
      for (let g = 0; g < 26; g++) {        // 결
        x.strokeStyle = `rgba(90,60,30,${(0.08 + Math.random() * 0.12).toFixed(3)})`;
        x.lineWidth = 1 + Math.random() * 1.5;
        x.beginPath();
        const gx = p * pw + Math.random() * pw;
        x.moveTo(gx, 0);
        x.bezierCurveTo(gx + 6, size * 0.3, gx - 6, size * 0.6, gx + 3, size);
        x.stroke();
      }
      x.strokeStyle = 'rgba(40,25,10,0.55)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(p * pw, 0); x.lineTo(p * pw, size); x.stroke();
      x.beginPath(); x.moveTo(p * pw, off); x.lineTo((p + 1) * pw, off); x.stroke();
    }
    return c;
  },
  wallpaper(size = 256) {
    const c = cv(size), x = c.getContext('2d');
    x.fillStyle = '#ececec'; x.fillRect(0, 0, size, size);
    noise(x, size, 14, 2);
    return c;
  },
  concrete(size = 512) {
    const c = cv(size), x = c.getContext('2d');
    x.fillStyle = '#d9d9d9'; x.fillRect(0, 0, size, size);
    noise(x, size, 40, 6);
    for (let i = 0; i < 40; i++) {
      x.fillStyle = `rgba(0,0,0,${(Math.random() * 0.12).toFixed(3)})`;
      x.beginPath(); x.arc(Math.random() * size, Math.random() * size, Math.random() * 3, 0, 7); x.fill();
    }
    return c;
  },
  fabric(size = 256) {
    const c = cv(size), x = c.getContext('2d');
    x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, size, size);
    noise(x, size, 34, 1);
    x.strokeStyle = 'rgba(0,0,0,0.05)'; x.lineWidth = 1;
    for (let i = 0; i < size; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, size); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(size, i); x.stroke(); }
    return c;
  },
  marble(size = 512) {
    const c = cv(size), x = c.getContext('2d');
    x.fillStyle = '#efefef'; x.fillRect(0, 0, size, size);
    noise(x, size, 10, 2);
    for (let i = 0; i < 14; i++) {
      x.strokeStyle = `rgba(80,80,90,${(0.08 + Math.random() * 0.2).toFixed(3)})`;
      x.lineWidth = 0.5 + Math.random() * 2;
      x.beginPath();
      let px = Math.random() * size, py = 0;
      x.moveTo(px, py);
      while (py < size) { py += 20 + Math.random() * 30; px += (Math.random() - 0.5) * 60; x.lineTo(px, py); }
      x.stroke();
    }
    return c;
  },
  tvscreen(size = 512) {
    const c = cv(size), x = c.getContext('2d');
    c.width = size * 2;
    const g = x.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, '#2b4d7a'); g.addColorStop(0.45, '#f2a65a'); g.addColorStop(0.5, '#fff1d0'); g.addColorStop(0.55, '#5c6b78'); g.addColorStop(1, '#e9eef2');
    x.fillStyle = g; x.fillRect(0, 0, size * 2, size);
    x.fillStyle = '#3b4650';
    x.beginPath(); x.moveTo(0, size * 0.62);
    for (let i = 0; i <= 12; i++) x.lineTo(i * size / 6, size * (0.45 + Math.random() * 0.2));
    x.lineTo(size * 2, size); x.lineTo(0, size); x.fill();
    x.fillStyle = '#fff'; x.font = `${size * 0.09}px sans-serif`; x.fillText('UHD TV', size * 1.35, size * 0.9);
    return c;
  },
};

// kind 별 원본 텍스처(캐시). 사용처마다 clone 해서 repeat 만 다르게 준다.
export function baseTexture(kind) {
  if (!GEN[kind]) return null;
  if (!cache.has(kind)) {
    const t = new THREE.CanvasTexture(GEN[kind]());
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    cache.set(kind, t);
  }
  return cache.get(kind);
}

export function texture(kind, sizeX = 1, sizeY = sizeX) {
  const b = baseTexture(kind);
  if (!b) return null;
  const t = b.clone();
  t.repeat.set(1 / sizeX, 1 / sizeY);
  t.needsUpdate = true;
  return t;
}

// 마감 프리셋: 패턴 1유닛의 실제 크기(m)·거칠기·범프
export const FINISHES = {
  plain:     { label: '무광',      size: null, rough: 0.6,  bump: 0 },
  gloss:     { label: '유광',      size: null, rough: 0.15, bump: 0 },
  wallpaper: { label: '벽지',      size: 0.5,  rough: 0.9,  bump: 0.004 },
  tile:      { label: '타일 600',  size: 0.6,  rough: 0.35, bump: 0.012 },
  tile30:    { label: '타일 300',  size: 0.3,  rough: 0.35, bump: 0.012, kind: 'tile' },
  wood:      { label: '원목 마루', size: 1.0,  rough: 0.5,  bump: 0.006 },
  concrete:  { label: '콘크리트',  size: 1.5,  rough: 0.85, bump: 0.01 },
  marble:    { label: '대리석',    size: 1.2,  rough: 0.18, bump: 0.002 },
  fabric:    { label: '패브릭',    size: 0.3,  rough: 1.0,  bump: 0.006 },
};
