// 건축(벽·바닥·천장·문·창·조명기구)과 가구 빌더.
import * as THREE from 'three';
import { S, H, mx, mz, WALLS, ROOMS, DOORS, FIXTURES, LIGHTS, CENTER } from './plan.js';
import { getMaterial, tinted, SPECIAL } from './materials.js';

// ── 기본 도형 ──────────────────────────────────────────────────
// BoxGeometry 의 UV 를 실제 크기(m)로 늘려 텍스처가 면마다 같은 축척으로 깔리게 한다
export function boxGeo(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = dims[f];
    for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * su, uv.getY(k) * sv); }
  }
  return g;
}

// y 는 바닥(아랫면) 높이. 중심은 (x, y+h/2, z)
export function bx(parent, w, h, d, mat, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(boxGeo(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
  if (o.paint) m.userData.paint = o.paint;
  parent.add(m); return m;
}
export function cyl(parent, r, h, mat, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(o.rTop ?? r, r, h, o.seg || 24), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}

const P = (key) => getMaterial(key);
const paintMesh = (m, key) => { m.userData.paint = key; return m; };

// ── 벽 ─────────────────────────────────────────────────────────
function wallSegment(g, s0, s1, t, y0, y1, mat, key) {
  if (s1 - s0 <= 0.001 || y1 - y0 <= 0.001) return;
  const m = bx(g, s1 - s0, y1 - y0, t, mat, (s0 + s1) / 2, y0, 0);
  paintMesh(m, key);
}

function windowIn(g, s0, s1, t, sill, head, gap) {
  const fw = 0.05, fm = P('frame.white');
  const L = s1 - s0, cx = (s0 + s1) / 2, ft = Math.min(t, 0.1);
  bx(g, L, fw, ft, fm, cx, sill, 0);
  bx(g, L, fw, ft, fm, cx, head - fw, 0);
  bx(g, fw, head - sill, ft, fm, s0 + fw / 2, sill, 0);
  bx(g, fw, head - sill, ft, fm, s1 - fw / 2, sill, 0);
  const n = gap.mull || 0;
  for (let i = 1; i <= n; i++) bx(g, 0.035, head - sill, ft * 0.7, fm, s0 + (L * i) / (n + 1), sill, 0);
  if (gap.hbar) bx(g, L, 0.035, ft * 0.7, fm, cx, gap.hbar, 0);
  const glass = bx(g, L - fw * 2, head - sill - fw * 2, 0.008, SPECIAL.glass, cx, sill + fw, 0, { cast: false, receive: false });
  glass.userData.glass = true;
}

function doorJambs(g, s0, s1, t, head, key) {
  const fm = P(key), jw = 0.04, jt = t + 0.02;
  bx(g, jw, head, jt, fm, s0 + jw / 2, 0, 0);
  bx(g, jw, head, jt, fm, s1 - jw / 2, 0, 0);
  bx(g, s1 - s0, jw, jt, fm, (s0 + s1) / 2, head - jw, 0);
}

export function buildWalls(scene) {
  for (const w of WALLS) {
    const ax = mx(w.a[0]), az = mz(w.a[1]), bxx = mx(w.b[0]), bz = mz(w.b[1]);
    const dx = bxx - ax, dz = bz - az, L = Math.hypot(dx, dz);
    const g = new THREE.Group();
    g.position.set(ax, 0, az);
    g.rotation.y = Math.atan2(-dz, dx);
    scene.add(g);
    const t = w.t * S, mat = P(w.paint), h = w.h || H;
    const gaps = (w.gaps || []).map(x => ({ ...x, s0: x.from * S, s1: x.to * S })).sort((a, b) => a.s0 - b.s0);
    let cur = 0;
    for (const gap of gaps) {
      wallSegment(g, cur, gap.s0, t, 0, h, mat, w.paint);
      if (gap.kind === 'window') {
        wallSegment(g, gap.s0, gap.s1, t, 0, gap.sill, mat, w.paint);
        wallSegment(g, gap.s0, gap.s1, t, gap.head, h, mat, w.paint);
        windowIn(g, gap.s0, gap.s1, t, gap.sill, gap.head, gap);
      } else {
        wallSegment(g, gap.s0, gap.s1, t, gap.head, h, mat, w.paint);
        doorJambs(g, gap.s0, gap.s1, t, gap.head, gap.frame || (gap.kind === 'open' ? w.paint : 'frame.white'));
      }
      cur = gap.s1;
    }
    wallSegment(g, cur, L, t, 0, h, mat, w.paint);
  }
}

// ── 바닥/천장 ──────────────────────────────────────────────────
function polyShape(poly, flipY) {
  const sh = new THREE.Shape();
  poly.forEach(([x, y], i) => { const X = mx(x), Y = mz(y) * (flipY ? -1 : 1); i ? sh.lineTo(X, Y) : sh.moveTo(X, Y); });
  sh.closePath(); return sh;
}

export function buildFloors(scene) {
  for (const r of ROOMS) {
    const f = new THREE.Mesh(new THREE.ShapeGeometry(polyShape(r.poly, true)), P(r.floor));
    f.rotation.x = -Math.PI / 2; f.receiveShadow = true;
    f.userData.paint = r.floor; f.userData.room = r.id; scene.add(f);
    const c = new THREE.Mesh(new THREE.ShapeGeometry(polyShape(r.poly, false)), P(r.ceil));
    c.rotation.x = Math.PI / 2; c.position.y = H; c.castShadow = true; c.receiveShadow = true;
    c.userData.paint = r.ceil; c.userData.room = r.id; scene.add(c);
  }
}

// ── 문짝 ───────────────────────────────────────────────────────
export function buildDoors(scene) {
  for (const d of DOORS) {
    const hx = mx(d.hinge[0]), hz = mz(d.hinge[1]), ex = mx(d.end[0]), ez = mz(d.end[1]);
    const dx = ex - hx, dz = ez - hz, L = Math.hypot(dx, dz) - 0.06;
    const g = new THREE.Group();
    g.position.set(hx, 0, hz);
    g.rotation.y = Math.atan2(-dz, dx) + THREE.MathUtils.degToRad(d.open);
    scene.add(g);
    const hgt = d.kind === 'glass' ? 2.1 : 2.05;
    if (d.kind === 'glass') {
      const fm = P('frame.black');
      bx(g, L, 0.04, 0.04, fm, L / 2, 0.02, 0); bx(g, L, 0.04, 0.04, fm, L / 2, hgt - 0.04, 0);
      bx(g, 0.04, hgt, 0.04, fm, 0.05, 0, 0); bx(g, 0.04, hgt, 0.04, fm, L - 0.02, 0, 0);
      bx(g, L - 0.08, hgt - 0.08, 0.008, SPECIAL.glass, L / 2, 0.04, 0, { cast: false });
      bx(g, 0.03, 0.3, 0.05, fm, L - 0.12, 0.95, 0);
    } else {
      const key = d.kind === 'front' ? 'door.front' : 'door';
      const leaf = bx(g, L, hgt, 0.04, P(key), 0.03 + L / 2, 0, 0);
      leaf.userData.paint = key;
      const hm = d.kind === 'front' ? P('appliance') : P('steel');
      bx(g, 0.12, 0.02, 0.05, hm, L - 0.1, 1.0, 0.04);      // 손잡이
      if (d.kind === 'front') bx(g, 0.07, 0.22, 0.03, P('appliance'), L - 0.1, 0.9, 0.035);
    }
  }
}

// ── 조명 기구 / 광원 ───────────────────────────────────────────
export function buildFixtures(scene) {
  for (const f of FIXTURES) {
    const x = mx(f.x), z = mz(f.y);
    if (f.kind === 'pendant') {
      const g = new THREE.Group(); g.position.set(x, H, z); scene.add(g);
      cyl(g, 0.06, 0.015, SPECIAL.lampBody, 0, -0.015, 0);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 12, 1, true), SPECIAL.lampBody);
      cone.material = cone.material.clone(); cone.material.side = THREE.DoubleSide;
      cone.position.y = -0.1; cone.rotation.x = Math.PI; g.add(cone);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), SPECIAL.lamp);
      bulb.position.y = -0.16; g.add(bulb);
    } else if (f.kind === 'panel') {
      bx(scene, 0.6, 0.03, 0.6, SPECIAL.panelLight, x, H - 0.03, z, { cast: false });
    } else if (f.kind === 'cassette') {
      bx(scene, 0.84, 0.03, 0.84, P('frame.white'), x, H - 0.03, z, { cast: false });
      for (const [ox, oz, w, d] of [[0, -0.34, 0.6, 0.06], [0, 0.34, 0.6, 0.06], [-0.34, 0, 0.06, 0.6], [0.34, 0, 0.06, 0.6]])
        bx(scene, w, 0.005, d, SPECIAL.dark, x + ox, H - 0.035, z + oz, { cast: false });
    }
  }
  for (const l of LIGHTS) {
    const pl = new THREE.PointLight(0xfff0dc, l.i, 0, 2);
    pl.position.set(mx(l.x), H - 0.25, mz(l.y));
    scene.add(pl);
  }
}

