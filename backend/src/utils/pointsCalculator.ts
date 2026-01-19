interface ScoreData {
  inPlayingXi?: boolean;
  runs?: number;
  ballsFaced?: number;
  fours?: number;
  sixes?: number;
  wickets?: number;
  oversBowled?: number;
  runsConceded?: number;
  maidens?: number;
  dotBalls?: number;
  catches?: number;
  stumpings?: number;
  directRunouts?: number;
  indirectRunouts?: number;
  dismissalType?: string | null;
  lbwBowledDismissals?: number;
}

export function calculatePoints(score: ScoreData): number {
  let total = 0;

  // Playing XI bonus
  if (score.inPlayingXi) {
    total += 4;
  }

  // Batting points
  const runs = score.runs || 0;
  const ballsFaced = score.ballsFaced || 0;
  const fours = score.fours || 0;
  const sixes = score.sixes || 0;

  total += runs * 1;
  total += fours * 4;
  total += sixes * 6;

  // Runs bonus (exclusive tiers)
  if (runs >= 100) {
    total += 16;
  } else if (runs >= 75) {
    total += 12;
  } else if (runs >= 50) {
    total += 8;
  } else if (runs >= 25) {
    total += 4;
  }

  // Duck penalty
  if (runs === 0 && score.dismissalType && ballsFaced > 0) {
    total -= 2;
  }

  // Strike rate bonus (minimum 10 balls faced)
  if (ballsFaced >= 10) {
    const strikeRate = (runs / ballsFaced) * 100;
    if (strikeRate >= 170) {
      total += 6;
    } else if (strikeRate >= 150) {
      total += 4;
    } else if (strikeRate >= 130) {
      total += 2;
    }
  }

  // Bowling points
  const wickets = score.wickets || 0;
  const oversBowled = score.oversBowled || 0;
  const runsConceded = score.runsConceded || 0;
  const maidens = score.maidens || 0;
  const dotBalls = score.dotBalls || 0;
  const lbwBowledDismissals = score.lbwBowledDismissals || 0;

  total += wickets * 25;
  total += lbwBowledDismissals * 8;
  total += maidens * 6;
  total += dotBalls * 1;

  // Wickets bonus (exclusive tiers)
  if (wickets >= 5) {
    total += 12;
  } else if (wickets >= 4) {
    total += 8;
  } else if (wickets >= 3) {
    total += 4;
  }

  // Economy bonus (minimum 2 overs)
  if (oversBowled >= 2) {
    const economy = runsConceded / oversBowled;
    if (economy < 5) {
      total += 6;
    } else if (economy < 6) {
      total += 4;
    } else if (economy < 7) {
      total += 2;
    }
  }

  // Fielding points
  const catches = score.catches || 0;
  const stumpings = score.stumpings || 0;
  const directRunouts = score.directRunouts || 0;
  const indirectRunouts = score.indirectRunouts || 0;

  total += catches * 8;
  if (catches >= 3) {
    total += 4;
  }
  total += stumpings * 12;
  total += directRunouts * 12;
  total += indirectRunouts * 6;

  return total;
}
