import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { H, mx, mz, CENTER, BOUNDS, VIEWS, DEFAULT_ITEMS, PLAN_VERSION } from './plan.js';
import { PAINTS, DEFAULT_PAINTS, updatePaint, getMaterial } from './materials.js';
import { FINISHES } from './textures.js';
import { buildWalls, buildFloors, buildDoors, buildFixtures, buildExterior, buildItem, BUILDERS, CATALOG, CATALOG_LIGHTS, KELVIN_OPTIONS } from './builders.js';

const SAVE_KEY = 'homedeck.v1';
const $ = (s) => document.querySelector(s);

// ── 상태 ───────────────────────────────────────────────────────
const state = { items: [], exposure: 1.0, sun: 1.0, lamp: 1.0 };
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
  state.exposure = s.exposure ?? 1.0; state.sun = s.sun ?? 1.0; state.lamp = s.lamp ?? 1.0;
  for (const k of Object.keys(PAINTS)) if (s.paints && s.paints[k]) updatePaint(k, s.paints[k]);
}
function serialize() {
  const paints = {};
  for (const k of Object.keys(PAINTS)) { const { color, finish, rough, metal } = PAINTS[k]; paints[k] = { color, finish, rough, metal }; }
  return { v: 1, plan: PLAN_VERSION, items: state.items, paints, exposure: state.exposure, sun: state.sun, lamp: state.lamp, savedAt: new Date().toISOString() };
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
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfd8e3');
scene.fog = new THREE.Fog('#cfd8e3', 40, 90);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(62, 1, 0.05, 200);
const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true; orbit.dampingFactor = 0.08; orbit.maxPolarAngle = Math.PI * 0.499;
orbit.target.set(CENTER.x, 1.0, CENTER.z);
const walk = new PointerLockControls(camera, document.body);

const hemi = new THREE.HemisphereLight('#e8eef5', '#6b675f', 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3e0', 2.2);
sun.position.set(CENTER.x - 14, 12, CENTER.z + 9); sun.target.position.set(CENTER.x, 0, CENTER.z);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 50 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

buildExterior(scene);
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
  return g;
}
// 조명 아이템: 광원 세기 = 기준(base) × 켜짐 × 아이템 배율(pw) × 전역 슬라이더
function applyLamp(g, it) {
  const f = (it.lit === false ? 0 : (it.pw ?? 1)) * state.lamp;
  g.traverse(o => { if (o.isLight) o.intensity = (o.userData.base || 0) * f; });
}
function applyLampAll() { for (const g of objs.values()) applyLamp(g, g.userData.item); }
function unmountItem(id) {
  const g = objs.get(id); if (!g) return;
  itemRoot.remove(g); objs.delete(id);
  g.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (o.material.userData.tinted) o.material.dispose(); } });
}
function mountAll() { for (const id of [...objs.keys()]) unmountItem(id); for (const it of state.items) mountItem(it); }

// ── 초기 로드 ──────────────────────────────────────────────────
const saved = loadState();
if (saved) applySaved(saved); else state.items = JSON.parse(JSON.stringify(DEFAULT_ITEMS));
mountAll();
renderer.toneMappingExposure = state.exposure; sun.intensity = 2.2 * state.sun;

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
setView(VIEWS[0]);

// 걷기 모드
const keys = new Set();
$('#btn-walk').onclick = () => { walk.lock(); };
walk.addEventListener('lock', () => { document.body.classList.add('walking'); orbit.enabled = false; });
walk.addEventListener('unlock', () => {
  document.body.classList.remove('walking'); orbit.enabled = true;
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
  orbit.target.copy(camera.position).addScaledVector(dir, 3); orbit.update();
});
addEventListener('keydown', e => { keys.add(e.code); });
addEventListener('keyup', e => keys.delete(e.code));

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
  drag.it.x = +(p.x + drag.ox).toFixed(3); drag.it.z = +(p.z + drag.oz).toFixed(3); drag.moved = true;
  const g = objs.get(drag.it.id); g.position.set(drag.it.x, 0, drag.it.z);
  refreshHelper(); fillItemFields(drag.it);
});
addEventListener('pointerup', () => { if (drag) { if (drag.moved) save(); drag = null; orbit.enabled = !walk.isLocked; } });

addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Escape') deselect();
  if (!selected?.item) return;
  const it = selected.item;
  if (e.code === 'Delete' || e.code === 'Backspace') { removeItem(it); }
  if (it.locked) return;
  if (e.code === 'KeyQ') rotateItem(it, -15); if (e.code === 'KeyE') rotateItem(it, 15); if (e.code === 'KeyR') rotateItem(it, 90);
});

