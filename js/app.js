import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { H, S, mx, mz, CENTER, BOUNDS, VIEWS, DEFAULT_ITEMS, PLAN_VERSION, WALLS } from './plan.js';
import { PAINTS, DEFAULT_PAINTS, updatePaint, getMaterial, OPTICS } from './materials.js';
import { FINISHES } from './textures.js';
import { SCHEMES } from './schemes.js';
import { buildWalls, buildFloors, buildDoors, buildFixtures, buildItem, BUILDERS, CATALOG, CATALOG_LIGHTS, KELVIN_OPTIONS, wattOf, lmOf, SHADOW_BUDGET } from './builders.js';

const SAVE_KEY = 'homedeck.v1';
const $ = (s) => document.querySelector(s);

// ── 상태 ───────────────────────────────────────────────────────
const state = { items: [], exposure: 1.0, sun: 0.7, lamp: 1.0, scheme: 'base', night: false };
const objs = new Map();          // itemId → Group

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) { const s = JSON.parse(raw); if (s.v === 1) return s; }
  } catch (e) { console.warn('저장 데이터 읽기 실패', e); }
  return null;
}
function applySaved(s) {
  // 평면 좌표계가 바뀐 저장본이면 가구 배치는 기본값으로, 색·마감만 이어받는다
  state.items = s.plan === PLAN_VERSION ? s.items : JSON.parse(JSON.stringify(DEFAULT_ITEMS));
  if (s.plan !== PLAN_VERSION) setTimeout(() => flash('평면·조명 구성이 바뀌어 배치를 기본값으로 되돌렸습니다(색은 유지)'), 800);
  state.exposure = s.exposure ?? 1.0; state.sun = Math.min(1, s.sun ?? 0.7); state.lamp = Math.min(1, s.lamp ?? 1.0); state.scheme = s.scheme || 'base'; state.night = !!s.night;
  for (const it of s.items || []) if (it.pw > 1) it.pw = 1;   // 조광은 정격(100%)을 넘지 않는다 — 옛 저장본 보정
  // pv 2 부터는 기본값과 다른 페인트만 저장 → 코드의 새 기본 색이 옛 저장본에 덮이지 않는다.
  // 옛 형식(pv 없음)은 모든 키에 당시 기본값이 들어 있어 구분이 안 되므로 색을 이어받지 않는다.
  if (s.pv === 2) { for (const k of Object.keys(PAINTS)) if (s.paints && s.paints[k]) updatePaint(k, s.paints[k]); }
  else if (s.paints) setTimeout(() => flash('저장 형식이 바뀌어 색·마감을 기본값으로 되돌렸습니다'), 1600);
}
const PAINT_FIELDS = ['color', 'finish', ...OPTICS];
function serialize() {
  const paints = {};
  for (const k of Object.keys(PAINTS)) {
    const p = PAINTS[k], d = DEFAULT_PAINTS[k];
    if (PAINT_FIELDS.some(f => (p[f] ?? null) !== (d[f] ?? null))) { paints[k] = {}; for (const f of PAINT_FIELDS) paints[k][f] = p[f] ?? null; }   // 비운 값은 null 로(JSON 유지)
  }
  const items = state.items.map(it => Object.fromEntries(Object.entries(it).filter(([k]) => !k.startsWith('_'))));   // _센서 상태 같은 임시 필드는 저장 안 함
  return { v: 1, pv: 2, plan: PLAN_VERSION, items, paints, exposure: state.exposure, sun: state.sun, lamp: state.lamp, scheme: state.scheme, night: state.night, savedAt: new Date().toISOString() };
}
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { localStorage.setItem(SAVE_KEY, JSON.stringify(serialize())); flash('저장됨'); }, 250);
}
function flash(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 1200);
}

// ── 씬 ─────────────────────────────────────────────────────────
const canvas = $('#c');
// 부하 절감: 픽셀비 1 고정 · 가벼운 PCF 그림자(1024) · 외부 지형/건물 없음 · 화면이 바뀔 때만 렌더(아래 dirty)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1);   // 픽셀비 1 고정(부하 절감) — 고DPI 모니터에서는 약간 부드럽게 보임
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;   // 그림자 깊이맵은 씬(가구·조명)이 바뀔 때만 다시 그린다 — 카메라 이동은 공짜
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfd8e3');
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 200);
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true; orbit.dampingFactor = 0.08; orbit.maxPolarAngle = Math.PI * 0.499;
orbit.target.set(CENTER.x, 1.0, CENTER.z);
const walk = new PointerLockControls(camera, document.body);

