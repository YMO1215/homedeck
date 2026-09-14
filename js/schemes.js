// 디자인 스킴 — 원클릭으로 전체 색·마감을 통째로 바꾼다. 가구 배치·형태는 건드리지 않는다(living: null = 원본 배치 유지).
// 색은 실제 도장·자재 레퍼런스를 기준으로 잡았다:
//   노르딕 — Farrow & Ball Wimborne White(#f7f3e8) / Strong White(#e5e0db), 화이트 오일 오크
//   재팬디 웜그레이 — 국내 아파트 그레이지 도장 + 크림/그레이 톤 대형 포세린 + 오크·월넛 (월간 THE LIVING 2026 자재 트렌드)
//   웨스트코스트 오가닉 — Benjamin Moore Swiss Coffee / White Dove(Studio McGee), 와이드 화이트오크, 트래버틴, 소프트 블랙
// 원칙: 채도 낮은 뉴트럴 3~4톤 + 포인트 1톤. 나무는 노랗지 않게(그레이지 쪽), 검정은 순검정 대신 #26~#2b.
// 공통: 스킴이 바꾸지 않는 키는 기본값으로 돌아간다(app.js applyScheme). 도기·가전·스테인리스는 스킴마다 같다.
const SANITARY = { 'sanitary': { color: '#fbfbfa', finish: 'gloss' }, 'washer': { color: '#f0f0ee', finish: 'gloss', rough: 0.3 }, 'fridge': { color: '#ececea', finish: 'gloss', rough: 0.3 } };

