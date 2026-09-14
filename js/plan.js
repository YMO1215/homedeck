// 평면 데이터 — 좌표는 탑뷰 이미지 픽셀(px) 기준. ORX/ORY 가 집 외곽 좌상단, S 는 px→m 배율.
// 실측 치수를 받으면 S 하나만 바꾸면 전체가 보정된다.
export const ORX = 90, ORY = 15;
export const S = 0.014;          // 1px = 14mm → 집 외곽 855px ≈ 12.0m
export const H = 2.3;            // 천장 높이(m)
export const PX = 1 / S;         // 1m = 71.4px

export const mx = (x) => (x - ORX) * S;   // px → world x
export const mz = (y) => (y - ORY) * S;   // px → world z (남쪽 = +z)

export const CENTER = { x: mx(517), z: mz(340) };
export const BOUNDS = { w: mx(945), d: mz(665) };   // 집 외곽 (m)

// ── 벽 ─────────────────────────────────────────────────────────
// a,b: 끝점(px) · t: 두께(px) · gaps: 선분 위 구간(px, a 기준 거리)
//   kind: 'door'(문 개구 · head 까지 뚫림) | 'open'(문 없는 개구) | 'window'(창: sill~head 유리)
export const WALLS = [
  // 외벽
  { a: [90, 15], b: [945, 15], t: 20, paint: 'wall' },
  { a: [90, 665], b: [945, 665], t: 20, paint: 'wall',
    gaps: [{ from: 390, to: 455, kind: 'door', head: 2.1, frame: 'door.front' }] },   // 현관문
  { a: [90, 15], b: [90, 665], t: 20, paint: 'wall',
    gaps: [{ from: 25, to: 315, kind: 'window', sill: 0.95, head: 2.2, mull: 3 },
           { from: 375, to: 635, kind: 'window', sill: 0.95, head: 2.2, mull: 3 }] },
  { a: [945, 15], b: [945, 665], t: 20, paint: 'wall',
    gaps: [{ from: 25, to: 235, kind: 'window', sill: 0.95, head: 2.2, mull: 2 },
           { from: 300, to: 390, kind: 'window', sill: 1.05, head: 1.9, mull: 1 },   // 주방창
           { from: 465, to: 635, kind: 'window', sill: 0.95, head: 2.2, mull: 2 }] },
  // 좌측 발코니 ↔ 안방/거실
  { a: [200, 15], b: [200, 665], t: 12, paint: 'wall',
    gaps: [{ from: 25, to: 315, kind: 'window', sill: 0.5, head: 2.1, mull: 3, hbar: 1.1 },   // 안방 창
           { from: 380, to: 635, kind: 'window', sill: 0.05, head: 2.2, mull: 2 }] },        // 거실 발코니 창
  { a: [90, 350], b: [200, 350], t: 12, paint: 'wall' },                       // 발코니 칸막이
  // 안방
  { a: [200, 350], b: [496, 350], t: 14, paint: 'wall' },                      // 안방 남벽(거실 TV벽)
  { a: [490, 15], b: [490, 350], t: 12, paint: 'wall',
    gaps: [{ from: 35, to: 95, kind: 'door', head: 2.1 },                     // 안방욕실 문
           { from: 260, to: 325, kind: 'door', head: 2.1 }] },                // 안방 문
  // 욕실 2개
  { a: [490, 130], b: [665, 130], t: 12, paint: 'wall' },
  { a: [490, 265], b: [665, 265], t: 12, paint: 'wall',
    gaps: [{ from: 105, to: 160, kind: 'door', head: 2.1 }] },                // 공용욕실 문
  { a: [665, 15], b: [665, 265], t: 22, paint: 'wall' },
  // 작은방 / 주방
  { a: [665, 265], b: [945, 265], t: 12, paint: 'wall',
    gaps: [{ from: 35, to: 95, kind: 'door', head: 2.1 }] },                  // 작은방 문
  { a: [860, 15], b: [860, 265], t: 10, paint: 'wall',
    gaps: [{ from: 25, to: 225, kind: 'window', sill: 0.05, head: 2.2, mull: 3 }] },  // 작은방 발코니창
  // 서재 / 현관
  { a: [590, 455], b: [945, 455], t: 12, paint: 'wall',
    gaps: [{ from: 25, to: 95, kind: 'open', head: 2.1 }] },                  // 서재 개구
  { a: [600, 455], b: [600, 665], t: 12, paint: 'wall' },
  { a: [860, 455], b: [860, 665], t: 10, paint: 'wall',
    gaps: [{ from: 25, to: 195, kind: 'window', sill: 0.5, head: 2.1, mull: 2 }] },   // 서재 창
  { a: [455, 560], b: [455, 665], t: 12, paint: 'wall' },
  { a: [455, 560], b: [600, 490], t: 12, paint: 'wall',
    gaps: [{ from: 45, to: 110, kind: 'door', head: 2.15, frame: 'frame.black' }] },   // 중문(사선)
  // 욕실 타일 마감(벽 안쪽 얇은 패널)
  { a: [496, 25], b: [659, 25], t: 3, paint: 'wall.bath' },
  { a: [659, 25], b: [659, 124], t: 3, paint: 'wall.bath' },
  { a: [659, 124], b: [496, 124], t: 3, paint: 'wall.bath' },
  { a: [496, 124], b: [496, 25], t: 3, paint: 'wall.bath', gaps: [{ from: 29, to: 89, kind: 'open', head: 2.1 }] },
  { a: [496, 136], b: [659, 136], t: 3, paint: 'wall.bath' },
  { a: [659, 136], b: [659, 259], t: 3, paint: 'wall.bath' },
  { a: [659, 259], b: [496, 259], t: 3, paint: 'wall.bath', gaps: [{ from: 9, to: 64, kind: 'open', head: 2.1 }] },
  { a: [496, 259], b: [496, 136], t: 3, paint: 'wall.bath' },
];