// 햇빛: 슬라이더 최대(1.0) = 한국 남향 아파트 한낮. 거실 큰 창(모델의 x=0 쪽)이 남향이라고 보고 그쪽에서 고도 39° 로 들어온다
// (서울 위도 37.5°의 계절 평균 정오 고도 ≈ 30~76°, 봄·가을 기준). 태양 세기·하늘광·환경광이 함께 슬라이더를 따른다.
const SUN_MAX = 6.0, HEMI_MIN = 0.12, HEMI_MAX = 0.75, ENV_MIN = 0.25, ENV_MAX = 1.0;
const hemi = new THREE.HemisphereLight('#e8eef5', '#6b675f', 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3e0', 2.2);
sun.position.set(CENTER.x - 16, 13.4, CENTER.z + 3); sun.target.position.set(CENTER.x, 0, CENTER.z);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

buildWalls(scene);
buildFloors(scene);
buildDoors(scene);
buildFixtures(scene);

const itemRoot = new THREE.Group(); scene.add(itemRoot);

function mountItem(it) {
  unmountItem(it.id);
  const g = buildItem(it);
  itemRoot.add(g); objs.set(it.id, g);
  applyLamp(g, it);
  enforceShadowBudget();
  return g;
}
// 그림자 켤 스포트 수 제한: GPU 샘플러 한계(보통 16개 텍스처) 때문에 우선순위(방등 3 > 스포트류 2 > 라인 2) 상위 SHADOW_BUDGET 개만 켠다
function enforceShadowBudget() {
  const spots = []; itemRoot.traverse(o => { if (o.isSpotLight) spots.push(o); });
  spots.sort((a, b) => (b.userData.shadowPrio || 0) - (a.userData.shadowPrio || 0));
  spots.forEach((sp, i) => { sp.castShadow = (sp.userData.shadowPrio || 0) > 0 && i < SHADOW_BUDGET; });
  renderer.shadowMap.needsUpdate = true;
}
// 조명 아이템: 광원 세기 = 기준(base) × 켜짐 × 아이템 배율(pw) × 전역 슬라이더
function applyLamp(g, it) {
  const sensor = it.type === 'sensorlight' && walk.isLocked ? (it._sensorOn ? 1 : 0) : 1;   // 센서등: 걷기 모드에서만 감지 상태를 따른다
  const f = (it.lit === false ? 0 : (it.pw ?? 1)) * state.lamp * sensor;
  g.traverse(o => {
    if (o.isLight) o.intensity = (o.userData.base || 0) * f;
    if (o.userData.glow) { if (o.userData.glowBase == null) o.userData.glowBase = o.material.emissiveIntensity; o.material.emissiveIntensity = f > 0 ? o.userData.glowBase : 0; }
  });
}
// 센서등 감지: 걷는 사람이 수평 2.5 m 안에 들어오면 켜지고, 벗어나면 3 초 뒤에 꺼진다
const SENSOR_RANGE = 2.5, SENSOR_HOLD = 3;
function updateSensors(dt) {
  for (const it of state.items) {
    if (it.type !== 'sensorlight') continue;
    const near = Math.hypot(camera.position.x - it.x, camera.position.z - it.z) < SENSOR_RANGE;
    it._sensorT = near ? SENSOR_HOLD : Math.max(0, (it._sensorT ?? 0) - dt);
    const on = it._sensorT > 0;
    if (on !== !!it._sensorOn) { it._sensorOn = on; const g = objs.get(it.id); if (g) applyLamp(g, it); invalidate(); }
  }
}
function applyLampAll() { for (const g of objs.values()) applyLamp(g, g.userData.item); }
function unmountItem(id) {
  const g = objs.get(id); if (!g) return;
  itemRoot.remove(g); objs.delete(id); renderer.shadowMap.needsUpdate = true;
  g.traverse(o => { if (o.userData.mirror) o.dispose(); else if (o.isMesh) { o.geometry.dispose(); if (o.material.userData.tinted) o.material.dispose(); } });   // 거울은 렌더타깃까지 해제
}
function mountAll() { for (const id of [...objs.keys()]) unmountItem(id); for (const it of state.items) mountItem(it); }

// ── 초기 로드 ──────────────────────────────────────────────────
const saved = loadState();
if (saved) applySaved(saved); else state.items = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
mountAll();
// ── 낮/밤 ─────────────────────────────────────────────────────
// 밤: 바깥에서 들어오는 빛(햇빛·하늘·환경맵) 0 → 실내 등만 빛을 낸다. 등이 없는 방은 다른 방에서 새어 드는 빛만큼만 보인다.
const DAY_BG = new THREE.Color('#cfd8e3'), NIGHT_BG = new THREE.Color('#0a0d12');
function applyDayNight() {
  const n = state.night;
  const s = Math.min(1, Math.max(0, state.sun));
  sun.intensity = n ? 0 : SUN_MAX * s;
  hemi.intensity = n ? 0.015 : HEMI_MIN + (HEMI_MAX - HEMI_MIN) * s;
  scene.environmentIntensity = n ? 0.02 : ENV_MIN + (ENV_MAX - ENV_MIN) * s;
  scene.background = n ? NIGHT_BG : DAY_BG;
  $('#sunlight').disabled = n;
  $('#btn-night').textContent = n ? '☀ 낮' : '🌙 밤';
  document.body.classList.toggle('night', n);
}
$('#btn-night').onclick = () => { state.night = !state.night; applyDayNight(); save(); flash(state.night ? '밤 — 실내 조명만' : '낮'); };
renderer.toneMappingExposure = state.exposure; applyDayNight();

// ── 시점 ───────────────────────────────────────────────────────
function setView(v) {
  if (walk.isLocked) walk.unlock();
  const p = new THREE.Vector3(mx(v.pos[0]), v.h, mz(v.pos[1]));
  const l = new THREE.Vector3(mx(v.look[0]), v.top ? 0 : 1.3, mz(v.look[1]));
  camera.position.copy(p); orbit.target.copy(l); orbit.update();
}
const viewSel = $('#view');
for (const v of VIEWS) { const o = document.createElement('option'); o.value = v.id; o.textContent = v.label; viewSel.appendChild(o); }
viewSel.onchange = () => setView(VIEWS.find(v => v.id === viewSel.value));
{ const top = VIEWS.find(v => v.id === 'top') || VIEWS[0]; setView(top); viewSel.value = top.id; }   // 시작은 탑뷰

// 걷기 모드 — 눌린 키는 "마지막 keydown 시각" 으로 관리한다. 한글 IME 상태에서는 keyup 이 씹혀 키가 눌린 채로
// 남는 일이 있어(→ 혼자 계속 움직임), OS 자동 반복이 끊긴 지 1.1 초가 지나면 뗀 것으로 본다.
const WALK_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
const keyTime = new Map();                 // code → performance.now()
const keys = { has: (c) => keyTime.has(c), get size() { return keyTime.size; } };
function pruneKeys() { const now = performance.now(); for (const [c, t] of keyTime) if (now - t > 1100) keyTime.delete(c); }   // 윈도우 반복 지연 최대 1초
// 걷기 시작: 현관문 밖 2.5 m 지점에서 문(북쪽)을 바라보며 들어간다 — 현관 센서등(z 8,300)까지 3.2 m 라 꺼진 상태로 시작
const WALK_START = { pos: [5850, 11500], look: [5850, 8000] };
$('#btn-walk').onclick = () => {
  camera.position.set(mx(WALK_START.pos[0]), 1.5, mz(WALK_START.pos[1]));
  camera.lookAt(mx(WALK_START.look[0]), 1.3, mz(WALK_START.look[1]));
  invalidate(); walk.lock();
};
walk.addEventListener('lock', () => { document.body.classList.add('walking'); orbit.enabled = false; keyTime.clear(); for (const it of state.items) if (it.type === 'sensorlight') { it._sensorOn = false; it._sensorT = 0; } applyLampAll(); });
walk.addEventListener('unlock', () => {
  document.body.classList.remove('walking'); orbit.enabled = true; keyTime.clear(); applyLampAll();   // 걷기 종료: 센서등은 다시 항상 켜짐
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  orbit.target.copy(camera.position).addScaledVector(dir, 3); orbit.update();
});
addEventListener('keydown', e => {
  if (!WALK_KEYS.has(e.code)) return;
  if (walk.isLocked) e.preventDefault();   // IME 조합·페이지 스크롤로 새지 않게
  keyTime.set(e.code, performance.now());
});
addEventListener('keyup', e => { keyTime.delete(e.code); if (e.key === 'Process') keyTime.clear(); });
addEventListener('blur', () => keyTime.clear());
document.addEventListener('visibilitychange', () => keyTime.clear());

// ── 선택 · 드래그 · 페인트 ────────────────────────────────────
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const helper = new THREE.BoxHelper(new THREE.Object3D(), '#ffb400'); helper.visible = false; scene.add(helper);
let selected = null;             // { item } | { paint, mesh }
let drag = null;

function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(scene.children, true).filter(h => h.object.isMesh && !h.object.userData.glass && h.object !== helper);
  return hits[0] || null;
}
function selectItem(it) {
  selected = { item: it };
  const g = objs.get(it.id); helper.setFromObject(g); helper.visible = true;
  showItemPanel(it);
}
function selectPaint(key, mesh) {
  selected = { paint: key, mesh };
  helper.setFromObject(mesh); helper.visible = true;
  showPaintPanel(key);
}
function deselect() { selected = null; helper.visible = false; $('#item-panel').hidden = true; $('#paint-panel').hidden = true; }
function refreshHelper() { if (selected?.item) { const g = objs.get(selected.item.id); if (g) helper.setFromObject(g); } }

