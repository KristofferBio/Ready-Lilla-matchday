// Positions as percentages of field (left=0, right=100, top=0 attack, bottom=100 defense)
// Field is rendered with own half at bottom, opponent at top
// x: 0-100 (left to right), y: 0-100 (top=opponent goal, bottom=own goal)

export const FORMATIONS = {
  '3-2-3': {
    label: '3-2-3',
    positions: [
      { id: 'gk',  label: 'MV',  x: 50, y: 92 },
      { id: 'dl',  label: 'VB',  x: 18, y: 75 },
      { id: 'dc',  label: 'MB',  x: 50, y: 75 },
      { id: 'dr',  label: 'HB',  x: 82, y: 75 },
      { id: 'ml',  label: 'VM',  x: 30, y: 55 },
      { id: 'mr',  label: 'HM',  x: 70, y: 55 },
      { id: 'fl',  label: 'VK',  x: 18, y: 30 },
      { id: 'fc',  label: 'AS',  x: 50, y: 25 },
      { id: 'fr',  label: 'HK',  x: 82, y: 30 },
    ],
  },
  '3-3-2': {
    label: '3-3-2',
    positions: [
      { id: 'gk',  label: 'MV',  x: 50, y: 92 },
      { id: 'dl',  label: 'VB',  x: 18, y: 75 },
      { id: 'dc',  label: 'MB',  x: 50, y: 75 },
      { id: 'dr',  label: 'HB',  x: 82, y: 75 },
      { id: 'ml',  label: 'VM',  x: 20, y: 52 },
      { id: 'mc',  label: 'CM',  x: 50, y: 52 },
      { id: 'mr',  label: 'HM',  x: 80, y: 52 },
      { id: 'fl',  label: 'VS',  x: 35, y: 25 },
      { id: 'fr',  label: 'HS',  x: 65, y: 25 },
    ],
  },
  '3-1-1-3': {
    label: '3-1-1-3',
    positions: [
      { id: 'gk',  label: 'MV',  x: 50, y: 92 },
      { id: 'dl',  label: 'VB',  x: 18, y: 75 },
      { id: 'dc',  label: 'MB',  x: 50, y: 75 },
      { id: 'dr',  label: 'HB',  x: 82, y: 75 },
      { id: 'dm',  label: 'DM',  x: 50, y: 58 },
      { id: 'am',  label: 'AM',  x: 50, y: 40 },
      { id: 'fl',  label: 'VK',  x: 18, y: 22 },
      { id: 'fc',  label: 'AS',  x: 50, y: 18 },
      { id: 'fr',  label: 'HK',  x: 82, y: 22 },
    ],
  },
  '3-4-1': {
    label: '3-4-1',
    positions: [
      { id: 'gk',  label: 'MV',  x: 50, y: 92 },
      { id: 'dl',  label: 'VB',  x: 18, y: 75 },
      { id: 'dc',  label: 'MB',  x: 50, y: 75 },
      { id: 'dr',  label: 'HB',  x: 82, y: 75 },
      { id: 'ml',  label: 'VM',  x: 15, y: 52 },
      { id: 'mcl', label: 'CM',  x: 38, y: 52 },
      { id: 'mcr', label: 'CM',  x: 62, y: 52 },
      { id: 'mr',  label: 'HM',  x: 85, y: 52 },
      { id: 'fc',  label: 'AS',  x: 50, y: 22 },
    ],
  },
}

export const FORMATION_KEYS = Object.keys(FORMATIONS)