function rotateItem(it, deg) { it.rot = ((it.rot || 0) + deg + 360) % 360; objs.get(it.id).rotation.y = THREE.MathUtils.degToRad(it.rot); refreshHelper(); fillItemFields(it); save(); }
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
  if (B.light) { $('#ip-lit').checked = it.lit !== false; $('#ip-pw').value = it.pw ?? 1; $('#ip-kelvin').value = String(it.kelvin || 3000); }
  $('#ip-dims').textContent = B.light ? (it.type === 'downlight' ? '폭 = 트림 지름' : '높이 = 천장에서 내려오는 길이') : '';
  fillItemFields(it);
}
$('#ip-lit').onchange = (e) => { const it = selected?.item; if (!it) return; it.lit = e.target.checked; rebuildItem(it); };
$('#ip-pw').oninput = (e) => { const it = selected?.item; if (!it) return; it.pw = +e.target.value; applyLamp(objs.get(it.id), it); };
$('#ip-pw').onchange = () => { const it = selected?.item; if (it) rebuildItem(it); };
$('#ip-kelvin').onchange = (e) => { const it = selected?.item; if (!it) return; it.kelvin = +e.target.value; rebuildItem(it); };
for (const k of KELVIN_OPTIONS) { const o = document.createElement('option'); o.value = k; o.textContent = k + 'K'; $('#ip-kelvin').appendChild(o); }
function fillItemFields(it) {
  if (IP.hidden) return;
  $('#ip-lock').checked = !!it.locked;
  for (const k of ['x', 'z', 'rot', 'w', 'd', 'h']) $('#ip-' + k).value = it[k];
}
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

// ── 탭 · 상단 바 ───────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x === t));
  document.querySelectorAll('.pane').forEach(p => p.hidden = p.id !== 'pane-' + t.dataset.pane);
});
$('#btn-panel').onclick = () => document.body.classList.toggle('panel-off');
$('#exposure').value = state.exposure;
$('#exposure').oninput = (e) => { state.exposure = +e.target.value; renderer.toneMappingExposure = state.exposure; save(); };
$('#sunlight').value = state.sun;
$('#sunlight').oninput = (e) => { state.sun = +e.target.value; sun.intensity = 2.2 * state.sun; save(); };
$('#lamp').value = state.lamp;
$('#lamp').oninput = (e) => { state.lamp = +e.target.value; applyLampAll(); save(); };

$('#btn-export').onclick = () => {
  const blob = new Blob([JSON.stringify(serialize(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'homedeck-layout.json'; a.click();
};
$('#file-import').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { const s = JSON.parse(await f.text()); if (s.v !== 1) throw 0; applySaved(s); mountAll(); deselect(); renderer.toneMappingExposure = state.exposure; sun.intensity = 2.2 * state.sun; $('#lamp').value = state.lamp; document.querySelectorAll('.prow').forEach(r => syncPaintRows(r.dataset.key)); save(); flash('불러옴'); }
  catch { flash('파일 형식이 맞지 않습니다'); }
  e.target.value = '';
};
$('#btn-reset').onclick = () => {
  if (!confirm('배치와 색을 모두 처음 상태로 되돌릴까요?')) return;
  localStorage.removeItem(SAVE_KEY);
  for (const k of Object.keys(PAINTS)) updatePaint(k, { ...DEFAULT_PAINTS[k] });
  state.items = JSON.parse(JSON.stringify(DEFAULT_ITEMS)); state.exposure = 1; state.sun = 1; state.lamp = 1;
  renderer.toneMappingExposure = 1; sun.intensity = 2.2; $('#exposure').value = 1; $('#sunlight').value = 1; $('#lamp').value = 1;
  mountAll(); deselect(); document.querySelectorAll('.prow').forEach(r => syncPaintRows(r.dataset.key)); flash('초기화');
};
$('#btn-shot').onclick = () => {
  renderer.render(scene, camera);
  const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'homedeck.png'; a.click();
};

// ── 루프 ───────────────────────────────────────────────────────
function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
}
const clock = new THREE.Clock();
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  resize();
  if (walk.isLocked) {
    const sp = (keys.has('ShiftLeft') ? 3.2 : 1.6) * dt;
    if (keys.has('KeyW') || keys.has('ArrowUp')) walk.moveForward(sp);
    if (keys.has('KeyS') || keys.has('ArrowDown')) walk.moveForward(-sp);
    if (keys.has('KeyA') || keys.has('ArrowLeft')) walk.moveRight(-sp);
    if (keys.has('KeyD') || keys.has('ArrowRight')) walk.moveRight(sp);
    camera.position.y = 1.5;
  } else orbit.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();
window.__homedeck = { scene, state, camera, renderer, setView, VIEWS };