canvas.addEventListener('pointerdown', ev => {
  if (walk.isLocked || ev.button !== 0) return;
  const hit = pick(ev);
  if (!hit) return;
  const id = hit.object.userData.itemId;
  if (id) {
    const it = state.items.find(i => i.id === id);
    if (!it) return;
    selectItem(it);
    if (!it.locked) {
      const p = new THREE.Vector3(); ray.ray.intersectPlane(floorPlane, p);
      drag = { it, ox: it.x - p.x, oz: it.z - p.z, moved: false };
      orbit.enabled = false;
    }
  } else if (hit.object.userData.paint) {
    selectPaint(hit.object.userData.paint, hit.object);
  }
});
canvas.addEventListener('pointermove', ev => {
  if (!drag) return;
  const r = canvas.getBoundingClientRect();
  ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const p = new THREE.Vector3();
  if (!ray.ray.intersectPlane(floorPlane, p)) return;
  const q = resolveWalls(drag.it, p.x + drag.ox, p.z + drag.oz);
  drag.it.x = +q.x.toFixed(3); drag.it.z = +q.z.toFixed(3); drag.moved = true;
  const g = objs.get(drag.it.id); g.position.set(drag.it.x, 0, drag.it.z);
  refreshHelper(); fillItemFields(drag.it);
});

