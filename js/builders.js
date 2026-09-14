// 건축(벽·바닥·천장·문·창·조명기구)과 가구 빌더.
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { S, H, mx, mz, WALLS, ROOMS, DOORS, FIXTURES, CENTER } from './plan.js';
RectAreaLightUniformsLib.init();   // 면광원(평판등·라인등)용 LUT — 한 번만
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
// 모서리가 둥근 박스 — 매트리스·쿠션·도기 같은 부드러운 물건. r: 모서리 반지름
export function rbx(parent, w, h, d, mat, x = 0, y = 0, z = 0, r = 0.03, o = {}) {
  const rr = Math.min(r, w / 2, h / 2, d / 2);
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, o.seg || 4, rr), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = o.cast !== false; m.receiveShadow = o.receive !== false;
  parent.add(m); return m;
}
// 회전체(도기 볼 등): 프로파일 [[r, y], ...] 를 y 축으로 회전
export function lathe(parent, profile, mat, x = 0, y = 0, z = 0, seg = 32) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, yy]) => new THREE.Vector2(r, yy)), seg), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  parent.add(m); return m;
}
// 실제 거울: 환경맵(가짜 스튜디오 조명)이 아니라 씬을 거울 시점에서 다시 그려 비춘다 → 그 방에서 실제로 보이는 등·가구만 비친다.
// 평면(w × h)이 +z 를 향한다. 중심 (x, y+h/2, z).
export function mirror(parent, w, h, x, y, z) {
  const m = new Reflector(new THREE.PlaneGeometry(w, h), { clipBias: 0.003, textureWidth: 768, textureHeight: 768, color: 0xdadada });
  m.position.set(x, y + h / 2, z);
  m.userData.mirror = true;
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
    if (w.cap) for (const s of [0, L]) {     // 사선 벽 등 각진 이음새: 두께 지름의 둥근 기둥으로 양쪽 벽과 매끈하게 잇는다
      const c = cyl(g, t / 2, h, mat, s, 0, 0, { seg: 24 }); paintMesh(c, w.paint);
    }
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
    if (f.kind === 'cassette') cassette(scene, 0.84, 0.84, x, z);   // 남겨둔 고정 설비용 — 기본 배치는 아이템 'cassette' 로 이동
  }
}

// 천장형 시스템 에어컨(카세트) — 패널 + 4방향 토출구. 아이템 빌더와 고정 설비가 공용
function cassette(parent, w, d, x, z) {
  bx(parent, w, 0.03, d, P('frame.white'), x, H - 0.03, z, { cast: false });
  const iw = w * 0.72, id = d * 0.72, s = 0.06;
  for (const [ox, oz, vw, vd] of [[0, -d * 0.4, iw, s], [0, d * 0.4, iw, s], [-w * 0.4, 0, s, id], [w * 0.4, 0, s, id]])
    bx(parent, vw, 0.005, vd, SPECIAL.dark, x + ox, H - 0.035, z + oz, { cast: false });
}

export function buildExterior(scene) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), SPECIAL.ground);
  ground.rotation.x = -Math.PI / 2; ground.position.set(CENTER.x, -0.02, CENTER.z); ground.receiveShadow = true;
  scene.add(ground);
  for (const [ox, oz, w, h, d] of [[-30, -6, 14, 18, 30], [34, 10, 16, 24, 26], [4, -34, 40, 14, 12], [-8, 40, 30, 20, 12]])
    bx(scene, w, h, d, SPECIAL.building, CENTER.x + ox, 0, CENTER.z + oz, { cast: false });
}