export const SCHEMES = [
  {
    id: 'base', label: '원안', region: '인테리어 업체 렌더',
    desc: '받은 렌더 그대로 — 회색 타일 바닥, 화이트 벽, 블랙 상판.',
    palette: ['#f1efe9', '#4d4d4f', '#c8c8c8', '#1e1e1e', '#e6e1d6'],
    paints: {},
    kelvin: 3000,
    living: null,
  },
  {
    id: 'nordic', label: '노르딕 라이트', region: '유럽 · 북유럽',
    desc: '스칸디 미니멀. F&B Wimborne White 벽 + 화이트 오일 오크 마루, 무광 화이트 가구, 화이트 쿼츠 주방 상판, 소프트 블랙 프레임, 2700K.',
    palette: ['#f4f1ea', '#d9cbb3', '#ebe8e2', '#262626', '#cfc8bb'],
    kelvin: 2700,
    paints: {
      'wall': { color: '#f4f1ea', finish: 'wallpaper' }, 'ceiling': { color: '#f6f4ef', finish: 'plain' },
      'floor.main': { color: '#d9cbb3', finish: 'wood' }, 'floor.bedroom': { color: '#d9cbb3', finish: 'wood' },
      'floor.small': { color: '#d9cbb3', finish: 'wood' }, 'floor.study': { color: '#d9cbb3', finish: 'wood' },
      'floor.foyer': { color: '#8e8b86', finish: 'tile30' }, 'floor.balcony': { color: '#b5b2ac', finish: 'tile30' },
      'floor.bath': { color: '#b9b6b0', finish: 'tile30' }, 'wall.bath': { color: '#dedbd5', finish: 'tile' }, 'ceiling.bath': { color: '#e9e7e2', finish: 'plain' },
      'kitchen.door': { color: '#ebe8e2', finish: 'matte' }, 'kitchen.upper': { color: '#ebe8e2', finish: 'matte' }, 'kitchen.top': { color: '#e9e6df', finish: 'satin' },   // 무광 도장 + 쿼츠 반광
      'appliance': { color: '#262626', finish: 'satin' }, 'steel': { color: '#c3c5c7', finish: 'brushed' },
      'wardrobe': { color: '#efece6', finish: 'plain', rough: 0.55 }, 'bed.frame': { color: '#c9b899', finish: 'wood' }, 'bed.linen': { color: '#f0ece5', finish: 'fabric' },
      'study.cabinet': { color: '#efece6', finish: 'plain', rough: 0.55 }, 'study.top': { color: '#d9cbb3', finish: 'wood' }, 'shoe': { color: '#efece6', finish: 'plain', rough: 0.55 },
      'tvwall': { color: '#efece6', finish: 'plain' }, 'tvwall.shelf': { color: '#f4f1ea', finish: 'plain' },
      'door': { color: '#efece6', finish: 'plain', rough: 0.5 }, 'door.front': { color: '#3a3a3a', finish: 'plain', rough: 0.45 },
      'frame.black': { color: '#262626', finish: 'plain', rough: 0.45, metal: 0.2 }, 'frame.white': { color: '#f4f1ea', finish: 'plain' },
      'wood.desk': { color: '#d9cbb3', finish: 'wood' }, 'shelf': { color: '#efece6', finish: 'plain', rough: 0.55 },
      'rug': { color: '#cfc8bb', finish: 'fabric' }, 'chair': { color: '#4a4a48', finish: 'fabric' }, 'sofa': { color: '#dcd6ca', finish: 'fabric' },
      'shade': { color: '#262626', finish: 'plain' }, 'plant': { color: '#5f7358', finish: 'fabric' }, 'pot': { color: '#d8d2c8', finish: 'plain' },
      'bath.acc': { color: '#262626', finish: 'plain', rough: 0.4 }, 'bath.ledge': { color: '#b9b6b0', finish: 'plain', rough: 0.35 }, 'towel': { color: '#e6e1d7', finish: 'fabric' },
      ...SANITARY,
    },
    living: null,
  },
  {
    id: 'japandi', label: '재팬디 웜그레이', region: '한국 · 재팬디',
    desc: '국내 아파트 웜그레이 미니멀. 그레이지 도장 벽, 밝은 웜그레이 대형 포세린, 다크 그레이 하부장 + 크림 상부장, 오크·월넛 포인트, 블랙 프레임, 3000K.',
    palette: ['#dfd9d0', '#b7b1a9', '#6a6560', '#6b5142', '#1f1f1f'],
    kelvin: 3000,
    paints: {
      'wall': { color: '#dfd9d0', finish: 'plain', rough: 0.9 }, 'ceiling': { color: '#e8e4dd', finish: 'plain' },
      'floor.main': { color: '#b7b1a9', finish: 'tile' }, 'floor.bedroom': { color: '#b7b1a9', finish: 'tile' },
      'floor.small': { color: '#b7b1a9', finish: 'tile' }, 'floor.study': { color: '#b7b1a9', finish: 'tile' },
      'floor.foyer': { color: '#6f6a64', finish: 'tile30' }, 'floor.balcony': { color: '#a39e97', finish: 'tile30' },
      'floor.bath': { color: '#a5a09a', finish: 'tile30' }, 'wall.bath': { color: '#d4cec5', finish: 'tile' }, 'ceiling.bath': { color: '#4a4744', finish: 'plain', rough: 0.6 },
      'kitchen.door': { color: '#6a6560', finish: 'satin' }, 'kitchen.upper': { color: '#e4dfd8', finish: 'satin' }, 'kitchen.top': { color: '#3a3734', finish: 'satin' },   // 반광 PET 도어 + 무광 세라믹 상판
      'appliance': { color: '#1f1f1f', finish: 'gloss' }, 'steel': { color: '#b4b6b8', finish: 'brushed' },
      'wardrobe': { color: '#e4dfd8', finish: 'plain', rough: 0.5 }, 'bed.frame': { color: '#6b5142', finish: 'wood' }, 'bed.linen': { color: '#e3ddd3', finish: 'fabric' },
      'study.cabinet': { color: '#e4dfd8', finish: 'satin' }, 'study.top': { color: '#3a3734', finish: 'satin' }, 'shoe': { color: '#6b5142', finish: 'wood' },
      'tvwall': { color: '#6a6560', finish: 'plain' }, 'tvwall.shelf': { color: '#e4dfd8', finish: 'plain' },
      'door': { color: '#e4dfd8', finish: 'plain', rough: 0.5 }, 'door.front': { color: '#2b2b2b', finish: 'plain', rough: 0.45 },
      'frame.black': { color: '#1f1f1f', finish: 'plain', rough: 0.4, metal: 0.3 }, 'frame.white': { color: '#e8e4dd', finish: 'plain' },
      'wood.desk': { color: '#c4ad8f', finish: 'wood' }, 'shelf': { color: '#6b5142', finish: 'wood' },
      'rug': { color: '#a8a094', finish: 'fabric' }, 'chair': { color: '#2b2a28', finish: 'fabric' }, 'sofa': { color: '#cfc8bd', finish: 'fabric' },
      'shade': { color: '#1f1f1f', finish: 'plain' }, 'plant': { color: '#5d6b55', finish: 'fabric' }, 'pot': { color: '#8b8279', finish: 'plain' },
      'bath.acc': { color: '#1f1f1f', finish: 'gloss', metal: 0.5, rough: 0.35 }, 'bath.ledge': { color: '#3a3734', finish: 'plain', rough: 0.3 }, 'towel': { color: '#ddd6cb', finish: 'fabric' },
      ...SANITARY,
    },
    living: null,
  },
  {
    id: 'westcoast', label: '웨스트코스트 오가닉', region: '미국 · 오가닉 모던',
    desc: 'Studio McGee 식 오가닉 모던. Swiss Coffee 벽 + White Dove 천장, 와이드 화이트오크 마루, 웜 화이트 주방 + 트래버틴 상판, 소프트 블랙 프레임, 브라스, 3000K.',
    palette: ['#efeae0', '#c8b59c', '#e1d8c9', '#2b2a28', '#b9a888'],
    kelvin: 3000,
    paints: {
      'wall': { color: '#efeae0', finish: 'plain', rough: 0.9 }, 'ceiling': { color: '#f0eee6', finish: 'plain' },
      'floor.main': { color: '#c8b59c', finish: 'wood' }, 'floor.bedroom': { color: '#c8b59c', finish: 'wood' },
      'floor.small': { color: '#c8b59c', finish: 'wood' }, 'floor.study': { color: '#c8b59c', finish: 'wood' },
      'floor.foyer': { color: '#8a837a', finish: 'tile30' }, 'floor.balcony': { color: '#b3ada3', finish: 'tile30' },
      'floor.bath': { color: '#c2b9ab', finish: 'tile30' }, 'wall.bath': { color: '#ddd5c8', finish: 'tile' }, 'ceiling.bath': { color: '#e9e4da', finish: 'plain' },
      'kitchen.door': { color: '#e6e0d5', finish: 'matte' }, 'kitchen.upper': { color: '#e6e0d5', finish: 'matte' }, 'kitchen.top': { color: '#e1d8c9', finish: 'stone' },   // 무광 도장 + 혼드 트래버틴
      'appliance': { color: '#2b2a28', finish: 'satin' }, 'steel': { color: '#b08d57', finish: 'brushed' },
      'wardrobe': { color: '#e9e3d9', finish: 'plain', rough: 0.55 }, 'bed.frame': { color: '#8f7a60', finish: 'wood' }, 'bed.linen': { color: '#efe9de', finish: 'fabric' },
      'study.cabinet': { color: '#e9e3d9', finish: 'matte' }, 'study.top': { color: '#e1d8c9', finish: 'stone' }, 'shoe': { color: '#3a3733', finish: 'matte' },
      'tvwall': { color: '#e9e3d9', finish: 'plain' }, 'tvwall.shelf': { color: '#efeae0', finish: 'plain' },
      'door': { color: '#e9e3d9', finish: 'plain', rough: 0.5 }, 'door.front': { color: '#3a3733', finish: 'plain', rough: 0.45 },
      'frame.black': { color: '#2b2a28', finish: 'plain', rough: 0.45, metal: 0.2 }, 'frame.white': { color: '#efeae0', finish: 'plain' },   // 창틀은 매입등 트림과 키를 공유해 화이트 유지
      'wood.desk': { color: '#c8b59c', finish: 'wood' }, 'shelf': { color: '#2b2a28', finish: 'plain', rough: 0.55 },
      'rug': { color: '#b9a888', finish: 'fabric' }, 'chair': { color: '#3a3733', finish: 'fabric' }, 'sofa': { color: '#ece6db', finish: 'fabric' },
      'shade': { color: '#2b2a28', finish: 'plain' }, 'plant': { color: '#7a8064', finish: 'fabric' }, 'pot': { color: '#c9bfae', finish: 'plain' },
      'bath.acc': { color: '#b08d57', finish: 'gloss', metal: 0.7, rough: 0.35 }, 'bath.ledge': { color: '#c2b9ab', finish: 'plain', rough: 0.3 }, 'towel': { color: '#e6dfd2', finish: 'fabric' },
      ...SANITARY,
    },
    living: null,
  },
  // ── 추가 10종 — 공통 헬퍼 P() 로 42개 키를 모두 채운다. 방마다 바닥을 달리 줄 수 있다(floorBed/floorSmall/floorStudy) ──
  ...[
    {
      id: 'paris', label: '파리지앵 클래식 화이트', region: '프랑스 · 오스만 아파트',
      desc: '따뜻한 화이트 벽 + 허니 오크 마루 + 카라라 마블 주방 상판, 브라스 하드웨어. 오래된 파리 아파트를 현대적으로.',
      kelvin: 2700,
      s: { wall: '#f3f0ea', ceiling: '#f7f5f1', floor: ['#cbb595', 'woodgloss'], foyer: '#8f8b84', balcony: '#b7b3ab',
           bathF: '#c9c4bb', bathW: '#e9e5de', bathC: '#efece7', kDoor: ['#f0ede7', 'satin'], kUpper: ['#f0ede7', 'satin'], kTop: ['#eae6df', 'marble'],
           black: '#2c2b29', metal: '#b08d57', cab: ['#f0ede7', 'satin'], studyTop: ['#eae6df', 'marble'], wood: '#b89a76', linen: '#f3efe8',
           sofa: '#e6e0d5', rug: '#cfc6b8', chair: '#4a4744', plant: '#5f7358', pot: '#d9d3c9', towel: '#eee9e0', acc: '#b08d57', ledge: '#eae6df', frameWhite: '#f3f0ea' },
    },
    {
      id: 'terracotta', label: '테라코타 어스', region: '지중해 · 2026 어스톤',
      desc: '웜 샌드 벽, 안방·서재는 오크, 거실은 크림 라임스톤 타일, 소파·러그에 테라코타 포인트와 세이지 화분.',
      kelvin: 2700,
      s: { wall: '#ece2d3', ceiling: '#f2ebe0', floor: ['#cdbfab', 'tilematte'], floorBed: ['#c9ac86', 'wood'], floorStudy: ['#c9ac86', 'wood'], floorSmall: ['#c9ac86', 'wood'],
           foyer: '#9a8672', balcony: '#b7ab9b', bathF: '#c7b3a0', bathW: '#e3d6c6', bathC: '#ece3d6', kDoor: ['#c9a284', 'wood'], kUpper: ['#efe6d8', 'matte'], kTop: ['#efe6d8', 'stone'],
           black: '#3a2f29', metal: '#9c7a52', cab: ['#efe6d8', 'matte'], studyTop: ['#b8735a', 'matte'], wood: '#b48b66', linen: '#efe5d6',
           sofa: '#b8735a', rug: '#d4b9a0', chair: '#7a5a48', plant: '#7c8a6a', pot: '#b8735a', towel: '#e6d6c4', acc: '#3a2f29', ledge: '#b8735a', frameWhite: '#ece2d3' },
    },
    {
      id: 'sage', label: '세이지 그린 코티지', region: '영국 · 컨트리 모던',
      desc: 'F&B Mizzle 계열 세이지 벽, 오크 마루, 세이지 하부장 + 크림 상부장, 브라스 수전. 차분하고 자연스러운 그린.',
      kelvin: 2700,
      s: { wall: '#d3d6c9', ceiling: '#eeeee8', floor: ['#cbb897', 'wood'], foyer: '#87857c', balcony: '#b3b2aa',
           bathF: '#b9bab2', bathW: '#dcded5', bathC: '#e8e9e3', kDoor: ['#8a9a86', 'satin'], kUpper: ['#eeeae0', 'satin'], kTop: ['#e9e5dc', 'stone'],
           black: '#2e2f2b', metal: '#b08d57', cab: ['#eeeae0', 'satin'], studyTop: ['#8a9a86', 'satin'], wood: '#b2966f', linen: '#f0ede4',
           sofa: '#d8d1c2', rug: '#c2c4b3', chair: '#5c6b55', plant: '#5c6b55', pot: '#cfc8bb', towel: '#e4e5dc', acc: '#b08d57', ledge: '#8a9a86', frameWhite: '#eeeee8' },
    },
    {
      id: 'navy', label: '딥 네이비 & 브라스', region: '뉴욕 · 무디 모던',
      desc: '그레이지 벽에 네이비 주방 하부장, 다크 월넛 마루, 브라스 하드웨어. 서재는 네이비 상판, 침구는 흰색으로 대비.',
      kelvin: 2700,
      s: { wall: '#dcd6cc', ceiling: '#e9e5de', floor: ['#7a5c45', 'woodgloss'], foyer: '#4f4a45', balcony: '#8e8880',
           bathF: '#8e8a85', bathW: '#cfcac2', bathC: '#3b3d45', kDoor: ['#2f3b4c', 'satin'], kUpper: ['#e8e2d8', 'satin'], kTop: ['#e8e4dd', 'marble'],
           black: '#232527', metal: '#b08d57', cab: ['#e8e2d8', 'satin'], studyTop: ['#2f3b4c', 'satin'], wood: '#6b4f3a', linen: '#f4f1eb',
           sofa: ['#3d4a5c', 'leather'], rug: '#b9ad9c', chair: '#2f3b4c', plant: '#556b5a', pot: '#2f3b4c', towel: '#e6e0d5', acc: '#b08d57', ledge: '#2f3b4c', frameWhite: '#e9e5de' },
    },
    {
      id: 'concrete', label: '차콜 인더스트리얼', region: '베를린 · 로프트',
      desc: '콘크리트 질감 벽, 다크 그레이 타일 바닥, 매트 블랙 주방과 스테인리스, 웜 우드 포인트로 차갑지 않게.',
      kelvin: 3000,
      s: { wall: ['#cfcdc8', 'concrete'], ceiling: '#bfbdb8', floor: ['#6b6a67', 'tilematte'], floorBed: ['#a08767', 'wood'], foyer: '#4a4947', balcony: '#7a7976',
           bathF: '#5d5c5a', bathW: '#8a8985', bathC: '#3a3a39', kDoor: ['#2e2e2e', 'matte'], kUpper: ['#3a3a3a', 'matte'], kTop: ['#b9bcc0', 'brushed'],
           black: '#1e1e1e', metal: '#b9bcc0', cab: ['#3a3a3a', 'matte'], studyTop: ['#a08767', 'wood'], wood: '#8c6f52', linen: '#d9d5cf',
           sofa: '#5b5955', rug: '#8f8b84', chair: '#2a2a2a', plant: '#4f6350', pot: '#3a3a3a', towel: '#c9c6c0', acc: '#1e1e1e', ledge: '#3a3a3a', frameWhite: '#2e2e2e' },
    },
    {
      id: 'midcentury', label: '크림 & 카라멜 미드센추리', region: '미국 · 1960s 모던',
      desc: '크림 벽, 월넛 마루, 카라멜 우드 하부장 + 크림 상부장, 블랙 프레임. 팜스프링스 느낌의 따뜻한 갈색 조합.',
      kelvin: 2700,
      s: { wall: '#f1eadc', ceiling: '#f5f0e6', floor: ['#8b6a4e', 'woodgloss'], foyer: '#5f574f', balcony: '#a39a8e',
           bathF: '#a49b8f', bathW: '#e6dfd2', bathC: '#efe9dd', kDoor: ['#b27f55', 'woodgloss'], kUpper: ['#f1eadc', 'satin'], kTop: ['#2b2724', 'satin'],
           black: '#2b2724', metal: '#c9a86a', cab: ['#f1eadc', 'satin'], studyTop: ['#b27f55', 'woodgloss'], wood: '#9a6d4b', linen: '#f2ece1',
           sofa: ['#c7955f', 'leather'], rug: '#d9c6a6', chair: '#5b4636', plant: '#6b7f5a', pot: '#b27f55', towel: '#ecdfcc', acc: '#2b2724', ledge: '#b27f55', frameWhite: '#f1eadc' },
    },
    {
      id: 'mono', label: '그레이 모노톤', region: '컨템포러리 · 갤러리',
      desc: '라이트 그레이 벽, 미드 그레이 포세린, 그레이 주방과 화이트 상부장, 차콜 소파. 채도 없이 명도 단계로만.',
      kelvin: 4000,
      s: { wall: '#e5e5e3', ceiling: '#eeeeec', floor: ['#9d9d9b', 'tile'], foyer: '#5a5a58', balcony: '#8a8a88',
           bathF: '#7f7f7d', bathW: '#cfcfcd', bathC: '#d8d8d6', kDoor: ['#8c8c8a', 'lacquer'], kUpper: ['#ececea', 'lacquer'], kTop: ['#f2f2f0', 'lacquer'],
           black: '#232323', metal: '#b9bcc0', cab: ['#ececea', 'satin'], studyTop: ['#4a4a48', 'satin'], wood: '#8a8580', linen: '#f2f2f0',
           sofa: '#4a4a48', rug: '#bdbdbb', chair: '#2a2a2a', plant: '#5a6b5a', pot: '#8c8c8a', towel: '#e0e0de', acc: '#232323', ledge: '#4a4a48', frameWhite: '#e5e5e3' },
    },
    {
      id: 'stone', label: '스톤 & 린넨', region: '이비자 · 지중해 미니멀',
      desc: '라임 플라스터 벽, 라임스톤 타일 바닥, 스톤 그레이 주방, 린넨 텍스타일. 흰 회벽 집의 조용한 톤.',
      kelvin: 2700,
      s: { wall: ['#e9e3d8', 'concrete'], ceiling: '#eee9e0', floor: ['#d3cabb', 'stone'], foyer: '#a59c8e', balcony: '#c4bcae',
           bathF: '#bdb4a6', bathW: '#ddd5c8', bathC: '#e6e0d5', kDoor: ['#a9a196', 'matte'], kUpper: ['#e6e0d5', 'matte'], kTop: ['#cfc7b9', 'concrete'],
           black: '#3a3733', metal: '#a89a86', cab: ['#e6e0d5', 'matte'], studyTop: ['#cfc7b9', 'concrete'], wood: '#b39c7d', linen: '#efe9df',
           sofa: '#d9d0c1', rug: '#c9bfae', chair: '#7a7166', plant: '#7a8064', pot: '#cbbfae', towel: '#e6dfd2', acc: '#3a3733', ledge: '#cfc7b9', frameWhite: '#e9e3d8' },
    },
    {
      id: 'blackoak', label: '블랙 & 오크', region: '일본 · 모던',
      desc: '화이트 벽, 다크 오크 마루, 블랙 하부장 + 오크 상부장, 블랙 프레임과 다크 욕실 타일. 선명한 명암의 일본식 모던.',
      kelvin: 3000,
      s: { wall: '#f2f1ed', ceiling: '#f5f4f1', floor: ['#8f6f52', 'woodgloss'], foyer: '#3f3d3a', balcony: '#8a8780',
           bathF: '#4e4c49', bathW: '#5c5a56', bathC: '#2e2e2d', kDoor: ['#202020', 'lacquer'], kUpper: ['#c9ad86', 'wood'], kTop: ['#202020', 'satin'],
           black: '#202020', metal: '#2b2b2b', cab: ['#f2f1ed', 'satin'], studyTop: ['#202020', 'satin'], wood: '#8f6f52', linen: '#f2f1ed',
           sofa: ['#2f2f2e', 'leather'], rug: '#b9ad9c', chair: '#202020', plant: '#4f6350', pot: '#202020', towel: '#e6e2da', acc: '#202020', ledge: '#202020', frameWhite: '#f2f1ed' },
    },
    {
      id: 'blush', label: '더스티 로즈 & 그레이지', region: '소프트 컨템포러리',
      desc: '아주 옅은 로즈 베이지 벽, 라이트 그레이 오크 마루, 그레이지 주방, 더스티 로즈 소파와 세이지 화분. 부드럽고 세련되게.',
      kelvin: 3000,
      s: { wall: '#ede4de', ceiling: '#f3eeea', floor: ['#cdc3b4', 'wood'], foyer: '#8c8680', balcony: '#b6afa6',
           bathF: '#b8b0a8', bathW: '#e2d9d3', bathC: '#ebe4df', kDoor: ['#cfc6bf', 'satin'], kUpper: ['#efe9e4', 'satin'], kTop: ['#efe9e4', 'marble'],
           black: '#3a3634', metal: '#c9a48f', cab: ['#efe9e4', 'satin'], studyTop: ['#cfc6bf', 'satin'], wood: '#b5a48f', linen: '#f3ede8',
           sofa: '#c9a29a', rug: '#d9cfc8', chair: '#7a6a66', plant: '#7c8a6a', pot: '#c9a29a', towel: '#ecdfda', acc: '#c9a48f', ledge: '#cfc6bf', frameWhite: '#ede4de' },
    },
  ].map(({ s, ...sc }) => ({ ...sc, palette: [col(s.wall), col(s.floor), col(s.kDoor), s.black, s.sofa], paints: P(s), living: null })),
];