// ── 벽 충돌 · 자석 스냅 ────────────────────────────────────────
// 축에 나란한 벽 구간(문·개구는 제외, 창은 벽으로 취급)을 사각형으로 두고, 드래그 중인 가구의 발자국(회전 반영 AABB)이
// 벽을 파고들면 밀어내고, 벽 면에서 SNAP 안쪽이면 면에 딱 붙인다.
const SNAP = 0.15;
const WALL_RECTS = (() => {
  const out = [];
  for (const w of WALLS) {
    const vert = w.a[0] === w.b[0], horz = w.a[1] === w.b[1];
    if (!vert && !horz) continue;                                  // 사선 벽(중문)은 제외
    const L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) * S, t = w.t * S / 2;
    const gaps = (w.gaps || []).filter(g => g.kind !== 'window').map(g => [g.from * S, g.to * S]).sort((a, b) => a[0] - b[0]);
    let cur = 0; const spans = [];
    for (const [s0, s1] of gaps) { if (s0 > cur) spans.push([cur, s0]); cur = s1; }
    if (L > cur) spans.push([cur, L]);
    const ax = mx(w.a[0]), az = mz(w.a[1]), sx = Math.sign(w.b[0] - w.a[0]), sz = Math.sign(w.b[1] - w.a[1]);
    for (const [s0, s1] of spans) {
      if (vert) { const z0 = az + sz * s0, z1 = az + sz * s1; out.push({ x0: ax - t, x1: ax + t, z0: Math.min(z0, z1), z1: Math.max(z0, z1) }); }
      else { const x0 = ax + sx * s0, x1 = ax + sx * s1; out.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: az - t, z1: az + t }); }
    }
  }
  return out;
})();
function halfExtents(it) {
  const a = THREE.MathUtils.degToRad(it.rot || 0), c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
  return { hx: (it.w / 2) * c + (it.d / 2) * s, hz: (it.w / 2) * s + (it.d / 2) * c };
}
function resolveWalls(it, x, z) {
  const { hx, hz } = halfExtents(it);
  for (let pass = 0; pass < 2; pass++) for (const r of WALL_RECTS) {            // 1) 파고든 벽에서 밀어내기
    const ox = Math.min(x + hx, r.x1) - Math.max(x - hx, r.x0), oz = Math.min(z + hz, r.z1) - Math.max(z - hz, r.z0);
    if (ox <= 0 || oz <= 0) continue;
    if (ox < oz) x += x < (r.x0 + r.x1) / 2 ? -ox : ox; else z += z < (r.z0 + r.z1) / 2 ? -oz : oz;
  }
  let snx = null, snz = null;                                                     // 2) 가장 가까운 벽 면에 스냅
  for (const r of WALL_RECTS) {
    const ox = Math.min(x + hx, r.x1) - Math.max(x - hx, r.x0), oz = Math.min(z + hz, r.z1) - Math.max(z - hz, r.z0);
    if (oz > 0.05) { const g1 = r.x0 - (x + hx), g2 = (x - hx) - r.x1;
      if (g1 >= 0 && g1 < SNAP && (snx === null || g1 < Math.abs(snx))) snx = g1;
      if (g2 >= 0 && g2 < SNAP && (snx === null || g2 < Math.abs(snx))) snx = -g2; }
    if (ox > 0.05) { const g1 = r.z0 - (z + hz), g2 = (z - hz) - r.z1;
      if (g1 >= 0 && g1 < SNAP && (snz === null || g1 < Math.abs(snz))) snz = g1;
      if (g2 >= 0 && g2 < SNAP && (snz === null || g2 < Math.abs(snz))) snz = -g2; }
  }
  if (snx !== null) x += snx; if (snz !== null) z += snz;
  return { x, z };
}
addEventListener('pointerup', () => { if (drag) { if (drag.moved) { save(); renderer.shadowMap.needsUpdate = true; } drag = null; orbit.enabled = !walk.isLocked; } });

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Escape') deselect();
  if (!selected?.item) return;
  const it = selected.item;
  if (e.code === 'Delete' || e.code === 'Backspace') { removeItem(it); }
  if (it.locked) return;
  if (e.code === 'KeyQ') rotateItem(it, -15); if (e.code === 'KeyE') rotateItem(it, 15); if (e.code === 'KeyR') rotateItem(it, 90);
});