// 도기 볼 안쪽(회전체를 위에서 들여다보므로 양면) · 장식 책 재질(칠하지 않음)
const BOWL_MAT = new THREE.MeshStandardMaterial({ color: '#ececea', roughness: 0.18, side: THREE.DoubleSide });
const BOOK_MATS = ['#c9b9a2', '#7a8b6f', '#3f5d7a', '#8b3a3a', '#e6dfd2', '#2e2e2e', '#b08d57', '#d7a86e', '#556b5a', '#f2f2f2'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));

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
  wallcab: { label: '상부 수납장(벽걸이)', parts: { body: 'wardrobe' }, def: { w: 0.9, d: 0.4, h: 1.2 }, mount: 0.75,
    build(g, it, M) { cabinet(g, it, M, { y: it.y0 ?? 0.75, groove: true }); } },   // 아래는 비고 y0 위로만 수납 — 책상 상판 높이에 맞춤
  bedshelf: { label: '침대 선반(미닫이 수납)', parts: { body: 'study.cabinet', top: 'study.top' }, def: { w: 2.0, d: 1.0, h: 0.45 },
    build(g, it, M) {                        // 낮은 단 + 앞면 미닫이 도어(2트랙, 번갈아 앞뒤)
      const t = 0.03, body = M('body');
      bx(g, it.w, it.h - t, it.d - 0.03, body, 0, 0, -0.015);
      bx(g, it.w + 0.02, t, it.d + 0.02, M('top'), 0, it.h - t, 0.01);
      const n = it.doors ?? 3, dw = it.w / n;
      for (let i = 0; i < n; i++) {
        const x = -it.w / 2 + dw * (i + 0.5), z = it.d / 2 - 0.02 + (i % 2 ? 0 : 0.018);
        bx(g, dw + 0.03, it.h - t - 0.03, 0.016, body, x, 0.015, z);
        bx(g, 0.004, it.h - t - 0.12, 0.004, SPECIAL.dark, x + dw / 2 - 0.05, 0.06, z + 0.01, { cast: false });   // 손잡이 홈
      }
    } },
  drawers: { label: '서랍장', parts: { body: 'wardrobe' }, def: { w: 0.9, d: 0.45, h: 0.9 },
    build(g, it, M) { cabinet(g, it, M, { drawers: 3 }); } },
  shoecab: { label: '신발장', parts: { body: 'shoe' }, def: { w: 1.2, d: 0.4, h: 2.2 },
    build(g, it, M) {
      cabinet(g, it, M, { h: 1.0 });
      cabinet(g, it, M, { y: 1.35, h: it.h - 1.35 });
      // 가운데 오픈 니치: 뒤판 + 양 옆판만 두고 앞은 비운다. 위 장 밑면에 얇은 LED 바 + 약한 광원
      bx(g, it.w, 0.35, 0.03, M('body'), 0, 1.0, -it.d / 2 + 0.015);        // 니치 뒤판
      bx(g, 0.02, 0.35, it.d, M('body'), -it.w / 2 + 0.01, 1.0, 0);         // 옆판
      bx(g, 0.02, 0.35, it.d, M('body'), it.w / 2 - 0.01, 1.0, 0);
      bx(g, it.w - 0.08, 0.006, 0.015, SPECIAL.panelLight, 0, 1.34, it.d / 2 - 0.05, { cast: false });   // LED 바
      const pl = new THREE.PointLight('#ffe8c8', 0, 1.6, 2); pl.position.set(0, 1.3, 0.05); pl.userData.base = 0.7; g.add(pl);
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
      if (it.dw != null) {                   // 식기세척기: 스테인리스 도어 + 손잡이 바 + 컨트롤 띠
        const y0 = 0.12, dh = h - 0.18, zf = d / 2 - 0.012;
        bx(g, 0.6, dh, 0.03, M('steel'), it.dw, y0, zf);
        bx(g, 0.56, 0.014, 0.03, M('steel'), it.dw, y0 + dh - 0.07, zf + 0.03);
        bx(g, 0.5, 0.03, 0.002, SPECIAL.dark, it.dw, y0 + dh - 0.14, zf + 0.016, { cast: false });
      }
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
      // 프레임 + 매트리스(둥근 모서리) + 이불(앞쪽으로 갈수록 살짝 두꺼운 둥근 덩어리) + 베개 2개(통통한 라운드)
      bx(g, w + 0.08, 0.06, d + 0.08, M('frame'), 0, 0.17, 0);
      bx(g, w + 0.08, 0.45, 0.04, M('frame'), 0, 0.17, -d / 2 + 0.02);                      // 헤드보드(발자국 안쪽)
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, 0.06, 0.17, 0.06, M('frame'), x * (w / 2 - 0.05), 0, z * (d / 2 - 0.08));
      rbx(g, w, 0.22, d, M('linen'), 0, 0.23, 0, 0.06);
      rbx(g, w + 0.03, 0.09, d * 0.66, M('linen'), 0, 0.44, d * 0.17, 0.045);
      for (const sx of [-1, 1]) rbx(g, w * 0.4, 0.13, 0.4, M('linen'), sx * w * 0.23, 0.45, -d / 2 + 0.3, 0.06);
    } },
  bed1: { label: '침대(싱글)', parts: { frame: 'bed.frame', linen: 'bed.linen' }, def: { w: 1.0, d: 2.0, h: 0.5 },
    build(g, it, M) { BUILDERS.bed.build(g, it, M); } },
  sofa: { label: '소파(3인)', parts: { fabric: 'sofa' }, def: { w: 2.6, d: 0.95, h: 0.75 },
    build(g, it, M) {
      const { w, d, h } = it, n = Math.max(1, Math.round(w / 0.85)), a = 0.18, m = M('fabric');
      rbx(g, w, 0.32, d, m, 0, 0.05, 0, 0.05);                                             // 베이스
      rbx(g, w, h - 0.05, 0.2, m, 0, 0.05, -d / 2 + 0.1, 0.05);                            // 등판
      rbx(g, a, 0.6, d, m, -w / 2 + a / 2, 0.05, 0, 0.07); rbx(g, a, 0.6, d, m, w / 2 - a / 2, 0.05, 0, 0.07);   // 팔걸이
      const cw = (w - 2 * a) / n;
      for (let i = 0; i < n; i++) {                                                         // 방석·등쿠션은 통통한 라운드
        rbx(g, cw - 0.03, 0.16, d - 0.3, m, -w / 2 + a + cw * (i + 0.5), 0.36, 0.1, 0.06);
        rbx(g, cw - 0.05, 0.44, 0.16, m, -w / 2 + a + cw * (i + 0.5), 0.36, -d / 2 + 0.28, 0.07);
      }
    } },
  armchair: { label: '1인 소파', parts: { fabric: 'sofa' }, def: { w: 0.9, d: 0.9, h: 0.75 },
    build(g, it, M) { BUILDERS.sofa.build(g, it, M); } },
  ottoman: { label: '스툴', parts: { fabric: 'sofa' }, def: { w: 0.8, d: 0.8, h: 0.42 },
    build(g, it, M) { rbx(g, it.w, it.h - 0.1, it.d, M('fabric'), 0, 0.05, 0, 0.06); rbx(g, it.w - 0.02, 0.12, it.d - 0.02, M('fabric'), 0, it.h - 0.11, 0, 0.06); } },
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
      bx(g, it.w - 0.05, 0.9, 0.02, M('body'), 0, 1.0, -it.d / 2 + 0.01, { cast: false });   // 거울 뒤판
      mirror(g, it.w - 0.07, 0.88, 0, 1.01, -it.d / 2 + 0.021);
    } },
  basin: { label: '세면대', parts: { body: 'sanitary' }, def: { w: 0.6, d: 0.45, h: 0.85 },
    build(g, it, M) {
      rbx(g, it.w, 0.26, it.d, M('body'), 0, it.h - 0.26, 0, 0.05);                       // 둥근 모서리 도기
      const bowl = lathe(g, [[0, 0], [0.12, 0.01], [0.2, 0.06], [0.24, 0.13]], BOWL_MAT, 0, it.h - 0.13, 0.02, 32);
      bowl.scale.set(Math.min(1, (it.w - 0.1) / 0.48), 1, Math.min(1, (it.d - 0.12) / 0.48));   // 볼 오목면
      faucet(g, 0, it.h, -it.d / 2 + 0.07);
    } },
  basin_wall: { label: '벽걸이 사각 세면대', parts: { body: 'sanitary', steel: 'steel' }, def: { w: 0.5, d: 0.42, h: 0.85 },
    build(g, it, M) {                        // 렌더의 각진 벽부착 세면기 — 상단 h, 몸통 0.36
      const m = M('body'), bh = 0.36, y0 = it.h - bh;
      rbx(g, it.w, bh, it.d, m, 0, y0, 0, 0.035);                                                        // 각진 도기, 모서리만 살짝 둥글게
      const bowl = lathe(g, [[0, 0], [0.14, 0.008], [0.21, 0.05], [0.24, 0.12]], BOWL_MAT, 0, it.h - 0.12, 0.02, 32);
      bowl.scale.set((it.w - 0.08) / 0.48, 1, (it.d - 0.12) / 0.48);                                    // 볼 오목면(사각에 맞게 늘림)
      faucet(g, 0, it.h, -it.d / 2 + 0.06);
      cyl(g, 0.02, y0 - 0.25, M('steel'), 0, 0.25, -it.d / 2 + 0.12);                                   // 트랩 배관
      bx(g, 0.05, 0.05, 0.12, M('steel'), 0, 0.22, -it.d / 2 + 0.06);
    } },
  mirrorcab: { label: '거울장', parts: { body: 'sanitary' }, def: { w: 0.9, d: 0.12, h: 0.7 }, mount: 1.1,
    build(g, it, M) {
      const y = it.y0 ?? 1.1;                // 하단 높이(m)
      bx(g, it.w, it.h, it.d - 0.01, M('body'), 0, y, -0.005);
      mirror(g, it.w / 2 - 0.008, it.h - 0.012, -it.w / 4, y + 0.006, it.d / 2 + 0.001);      // 2도어 거울(실제 반사)
      mirror(g, it.w / 2 - 0.008, it.h - 0.012, it.w / 4, y + 0.006, it.d / 2 + 0.001);
      bx(g, 0.004, it.h - 0.01, 0.007, SPECIAL.dark, 0, y + 0.005, it.d / 2 - 0.003, { cast: false });   // 도어 틈
    } },
  towelbar: { label: '수건걸이(수건)', parts: { metal: 'steel', towel: 'towel' }, def: { w: 0.6, d: 0.12, h: 0.1 }, mount: 1.15,
    build(g, it, M) {                        // 벽에 붙는 면이 -z. y0: 봉 높이
      const y = it.y0 ?? 1.15, m = M('metal'), zb = it.d / 2 - 0.02;   // zb: 봉 위치
      for (const x of [-it.w / 2 + 0.03, it.w / 2 - 0.03]) {
        const plate = cyl(g, 0.018, 0.008, m, 0, 0, 0, { seg: 16 }); plate.rotation.x = Math.PI / 2; plate.position.set(x, y, -it.d / 2 + 0.004);
        const arm = cyl(g, 0.006, zb + it.d / 2, m, 0, 0, 0, { seg: 8 }); arm.rotation.x = Math.PI / 2; arm.position.set(x, y, (zb - it.d / 2) / 2);
      }
      const bar = cyl(g, 0.01, it.w - 0.02, m, 0, 0, 0, { seg: 12 }); bar.rotation.z = Math.PI / 2; bar.position.set(0, y, zb);
      if (it.towel !== false) {              // 반으로 접어 걸린 수건
        const tw = Math.min(0.42, it.w - 0.12), tm = M('towel');
        rbx(g, tw, 0.5, 0.014, tm, 0, y - 0.5, zb + 0.016, 0.007);
        rbx(g, tw, 0.48, 0.014, tm, 0, y - 0.48, zb - 0.016, 0.007);
        const fold = cyl(g, 0.024, tw, tm, 0, 0, 0, { seg: 16 }); fold.rotation.z = Math.PI / 2; fold.position.set(0, y + 0.004, zb);   // 접힌 부분은 둥글게
      }
    } },
  paperholder: { label: '휴지걸이', parts: { body: 'bath.acc', paper: 'sanitary' }, def: { w: 0.18, d: 0.12, h: 0.12 }, mount: 0.7,
    build(g, it, M) {
      const y = it.y0 ?? 0.7, m = M('body');
      bx(g, 0.05, 0.05, 0.006, m, 0, y - 0.025, -it.d / 2 + 0.003);                                     // 벽 플레이트
      const arm = cyl(g, 0.006, it.d - 0.02, m, 0, 0, 0, { seg: 8 }); arm.rotation.x = Math.PI / 2; arm.position.set(0, y, -it.d / 2 + (it.d - 0.02) / 2 + 0.006);
      const rod = cyl(g, 0.006, it.w - 0.02, m, 0, 0, 0, { seg: 8 }); rod.rotation.z = Math.PI / 2; rod.position.set(0, y, it.d / 2 - 0.02);
      const roll = cyl(g, 0.055, 0.1, M('paper'), 0, 0, 0, { seg: 20 }); roll.rotation.z = Math.PI / 2; roll.position.set(0.01, y, it.d / 2 - 0.02);
    } },
  ledge: { label: '젠다이(타일 선반)', parts: { body: 'bath.ledge' }, def: { w: 1.0, d: 0.05, h: 0.02 }, mount: 0.86,
    build(g, it, M) {                        // 벽면 -z 에 붙는 얇은 선반. y0: 상판 높이
      const y = (it.y0 ?? 0.86) - it.h;
      bx(g, it.w, it.h, it.d, M('body'), 0, y, 0);
      bx(g, it.w, 0.004, 0.004, SPECIAL.dark, 0, y - 0.004, it.d / 2 - 0.002, { cast: false });         // 그림자 라인
    } },
  bin: { label: '휴지통', parts: { body: 'bath.acc' }, def: { w: 0.2, d: 0.2, h: 0.3 },
    build(g, it, M) { bx(g, it.w, it.h, it.d, M('body'), 0, 0, 0); bx(g, it.w - 0.03, 0.004, it.d - 0.03, SPECIAL.dark, 0, it.h - 0.003, 0, { cast: false }); } },
  toilet: { label: '양변기', parts: { body: 'sanitary' }, def: { w: 0.4, d: 0.7, h: 0.8 },
    build(g, it, M) {
      // 실제 양변기 형태: 둥근 물탱크, 아래로 좁아지는 타원 볼(회전체), 타원 시트 + 덮개, 버튼
      const m = M('body'), zb = it.d / 2 - 0.25;
      rbx(g, 0.38, 0.4, 0.18, m, 0, 0.38, -it.d / 2 + 0.09, 0.04);
      rbx(g, 0.34, 0.03, 0.14, m, 0, 0.78, -it.d / 2 + 0.09, 0.012);                                   // 탱크 뚜껑
      const bowl = lathe(g, [[0.09, 0], [0.13, 0.05], [0.17, 0.16], [0.19, 0.3], [0.195, 0.38], [0.17, 0.39]], m, 0, 0, zb, 36);
      bowl.scale.z = 1.35;
      const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.035, 36), m); seat.scale.z = 1.35; seat.position.set(0, 0.4, zb); seat.castShadow = true; g.add(seat);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.015, 36), m); lid.scale.z = 1.3; lid.position.set(0, 0.425, zb); g.add(lid);
      bx(g, 0.36, 0.06, 0.12, m, 0, 0.36, -it.d / 2 + 0.2);                                             // 볼-탱크 연결부
      bx(g, 0.1, 0.008, 0.03, P('steel'), 0, 0.81, -it.d / 2 + 0.09, { cast: false });
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
  glasswall: { label: '유리 칸막이(샤워)', parts: { frame: 'frame.black' }, def: { w: 0.04, d: 1.0, h: 2.0 },
    build(g, it, M) {                        // 폭 = 두께, 깊이 = 길이. 양끝 프레임 + 상하 바 + 유리
      const fm = M('frame'), t = it.w, L = it.d, h = it.h;
      bx(g, t, h, 0.03, fm, 0, 0, -L / 2 + 0.015); bx(g, t, h, 0.03, fm, 0, 0, L / 2 - 0.015);
      bx(g, t, 0.03, L, fm, 0, 0, 0); bx(g, t, 0.03, L, fm, 0, h - 0.03, 0);
      bx(g, 0.008, h - 0.06, L - 0.06, SPECIAL.glass, 0, 0.03, 0, { cast: false, receive: false }).userData.glass = true;
    } },
  desk: { label: '책상', parts: { top: 'wood.desk', leg: 'wardrobe' }, def: { w: 1.4, d: 0.6, h: 0.74 },
    build(g, it, M) {
      bx(g, it.w, 0.03, it.d, M('top'), 0, it.h - 0.03, 0);
      bx(g, 0.03, it.h - 0.03, it.d - 0.05, M('leg'), -it.w / 2 + 0.03, 0, 0); bx(g, 0.03, it.h - 0.03, it.d - 0.05, M('leg'), it.w / 2 - 0.03, 0, 0);
      bx(g, it.w - 0.12, it.h - 0.35, 0.02, M('leg'), 0, 0.3, -it.d / 2 + 0.05);
    } },
  desk_curve: { label: '벽 전체 책상(굴곡 연결)', parts: { top: 'wardrobe', leg: 'wardrobe' }, def: { w: 2.4, d: 0.6, h: 0.75 },
    build(g, it, M) {                        // 벽(-z) 을 따라 w 만큼 이어지는 상판. 끝(ends: both|left|right)에서 extLen 구간은 ext 만큼 더 깊고,
      const { w, d, h } = it, ext = it.ext ?? 0.3, extLen = it.extLen ?? 0, cw = it.curve ?? 0.45, t = 0.03;   // 그 사이를 S 곡선으로 잇는다
      const ends = it.ends ?? 'both', eL = ends !== 'right', eR = ends !== 'left', f = d / 2, fe = d / 2 + ext;
      const sh = new THREE.Shape();
      sh.moveTo(-w / 2, -f); sh.lineTo(w / 2, -f);
      if (eR) { const x1 = w / 2 - extLen; sh.lineTo(w / 2, fe); sh.lineTo(x1, fe); sh.bezierCurveTo(x1 - cw * 0.55, fe, x1 - cw * 0.45, f, x1 - cw, f); }
      else sh.lineTo(w / 2, f);
      if (eL) { const x1 = -w / 2 + extLen; sh.lineTo(x1 + cw, f); sh.bezierCurveTo(x1 + cw * 0.45, f, x1 + cw * 0.55, fe, x1, fe); sh.lineTo(-w / 2, fe); }
      else sh.lineTo(-w / 2, f);
      sh.closePath();
      const top = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false }), M('top'));
      top.rotation.x = Math.PI / 2; top.position.y = h; top.castShadow = top.receiveShadow = true; g.add(top);
      const leg = M('leg');
      bx(g, 0.03, h - t, d + (eL ? ext : 0) - 0.05, leg, -w / 2 + 0.03, 0, eL ? ext / 2 : 0);   // 끝 측판(확장 깊이 반영)
      bx(g, 0.03, h - t, d + (eR ? ext : 0) - 0.05, leg, w / 2 - 0.03, 0, eR ? ext / 2 : 0);
      if (it.midLeg) bx(g, 0.03, h - t, d - 0.05, leg, 0, 0, 0);                     // 중간 측판(기본 없음, midLeg: true 로 켬)
      bx(g, w - 0.12, h - 0.35, 0.02, leg, 0, 0.3, -d / 2 + 0.05);                   // 뒤판
    } },
  desk_dark: { label: '책상(다크 상판)', parts: { top: 'study.top', leg: 'study.cabinet' }, def: { w: 1.4, d: 0.6, h: 0.75 },
    build(g, it, M) { BUILDERS.desk.build(g, it, M); } },      // 하부장과 같은 상판 재질 → ㄱ자로 이어 붙일 때 색이 같다
  chair: { label: '의자', parts: { seat: 'chair', leg: 'steel' }, def: { w: 0.45, d: 0.48, h: 0.9 },
    build(g, it, M) {
      // 둥근 방석 + 살짝 뒤로 기운 곡면 등받이 + 가는 다리
      rbx(g, it.w, 0.06, it.d, M('seat'), 0, 0.42, 0, 0.03);
      const back = rbx(g, it.w - 0.04, 0.4, 0.035, M('seat'), 0, 0, 0, 0.018);
      back.position.set(0, 0.7, -it.d / 2 + 0.04); back.rotation.x = -0.12;
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.012, 0.42, M('leg'), x * (it.w / 2 - 0.03), 0, z * (it.d / 2 - 0.03), { seg: 10 });
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
  shelfwall: { label: '책장 벽(모듈)', parts: { frame: 'shelf' }, def: { w: 2.4, d: 0.35, h: 2.28 },
    build(g, it, M) {
      const { w, d, h } = it, m = M('frame'), t = 0.025;
      const baseH = it.base === false ? 0 : Math.min(0.6, h * 0.4);
      if (baseH) cabinet(g, { w, d, h: baseH, doors: Math.max(2, Math.round(w / 0.6)) }, M, { bodyPart: 'frame' });
      const bays = Math.max(1, Math.round(w / 0.8)), rows = Math.max(1, Math.round((h - baseH) / 0.38));
      bx(g, w, h - baseH, 0.012, m, 0, baseH, -d / 2 + 0.006);                                     // 뒤판
      for (let i = 0; i <= bays; i++) bx(g, t, h - baseH, d, m, -w / 2 + t / 2 + (w - t) * i / bays, baseH, 0);
      for (let r = 0; r <= rows; r++) bx(g, w, t, d, m, 0, baseH + (h - baseH - t) * r / rows, 0);
      if (it.books !== false) {                                                                   // 장식 책
        let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
        const bw = (w - t) / bays, rh = (h - baseH - t) / rows;
        for (let b = 0; b < bays; b++) for (let r = 0; r < rows; r++) {
          if (rnd() < 0.25) continue;
          const x0 = -w / 2 + t + bw * b + 0.03, y0 = baseH + t + rh * r, fill = 0.35 + rnd() * 0.5;
          let x = x0; const xEnd = x0 + (bw - t - 0.06) * fill;
          while (x < xEnd) { const tw = 0.018 + rnd() * 0.03, th = Math.min(rh - 0.04, 0.17 + rnd() * 0.13);
            const bk = rbx(g, tw, th, 0.14 + rnd() * 0.06, BOOK_MATS[Math.floor(rnd() * BOOK_MATS.length)], x + tw / 2, y0, -0.02 + rnd() * 0.02, 0.004, { cast: false, seg: 2 });
            if (rnd() < 0.12) { bk.rotation.z = -0.12; bk.position.x += 0.012; }   // 가끔 기울어진 책
            x += tw + 0.002; }
          if (rnd() < 0.3) bx(g, 0.12, 0.1 + rnd() * 0.08, 0.12, BOOK_MATS[Math.floor(rnd() * BOOK_MATS.length)], x0 + bw - t - 0.12, y0, 0, { cast: false });   // 오브제
        }
      }
    } },
  roundtable: { label: '원탁', parts: { top: 'wood.desk', leg: 'chair' }, def: { w: 0.8, d: 0.8, h: 0.45 },
    build(g, it, M) {
      cyl(g, it.w / 2, 0.03, M('top'), 0, it.h - 0.03, 0, { seg: 40 });
      cyl(g, 0.05, it.h - 0.05, M('leg'), 0, 0.02, 0);
      cyl(g, it.w * 0.28, 0.02, M('leg'), 0, 0, 0, { seg: 40 });
    } },
  daybed: { label: '데이베드', parts: { frame: 'bed.frame', linen: 'bed.linen' }, def: { w: 2.0, d: 0.9, h: 0.42 },
    build(g, it, M) {
      const { w, d, h } = it;
      bx(g, w, 0.1, d, M('frame'), 0, h - 0.24, 0);
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bx(g, 0.05, h - 0.24, 0.05, M('frame'), x * (w / 2 - 0.06), 0, z * (d / 2 - 0.06));
      rbx(g, w - 0.04, 0.13, d - 0.04, M('linen'), 0, h - 0.15, 0, 0.05);
      for (const x of [-w / 2 + 0.35, w / 2 - 0.35]) { const b = cyl(g, 0.11, 0.5, M('linen'), x, h - 0.02, -d / 2 + 0.15, { seg: 20 }); b.rotation.z = Math.PI / 2; b.position.y = h + 0.02; }
    } },
  box: { label: '박스(치수 입력)', parts: { body: 'wardrobe' }, def: { w: 0.6, d: 0.6, h: 0.6 },
    build(g, it, M) { bx(g, it.w, it.h, it.d, M('body'), 0, 0, 0); } },
  cassette: { label: '천장형 에어컨', parts: { panel: 'frame.white' }, def: { w: 0.84, d: 0.84, h: 0.03 }, ceiling: true,
    build(g, it, M) {                        // 천장에 붙는 패널. 폭·깊이로 크기 조절(1방향 기종은 깊이를 줄이면 된다)
      bx(g, it.w, it.h, it.d, M('panel'), 0, H - it.h, 0, { cast: false });
      const iw = it.w * 0.72, id = it.d * 0.72, s = 0.06;
      const slim = Math.min(it.w, it.d) < 0.5;   // 슬림(1방향) 기종: 긴 축을 따라 토출구 하나
      const vents = slim ? (it.w >= it.d ? [[0, it.d * 0.25, iw, s]] : [[it.w * 0.25, 0, s, id]])
        : [[0, -it.d * 0.4, iw, s], [0, it.d * 0.4, iw, s], [-it.w * 0.4, 0, s, id], [it.w * 0.4, 0, s, id]];
      for (const [ox, oz, vw, vd] of vents) bx(g, vw, 0.005, vd, SPECIAL.dark, ox, H - it.h - 0.005, oz, { cast: false });
    } },
};

