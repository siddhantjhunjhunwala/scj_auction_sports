import type { PlayerMatchScore } from '../types';

export interface PointsBreakdown {
  playingXi: number;
  runs: number;
  fours: number;
  sixes: number;
  runsBonus: number;
  duck: number;
  strikeRateBonus: number;
  wickets: number;
  lbwBowledBonus: number;
  maidens: number;
  dotBalls: number;
  wicketsBonus: number;
  economyBonus: number;
  catches: number;
  catchBonus: number;
  stumpings: number;
  directRunouts: number;
  indirectRunouts: number;
  total: number;
}

export function calculatePoints(score: Partial<PlayerMatchScore>): PointsBreakdown {
  const breakdown: PointsBreakdown = {
    playingXi: 0,
    runs: 0,
    fours: 0,
    sixes: 0,
    runsBonus: 0,
    duck: 0,
    strikeRateBonus: 0,
    wickets: 0,
    lbwBowledBonus: 0,
    maidens: 0,
    dotBalls: 0,
    wicketsBonus: 0,
    economyBonus: 0,
    catches: 0,
    catchBonus: 0,
    stumpings: 0,
    directRunouts: 0,
    indirectRunouts: 0,
    total: 0,
  };

  // Playing XI bonus
  if (score.inPlayingXi) {
    breakdown.playingXi = 4;
  }

  // Batting points
  const runs = score.runs || 0;
  const ballsFaced = score.ballsFaced || 0;
  const fours = score.fours || 0;
  const sixes = score.sixes || 0;

  breakdown.runs = runs * 1;
  breakdown.fours = fours * 4;
  breakdown.sixes = sixes * 6;

  // Runs bonus (exclusive tiers)
  if (runs >= 100) {
    breakdown.runsBonus = 16;
  } else if (runs >= 75) {
    breakdown.runsBonus = 12;
  } else if (runs >= 50) {
    breakdown.runsBonus = 8;
  } else if (runs >= 25) {
    breakdown.runsBonus = 4;
  }

  // Duck penalty
  if (runs === 0 && score.dismissalType && ballsFaced > 0) {
    breakdown.duck = -2;
  }

  // Strike rate bonus (minimum 10 balls faced)
  if (ballsFaced >= 10) {
    const strikeRate = (runs / ballsFaced) * 100;
    if (strikeRate >= 170) {
      breakdown.strikeRateBonus = 6;
    } else if (strikeRate >= 150) {
      breakdown.strikeRateBonus = 4;
    } else if (strikeRate >= 130) {
      breakdown.strikeRateBonus = 2;
    }
  }

  // Bowling points
  const wickets = score.wickets || 0;
  const oversBowled = score.oversBowled || 0;
  const runsConceded = score.runsConceded || 0;
  const maidens = score.maidens || 0;
  const dotBalls = score.dotBalls || 0;
  const lbwBowledDismissals = score.lbwBowledDismissals || 0;

  breakdown.wickets = wickets * 25;
  breakdown.lbwBowledBonus = lbwBowledDismissals * 8;
  breakdown.maidens = maidens * 6;
  breakdown.dotBalls = dotBalls * 1;

  // Wickets bonus (exclusive tiers)
  if (wickets >= 5) {
    breakdown.wicketsBonus = 12;
  } else if (wickets >= 4) {
    breakdown.wicketsBonus = 8;
  } else if (wickets >= 3) {
    breakdown.wicketsBonus = 4;
  }

  // Economy bonus (minimum 2 overs)
  if (oversBowled >= 2) {
    const economy = runsConceded / oversBowled;
    if (economy < 5) {
      breakdown.economyBonus = 6;
    } else if (economy < 6) {
      breakdown.economyBonus = 4;
    } else if (economy < 7) {
      breakdown.economyBonus = 2;
    }
  }

  // Fielding points
  const catches = score.catches || 0;
  const stumpings = score.stumpings || 0;
  const directRunouts = score.directRunouts || 0;
  const indirectRunouts = score.indirectRunouts || 0;

  breakdown.catches = catches * 8;
  if (catches >= 3) {
    breakdown.catchBonus = 4;
  }
  breakdown.stumpings = stumpings * 12;
  breakdown.directRunouts = directRunouts * 12;
  breakdown.indirectRunouts = indirectRunouts * 6;

  // Calculate total
  breakdown.total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

  return breakdown;
}

export function formatPointsBreakdown(breakdown: PointsBreakdown): string[] {
  const lines: string[] = [];

  if (breakdown.playingXi) lines.push(`Playing XI: +${breakdown.playingXi}`);
  if (breakdown.runs) lines.push(`Runs: +${breakdown.runs}`);
  if (breakdown.fours) lines.push(`Fours: +${breakdown.fours}`);
  if (breakdown.sixes) lines.push(`Sixes: +${breakdown.sixes}`);
  if (breakdown.runsBonus) lines.push(`Runs Bonus: +${breakdown.runsBonus}`);
  if (breakdown.duck) lines.push(`Duck: ${breakdown.duck}`);
  if (breakdown.strikeRateBonus) lines.push(`Strike Rate Bonus: +${breakdown.strikeRateBonus}`);
  if (breakdown.wickets) lines.push(`Wickets: +${breakdown.wickets}`);
  if (breakdown.lbwBowledBonus) lines.push(`LBW/Bowled: +${breakdown.lbwBowledBonus}`);
  if (breakdown.maidens) lines.push(`Maidens: +${breakdown.maidens}`);
  if (breakdown.dotBalls) lines.push(`Dot Balls: +${breakdown.dotBalls}`);
  if (breakdown.wicketsBonus) lines.push(`Wickets Bonus: +${breakdown.wicketsBonus}`);
  if (breakdown.economyBonus) lines.push(`Economy Bonus: +${breakdown.economyBonus}`);
  if (breakdown.catches) lines.push(`Catches: +${breakdown.catches}`);
  if (breakdown.catchBonus) lines.push(`Catch Bonus: +${breakdown.catchBonus}`);
  if (breakdown.stumpings) lines.push(`Stumpings: +${breakdown.stumpings}`);
  if (breakdown.directRunouts) lines.push(`Direct Run-outs: +${breakdown.directRunouts}`);
  if (breakdown.indirectRunouts) lines.push(`Indirect Run-outs: +${breakdown.indirectRunouts}`);

  return lines;
}