function rotateItem(it, deg) { it.rot = ((it.rot || 0) + deg + 360) % 360; objs.get(it.id).rotation.y = THREE.MathUtils.degToRad(it.rot); refreshHelper(); fillItemFields(it); renderer.shadowMap.needsUpdate = true; save(); }
function removeItem(it) { unmountItem(it.id); state.items = state.items.filter(i => i !== it); deselect(); save(); }
function rebuildItem(it) { mountItem(it); refreshHelper(); save(); }
let seq = Date.now() % 100000;
function addItem(type, at) {
  const B = BUILDERS[type];
  const it = { id: 'u' + (seq++), type, label: B.label, x: +at.x.toFixed(2), z: +at.z.toFixed(2), rot: 0, ...B.def, locked: false, builtin: false, colors: {} };
  state.items.push(it); mountItem(it); selectItem(it); save();
}

// ── 아이템 패널 ────────────────────────────────────────────────
const IP = $('#item-panel');
function showItemPanel(it) {
  $('#paint-panel').hidden = true; IP.hidden = false;
  $('#ip-title').textContent = it.label + (it.builtin ? ' (기본 배치)' : '');
  const B = BUILDERS[it.type], parts = $('#ip-parts'); parts.innerHTML = '';
  for (const [part, key] of Object.entries(B.parts)) {
    const row = document.createElement('label'); row.className = 'row';
    row.innerHTML = `<span>${PAINTS[key].label}</span><input type="color" value="${it.colors[part] || PAINTS[key].color}"><button class="mini" title="공유 색으로 되돌리기">↺</button>`;
    row.querySelector('input').oninput = (e) => { it.colors[part] = e.target.value; rebuildItem(it); };
    row.querySelector('button').onclick = () => { delete it.colors[part]; rebuildItem(it); showItemPanel(it); };
    parts.appendChild(row);
  }
  const L = $('#ip-light'); L.hidden = !B.light;
  if (B.light) { $('#ip-lit').checked = it.lit !== false; $('#ip-pw').value = it.pw ?? 1; $('#ip-kelvin').value = String(it.kelvin || 3000); $('#ip-watt').value = wattOf(B, it); }
  $('#ip-dims').textContent = B.light ? `${wattOf(B, it)} W ≈ ${Math.round(lmOf(B, it))} lm · ` + (it.type === 'downlight' ? '폭 = 트림 지름' : '높이 = 천장에서 내려오는 길이') : B.ceiling ? '천장 부착 — 폭·깊이로 패널 크기 조절' : '';
  fillItemFields(it);
}
$('#ip-lit').onchange = (e) => { const it = selected?.item; if (!it) return; it.lit = e.target.checked; rebuildItem(it); };
$('#ip-pw').oninput = (e) => { const it = selected?.item; if (!it) return; it.pw = +e.target.value; applyLamp(objs.get(it.id), it); };
$('#ip-pw').onchange = () => { const it = selected?.item; if (it) rebuildItem(it); };
$('#ip-kelvin').onchange = (e) => { const it = selected?.item; if (!it) return; it.kelvin = +e.target.value; it.kelvin_user = true; rebuildItem(it); $('#kelvin-all').value = ''; };
$('#ip-watt').onchange = (e) => { const it = selected?.item; if (!it) return; const w = +e.target.value; if (w > 0) it.watt = w; else delete it.watt; rebuildItem(it); showItemPanel(it); };
for (const k of KELVIN_OPTIONS) {
  for (const sel of ['#ip-kelvin', '#kelvin-all']) { const o = document.createElement('option'); o.value = k; o.textContent = k + 'K'; $(sel).appendChild(o); }
}
// 전체 색온도: 모든 등의 kelvin 을 한 번에. 이후 스킴이 바꾸지 않도록 kelvin_user 표시
$('#kelvin-all').onchange = (e) => {
  const k = +e.target.value; if (!k) return;
  for (const it of state.items) if (BUILDERS[it.type]?.light) { it.kelvin = k; it.kelvin_user = true; }
  mountAll(); if (selected?.item) selectItem(selected.item); save(); flash(`전체 색온도 ${k}K`);
};
function fillItemFields(it) {
  if (IP.hidden) return;
  $('#ip-lock').checked = !!it.locked;
  for (const k of ['x', 'z', 'rot', 'w', 'd', 'h']) $('#ip-' + k).value = it[k];
  const B = BUILDERS[it.type];                                   // 벽부착품: 설치 높이(y0)
  $('#ip-y0-row').hidden = !B.mount;
  if (B.mount) $('#ip-y0').value = it.y0 ?? B.mount;
}
$('#ip-y0').onchange = (e) => { const it = selected?.item; if (!it) return; it.y0 = +e.target.value; rebuildItem(it); };
$('#ip-lock').onchange = (e) => { if (selected?.item) { selected.item.locked = e.target.checked; save(); } };
for (const k of ['x', 'z', 'rot', 'w', 'd', 'h']) $('#ip-' + k).onchange = (e) => {
  const it = selected?.item; if (!it) return;
  it[k] = +e.target.value; rebuildItem(it);
};
$('#ip-rotl').onclick = () => selected?.item && rotateItem(selected.item, -15);
$('#ip-rotr').onclick = () => selected?.item && rotateItem(selected.item, 15);
$('#ip-rot90').onclick = () => selected?.item && rotateItem(selected.item, 90);
$('#ip-dup').onclick = () => { const it = selected?.item; if (!it) return; const c = JSON.parse(JSON.stringify(it)); c.id = 'u' + (seq++); c.x += 0.3; c.z += 0.3; c.locked = false; c.builtin = false; state.items.push(c); mountItem(c); selectItem(c); save(); };
$('#ip-del').onclick = () => selected?.item && removeItem(selected.item);
$('#ip-close').onclick = deselect;

