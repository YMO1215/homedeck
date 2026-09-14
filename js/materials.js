// 페인트 레지스트리 — 화면의 모든 칠할 수 있는 면은 여기 키 하나를 가리킨다.
import * as THREE from 'three';
import { texture, baseTexture, FINISHES } from './textures.js';

// key → { label, group, color, finish, sizeY?, metal? }
export const PAINTS = {
  'wall':           { label: '벽',              group: '건축', color: '#f1efe9', finish: 'wallpaper' },
  'wall.bath':      { label: '욕실 벽 타일',    group: '건축', color: '#e6e1d6', finish: 'tile', sizeY: 0.6 },   // 600×600 대형 타일
  'ceiling':        { label: '천장',            group: '건축', color: '#dedede', finish: 'plain' },
  'ceiling.bath':   { label: '욕실 천장',       group: '건축', color: '#4a4a4c', finish: 'plain', rough: 0.6 },   // 다크 그레이 천장
  'floor.main':     { label: '거실·주방 바닥',  group: '바닥', color: '#4d4d4f', finish: 'tile' },
  'floor.bedroom':  { label: '안방 바닥',       group: '바닥', color: '#4d4d4f', finish: 'tile' },
  'floor.small':    { label: '작은방 바닥',     group: '바닥', color: '#55555a', finish: 'tile' },
  'floor.study':    { label: '서재 바닥',       group: '바닥', color: '#55555a', finish: 'tile' },
  'floor.bath':     { label: '욕실 바닥',       group: '바닥', color: '#cfc8b8', finish: 'tile30' },
  'floor.foyer':    { label: '현관 바닥',       group: '바닥', color: '#3a3a3c', finish: 'tile30' },
  'floor.balcony':  { label: '발코니 바닥',     group: '바닥', color: '#9a9a9a', finish: 'tile30' },
  'kitchen.door':   { label: '주방 하부장 도어', group: '주방', color: '#c8c8c8', finish: 'plain', rough: 0.45 },
  'kitchen.upper':  { label: '주방 상부장',     group: '주방', color: '#d2d2d2', finish: 'plain', rough: 0.45 },
  'kitchen.top':    { label: '주방 상판',       group: '주방', color: '#3a3a3a', finish: 'plain', rough: 0.3 },
  'appliance':      { label: '가전(블랙)',      group: '주방', color: '#141414', finish: 'gloss' },
  'steel':          { label: '스테인리스',      group: '주방', color: '#b9bcc0', finish: 'gloss', metal: 0.9, rough: 0.3 },
  'wardrobe':       { label: '붙박이장',        group: '가구', color: '#f4f4f4', finish: 'plain', rough: 0.4 },
  'tvwall':         { label: 'TV장 몸체',       group: '가구', color: '#8a8a8a', finish: 'plain', rough: 0.5 },
  'tvwall.shelf':   { label: 'TV장 선반',       group: '가구', color: '#f5f5f5', finish: 'plain', rough: 0.5 },
  'sofa':           { label: '소파',            group: '가구', color: '#f0efec', finish: 'fabric' },
  'bed.frame':      { label: '침대 프레임',     group: '가구', color: '#a88a6a', finish: 'wood' },
  'bed.linen':      { label: '침구',            group: '가구', color: '#f7f7f7', finish: 'fabric' },
  'study.cabinet':  { label: '서재 수납장',     group: '가구', color: '#f4f4f4', finish: 'plain', rough: 0.4 },
  'study.top':      { label: '서재 상판(블랙)', group: '가구', color: '#1e1e1e', finish: 'plain', rough: 0.5 },   // 책상·하부장·침대 선반 상판 공용 — 검은 단색
  'shoe':           { label: '신발장',          group: '가구', color: '#4b4b4b', finish: 'plain', rough: 0.45 },
  'wood.desk':      { label: '책상·테이블',     group: '가구', color: '#b99a78', finish: 'wood' },
  'door':           { label: '방문',            group: '건축', color: '#f0f0f0', finish: 'plain', rough: 0.5 },
  'door.front':     { label: '현관문',          group: '건축', color: '#3a3a3a', finish: 'plain', rough: 0.4 },
  'frame.black':    { label: '중문·창 프레임(흑)', group: '건축', color: '#1c1c1c', finish: 'gloss', metal: 0.6 },
  'frame.white':    { label: '창틀(백)',        group: '건축', color: '#f4f4f4', finish: 'plain', rough: 0.4 },
  'sanitary':       { label: '도기(변기·세면대)', group: '욕실', color: '#ffffff', finish: 'gloss' },
  'bath.acc':       { label: '욕실 액세서리(블랙)', group: '욕실', color: '#2a2a2a', finish: 'gloss', metal: 0.5, rough: 0.35 },
  'bath.ledge':     { label: '욕실 젠다이',     group: '욕실', color: '#3b3b3b', finish: 'plain', rough: 0.3 },
  'towel':          { label: '수건',            group: '욕실', color: '#efe9dc', finish: 'fabric' },
  'washer':         { label: '세탁기',          group: '가전', color: '#f2f2f2', finish: 'gloss', rough: 0.3 },
  'fridge':         { label: '냉장고',          group: '가전', color: '#e9e9e9', finish: 'gloss', rough: 0.3 },
  'plant':          { label: '식물',            group: '가구', color: '#3f7d3a', finish: 'fabric' },
  'pot':            { label: '화분',            group: '가구', color: '#8a7a6a', finish: 'plain' },
  'rug':            { label: '러그',            group: '가구', color: '#b7aa9a', finish: 'fabric' },
  'shelf':          { label: '책장(모듈)',      group: '가구', color: '#f4f4f4', finish: 'plain', rough: 0.5 },
  'chair':          { label: '의자',            group: '가구', color: '#2e2e2e', finish: 'fabric' },
  'shade':          { label: '조명 갓·바디',    group: '조명', color: '#2b2b2b', finish: 'plain', rough: 0.5 },
};