// ── 바닥/천장 폴리곤 ───────────────────────────────────────────
export const ROOMS = [
  { id: 'bedroom', label: '안방', floor: 'floor.bedroom', ceil: 'ceiling',
    poly: [[200, 15], [490, 15], [490, 350], [200, 350]] },
  { id: 'bath1', label: '안방욕실', floor: 'floor.bath', ceil: 'ceiling.bath', tiled: true,
    poly: [[490, 15], [665, 15], [665, 130], [490, 130]] },
  { id: 'bath2', label: '공용욕실', floor: 'floor.bath', ceil: 'ceiling.bath', tiled: true,
    poly: [[490, 130], [665, 130], [665, 265], [490, 265]] },
  { id: 'small', label: '작은방', floor: 'floor.small', ceil: 'ceiling',
    poly: [[665, 15], [860, 15], [860, 265], [665, 265]] },
  { id: 'kitchen', label: '주방', floor: 'floor.main', ceil: 'ceiling',
    poly: [[665, 265], [945, 265], [945, 455], [665, 455]] },
  { id: 'living', label: '거실·복도', floor: 'floor.main', ceil: 'ceiling',
    poly: [[200, 350], [490, 350], [490, 265], [665, 265], [665, 455], [590, 455], [600, 490], [455, 560], [455, 665], [200, 665]] },
  { id: 'foyer', label: '현관', floor: 'floor.foyer', ceil: 'ceiling',
    poly: [[455, 560], [600, 490], [600, 665], [455, 665]] },
  { id: 'study', label: '서재', floor: 'floor.study', ceil: 'ceiling',
    poly: [[600, 455], [860, 455], [860, 665], [600, 665]] },
  { id: 'balcL1', label: '다용도실', floor: 'floor.balcony', ceil: 'ceiling',
    poly: [[90, 15], [200, 15], [200, 350], [90, 350]] },
  { id: 'balcL2', label: '거실 발코니', floor: 'floor.balcony', ceil: 'ceiling',
    poly: [[90, 350], [200, 350], [200, 665], [90, 665]] },
  { id: 'balcR1', label: '작은방 발코니', floor: 'floor.balcony', ceil: 'ceiling',
    poly: [[860, 15], [945, 15], [945, 265], [860, 265]] },
  { id: 'balcR2', label: '서재 발코니', floor: 'floor.balcony', ceil: 'ceiling',
    poly: [[860, 455], [945, 455], [945, 665], [860, 665]] },
];