// ── 페인트 패널(면 클릭) ───────────────────────────────────────
function paintRow(key) {
  const p = PAINTS[key];
  const row = document.createElement('div'); row.className = 'prow'; row.dataset.key = key;
  row.innerHTML = `<span class="lbl">${p.label}</span><input type="color" value="${p.color}"><select>${Object.entries(FINISHES).map(([k, f]) => `<option value="${k}" ${k === p.finish ? 'selected' : ''}>${f.label}</option>`).join('')}</select>`;
  row.querySelector('input').oninput = (e) => { updatePaint(key, { color: e.target.value }); syncPaintRows(key); save(); };
  row.querySelector('select').onchange = (e) => { updatePaint(key, { finish: e.target.value, rough: undefined }); syncPaintRows(key); save(); };
  return row;
}
function syncPaintRows(key) {
  document.querySelectorAll(`.prow[data-key="${key}"]`).forEach(r => { r.querySelector('input').value = PAINTS[key].color; r.querySelector('select').value = PAINTS[key].finish; });
}
function showPaintPanel(key) {
  IP.hidden = true; const pp = $('#paint-panel'); pp.hidden = false;
  const host = $('#pp-row'); host.innerHTML = ''; host.appendChild(paintRow(key));
}
$('#pp-close').onclick = deselect;

