export const COLORS = {
  bg: '#0B1120',
  bgSecondary: '#0E1522',
  card: '#1E2A3A',
  cardDark: '#1A2432',
  border: '#2E3E54',
  borderSubtle: '#2A3A50',
  gold: '#C9A84C',
  goldHover: '#E0C77A',
  textPrimary: '#F0EDE6',
  textSecondary: '#B7BFCC',
  textMuted: '#8A93A6',
  textFaint: '#6B7488',
  statusActive: { color: '#5B8DC9', bg: 'rgba(91,141,201,0.15)' },
  statusCritical: { color: '#D9A24E', bg: 'rgba(201,142,49,0.15)' },
  statusCompleted: { color: '#8A93A6', bg: 'rgba(138,147,166,0.15)' },
  statusCancelled: { color: '#B5574A', bg: 'rgba(181,87,74,0.15)' },
  paradoxPending: { color: '#D9A24E', bg: 'rgba(201,142,49,0.15)' },
  paradoxResolved: { color: '#3FAE79', bg: 'rgba(63,174,121,0.15)' },
  paradoxCritical: { color: '#E05A4E', bg: 'rgba(224,90,78,0.18)' },
} as const;

export const BOOKING_CUTOFF_MS = 3_600_000; // 1 hour before departure
