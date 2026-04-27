// x: 0-100 (left to right), y: 0-100 (top=opponent goal, bottom=own goal)

export const FORMATIONS = {
  '3-3-2': {
    label: '3-3-2',
    positions: [
      { id: 'gk',  label: 'K',   x: 50, y: 92 },
      { id: 'dl',  label: 'FV',  x: 18, y: 70 },
      { id: 'dc',  label: 'FM',  x: 50, y: 70 },
      { id: 'dr',  label: 'FH',  x: 82, y: 70 },
      { id: 'ml',  label: 'MV',  x: 20, y: 48 },
      { id: 'mc',  label: 'M',   x: 50, y: 48 },
      { id: 'mr',  label: 'MH',  x: 80, y: 48 },
      { id: 'fl',  label: 'SV',  x: 35, y: 25 },
      { id: 'fr',  label: 'SH',  x: 65, y: 25 },
    ],
  },
  '3-1-1-3': {
    label: '3-1-1-3',
    positions: [
      { id: 'gk',  label: 'K',   x: 50, y: 92 },
      { id: 'dl',  label: 'FV',  x: 18, y: 74 },
      { id: 'dc',  label: 'FM',  x: 50, y: 74 },
      { id: 'dr',  label: 'FH',  x: 82, y: 74 },
      { id: 'dm',  label: 'MD',  x: 50, y: 56 },
      { id: 'am',  label: 'MO',  x: 50, y: 38 },
      { id: 'fl',  label: 'VV',  x: 18, y: 27 },
      { id: 'fc',  label: 'S',   x: 50, y: 10 },
      { id: 'fr',  label: 'VH',  x: 82, y: 27 },
    ],
  },
  '3-4-1': {
    label: '3-4-1',
    positions: [
      { id: 'gk',  label: 'K',   x: 50, y: 92 },
      { id: 'dl',  label: 'FV',  x: 18, y: 69 },
      { id: 'dc',  label: 'FM',  x: 50, y: 69 },
      { id: 'dr',  label: 'FH',  x: 82, y: 69 },
      { id: 'ml',  label: 'MV',  x: 15, y: 46 },
      { id: 'mcl', label: 'MS',  x: 38, y: 46 },
      { id: 'mcr', label: 'MS',  x: 62, y: 46 },
      { id: 'mr',  label: 'MH',  x: 85, y: 46 },
      { id: 'fc',  label: 'S',   x: 50, y: 22 },
    ],
  },
}

export const FORMATION_KEYS = Object.keys(FORMATIONS)