export function buildExterior(scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), SPECIAL.ground);
  ground.rotation.x = -Math.PI / 2; ground.position.set(CENTER.x, -0.02, CENTER.z); ground.receiveShadow = true;
  scene.add(ground);
  for (const [ox, oz, w, h, d] of [[-30, -6, 14, 18, 30], [34, 10, 16, 24, 26], [4, -34, 40, 14, 12], [-8, 40, 30, 20, 12]])
    bx(scene, w, h, d, SPECIAL.building, CENTER.x + ox, 0, CENTER.z + oz, { cast: false });
}

// ── 가구 빌더 ──────────────────────────────────────────────────
// 각 항목: label, parts{part:paintKey}, def{w,d,h}, build(g, it, M)
// 좌표계: 발자국 중심이 원점, 바닥 y=0, 정면 +z.
function cabinet(g, it, M, o = {}) {
  const { w, d } = it, h = o.h ?? it.h, y = o.y ?? 0, dt = o.doorT ?? 0.02;
  const body = M(o.bodyPart || 'body');
  bx(g, w, h, d - dt, body, 0, y, -dt / 2);
  bx(g, w - 0.01, h - 0.01, 0.002, SPECIAL.dark, 0, y, d / 2 - dt - 0.001, { cast: false });   // 도어 틈 그림자
  const n = o.doors ?? it.doors ?? Math.max(1, Math.round(w / 0.45));
  const dw = w / n;
  if (o.drawers) {
    const dh = h / o.drawers;
    for (let i = 0; i < o.drawers; i++) bx(g, w - 0.006, dh - 0.006, dt, body, 0, y + i * dh + 0.003, d / 2 - dt / 2);
  } else {
    for (let i = 0; i < n; i++) bx(g, dw - 0.004, h - 0.006, dt, body, -w / 2 + dw * (i + 0.5), y + 0.003, d / 2 - dt / 2);
  }
  if (o.groove) for (let i = 0; i < n; i++)     // 손잡이 홈(상단 어두운 선)
    bx(g, dw - 0.03, 0.02, 0.004, SPECIAL.dark, -w / 2 + dw * (i + 0.5), y + h - 0.05, d / 2 + 0.002, { cast: false });
  if (o.plinth) { bx(g, w - 0.02, 0.1, d - 0.08, SPECIAL.dark, 0, y - 0.1, -0.03, { cast: false }); }
}

