import type { PlayerType } from '../types';

// Player type symbols
export const PLAYER_TYPE_SYMBOLS: Record<PlayerType, string> = {
  batsman: '🏏',      // Cricket bat
  bowler: '🔴',       // Ball (red cricket ball)
  allrounder: '🏏🔴', // Both bat and ball
  wicketkeeper: '🧤', // Gloves
};

// Foreign player symbol
export const FOREIGN_SYMBOL = '✈️';

// Get symbol for player type
export function getTypeSymbol(type: PlayerType): string {
  return PLAYER_TYPE_SYMBOLS[type] || '❓';
}

// Get color for player type (for text styling)
export function getTypeColor(type: PlayerType): string {
  switch (type) {
    case 'batsman':
      return 'text-[var(--accent-gold)]';
    case 'bowler':
      return 'text-[var(--accent-cyan)]';
    case 'allrounder':
      return 'text-[var(--accent-purple)]';
    case 'wicketkeeper':
      return 'text-[var(--accent-emerald)]';
    default:
      return 'text-[var(--text-secondary)]';
  }
}

// Get short label for player type (for compact displays)
export function getTypeLabel(type: PlayerType): string {
  switch (type) {
    case 'batsman':
      return 'BAT';
    case 'bowler':
      return 'BOWL';
    case 'allrounder':
      return 'AR';
    case 'wicketkeeper':
      return 'WK';
    default:
      return String(type).toUpperCase();
  }
}

// Combined display: symbol + optional label
export function getTypeDisplay(type: PlayerType, showLabel = false): string {
  const symbol = getTypeSymbol(type);
  if (showLabel) {
    return `${symbol} ${getTypeLabel(type)}`;
  }
  return symbol;
}

// Get foreign indicator
export function getForeignIndicator(isForeign: boolean): string {
  return isForeign ? FOREIGN_SYMBOL : '';
}
