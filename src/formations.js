// x: 0-100 (left to right), y: 0-100 (top=opponent goal, bottom=own goal)

export const FORMATIONS = {
  '3-3-2': {
    label: '3-3-2',
    positions: [
      { id: 'gk',  label: 'K',   x: 50, y: 92 },
      { id: 'dl',  label: 'VB',  x: 18, y: 70 },
      { id: 'dc',  label: 'MB',  x: 50, y: 70 },
      { id: 'dr',  label: 'HB',  x: 82, y: 70 },
      { id: 'ml',  label: 'VM',  x: 20, y: 48 },
      { id: 'mc',  label: 'CM',  x: 50, y: 48 },
      { id: 'mr',  label: 'HM',  x: 80, y: 48 },
      { id: 'fl',  label: 'VS',  x: 35, y: 25 },
      { id: 'fr',  label: 'HS',  x: 65, y: 25 },
    ],
  },
  '3-1-1-3': {
    label: '3-1-1-3',
    positions: [
      { id: 'gk',  label: 'K',   x: 50, y: 92 },
      { id: 'dl',  label: 'VB',  x: 18, y: 74 },
      { id: 'dc',  label: 'MB',  x: 50, y: 74 },
      { id: 'dr',  label: 'HB',  x: 82, y: 74 },
      { id: 'dm',  label: 'DM',  x: 50, y: 56 },
      { id: 'am',  label: 'AM',  x: 50, y: 38 },
      { id: 'fl',  label: 'VK',  x: 18, y: 27 },
      { id: 'fc',  label: 'S',   x: 50, y: 10 },
      { id: 'fr',  label: 'HK',  x: 82, y: 27 },
    ],
  },
  '3-4-1': {
    label: '3-4-1',
    positions: [
      { id: 'gk',  label: 'K',   x: 50, y: 92 },
      { id: 'dl',  label: 'VB',  x: 18, y: 69 },
      { id: 'dc',  label: 'MB',  x: 50, y: 69 },
      { id: 'dr',  label: 'HB',  x: 82, y: 69 },
      { id: 'ml',  label: 'VM',  x: 15, y: 46 },
      { id: 'mcl', label: 'CM',  x: 38, y: 46 },
      { id: 'mcr', label: 'CM',  x: 62, y: 46 },
      { id: 'mr',  label: 'HM',  x: 85, y: 46 },
      { id: 'fc',  label: 'S',   x: 50, y: 22 },
    ],
  },
}

export const FORMATION_KEYS = Object.keys(FORMATIONS)