// ── 문짝 ───────────────────────────────────────────────────────
// hinge/end: px · open: 여닫힌 각도(도, 부호로 방향) · kind: door | front | glass
export const DOORS = [
  { hinge: [490, 325], end: [490, 260], open: -70, kind: 'door', label: '안방 문' },
  { hinge: [490, 95], end: [490, 35], open: -8, kind: 'door', label: '안방욕실 문' },
  { hinge: [650, 265], end: [595, 265], open: -35, kind: 'door', label: '공용욕실 문' },
  { hinge: [760, 265], end: [700, 265], open: -20, kind: 'door', label: '작은방 문' },
  { hinge: [545, 665], end: [480, 665], open: 90, kind: 'front', label: '현관문' },   // 바깥으로 열린 상태(원본 12번 컷)
  { hinge: [554, 512.2], end: [495.5, 540.4], open: 0, kind: 'glass', label: '중문' },
];

// ── 조명 기구(장식) 과 실제 광원 ──────────────────────────────
export const FIXTURES = [
  { kind: 'pendant', x: 280, y: 450 }, { kind: 'pendant', x: 420, y: 450 },
  { kind: 'panel', x: 240, y: 520 },
  { kind: 'pendant', x: 560, y: 330 },
  { kind: 'pendant', x: 740, y: 320 }, { kind: 'pendant', x: 800, y: 320 }, { kind: 'pendant', x: 860, y: 320 },
  { kind: 'pendant', x: 740, y: 400 }, { kind: 'pendant', x: 860, y: 400 },
  { kind: 'panel', x: 345, y: 190 },
  { kind: 'panel', x: 760, y: 140 },
  { kind: 'panel', x: 730, y: 560 }, { kind: 'cassette', x: 660, y: 480 },
  { kind: 'pendant', x: 560, y: 60 }, { kind: 'pendant', x: 600, y: 60 },
  { kind: 'pendant', x: 560, y: 190 }, { kind: 'pendant', x: 600, y: 190 },
  { kind: 'pendant', x: 520, y: 610 },
  { kind: 'pendant', x: 457, y: 60 },
];

export const LIGHTS = [
  { x: 375, y: 480, i: 14 },   // 거실
  { x: 560, y: 330, i: 8 },    // 복도
  { x: 800, y: 360, i: 12 },   // 주방
  { x: 345, y: 200, i: 10 },   // 안방
  { x: 760, y: 140, i: 8 },    // 작은방
  { x: 730, y: 560, i: 9 },    // 서재
  { x: 525, y: 600, i: 5 },    // 현관
  { x: 580, y: 195, i: 5 },    // 공용욕실
  { x: 580, y: 75, i: 5 },     // 안방욕실
  { x: 145, y: 180, i: 4 },    // 다용도실
];

// ── 카메라 프리셋(px, 눈높이 m) ────────────────────────────────
export const VIEWS = [
  { id: 'living_win', label: '거실 → 창', pos: [530, 440], look: [200, 480], h: 1.5 },
  { id: 'living_door', label: '거실 → 현관', pos: [215, 520], look: [600, 500], h: 1.5 },
  { id: 'entry_glass', label: '중문·서재', pos: [390, 420], look: [600, 530], h: 1.5 },
  { id: 'kitchen', label: '주방', pos: [690, 340], look: [930, 420], h: 1.5 },
  { id: 'hall_kitchen', label: '복도 → 주방', pos: [515, 330], look: [930, 370], h: 1.5 },
  { id: 'bedroom', label: '안방', pos: [470, 320], look: [230, 90], h: 1.5 },
  { id: 'utility', label: '다용도실', pos: [147, 335], look: [147, 30], h: 1.5 },
  { id: 'study', label: '서재', pos: [640, 468], look: [840, 650], h: 1.5 },
  { id: 'bath2', label: '공용욕실', pos: [600, 254], look: [555, 138], h: 1.5 },
  { id: 'bath1', label: '안방욕실', pos: [500, 105], look: [655, 55], h: 1.5 },
  { id: 'small', label: '작은방', pos: [730, 255], look: [820, 40], h: 1.5 },
  { id: 'entry', label: '현관 밖에서', pos: [500, 715], look: [560, 300], h: 1.5 },
  { id: 'top', label: '탑뷰', pos: [517, 340], look: [517, 339], h: 15, top: true },
];

// ── 기본 배치 아이템(px 중심 · 치수 m · rot 도) ───────────────
// rot 0 = 정면이 남쪽(+z). 북벽에 붙는 가구 0, 남벽 180, 서벽 90, 동벽 -90.
let _id = 0;
const I = (type, label, cx, cz, w, d, h, rot = 0, extra = {}) => ({
  id: 'b' + (++_id), type, label, x: +mx(cx).toFixed(3), z: +mz(cz).toFixed(3),
  w, d, h, rot, locked: true, builtin: true, colors: {}, ...extra,
});