// 페인트 탭 전체 목록
{
  const host = $('#paint-list'); const groups = {};
  for (const [k, p] of Object.entries(PAINTS)) (groups[p.group] ||= []).push(k);
  for (const [g, keys] of Object.entries(groups)) {
    const h = document.createElement('h4'); h.textContent = g; host.appendChild(h);
    for (const k of keys) host.appendChild(paintRow(k));
  }
}

// 색 스와치
const SWATCHES = ['#ffffff', '#f1efe9', '#e8e2d6', '#d9d9d9', '#bdbdbd', '#8a8a8a', '#4d4d4f', '#2b2b2b', '#c9b79c', '#a88a6a', '#7a5a3a', '#556b5a', '#3f5d7a', '#8b3a3a', '#d7a86e', '#f4d35e'];
{
  const host = $('#swatches');
  for (const c of SWATCHES) {
    const b = document.createElement('button'); b.className = 'sw'; b.style.background = c; b.title = c;
    b.onclick = () => {
      if (selected?.paint) { updatePaint(selected.paint, { color: c }); syncPaintRows(selected.paint); save(); }
      else if (selected?.item) { const it = selected.item, part = Object.keys(BUILDERS[it.type].parts)[0]; it.colors[part] = c; rebuildItem(it); showItemPanel(it); }
      else flash('먼저 면이나 가구를 클릭하세요');
    };
    host.appendChild(b);
  }
}

// ── 가구·조명 카탈로그 ─────────────────────────────────────────
function fillCatalog(host, types) {
  for (const t of types) {
    const b = document.createElement('button'); b.textContent = BUILDERS[t].label;
    b.onclick = () => {
      // 카메라 앞 2.5m 바닥, 집 외곽 안으로 클램프
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize();
      const p = camera.position.clone().addScaledVector(dir, 2.5); p.y = 0;
      p.x = THREE.MathUtils.clamp(p.x, 0.4, BOUNDS.w - 0.4); p.z = THREE.MathUtils.clamp(p.z, 0.4, BOUNDS.d - 0.4);
      addItem(t, p);
    };
    host.appendChild(b);
  }
}
fillCatalog($('#catalog'), CATALOG);
fillCatalog($('#catalog-lights'), CATALOG_LIGHTS);
$('#btn-unlock-all').onclick = () => { for (const it of state.items) it.locked = false; save(); flash('기본 배치 가구도 이동 가능'); if (selected?.item) fillItemFields(selected.item); };
$('#btn-lock-all').onclick = () => { for (const it of state.items) it.locked = !!it.builtin; save(); flash('기본 배치 가구 잠금'); if (selected?.item) fillItemFields(selected.item); };

// ── 디자인 스킴(원클릭 전체 교체) ──────────────────────────────
const LIVING_DEFAULT_TYPES = ['tvwall', 'sofa', 'ottoman'];
function applyScheme(id, { quiet } = {}) {
  const sc = SCHEMES.find(s => s.id === id); if (!sc) return;
  // 1) 색·마감: 기본값 위에 스킴 패치
  const clear = Object.fromEntries(OPTICS.map(f => [f, undefined]));   // 스킴이 안 준 광학값은 마감 프리셋 기본으로
  for (const k of Object.keys(PAINTS)) updatePaint(k, { ...DEFAULT_PAINTS[k], ...clear, ...(sc.paints[k] || {}) });
  document.querySelectorAll('.prow').forEach(r => syncPaintRows(r.dataset.key));
  // 2) 거실 구성: 스킴이 자기 거실 세트(living)를 가진 경우에만 zone:'living' 아이템을 교체.
  //    living: null 이면 가구 배치·형태는 손대지 않고 색·마감만 바뀐다(현재 모든 스킴).
  if (sc.living) {
    state.items = state.items.filter(it => !(it.zone === 'living' || (it.builtin && LIVING_DEFAULT_TYPES.includes(it.type))));
    state.items.push(...JSON.parse(JSON.stringify(sc.living)));
  }
  // 3) 조명 색온도
  if (sc.kelvin) for (const it of state.items) if (BUILDERS[it.type]?.light && !it.kelvin_user) it.kelvin = sc.kelvin;
  state.scheme = id;
  mountAll(); deselect(); markScheme(); save();
  if (!quiet) flash(`디자인: ${sc.label}`);   // 시점은 그대로 — 보고 있던 화면에서 색·마감만 바뀐다
}
function markScheme() { document.querySelectorAll('.scheme').forEach(c => c.classList.toggle('on', c.dataset.id === state.scheme)); }
{
  const host = $('#schemes');
  for (const sc of SCHEMES) {
    const c = document.createElement('div'); c.className = 'scheme'; c.dataset.id = sc.id;
    c.innerHTML = `<div class="sh"><b>${sc.label}</b><span>${sc.region}</span></div>
      <div class="chips">${sc.palette.map(p => `<i style="background:${p}"></i>`).join('')}</div>
      <p>${sc.desc}</p><button>이 디자인으로 보기</button>`;
    c.querySelector('button').onclick = () => applyScheme(sc.id);
    host.appendChild(c);
  }
  markScheme();
}

