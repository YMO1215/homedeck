// 디자인 스킴 — 원클릭으로 전체 색·마감 + 거실 구성(가구·조명)을 통째로 바꾼다.
// 거실은 소파·TV장 대신 "책장 거실" 로: 스킴마다 책장 벽·독서 의자·테이블·러그·조명·식물을 다르게 짠다.
// 거실 아이템은 zone:'living' 으로 태그 — 스킴을 바꾸면 그 태그가 붙은 것만 교체되고 나머지 방은 그대로다.
import { mx, mz } from './plan.js';

let _n = 0;
const L = (type, label, cx, cz, w, d, h, rot = 0, colors = {}, extra = {}) => ({
  id: 's' + (++_n), type, label, x: +mx(cx).toFixed(3), z: +mz(cz).toFixed(3),
  w, d, h, rot, locked: true, builtin: true, zone: 'living', colors, ...extra,
});

// 거실 안쪽: x 1,360–5,140 · z 4,570(TV벽 면)–8,900. 중심 (3,250, 6,750)
export const SCHEMES = [
  {
    id: 'base', label: '원안', region: '인테리어 업체 렌더',
    desc: '받은 렌더 그대로 — 소파 + TV 붙박이장, 회색 타일 바닥, 화이트 벽.',
    palette: ['#f1efe9', '#4d4d4f', '#c8c8c8', '#8a8a8a', '#f0efec'],
    paints: {},              // 기본값
    kelvin: 3000,
    living: null,            // null = plan.js 의 기본 거실 아이템(소파·TV장·스툴)
  },
  {
    id: 'nordic', label: '노르딕 라이트', region: '유럽 · 북유럽',
    desc: '스칸디 미니멀. 화이트 벽 + 밝은 오크 바닥, 흰 책장 벽 전면, 오트색 독서 의자 둘과 자작나무 원탁, 2700K 따뜻한 빛.',
    palette: ['#f6f4ef', '#d6bf9d', '#e8e2d6', '#2a2a2a', '#7a8b6f'],
    kelvin: 2700,
    paints: {
      'wall': { color: '#f6f4ef', finish: 'wallpaper' }, 'ceiling': { color: '#f6f5f2', finish: 'plain' },
      'floor.main': { color: '#d6bf9d', finish: 'wood' }, 'floor.bedroom': { color: '#d6bf9d', finish: 'wood' },
      'floor.small': { color: '#d6bf9d', finish: 'wood' }, 'floor.study': { color: '#d6bf9d', finish: 'wood' },
      'floor.foyer': { color: '#8f8a82', finish: 'tile30' }, 'floor.bath': { color: '#e4dfd6', finish: 'tile30' }, 'wall.bath': { color: '#eee9e1', finish: 'tile' },
      'kitchen.door': { color: '#f2f0eb', finish: 'plain', rough: 0.5 }, 'kitchen.upper': { color: '#f2f0eb', finish: 'plain', rough: 0.5 }, 'kitchen.top': { color: '#c9a97e', finish: 'wood' },
      'wardrobe': { color: '#f4f2ee', finish: 'plain' }, 'bed.frame': { color: '#c8a97f', finish: 'wood' }, 'bed.linen': { color: '#f3efe8', finish: 'fabric' },
      'study.cabinet': { color: '#f2f0eb', finish: 'plain' }, 'study.top': { color: '#d6bf9d', finish: 'wood' }, 'shoe': { color: '#f2f0eb', finish: 'plain' },
      'door': { color: '#f4f2ee', finish: 'plain' }, 'frame.black': { color: '#2a2a2a', finish: 'gloss', metal: 0.6 }, 'wood.desk': { color: '#d6bf9d', finish: 'wood' },
      'shelf': { color: '#f7f5f0', finish: 'plain', rough: 0.5 }, 'rug': { color: '#d9d2c5', finish: 'fabric' }, 'chair': { color: '#3b3b3b', finish: 'fabric' },
      'sofa': { color: '#e8e2d6', finish: 'fabric' }, 'shade': { color: '#2a2a2a', finish: 'plain' },
    },
    living: [
      L('shelfwall', '책장 벽(화이트)', 3250, 4750, 3.78, 0.36, 2.28, 0, {}, { base: true, books: true }),
      L('armchair', '독서 의자', 2350, 7650, 0.85, 0.85, 0.75, 0, { fabric: '#e8e2d6' }),
      L('armchair', '독서 의자', 4150, 7650, 0.85, 0.85, 0.75, 0, { fabric: '#e8e2d6' }),
      L('roundtable', '자작나무 원탁', 3250, 7350, 0.7, 0.7, 0.45, 0, { top: '#d8c3a1', leg: '#d8c3a1' }),
      L('rug', '울 러그', 3250, 7100, 3.0, 2.2, 0.012, 0, { body: '#d9d2c5' }),
      L('lamp', '플로어 램프', 4950, 8500, 0.4, 0.4, 1.5, 0, { body: '#2a2a2a' }),
      L('plant', '몬스테라', 1650, 8550, 0.5, 0.5, 1.4, 0),
      L('globe', '유리 구 펜던트', 3250, 7350, 0.3, 0.3, 0.85, 0, { metal: '#2a2a2a' }, { kelvin: 2700 }),
    ],
  },
  {
    id: 'japandi', label: '재팬디 웜그레이', region: '한국 · 재팬디',
    desc: '한국 아파트에서 가장 많이 고르는 웜그레이 미니멀. 그레이지 벽, 진회색 포세린 타일, 월넛 로우 책장과 데이베드, 검정 철제 포인트.',
    palette: ['#e9e4dc', '#5a5450', '#4a3728', '#1e1e1e', '#b9ad9a'],
    kelvin: 3000,
    paints: {
      'wall': { color: '#e9e4dc', finish: 'plain', rough: 0.9 }, 'ceiling': { color: '#ece8e1', finish: 'plain' },
      'floor.main': { color: '#5a5450', finish: 'tile' }, 'floor.bedroom': { color: '#5a5450', finish: 'tile' },
      'floor.small': { color: '#5a5450', finish: 'tile' }, 'floor.study': { color: '#5a5450', finish: 'tile' },
      'floor.foyer': { color: '#3d3a37', finish: 'tile30' }, 'floor.bath': { color: '#cfc8bb', finish: 'tile30' }, 'wall.bath': { color: '#ddd6ca', finish: 'tile' },
      'kitchen.door': { color: '#6b625a', finish: 'plain', rough: 0.5 }, 'kitchen.upper': { color: '#e6e1d9', finish: 'plain', rough: 0.5 }, 'kitchen.top': { color: '#2e2b28', finish: 'plain', rough: 0.3 },
      'wardrobe': { color: '#e6e1d9', finish: 'plain' }, 'bed.frame': { color: '#5a4232', finish: 'wood' }, 'bed.linen': { color: '#e5dfd4', finish: 'fabric' },
      'study.cabinet': { color: '#e6e1d9', finish: 'plain' }, 'study.top': { color: '#4a3728', finish: 'wood' }, 'shoe': { color: '#4a3728', finish: 'wood' },
      'door': { color: '#e6e1d9', finish: 'plain' }, 'frame.black': { color: '#1e1e1e', finish: 'gloss', metal: 0.6 }, 'wood.desk': { color: '#5a4232', finish: 'wood' },
      'shelf': { color: '#4a3728', finish: 'wood' }, 'rug': { color: '#b9ad9a', finish: 'fabric' }, 'chair': { color: '#2a2a2a', finish: 'fabric' },
      'sofa': { color: '#d9d2c4', finish: 'fabric' }, 'shade': { color: '#1e1e1e', finish: 'plain' },
    },
    living: [
      L('shelfwall', '월넛 로우 책장', 3250, 4760, 3.78, 0.38, 1.2, 0, {}, { base: true, books: true }),
      L('daybed', '데이베드', 3250, 8250, 2.2, 0.95, 0.42, 180, { frame: '#5a4232', linen: '#d9d2c4' }),
      L('armchair', '라운지 체어', 1900, 6700, 0.85, 0.85, 0.75, 90, { fabric: '#cfc6b6' }),
      L('roundtable', '블랙 로우 테이블', 3250, 6750, 0.8, 0.8, 0.35, 0, { top: '#2a2a2a', leg: '#2a2a2a' }),
      L('rug', '헴프 러그', 3250, 6950, 3.0, 2.4, 0.012, 0, { body: '#b9ad9a' }),
      L('plant', '올리브 나무', 1650, 5250, 0.6, 0.6, 1.7, 0),
      L('lamp', '한지 스탠드', 1700, 8500, 0.45, 0.45, 1.45, 0, { body: '#d9d2c4' }),
      L('globe', '한지 볼 펜던트', 3250, 6750, 0.5, 0.5, 0.95, 0, { metal: '#1e1e1e' }, { kelvin: 3000 }),
    ],
  },
  {
    id: 'westcoast', label: '웨스트코스트 오가닉', region: '미국 · 오가닉 모던',
    desc: '미국 웨스트코스트 오가닉 모던. 크림 화이트 벽 + 와이드 화이트오크 마루, 매트블랙 오픈 책장, 부클레 크림 의자, 트래버틴 원탁, 링 조명.',
    palette: ['#f4efe6', '#c9b08e', '#222222', '#ddd3c2', '#c9b99c'],
    kelvin: 3000,
    paints: {
      'wall': { color: '#f4efe6', finish: 'plain', rough: 0.9 }, 'ceiling': { color: '#f6f3ee', finish: 'plain' },
      'floor.main': { color: '#c9b08e', finish: 'wood' }, 'floor.bedroom': { color: '#c9b08e', finish: 'wood' },
      'floor.small': { color: '#c9b08e', finish: 'wood' }, 'floor.study': { color: '#c9b08e', finish: 'wood' },
      'floor.foyer': { color: '#6a645c', finish: 'tile30' }, 'floor.bath': { color: '#d9d3c8', finish: 'tile30' }, 'wall.bath': { color: '#ebe6dd', finish: 'tile' },
      'kitchen.door': { color: '#e8e2d8', finish: 'plain', rough: 0.5 }, 'kitchen.upper': { color: '#e8e2d8', finish: 'plain', rough: 0.5 }, 'kitchen.top': { color: '#f0ece4', finish: 'marble' },
      'wardrobe': { color: '#ece7df', finish: 'plain' }, 'bed.frame': { color: '#8a7358', finish: 'wood' }, 'bed.linen': { color: '#f2ede4', finish: 'fabric' },
      'study.cabinet': { color: '#ece7df', finish: 'plain' }, 'study.top': { color: '#f0ece4', finish: 'marble' }, 'shoe': { color: '#3a3632', finish: 'plain' },
      'door': { color: '#ece7df', finish: 'plain' }, 'frame.black': { color: '#222222', finish: 'gloss', metal: 0.6 }, 'wood.desk': { color: '#c9b08e', finish: 'wood' },
      'shelf': { color: '#222222', finish: 'plain', rough: 0.55 }, 'rug': { color: '#c9b99c', finish: 'fabric' }, 'chair': { color: '#2b2b2b', finish: 'fabric' },
      'sofa': { color: '#f0ebe2', finish: 'fabric' }, 'shade': { color: '#222222', finish: 'plain' },
    },
    living: [
      L('shelfwall', '매트블랙 오픈 책장', 3250, 4750, 3.78, 0.35, 2.28, 0, {}, { base: true, books: true }),
      L('armchair', '부클레 체어', 2250, 7500, 0.9, 0.9, 0.75, 30, { fabric: '#f0ebe2' }),
      L('armchair', '부클레 체어', 4250, 7500, 0.9, 0.9, 0.75, -30, { fabric: '#f0ebe2' }),
      L('roundtable', '트래버틴 원탁', 3250, 7050, 0.9, 0.9, 0.4, 0, { top: '#ddd3c2', leg: '#ddd3c2' }),
      L('rug', '주트 러그', 3250, 7000, 3.2, 2.4, 0.012, 0, { body: '#c9b99c' }),
      L('plant', '올리브 나무', 1700, 8500, 0.7, 0.7, 1.8, 0),
      L('lamp', '브라스 램프', 4950, 8500, 0.4, 0.4, 1.5, 0, { body: '#b08d57' }),
      L('ring', '링 펜던트', 3250, 7050, 0.8, 0.8, 0.55, 0, { body: '#222222' }, { kelvin: 3000 }),
    ],
  },
];
