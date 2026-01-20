import type { Cricketer, TeamComposition, User } from '../types';

export const TEAM_SIZE = 12;
export const MAX_FOREIGNERS = 4;
export const MIN_BUDGET_PER_PLAYER = 0.5;
export const STARTING_BUDGET = 200;

export function getTeamComposition(cricketers: Cricketer[]): TeamComposition {
  return {
    batsmen: cricketers.filter((c) => c.playerType === 'batsman').length,
    bowlers: cricketers.filter((c) => c.playerType === 'bowler').length,
    wicketkeepers: cricketers.filter((c) => c.playerType === 'wicketkeeper').length,
    allrounders: cricketers.filter((c) => c.playerType === 'allrounder').length,
    foreigners: cricketers.filter((c) => c.isForeign).length,
    total: cricketers.length,
  };
}

export function validateBid(
  bidAmount: number,
  currentHighBid: number,
  user: User,
  currentTeam: Cricketer[],
  cricketer: Cricketer
): { valid: boolean; message?: string } {
  // Check bid increment
  const minIncrement = currentHighBid < 10 ? 0.5 : 1;
  if (bidAmount < currentHighBid + minIncrement) {
    return {
      valid: false,
      message: `Minimum bid increment is $${minIncrement.toFixed(2)}. Minimum bid: $${(currentHighBid + minIncrement).toFixed(2)}`,
    };
  }

  // Check if team is full
  const composition = getTeamComposition(currentTeam);
  if (composition.total >= TEAM_SIZE) {
    return {
      valid: false,
      message: 'Your team is already full (12 players)',
    };
  }

  // Check foreign player limit
  if (cricketer.isForeign && composition.foreigners >= MAX_FOREIGNERS) {
    return {
      valid: false,
      message: 'Maximum foreign players limit reached (4 players)',
    };
  }

  // Calculate remaining slots and minimum budget needed
  const remainingSlots = TEAM_SIZE - composition.total - 1; // -1 for current player being bid on
  const minBudgetNeeded = remainingSlots * MIN_BUDGET_PER_PLAYER;
  const maxBidAllowed = user.budgetRemaining - minBudgetNeeded;

  if (bidAmount > maxBidAllowed) {
    return {
      valid: false,
      message: `Maximum bid allowed is $${maxBidAllowed.toFixed(2)} (need to reserve $${minBudgetNeeded.toFixed(2)} for ${remainingSlots} remaining slots)`,
    };
  }

  if (bidAmount > user.budgetRemaining) {
    return {
      valid: false,
      message: `Insufficient budget. You have $${user.budgetRemaining.toFixed(2)}`,
    };
  }

  return { valid: true };
}

export function validateSubstitution(
  currentTeam: Cricketer[],
  subOut: Cricketer,
  subIn: Cricketer
): { valid: boolean; message?: string } {
  // Create new team composition after substitution
  const newTeam = currentTeam.filter((c) => c.id !== subOut.id);
  newTeam.push(subIn);

  const newComposition = getTeamComposition(newTeam);

  // Check foreign player limit
  if (newComposition.foreigners > MAX_FOREIGNERS) {
    return {
      valid: false,
      message: `Substitution would exceed foreign player limit (${MAX_FOREIGNERS})`,
    };
  }

  // Team should still have 11 players
  if (newComposition.total !== TEAM_SIZE) {
    return {
      valid: false,
      message: `Team must have exactly ${TEAM_SIZE} players`,
    };
  }

  return { valid: true };
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function getPlayerTypeLabel(type: Cricketer['playerType']): string {
  const labels: Record<Cricketer['playerType'], string> = {
    batsman: 'Batsman',
    bowler: 'Bowler',
    wicketkeeper: 'Wicketkeeper',
    allrounder: 'All-rounder',
  };
  return labels[type];
}

export function getPlayerTypeColor(type: Cricketer['playerType']): string {
  const colors: Record<Cricketer['playerType'], string> = {
    batsman: 'bg-blue-100 text-blue-800',
    bowler: 'bg-green-100 text-green-800',
    wicketkeeper: 'bg-purple-100 text-purple-800',
    allrounder: 'bg-orange-100 text-orange-800',
  };
  return colors[type];
}