export const DEFAULT_ITEMS = [
  // 안방
  I('wardrobe', '안방 붙박이장', 319, 46.5, 3.0, 0.6, 2.28, 0, { doors: 7 }),
  I('vanity', '화장대', 457, 43, 0.75, 0.5, 0.75, 0),
  I('bed', '침대(퀸)', 355, 205, 1.55, 2.1, 0.5, 0),
  // 안방욕실
  I('basin', '세면대', 638, 85, 0.6, 0.45, 0.85, -90),
  I('mirrorcab', '거울장', 646, 85, 0.9, 0.12, 0.7, -90),
  I('toilet', '양변기', 629, 42, 0.4, 0.7, 0.8, -90),
  I('shower', '샤워기', 525, 30, 0.3, 0.1, 2.1, 0),
  // 공용욕실
  I('basin', '세면대', 580, 152, 0.6, 0.45, 0.85, 0),
  I('mirrorcab', '거울장', 580, 140, 0.9, 0.12, 0.7, 0),
  I('toilet', '양변기', 521, 185, 0.4, 0.7, 0.8, 90),
  I('panel', '샤워 파티션', 612, 175, 0.08, 1.1, 2.0, 0),
  I('shower', '샤워기', 635, 140, 0.3, 0.1, 2.1, 0),
  // 작은방
  I('desk', '책상', 760, 46, 1.4, 0.6, 0.74, 0),
  I('chair', '의자', 760, 95, 0.45, 0.48, 0.9, 180),
  I('bookshelf', '책장', 682, 200, 0.9, 0.3, 2.0, 90),
  // 주방
  I('fridge', '냉장고', 702, 298, 0.85, 0.75, 1.85, 0),
  I('kcounter', '주방 하부장(북)', 806.5, 292.5, 2.06, 0.6, 0.88, 0, { doors: 4 }),
  I('kupper', '주방 상부장(북)', 806.5, 283.5, 2.06, 0.35, 0.72, 0, { doors: 4 }),
  I('kcounter', '주방 하부장(동·싱크)', 913.5, 360, 2.49, 0.6, 0.88, -90, { doors: 4, sink: -0.07, dw: 0.9 }),
  I('kupper', '주방 상부장(동1)', 922.5, 293, 0.62, 0.35, 0.72, -90, { doors: 1 }),
  I('kupper', '주방 상부장(동2)', 922.5, 427, 0.62, 0.35, 0.72, -90, { doors: 1 }),
  I('kcounter', '주방 하부장(남·쿡탑)', 805.5, 427.5, 2.37, 0.6, 0.88, 180, { doors: 5, cooktop: 0.1 }),
  I('hood', '후드', 798, 424, 0.9, 0.5, 0.7, 180),
  I('kupper', '주방 상부장(남1)', 748, 436.5, 0.65, 0.35, 0.72, 180, { doors: 1 }),
  I('kupper', '주방 상부장(남2)', 866, 436.5, 0.63, 0.35, 0.72, 180, { doors: 1 }),
  I('ovencol', '오븐 키큰장', 696, 427, 0.7, 0.62, 2.2, 180),
  // 거실
  I('tvwall', 'TV 붙박이장', 348, 370, 3.8, 0.36, 2.28, 0),
  I('sofa', '소파(3인)', 357, 600, 2.6, 0.95, 0.75, 180),
  I('ottoman', '스툴', 300, 505, 0.8, 0.8, 0.42, 0),
  // 현관
  I('shoecab', '신발장', 579.5, 583.5, 2.0, 0.4, 2.28, -90),
  // 서재
  I('lowcab', '서재 하부장(남)', 698, 639, 2.58, 0.45, 0.85, 180, { doors: 6 }),
  I('tallcab', '서재 키큰장', 820, 639, 0.84, 0.45, 2.28, 180, { doors: 2 }),
  I('lowcab', '서재 하부장(서)', 622, 542, 2.27, 0.45, 0.85, 90, { doors: 5 }),
  // 다용도실
  I('washtower', '세탁기·건조기', 147, 52.5, 0.7, 0.77, 1.85, 0),
];