// ── 탭 · 상단 바 ───────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
  document.querySelectorAll('.pane').forEach(p => p.hidden = p.id !== 'pane-' + t.dataset.pane);
});
$('#btn-panel').onclick = () => document.body.classList.toggle('panel-off');
$('#exposure').value = state.exposure;
$('#exposure').oninput = (e) => { state.exposure = +e.target.value; renderer.toneMappingExposure = state.exposure; save(); };
$('#sunlight').value = state.sun;
$('#sunlight').oninput = (e) => { state.sun = +e.target.value; applyDayNight(); save(); };
$('#lamp').value = state.lamp;
$('#lamp').oninput = (e) => { state.lamp = +e.target.value; applyLampAll(); save(); };

$('#btn-export').onclick = () => {
  const blob = new Blob([JSON.stringify(serialize(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'homedeck-layout.json'; a.click();
};
$('#file-import').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { const s = JSON.parse(await f.text()); if (s.v !== 1) throw 0; applySaved(s); mountAll(); deselect(); renderer.toneMappingExposure = state.exposure; applyDayNight(); $('#lamp').value = state.lamp; document.querySelectorAll('.prow').forEach(r => syncPaintRows(r.dataset.key)); markScheme(); save(); flash('불러옴'); }
  catch { flash('파일 형식이 맞지 않습니다'); }
  e.target.value = '';
};
// ↺ 원본: plan.js 의 DEFAULT_ITEMS · materials.js 의 DEFAULT_PAINTS 가 "원본 구조". 언제든 여기로 되돌린다.
$('#btn-reset').onclick = () => {
  if (!confirm('배치·색·밝기를 모두 원본 구조로 되돌릴까요? (현재 수정 내용은 사라집니다 — 남기려면 먼저 내보내기)')) return;
  localStorage.removeItem(SAVE_KEY);
  for (const k of Object.keys(PAINTS)) updatePaint(k, { ...DEFAULT_PAINTS[k] });
  state.items = JSON.parse(JSON.stringify(DEFAULT_ITEMS)); state.exposure = 1; state.sun = 0.7; state.lamp = 1;
  state.night = false; state.sun = 0.7; renderer.toneMappingExposure = 1; applyDayNight(); $('#exposure').value = 1; $('#sunlight').value = 0.7; $('#lamp').value = 1;
  state.scheme = 'base'; markScheme();
  mountAll(); deselect(); document.querySelectorAll('.prow').forEach(r => syncPaintRows(r.dataset.key)); flash('원본 구조로 되돌렸습니다');
};
$('#btn-shot').onclick = () => {
  renderer.render(scene, camera);
  const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'homedeck.png'; a.click();
};

// ── 루프 ───────────────────────────────────────────────────────
// 화면이 바뀔 이유(입력·카메라·리사이즈)가 있을 때만 그린다. 가만히 있으면 GPU 를 거의 쓰지 않는다.
let dirty = 3;
const invalidate = () => { dirty = 3; };
for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'wheel', 'keydown', 'keyup', 'input', 'change', 'click'])
  addEventListener(ev, invalidate, { capture: true, passive: true });
addEventListener('resize', invalidate);
orbit.addEventListener('change', invalidate);
walk.addEventListener('change', invalidate);

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate();
  }
}
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  resize();
  let moving = false;
  if (walk.isLocked) {
    pruneKeys();
    const sp = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 3.2 : 1.6) * dt;
    if (keys.has('KeyW') || keys.has('ArrowUp')) walk.moveForward(sp);
    if (keys.has('KeyS') || keys.has('ArrowDown')) walk.moveForward(-sp);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) walk.moveRight(-sp);
    if (keys.has('KeyD') || keys.has('ArrowRight')) walk.moveRight(sp);
    camera.position.y = 1.5;
    updateSensors(dt);
    moving = keys.size > 0;
  } else moving = orbit.update();          // 감쇠 중이면 true
  if (moving || drag || dirty > 0) { renderer.render(scene, camera); if (dirty > 0) dirty--; }
  requestAnimationFrame(tick);
}
tick();
window.__homedeck = { scene, state, camera, renderer, setView, VIEWS };