// ── 조명 빌더 ──────────────────────────────────────────────────
// 조명 아이템 공통 필드: lit(켜짐) · pw(세기 배율) · kelvin(색온도). 광원은 userData.base 에 기준 세기를 두고
// app 이 lit·pw·전역 슬라이더를 곱해 intensity 를 정한다.
const KELVIN = { 2700: '#ffc48a', 3000: '#ffd6a8', 3500: '#ffe3c4', 4000: '#fff0dc', 5000: '#fff8ef', 5700: '#fffcf6', 6500: '#ffffff' };
export const KELVIN_OPTIONS = Object.keys(KELVIN).map(Number);
const lampColor = (it) => KELVIN[it.kelvin] || KELVIN[3000];
function glowMat(it, mult = 1) {
  const on = it.lit !== false;
  const m = new THREE.MeshStandardMaterial({ color: on ? '#fff8ee' : '#cfcfcf', emissive: lampColor(it), emissiveIntensity: on ? 1.5 * mult * Math.min(it.pw ?? 1, 2) : 0, roughness: 0.5 });
  m.userData.tinted = true; return m;
}
// ── 밝기: 소비전력(W) → 광도(cd). LED 100 lm/W 기준, 전방향은 lm/4π, 스포트는 빔 각으로 집광. CD_SCALE 은 렌더 단위 보정
//    (5W 매입등 ≈ 500 lm ≈ 40 cd 를 기존 밝기 2.7 에 맞춘 값). 아이템 watt 가 없으면 빌더의 기본 watt 를 쓴다.
const LM_PER_W = 100, CD_SCALE = 0.025;   // 40W 평판등(4,000 lm) 방이 노출 1 에서 적정 밝기가 되는 값
export const wattOf = (B, it) => it.watt ?? (typeof B.watt === 'function' ? B.watt(it) : (B.watt ?? 10));
// 광속(lm) = W × 발광효율. 효율은 빌더의 lmw(lm/W, 기본 100)로 제품별 지정 — 예) 장수램프 3인치 5W 매입등 = 290 lm(58 lm/W)
export const lmOf = (B, it) => it.lm ?? wattOf(B, it) * (typeof B.lmw === 'function' ? B.lmw(it) : (B.lmw ?? LM_PER_W));
const cdOmni = (lm) => lm / (4 * Math.PI) * CD_SCALE;
const cdSpot = (lm, angle) => lm / (2 * Math.PI * (1 - Math.cos(angle))) * CD_SCALE;   // 원뿔(반각 angle) 안에 lm 을 균일 분배한 광도
function addPoint(g, it, x, y, z, base, dist = 0) {
  const pl = new THREE.PointLight(lampColor(it), 0, dist, 2);
  pl.position.set(x, y, z); pl.userData.base = base; g.add(pl); return pl;
}
// 면광원: 아래(-y)로 비추는 사각 발광면. 밝기 단위는 nit(cd/m²) — 램버시안 면의 정면 광도 = lm/π = 4 × 전방향 cd 를 면적으로 나눈 값.
// 바닥·상판의 유광 면에 등의 형태가 실제로 비친다.
function addRect(g, it, x, y, z, w, d, lm, share = 1) {
  const nits = lm * share / (Math.PI * w * d) * CD_SCALE;   // 램버시안 면 휘도 L = lm / (π·A)
  const rl = new THREE.RectAreaLight(lampColor(it), 0, w, d);
  rl.position.set(x, y, z); rl.lookAt(x, y - 1, z); rl.userData.base = nits; g.add(rl); return rl;
}
// 스포트(원뿔, 반각 angle) — 그림자를 만든다(256² 깊이맵, 씬이 바뀔 때만 갱신) → 벽을 넘어가지 않는다.
// share: 총 lm 중 이 광원의 몫(면광원과 나눠 쓸 때). 기본은 바로 아래(-y)를 향한다.
// shadow: 그림자 우선순위(숫자 클수록 먼저). GPU 샘플러 한계(보통 16) 때문에 app 이 상위 SHADOW_BUDGET 개만 실제로 켠다. 0 = 그림자 없음
function addSpot(g, it, x, y, z, angle, lm, share = 1, tx = x, ty = 0, tz = z, dist = 8, shadow = 1) {
  const sp = new THREE.SpotLight(lampColor(it), 0, dist, angle, 0.6, 2);
  sp.position.set(x, y, z); sp.target.position.set(tx, ty, tz);
  sp.shadow.mapSize.set(256, 256); sp.shadow.bias = -0.0008; sp.shadow.normalBias = 0.02;
  sp.shadow.camera.near = 0.05; sp.shadow.camera.far = dist;
  sp.userData.shadowPrio = shadow;
  sp.userData.base = cdSpot(lm, angle) * share; g.add(sp, sp.target); return sp;
}
export const SHADOW_BUDGET = 10;
function cord(g, x, y0, y1, z) { cyl(g, 0.0025, y1 - y0, SPECIAL.dark, x, y0, z, { seg: 6 }); }