// 색 문자열 또는 [색, 마감] 튜플
function col(v) { return Array.isArray(v) ? v[0] : v; }
function fin(v, defFinish, extra = {}) { return Array.isArray(v) ? { color: v[0], finish: v[1], ...extra, ...(v[2] || {}) } : { color: v, finish: defFinish, ...extra }; }   // [색, 마감, {rough, coat, env…}]
function wood(v) { return fin(v, 'wood'); }

// 컴팩트 스펙 → 42개 페인트 키
function P(s) {
  const floorMain = fin(s.floor, 'tile'), fb = fin(s.floorBed ?? s.floor, 'tile'), fs = fin(s.floorSmall ?? s.floor, 'tile'), fst = fin(s.floorStudy ?? s.floor, 'tile');
  const cab = fin(s.cab, 'plain', { rough: 0.5 });
  return {
    'wall': fin(s.wall, 'plain', { rough: 0.9 }), 'ceiling': { color: s.ceiling, finish: 'plain' },
    'floor.main': floorMain, 'floor.bedroom': fb, 'floor.small': fs, 'floor.study': fst,
    'floor.foyer': { color: s.foyer, finish: 'tile30' }, 'floor.balcony': { color: s.balcony, finish: 'tile30' },
    'floor.bath': { color: s.bathF, finish: 'tile30' }, 'wall.bath': { color: s.bathW, finish: 'tile' }, 'ceiling.bath': { color: s.bathC, finish: 'plain', rough: 0.6 },
    'kitchen.door': fin(s.kDoor, 'plain', { rough: 0.5 }), 'kitchen.upper': fin(s.kUpper, 'plain', { rough: 0.5 }), 'kitchen.top': fin(s.kTop, 'plain', { rough: 0.3 }),
    'appliance': { color: s.black, finish: 'gloss' }, 'steel': { color: s.metal, finish: 'brushed' },
    'wardrobe': cab, 'study.cabinet': cab, 'door': cab, 'tvwall': cab, 'shelf': cab, 'shoe': cab,
    'tvwall.shelf': { color: col(s.wall), finish: 'plain' }, 'study.top': fin(s.studyTop, 'plain', { rough: 0.35 }),
    'bed.frame': wood(s.wood), 'wood.desk': wood(s.wood), 'bed.linen': { color: s.linen, finish: 'fabric', sheen: 0.3 },
    'door.front': { color: s.black, finish: 'plain', rough: 0.45 }, 'frame.black': { color: s.black, finish: 'plain', rough: 0.45, metal: 0.2 },
    'frame.white': { color: s.frameWhite ?? col(s.wall), finish: 'plain' },
    'sofa': fin(s.sofa, 'fabric'), 'rug': { color: s.rug, finish: 'fabric', sheen: 0.2 }, 'chair': fin(s.chair, 'fabric'),
    'plant': { color: s.plant, finish: 'fabric' }, 'pot': { color: s.pot, finish: 'plain' }, 'shade': { color: s.black, finish: 'plain' },
    'bath.acc': { color: s.acc, finish: 'gloss', metal: 0.5, rough: 0.35 }, 'bath.ledge': fin(s.ledge, 'plain', { rough: 0.3 }), 'towel': { color: s.towel, finish: 'fabric', sheen: 0.6 },
    ...SANITARY,
  };
}