function shelfColumn(g, w, h, d, mat, x, y, z, n = 5) {
  bx(g, w, h, 0.02, mat, x, y, z - d / 2 + 0.01);
  bx(g, 0.02, h, d, mat, x - w / 2 + 0.01, y, z); bx(g, 0.02, h, d, mat, x + w / 2 - 0.01, y, z);
  for (let i = 0; i <= n; i++) bx(g, w, 0.02, d, mat, x, y + (h - 0.02) * i / n, z);
}

function faucet(g, x, y, z) {
  cyl(g, 0.014, 0.22, P('steel'), x, y, z);
  bx(g, 0.028, 0.02, 0.14, P('steel'), x, y + 0.2, z + 0.06);
}

export const BUILDERS = {
  wardrobe: { label: '옷장', parts: { body: 'wardrobe' }, def: { w: 1.2, d: 0.6, h: 2.2 },
    build(g, it, M) { cabinet(g, it, M); } },
  lowcab: { label: '하부 수납장', parts: { body: 'study.cabinet', top: 'study.top' }, def: { w: 1.2, d: 0.45, h: 0.85 },
    build(g, it, M) { cabinet(g, it, M, { h: it.h - 0.03 }); bx(g, it.w + 0.02, 0.03, it.d + 0.02, M('top'), 0, it.h - 0.03, 0.01); } },
  tallcab: { label: '키큰 수납장', parts: { body: 'study.cabinet' }, def: { w: 0.8, d: 0.45, h: 2.2 },
    build(g, it, M) { cabinet(g, it, M); } },
  drawers: { label: '서랍장', parts: { body: 'wardrobe' }, def: { w: 0.9, d: 0.45, h: 0.9 },
    build(g, it, M) { cabinet(g, it, M, { drawers: 3 }); } },
  shoecab: { label: '신발장', parts: { body: 'shoe' }, def: { w: 1.2, d: 0.4, h: 2.2 },
    build(g, it, M) {
      cabinet(g, it, M, { h: 1.0 });
      cabinet(g, it, M, { y: 1.35, h: it.h - 1.35 });
      bx(g, it.w, 0.35, it.d - 0.02, M('body'), 0, 1.0, -0.01);            // 니치 몸체
      bx(g, it.w - 0.06, 0.31, it.d - 0.1, SPECIAL.panelLight, 0, 1.02, 0.03, { cast: false }); // 간접등 니치
    } },
  kcounter: { label: '주방 하부장', parts: { body: 'kitchen.door', top: 'kitchen.top', steel: 'steel', black: 'appliance' }, def: { w: 1.8, d: 0.6, h: 0.88 },
    build(g, it, M) {
      const { w, d, h } = it;
      cabinet(g, it, M, { y: 0.1, h: h - 0.14, groove: true, plinth: true });
      bx(g, w + 0.02, 0.04, d + 0.03, M('top'), 0, h - 0.04, 0.015);
      if (it.sink != null) {
        bx(g, 0.76, 0.012, 0.44, M('steel'), it.sink, h - 0.006, 0.02);
        bx(g, 0.7, 0.004, 0.38, SPECIAL.dark, it.sink, h + 0.006, 0.02, { cast: false });
        faucet(g, it.sink, h, -d / 2 + 0.08);
      }
      if (it.cooktop != null) {
        bx(g, 0.78, 0.008, 0.52, M('black'), it.cooktop, h, 0);
        for (const [ox, oz] of [[-0.2, -0.13], [0.2, -0.13], [-0.2, 0.13], [0.2, 0.13]])
          cyl(g, 0.1, 0.002, P('steel'), it.cooktop + ox, h + 0.008, oz);
      }
      if (it.dw != null) bx(g, 0.6, h - 0.18, 0.024, M('steel'), it.dw, 0.12, d / 2 - 0.012);
    } },
  kupper: { label: '주방 상부장', parts: { body: 'kitchen.upper' }, def: { w: 1.2, d: 0.35, h: 0.72 },
    build(g, it, M) { cabinet(g, it, M, { y: 1.45, groove: true }); bx(g, it.w, 0.01, it.d, SPECIAL.panelLight, 0, 1.44, 0, { cast: false }); } },
  hood: { label: '후드', parts: { body: 'steel' }, def: { w: 0.9, d: 0.5, h: 0.7 },
    build(g, it, M) { bx(g, it.w, 0.05, it.d, M('body'), 0, 1.6, 0); bx(g, 0.26, H - 1.65, 0.26, M('body'), 0, 1.65, -it.d / 2 + 0.15); bx(g, it.w - 0.1, 0.005, it.d - 0.1, SPECIAL.panelLight, 0, 1.595, 0, { cast: false }); } },
  ovencol: { label: '오븐 키큰장', parts: { body: 'kitchen.door', black: 'appliance', steel: 'steel' }, def: { w: 0.7, d: 0.62, h: 2.2 },
    build(g, it, M) {
      const { w, d, h } = it;
      bx(g, w, h, d - 0.02, M('body'), 0, 0, -0.01);
      bx(g, w - 0.004, 0.86, 0.02, M('body'), 0, 0.003, d / 2 - 0.01);
      bx(g, w - 0.004, h - 2.02, 0.02, M('body'), 0, 2.02, d / 2 - 0.01);
      for (const y of [0.86, 1.44]) {
        bx(g, 0.62, 0.58, 0.02, M('black'), 0, y, d / 2 - 0.01);
        bx(g, 0.58, 0.012, 0.03, M('steel'), 0, y + 0.5, d / 2 + 0.005);
        bx(g, 0.5, 0.05, 0.001, SPECIAL.panelLight, 0, y + 0.42, d / 2 + 0.001, { cast: false }).material = SPECIAL.dark;
      }
    } },
  fridge: { label: '냉장고', parts: { body: 'fridge', steel: 'steel' }, def: { w: 0.85, d: 0.75, h: 1.85 },
    build(g, it, M) {
      const { w, d, h } = it;
      bx(g, w, h, d, M('body'), 0, 0, 0);
      bx(g, w - 0.02, 0.006, 0.004, SPECIAL.dark, 0, h * 0.62, d / 2 + 0.001, { cast: false });
      bx(g, 0.006, h * 0.6, 0.004, SPECIAL.dark, 0, 0.01, d / 2 + 0.001, { cast: false });
      bx(g, 0.025, 0.5, 0.03, M('steel'), -0.03, h * 0.62 + 0.15, d / 2 + 0.015); bx(g, 0.025, 0.5, 0.03, M('steel'), 0.03, h * 0.62 + 0.15, d / 2 + 0.015);
    } },
  washtower: { label: '세탁기·건조기 타워', parts: { body: 'washer', glass: 'appliance' }, def: { w: 0.7, d: 0.77, h: 1.85 },
    build(g, it, M) {
      const { w, d, h } = it;
      bx(g, w, h, d, M('body'), 0, 0, 0);
      for (const y of [0.42, 1.3]) {
        const door = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.03, 32), M('glass'));
        door.rotation.x = Math.PI / 2; door.position.set(0, y, d / 2 + 0.015); door.castShadow = true; g.add(door);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.012, 8, 32), P('steel'));
        ring.position.set(0, y, d / 2 + 0.03); g.add(ring);
      }
      bx(g, w - 0.08, 0.1, 0.004, SPECIAL.dark, 0, 0.9, d / 2 + 0.001, { cast: false });
    } },
  bed: { label: '침대(퀸)', parts: { frame: 'bed.frame', linen: 'bed.linen' }, def: { w: 1.55, d: 2.1, h: 0.5 },
    build(g, it, M) {
      const { w, d } = it;
      bx(g, w + 0.08, 0.06, d + 0.08, M('frame'), 0, 0.17, 0);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, 0.06, 0.17, 0.06, M('frame'), x * (w / 2 - 0.05), 0, z * (d / 2 - 0.08));
      bx(g, w, 0.22, d, M('linen'), 0, 0.23, 0);
      bx(g, w + 0.03, 0.08, d * 0.68, M('linen'), 0, 0.45, d * 0.16);
      bx(g, w * 0.4, 0.12, 0.42, M('linen'), -w * 0.24, 0.45, -d / 2 + 0.3); bx(g, w * 0.4, 0.12, 0.42, M('linen'), w * 0.24, 0.45, -d / 2 + 0.3);
    } },
  bed1: { label: '침대(싱글)', parts: { frame: 'bed.frame', linen: 'bed.linen' }, def: { w: 1.0, d: 2.0, h: 0.5 },
    build(g, it, M) { BUILDERS.bed.build(g, it, M); } },
  sofa: { label: '소파(3인)', parts: { fabric: 'sofa' }, def: { w: 2.6, d: 0.95, h: 0.75 },
    build(g, it, M) {
      const { w, d, h } = it, n = Math.max(1, Math.round(w / 0.85)), a = 0.18, m = M('fabric');
      bx(g, w, 0.32, d, m, 0, 0.05, 0);
      bx(g, w, h - 0.05, 0.2, m, 0, 0.05, -d / 2 + 0.1);
      bx(g, a, 0.6, d, m, -w / 2 + a / 2, 0.05, 0); bx(g, a, 0.6, d, m, w / 2 - a / 2, 0.05, 0);
      const cw = (w - 2 * a) / n;
      for (let i = 0; i < n; i++) {
        bx(g, cw - 0.03, 0.14, d - 0.3, m, -w / 2 + a + cw * (i + 0.5), 0.37, 0.1);
        bx(g, cw - 0.05, 0.42, 0.14, m, -w / 2 + a + cw * (i + 0.5), 0.37, -d / 2 + 0.28);
      }
    } },
  armchair: { label: '1인 소파', parts: { fabric: 'sofa' }, def: { w: 0.9, d: 0.9, h: 0.75 },
    build(g, it, M) { BUILDERS.sofa.build(g, it, M); } },
  ottoman: { label: '스툴', parts: { fabric: 'sofa' }, def: { w: 0.8, d: 0.8, h: 0.42 },
    build(g, it, M) { bx(g, it.w, it.h - 0.1, it.d, M('fabric'), 0, 0.05, 0); bx(g, it.w - 0.04, 0.1, it.d - 0.04, M('fabric'), 0, it.h - 0.1, 0); } },
  tvwall: { label: 'TV 붙박이장', parts: { body: 'tvwall', shelf: 'tvwall.shelf', tv: 'appliance' }, def: { w: 3.8, d: 0.36, h: 2.28 },
    build(g, it, M) {
      const { w, d, h } = it, cw = 0.65;
      cabinet(g, it, M, { h: 0.45, doors: Math.round(w / 0.6) });
      shelfColumn(g, cw, h - 0.45, d, M('shelf'), -w / 2 + cw / 2, 0.45, 0);
      shelfColumn(g, cw, h - 0.45, d, M('shelf'), w / 2 - cw / 2, 0.45, 0);
      const mw = w - 2 * cw;
      bx(g, mw, h - 0.45, 0.06, M('body'), 0, 0.45, -d / 2 + 0.03);
      cabinet(g, { w: mw, d, h: 0.5, doors: 3 }, M, { y: h - 0.5 });
      bx(g, 1.5, 0.86, 0.05, M('tv'), 0, 0.95, -d / 2 + 0.09);
      const scr = bx(g, 1.44, 0.8, 0.004, SPECIAL.screen, 0, 0.98, -d / 2 + 0.117, { cast: false });
      scr.material = SPECIAL.screen;
    } },
  tvstand: { label: 'TV 스탠드', parts: { body: 'tvwall', tv: 'appliance' }, def: { w: 1.8, d: 0.4, h: 0.5 },
    build(g, it, M) {
      cabinet(g, it, M, { doors: 3 });
      bx(g, 1.3, 0.75, 0.04, M('tv'), 0, it.h + 0.05, 0); bx(g, 0.5, 0.05, 0.25, M('tv'), 0, it.h, 0);
      bx(g, 1.24, 0.69, 0.004, SPECIAL.screen, 0, it.h + 0.08, 0.022, { cast: false });
    } },
  vanity: { label: '화장대', parts: { body: 'wardrobe' }, def: { w: 0.75, d: 0.5, h: 0.75 },
    build(g, it, M) {
      cabinet(g, it, M, { h: it.h - 0.4, y: 0.4, drawers: 1 });
      bx(g, it.w, 0.03, it.d, M('body'), 0, it.h - 0.03, 0);
      bx(g, 0.03, 0.4, it.d - 0.05, M('body'), -it.w / 2 + 0.015, 0, 0); bx(g, 0.03, 0.4, it.d - 0.05, M('body'), it.w / 2 - 0.015, 0, 0);
      bx(g, it.w - 0.05, 0.9, 0.02, SPECIAL.mirror, 0, 1.0, -it.d / 2 + 0.01, { cast: false });
    } },
  basin: { label: '세면대', parts: { body: 'sanitary' }, def: { w: 0.6, d: 0.45, h: 0.85 },
    build(g, it, M) {
      bx(g, it.w, 0.26, it.d, M('body'), 0, it.h - 0.26, 0);
      bx(g, it.w - 0.1, 0.004, it.d - 0.12, SPECIAL.dark, 0, it.h + 0.001, 0.02, { cast: false });
      faucet(g, 0, it.h, -it.d / 2 + 0.07);
    } },
  mirrorcab: { label: '거울장', parts: { body: 'sanitary' }, def: { w: 0.9, d: 0.12, h: 0.7 },
    build(g, it, M) {
      bx(g, it.w, it.h, it.d - 0.01, M('body'), 0, 1.2, -0.005);
      bx(g, it.w / 2 - 0.006, it.h - 0.01, 0.006, SPECIAL.mirror, -it.w / 4, 1.205, it.d / 2 - 0.003, { cast: false });
      bx(g, it.w / 2 - 0.006, it.h - 0.01, 0.006, SPECIAL.mirror, it.w / 4, 1.205, it.d / 2 - 0.003, { cast: false });
    } },
  toilet: { label: '양변기', parts: { body: 'sanitary' }, def: { w: 0.4, d: 0.7, h: 0.8 },
    build(g, it, M) {
      const m = M('body');
      bx(g, 0.38, 0.4, 0.18, m, 0, 0.38, -it.d / 2 + 0.09);
      const bowl = cyl(g, 0.19, 0.38, m, 0, 0, it.d / 2 - 0.24); bowl.scale.z = 1.4;
      bx(g, 0.36, 0.03, 0.46, m, 0, 0.38, it.d / 2 - 0.25);
      bx(g, 0.1, 0.008, 0.03, P('steel'), 0, 0.78, -it.d / 2 + 0.09, { cast: false });
    } },
  shower: { label: '샤워기', parts: { steel: 'steel' }, def: { w: 0.3, d: 0.1, h: 2.1 },
    build(g, it, M) {
      const m = M('steel');
      cyl(g, 0.012, 1.7, m, 0, 0.5, 0);
      bx(g, 0.02, 0.02, 0.32, m, 0, 2.0, 0.15);
      const head = cyl(g, 0.1, 0.015, m, 0, 1.98, 0.3); head.rotation.x = 0.1;
      bx(g, 0.05, 0.06, 0.05, m, 0, 1.05, 0.02); cyl(g, 0.014, 0.2, m, 0.06, 1.1, 0.05);
    } },
  panel: { label: '타일 파티션', parts: { body: 'wall.bath' }, def: { w: 0.08, d: 1.0, h: 2.0 },
    build(g, it, M) { bx(g, it.w, it.h, it.d, M('body'), 0, 0, 0); } },
  desk: { label: '책상', parts: { top: 'wood.desk', leg: 'wardrobe' }, def: { w: 1.4, d: 0.6, h: 0.74 },
    build(g, it, M) {
      bx(g, it.w, 0.03, it.d, M('top'), 0, it.h - 0.03, 0);
      bx(g, 0.03, it.h - 0.03, it.d - 0.05, M('leg'), -it.w / 2 + 0.03, 0, 0); bx(g, 0.03, it.h - 0.03, it.d - 0.05, M('leg'), it.w / 2 - 0.03, 0, 0);
      bx(g, it.w - 0.12, it.h - 0.35, 0.02, M('leg'), 0, 0.3, -it.d / 2 + 0.05);
    } },
  chair: { label: '의자', parts: { seat: 'chair', leg: 'steel' }, def: { w: 0.45, d: 0.48, h: 0.9 },
    build(g, it, M) {
      bx(g, it.w, 0.05, it.d, M('seat'), 0, 0.43, 0);
      bx(g, it.w, 0.42, 0.04, M('seat'), 0, 0.48, -it.d / 2 + 0.02);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.012, 0.43, M('leg'), x * (it.w / 2 - 0.03), 0, z * (it.d / 2 - 0.03));
    } },
  table: { label: '식탁', parts: { top: 'wood.desk', leg: 'chair' }, def: { w: 1.4, d: 0.8, h: 0.74 },
    build(g, it, M) {
      bx(g, it.w, 0.04, it.d, M('top'), 0, it.h - 0.04, 0);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, 0.05, it.h - 0.04, 0.05, M('leg'), x * (it.w / 2 - 0.06), 0, z * (it.d / 2 - 0.06));
    } },
  bookshelf: { label: '책장', parts: { body: 'study.cabinet' }, def: { w: 0.9, d: 0.3, h: 2.0 },
    build(g, it, M) { shelfColumn(g, it.w, it.h, it.d, M('body'), 0, 0, 0, 5); } },
  plant: { label: '화분', parts: { leaf: 'plant', pot: 'pot' }, def: { w: 0.45, d: 0.45, h: 1.4 },
    build(g, it, M) {
      cyl(g, it.w / 2 * 0.8, it.h * 0.3, M('pot'), 0, 0, 0, { rTop: it.w / 2 });
      for (const [x, y, z, r] of [[0, 0.65, 0, 0.32], [0.18, 0.5, 0.1, 0.22], [-0.16, 0.55, -0.12, 0.2], [0.05, 0.85, -0.08, 0.2]]) {
        const s = new THREE.Mesh(new THREE.SphereGeometry(r * it.w / 0.45, 12, 10), M('leaf'));
        s.position.set(x, it.h * 0.3 + y * it.h / 1.4, z); s.castShadow = true; g.add(s);
      }
    } },
  rug: { label: '러그', parts: { body: 'rug' }, def: { w: 2.4, d: 1.6, h: 0.012 },
    build(g, it, M) { bx(g, it.w, 0.012, it.d, M('body'), 0, 0, 0, { cast: false }); } },
  lamp: { label: '스탠드 조명', parts: { body: 'steel' }, def: { w: 0.4, d: 0.4, h: 1.5 },
    build(g, it, M) {
      cyl(g, 0.14, 0.02, M('body'), 0, 0, 0); cyl(g, 0.012, it.h - 0.3, M('body'), 0, 0.02, 0);
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.28, 24, 1, true), SPECIAL.lamp.clone());
      sh.material.side = THREE.DoubleSide; sh.material.emissiveIntensity = 1.2; sh.position.y = it.h - 0.14; g.add(sh);
    } },
  box: { label: '박스(치수 입력)', parts: { body: 'wardrobe' }, def: { w: 0.6, d: 0.6, h: 0.6 },
    build(g, it, M) { bx(g, it.w, it.h, it.d, M('body'), 0, 0, 0); } },
};

// 카탈로그에 노출할 타입 순서
export const CATALOG = ['bed', 'bed1', 'sofa', 'armchair', 'ottoman', 'table', 'chair', 'desk', 'wardrobe', 'drawers', 'bookshelf', 'lowcab', 'tallcab', 'tvstand', 'fridge', 'kcounter', 'kupper', 'plant', 'rug', 'lamp', 'box'];

// 아이템 → Group. 색 오버라이드는 it.colors[part] = '#hex'
export function buildItem(it) {
  const B = BUILDERS[it.type];
  if (!B) throw new Error('unknown item type ' + it.type);
  const g = new THREE.Group();
  const M = (part) => {
    const key = B.parts[part];
    return it.colors && it.colors[part] ? tinted(key, it.colors[part]) : getMaterial(key);
  };
  B.build(g, it, M);
  g.position.set(it.x, 0, it.z);
  g.rotation.y = THREE.MathUtils.degToRad(it.rot || 0);
  g.userData.item = it;
  g.traverse(o => { if (o.isMesh) o.userData.itemId = it.id; });
  return g;
}