const LIGHT_BUILDERS = {
  // 장수램프 LED 다운라이트 매입등 3인치 5W (wooree-mall 242): Ø96 × 30 mm, 타공 Ø75, 정격광속 주광색 290 / 주백색 290 / 전구색 270 lm,
  // 색온도 6500 / 4000 / 3000K, CRI 80, 유백색 확산판(넓은 배광 ≈ 120°), 플리커프리
  downlight: { label: '3인치 LED 매입등 5W (장수램프)', light: true, watt: 5, lmw: (it) => ((it.kelvin || 3000) <= 3000 ? 54 : 58),
    parts: { trim: 'frame.white' }, def: { w: 0.096, d: 0.096, h: 0.03 },
    build(g, it, M) {
      const r = it.w / 2, ra = r * 0.78;    // 외경 Ø96 트림, 발광 개구 ≈ Ø75(타공)
      cyl(g, r, 0.005, M('trim'), 0, H - 0.005, 0, { seg: 40 });                        // 흰 트림 몸체(5 mm 돌출)
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(ra, ra, 0.003, 40), glowMat(it, 0.6));   // 유백색 확산판 — 은은하게
      disc.position.y = H - 0.0065; g.add(disc);
      addSpot(g, it, 0, H - 0.02, 0, THREE.MathUtils.degToRad(60), lmOf(LIGHT_BUILDERS.downlight, it), 1, 0, 0, 0, 3.2, 0);   // 120° 확산 배광, 도달 3.2 m
    } },
  // 거실등: 우리조명 매입형/고정형 LED등기구 60W — 정격광속 5,400 lm(90 lm/W), 6500K, 375 × 705 × 50 mm, KS C 7653, CRI 80
  ledpanel: { label: 'LED 거실등 60W (375×705 평판)', light: true, watt: 60, lmw: 90, parts: { frame: 'frame.white' }, def: { w: 0.705, d: 0.375, h: 0.05 },
    build(g, it, M) {
      bx(g, it.w, it.h, it.d, M('frame'), 0, H - it.h, 0, { cast: false });                  // 흰 알루미늄 프레임(고정형 50 mm)
      const m = new THREE.Mesh(boxGeo(it.w - 0.03, 0.004, it.d - 0.03), glowMat(it)); m.position.y = H - it.h - 0.002; g.add(m);   // 유백 확산판
      const L = lmOf(LIGHT_BUILDERS.ledpanel, it);
      addRect(g, it, 0, H - it.h - 0.01, 0, it.w - 0.03, it.d - 0.03, L, 0.25);              // 면광원 25% — 유광 면에 패널 형태가 비친다
      addSpot(g, it, 0, H - it.h - 0.02, 0, THREE.MathUtils.degToRad(70), L, 0.75, 0, 0, 0, 8, 3);   // 넓은 스포트 75% — 그림자(벽 차단)
    } },
  // 방등: 우리엔터프라이즈 LED 등기구(고정형) 60W — Ø500 × 65 mm, 6500K, CRI 80, KS C 7653. 광속 표기 없음 → 같은 계열 90 lm/W 로 5,400 lm 가정
  roundlight: { label: 'LED 방등 60W (Ø500 원형)', light: true, watt: 60, lmw: 90, parts: { frame: 'frame.white' }, def: { w: 0.5, d: 0.5, h: 0.065 },
    build(g, it, M) {
      const r = it.w / 2;
      cyl(g, r, it.h, M('frame'), 0, H - it.h, 0, { seg: 48 });                              // 흰 원형 본체 65 mm
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r - 0.015, r - 0.015, 0.004, 48), glowMat(it)); disc.position.y = H - it.h - 0.002; g.add(disc);   // 유백 확산판
      const L = lmOf(LIGHT_BUILDERS.roundlight, it), s = r * 1.77;                            // 원 면적과 같은 정사각 면광원
      addRect(g, it, 0, H - it.h - 0.01, 0, s, s, L, 0.25);
      addSpot(g, it, 0, H - it.h - 0.02, 0, THREE.MathUtils.degToRad(70), L, 0.75, 0, 0, 0, 8, 3);
    } },
  pendant: { label: '식탁등(돔)', light: true, watt: 8, parts: { shade: 'shade' }, def: { w: 0.35, d: 0.35, h: 0.9 },
    build(g, it, M) {
      const drop = it.h, r = it.w / 2, sh = r * 0.7;
      cyl(g, 0.045, 0.02, M('shade'), 0, H - 0.02, 0);
      cord(g, 0, H - drop + sh, H - 0.02, 0);
      const sm = M('shade').clone(); sm.side = THREE.DoubleSide; sm.userData.tinted = true;
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.35, r, sh, 32, 1, true), sm);
      shade.position.y = H - drop + sh / 2; shade.castShadow = true; g.add(shade);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 14, 10), glowMat(it, 1.3)); bulb.position.y = H - drop + sh * 0.4; g.add(bulb);
      addPoint(g, it, 0, H - drop + sh * 0.3, 0, cdOmni(lmOf(LIGHT_BUILDERS.pendant, it)));
    } },
  pendant_line: { label: '식탁등(라인)', light: true, watt: 20, parts: { body: 'shade' }, def: { w: 1.0, d: 0.06, h: 0.8 },
    build(g, it, M) {
      const drop = it.h;
      for (const x of [-it.w * 0.35, it.w * 0.35]) { cyl(g, 0.02, 0.01, M('body'), x, H - 0.01, 0); cord(g, x, H - drop + 0.04, H - 0.01, 0); }
      bx(g, it.w, 0.04, it.d, M('body'), 0, H - drop, 0);
      const s = new THREE.Mesh(boxGeo(it.w - 0.02, 0.004, it.d - 0.02), glowMat(it)); s.position.y = H - drop - 0.002; g.add(s);
      const n = Math.max(1, Math.round(it.w / 0.6));
      for (let i = 0; i < n; i++) addPoint(g, it, -it.w / 2 + it.w * (i + 0.5) / n, H - drop - 0.03, 0, cdOmni(lmOf(LIGHT_BUILDERS.pendant_line, it)) / n);
    } },
  globe: { label: '펜던트(유리 구)', light: true, watt: 6, parts: { metal: 'steel' }, def: { w: 0.25, d: 0.25, h: 0.7 },
    build(g, it, M) {
      const drop = it.h, r = it.w / 2;
      cyl(g, 0.04, 0.02, M('metal'), 0, H - 0.02, 0); cord(g, 0, H - drop + r, H - 0.02, 0);
      const gm = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, roughness: 0.05 }); gm.userData.tinted = true;
      const glass = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), gm); glass.position.y = H - drop + r; g.add(glass);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(r * 0.35, 16, 12), glowMat(it, 1.4)); bulb.position.y = H - drop + r; g.add(bulb);
      addPoint(g, it, 0, H - drop + r, 0, cdOmni(lmOf(LIGHT_BUILDERS.globe, it)));
    } },
  ring: { label: '디자인등(링)', light: true, watt: 24, parts: { body: 'frame.black' }, def: { w: 0.6, d: 0.6, h: 0.5 },
    build(g, it, M) {
      const drop = it.h, r = it.w / 2;
      cyl(g, 0.05, 0.02, M('body'), 0, H - 0.02, 0);
      for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; cord(g, Math.cos(a) * r, H - drop + 0.02, H - 0.02, Math.sin(a) * r); }
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 12, 64), M('body')); t.rotation.x = Math.PI / 2; t.position.y = H - drop; t.castShadow = true; g.add(t);
      const gl = new THREE.Mesh(new THREE.TorusGeometry(r, 0.014, 8, 64), glowMat(it)); gl.rotation.x = Math.PI / 2; gl.position.y = H - drop - 0.015; g.add(gl);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; addPoint(g, it, Math.cos(a) * r * 0.7, H - drop - 0.05, Math.sin(a) * r * 0.7, cdOmni(lmOf(LIGHT_BUILDERS.ring, it)) / 4); }
    } },
  // ── 마그네틱 레일 시스템 (서울L&D몰 "마그네틱 조명 LED 라인 레일" 기준) ──
  // 레일: 일자형 100~3,020 mm, 매입형(기본) / 노출형(exposed). 등기구는 레일 위 아무 곳에나 자석으로 붙는 구조라
  // 여기서는 각각 별도 아이템으로 두고 레일 선상에 배치한다. 색온도 3000 / 4000 / 5700K.
  magtrack: { label: '마그네틱 레일', parts: { body: 'frame.black' }, def: { w: 2.0, d: 0.025, h: 0.03 }, ceiling: true,
    build(g, it, M) {
      const m = M('body');
      if (it.exposed) {                     // 노출형: 25 × 30 mm 알루미늄 바
        bx(g, it.w, it.h, it.d, m, 0, H - it.h, 0, { cast: false });
        bx(g, it.w - 0.004, 0.002, it.d * 0.55, SPECIAL.dark, 0, H - it.h - 0.002, 0, { cast: false });
      } else {                              // 매입형: 천장면과 같은 높이의 검은 슬롯
        bx(g, it.w, 0.006, it.d, m, 0, H - 0.006, 0, { cast: false });
        bx(g, it.w - 0.004, 0.002, it.d * 0.55, SPECIAL.dark, 0, H - 0.008, 0, { cast: false });
      }
    } },
  magline: { label: '마그네틱 라인등(300/600/900)', light: true, watt: (it) => Math.max(1, Math.round(it.w / 0.3)) * 10, parts: { body: 'frame.black' }, def: { w: 0.6, d: 0.024, h: 0.035 },
    build(g, it, M) {                        // 10 / 20 / 30 W — 길이 0.3 단위로 광원 하나씩
      bx(g, it.w, it.h, it.d, M('body'), 0, H - it.h, 0, { cast: false });
      const s = new THREE.Mesh(boxGeo(it.w - 0.01, 0.004, it.d - 0.008), glowMat(it, 1.1)); s.position.y = H - it.h - 0.002; g.add(s);
      const n = Math.max(1, Math.round(it.w / 0.3));
      const W = lmOf(LIGHT_BUILDERS.magline, it);
      addRect(g, it, 0, H - it.h - 0.006, 0, it.w - 0.01, 0.016, W, 0.25);                 // 라인 면광원(반사용)
      for (let i = 0; i < n; i++) addSpot(g, it, -it.w / 2 + it.w * (i + 0.5) / n, H - it.h - 0.02, 0, THREE.MathUtils.degToRad(60), W, 0.75 / n, undefined, 0, 0, 6, 2);
    } },
  maglens: { label: '마그네틱 라인렌즈(300/600/900)', light: true, watt: (it) => Math.max(1, Math.round(it.w / 0.3)) * 12, parts: { body: 'frame.black' }, def: { w: 0.6, d: 0.024, h: 0.04 },
    build(g, it, M) {                        // 12 / 24 / 38 W — 렌즈가 줄지어 있고 아래로 집광
      bx(g, it.w, it.h, it.d, M('body'), 0, H - it.h, 0, { cast: false });
      const n = Math.max(1, Math.round(it.w / 0.3)), per = 6;
      for (let i = 0; i < n * per; i++) {
        const x = -it.w / 2 + it.w * (i + 0.5) / (n * per);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.006, 12), glowMat(it, 1.3)); lens.position.set(x, H - it.h - 0.001, 0); lens.rotation.x = Math.PI / 2; g.add(lens);
      }
      for (let i = 0; i < n; i++) {
        const x = -it.w / 2 + it.w * (i + 0.5) / n;
        const sp = new THREE.SpotLight(lampColor(it), 0, 6, 0.6, 0.5, 2);
        sp.position.set(x, H - 0.05, 0); sp.target.position.set(x, 0, 0); sp.shadow.mapSize.set(256, 256); sp.shadow.bias = -0.0008; sp.userData.shadowPrio = 2; sp.userData.base = cdSpot(lmOf(LIGHT_BUILDERS.maglens, it), 0.6) / n; g.add(sp, sp.target);
      }
    } },
  magspot: { label: '마그네틱 원형 스포트(10W)', light: true, watt: 10, parts: { body: 'frame.black' }, def: { w: 0.03, d: 0.03, h: 0.1 },
    build(g, it, M) {                        // 레일에 붙는 베이스 + 기울어진 원통 헤드. 정면(+z) 쪽으로 비춘다
      const m = M('body'), tilt = THREE.MathUtils.degToRad(it.tilt ?? 25);
      bx(g, 0.04, 0.012, 0.024, m, 0, H - 0.012, 0, { cast: false });
      const arm = cyl(g, 0.005, 0.03, m, 0, H - 0.042, 0, { seg: 8 });
      const head = cyl(g, 0.015, 0.075, m, 0, 0, 0, { seg: 20 }); head.rotation.x = -tilt; head.position.set(0, H - 0.075, 0.012);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.011, 16), glowMat(it, 1.4));
      lens.position.set(0, H - 0.075 - 0.037 * Math.cos(tilt), 0.012 + 0.037 * Math.sin(tilt)); lens.rotation.x = Math.PI / 2 - tilt; g.add(lens);
      const sp = new THREE.SpotLight(lampColor(it), 0, 7, 0.45, 0.5, 2);
      sp.position.set(0, H - 0.1, 0.02); sp.target.position.set(0, 0, 0.02 + (H - 0.1) * Math.tan(tilt)); sp.shadow.mapSize.set(256, 256); sp.shadow.bias = -0.0008; sp.userData.shadowPrio = 2; sp.userData.base = cdSpot(lmOf(LIGHT_BUILDERS.magspot, it), 0.45); g.add(sp, sp.target);
    } },
  magdual: { label: '마그네틱 사각 듀얼 스포트(20W)', light: true, watt: 20, parts: { body: 'frame.black' }, def: { w: 0.075, d: 0.035, h: 0.04 },
    build(g, it, M) {
      bx(g, it.w, it.h, it.d, M('body'), 0, H - it.h, 0, { cast: false });
      for (const x of [-it.w / 4, it.w / 4]) {
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.011, 16), glowMat(it, 1.4)); lens.position.set(x, H - it.h - 0.001, 0); lens.rotation.x = Math.PI / 2; g.add(lens);
        const sp = new THREE.SpotLight(lampColor(it), 0, 7, 0.5, 0.5, 2);
        sp.position.set(x, H - 0.06, 0); sp.target.position.set(x, 0, 0); sp.shadow.mapSize.set(256, 256); sp.shadow.bias = -0.0008; sp.userData.shadowPrio = 2; sp.userData.base = cdSpot(lmOf(LIGHT_BUILDERS.magdual, it), 0.5) / 2; g.add(sp, sp.target);
      }
    } },
  cove: { label: '간접조명(라인)', light: true, watt: (it) => Math.round(it.w * 10), parts: { lip: 'ceiling' }, def: { w: 2.0, d: 0.12, h: 0.1 },
    build(g, it, M) {
      // 천장에 매단 막이판 뒤에서 빛이 새어 천장·벽을 씻어 올린다. 정면(+z)이 방 쪽, 등은 벽(-z) 쪽에 붙인다.
      bx(g, it.w, it.h, 0.02, M('lip'), 0, H - it.h, it.d / 2 - 0.01);
      bx(g, it.w, 0.02, it.d, M('lip'), 0, H - it.h, 0, { cast: false });
      const s = new THREE.Mesh(boxGeo(it.w - 0.02, 0.006, 0.02), glowMat(it, 1.2)); s.position.set(0, H - it.h + 0.023, -it.d / 2 + 0.03); g.add(s);
      const n = Math.max(1, Math.round(it.w / 0.8));
      for (let i = 0; i < n; i++) addPoint(g, it, -it.w / 2 + it.w * (i + 0.5) / n, H - it.h / 2, -it.d / 2 + 0.03, cdOmni(lmOf(LIGHT_BUILDERS.cove, it)) / n, 4);
    } },
  track: { label: '레일 스팟(3구)', light: true, watt: 15, parts: { body: 'frame.black' }, def: { w: 1.2, d: 0.04, h: 0.12 },
    build(g, it, M) {
      bx(g, it.w, 0.03, 0.035, M('body'), 0, H - 0.03, 0);
      const n = Math.max(1, Math.round(it.w / 0.4));
      for (let i = 0; i < n; i++) {
        const x = -it.w / 2 + it.w * (i + 0.5) / n;
        cyl(g, 0.012, 0.05, M('body'), x, H - 0.08, 0);
        const head = cyl(g, 0.03, 0.1, M('body'), x, H - 0.18, 0); head.rotation.x = 0.35; head.position.z = 0.03;
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.024, 16), glowMat(it)); lens.position.set(x, H - 0.19, 0.06); lens.rotation.x = -Math.PI / 2 + 0.35; g.add(lens);
        const sp = new THREE.SpotLight(lampColor(it), 0, 7, 0.55, 0.5, 2);
        sp.position.set(x, H - 0.15, 0.03); sp.target.position.set(x, 0, 0.8); sp.shadow.mapSize.set(256, 256); sp.shadow.bias = -0.0008; sp.userData.shadowPrio = 2; sp.userData.base = cdSpot(lmOf(LIGHT_BUILDERS.track, it), 0.55) / n; g.add(sp, sp.target);
      }
    } },
};
Object.assign(BUILDERS, LIGHT_BUILDERS);
export const CATALOG_LIGHTS = Object.keys(LIGHT_BUILDERS);

// 카탈로그에 노출할 타입 순서
export const CATALOG = ['bed', 'bed1', 'daybed', 'sofa', 'armchair', 'ottoman', 'table', 'roundtable', 'chair', 'desk', 'desk_dark', 'desk_curve', 'wardrobe', 'wallcab', 'bedshelf', 'drawers', 'bookshelf', 'shelfwall', 'lowcab', 'tallcab', 'tvstand', 'fridge', 'kcounter', 'kupper', 'plant', 'rug', 'lamp',
  'basin_wall', 'basin', 'mirrorcab', 'toilet', 'towelbar', 'paperholder', 'ledge', 'panel', 'glasswall', 'bin', 'cassette', 'box'];

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