export const DEFAULT_PAINTS = JSON.parse(JSON.stringify(PAINTS));

const mats = new Map();

function apply(m, p) {
  const f = FINISHES[p.finish] || FINISHES.plain;
  const kind = f.kind || p.finish;
  m.color.set(p.color);
  m.roughness = p.rough ?? f.rough;
  m.metalness = p.metal ?? 0;
  m.envMapIntensity = f.env ?? 0.5;
  if (f.size) {
    m.map = texture(kind, f.size, p.sizeY || f.size);
    m.bumpMap = m.map; m.bumpScale = f.bump;
  } else { m.map = null; m.bumpMap = null; }
  m.needsUpdate = true;
}

export function getMaterial(key) {
  if (!mats.has(key)) {
    const p = PAINTS[key];
    if (!p) throw new Error('unknown paint ' + key);
    const m = new THREE.MeshStandardMaterial({ envMapIntensity: 0.6 });
    apply(m, p);
    m.userData.paint = key;
    mats.set(key, m);
  }
  return mats.get(key);
}

// 색/마감을 바꾸면 그 재질을 쓰는 모든 메시가 즉시 바뀐다
export function updatePaint(key, patch) {
  Object.assign(PAINTS[key], patch);
  if (mats.has(key)) apply(mats.get(key), PAINTS[key]);
}

// 개별 가구 색 오버라이드용 — 공유 재질을 복제해 색만 바꾼다
export function tinted(key, hex) {
  const m = getMaterial(key).clone();
  m.color.set(hex);
  m.userData.paint = key; m.userData.tinted = true;
  return m;
}

// 칠하지 않는 특수 재질
export const SPECIAL = {
  glass: new THREE.MeshPhysicalMaterial({ color: '#dfe8ee', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, envMapIntensity: 1 }),
  mirror: new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: 0.03, envMapIntensity: 1.2 }),
  lamp: new THREE.MeshStandardMaterial({ color: '#f6e9c8', emissive: '#ffe1a6', emissiveIntensity: 2.2 }),
  lampBody: new THREE.MeshStandardMaterial({ color: '#d9c9a0', metalness: 0.7, roughness: 0.35 }),
  panelLight: new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4dd', emissiveIntensity: 1.6 }),
  screen: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.2 }),
  dark: new THREE.MeshStandardMaterial({ color: '#202020', roughness: 0.5 }),
  ground: new THREE.MeshStandardMaterial({ color: '#8b9a80', roughness: 1 }),
  building: new THREE.MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.9 }),
};
SPECIAL.screen.emissiveMap = baseTexture('tvscreen');
