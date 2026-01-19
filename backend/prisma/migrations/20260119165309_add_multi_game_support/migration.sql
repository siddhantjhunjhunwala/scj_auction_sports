-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('pre_auction', 'auction_active', 'auction_paused', 'auction_ended', 'scoring', 'completed');

-- CreateTable
CREATE TABLE "games" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'pre_auction',
    "joiningAllowed" BOOLEAN NOT NULL DEFAULT true,
    "cricketersUploaded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_participants" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "budgetRemaining" DOUBLE PRECISION NOT NULL DEFAULT 200.00,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_cricketers" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "playerType" "PlayerType" NOT NULL,
    "isForeign" BOOLEAN NOT NULL DEFAULT false,
    "iplTeam" TEXT NOT NULL,
    "battingRecord" JSONB,
    "bowlingRecord" JSONB,
    "pictureUrl" TEXT,
    "isPicked" BOOLEAN NOT NULL DEFAULT false,
    "pickedByParticipantId" TEXT,
    "pricePaid" DOUBLE PRECISION,
    "pickOrder" INTEGER,
    "wasSkipped" BOOLEAN NOT NULL DEFAULT false,
    "auctionOrder" INTEGER,

    CONSTRAINT "game_cricketers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_auction_states" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "currentCricketerId" TEXT,
    "auctionStatus" "AuctionStatus" NOT NULL DEFAULT 'not_started',
    "timerEndTime" TIMESTAMP(3),
    "timerPausedAt" TIMESTAMP(3),
    "currentHighBid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentHighBidderId" TEXT,
    "isFirstRound" BOOLEAN NOT NULL DEFAULT true,
    "currentBiddingLog" JSONB NOT NULL DEFAULT '[]',
    "lastWinMessage" TEXT,

    CONSTRAINT "game_auction_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_bids" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "cricketerId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_matches" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "team1" TEXT NOT NULL,
    "team2" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "scoresPopulated" BOOLEAN NOT NULL DEFAULT false,
    "isAutoPopulated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "game_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_player_match_scores" (
    "id" TEXT NOT NULL,
    "gameMatchId" TEXT NOT NULL,
    "cricketerId" TEXT NOT NULL,
    "inPlayingXi" BOOLEAN NOT NULL DEFAULT true,
    "runs" INTEGER NOT NULL DEFAULT 0,
    "ballsFaced" INTEGER NOT NULL DEFAULT 0,
    "fours" INTEGER NOT NULL DEFAULT 0,
    "sixes" INTEGER NOT NULL DEFAULT 0,
    "wickets" INTEGER NOT NULL DEFAULT 0,
    "oversBowled" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "runsConceded" INTEGER NOT NULL DEFAULT 0,
    "maidens" INTEGER NOT NULL DEFAULT 0,
    "dotBalls" INTEGER NOT NULL DEFAULT 0,
    "catches" INTEGER NOT NULL DEFAULT 0,
    "stumpings" INTEGER NOT NULL DEFAULT 0,
    "directRunouts" INTEGER NOT NULL DEFAULT 0,
    "indirectRunouts" INTEGER NOT NULL DEFAULT 0,
    "dismissalType" TEXT,
    "lbwBowledDismissals" INTEGER NOT NULL DEFAULT 0,
    "calculatedPoints" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "game_player_match_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "point_system_configs" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "runPoints" INTEGER NOT NULL DEFAULT 1,
    "fourBonus" INTEGER NOT NULL DEFAULT 4,
    "sixBonus" INTEGER NOT NULL DEFAULT 6,
    "runs25Bonus" INTEGER NOT NULL DEFAULT 4,
    "runs50Bonus" INTEGER NOT NULL DEFAULT 8,
    "runs75Bonus" INTEGER NOT NULL DEFAULT 12,
    "runs100Bonus" INTEGER NOT NULL DEFAULT 16,
    "duckPenalty" INTEGER NOT NULL DEFAULT -2,
    "sr130Bonus" INTEGER NOT NULL DEFAULT 2,
    "sr150Bonus" INTEGER NOT NULL DEFAULT 4,
    "sr170Bonus" INTEGER NOT NULL DEFAULT 6,
    "wicketPoints" INTEGER NOT NULL DEFAULT 25,
    "lbwBowledBonus" INTEGER NOT NULL DEFAULT 8,
    "maidenPoints" INTEGER NOT NULL DEFAULT 6,
    "dotBallPoints" INTEGER NOT NULL DEFAULT 1,
    "wickets3Bonus" INTEGER NOT NULL DEFAULT 4,
    "wickets4Bonus" INTEGER NOT NULL DEFAULT 8,
    "wickets5Bonus" INTEGER NOT NULL DEFAULT 12,
    "econ5Bonus" INTEGER NOT NULL DEFAULT 6,
    "econ6Bonus" INTEGER NOT NULL DEFAULT 4,
    "econ7Bonus" INTEGER NOT NULL DEFAULT 2,
    "catchPoints" INTEGER NOT NULL DEFAULT 8,
    "catches3Bonus" INTEGER NOT NULL DEFAULT 4,
    "stumpingPoints" INTEGER NOT NULL DEFAULT 12,
    "directRunout" INTEGER NOT NULL DEFAULT 12,
    "indirectRunout" INTEGER NOT NULL DEFAULT 6,
    "playingXiBonus" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "point_system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_code_key" ON "games"("code");

-- CreateIndex
CREATE UNIQUE INDEX "game_participants_gameId_userId_key" ON "game_participants"("gameId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "game_auction_states_gameId_key" ON "game_auction_states"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "game_auction_states_currentCricketerId_key" ON "game_auction_states"("currentCricketerId");

-- CreateIndex
CREATE UNIQUE INDEX "game_matches_gameId_matchNumber_key" ON "game_matches"("gameId", "matchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "game_player_match_scores_gameMatchId_cricketerId_key" ON "game_player_match_scores"("gameMatchId", "cricketerId");

-- CreateIndex
CREATE UNIQUE INDEX "point_system_configs_gameId_key" ON "point_system_configs"("gameId");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_participants" ADD CONSTRAINT "game_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_cricketers" ADD CONSTRAINT "game_cricketers_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_cricketers" ADD CONSTRAINT "game_cricketers_pickedByParticipantId_fkey" FOREIGN KEY ("pickedByParticipantId") REFERENCES "game_participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_auction_states" ADD CONSTRAINT "game_auction_states_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_auction_states" ADD CONSTRAINT "game_auction_states_currentCricketerId_fkey" FOREIGN KEY ("currentCricketerId") REFERENCES "game_cricketers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_bids" ADD CONSTRAINT "game_bids_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_bids" ADD CONSTRAINT "game_bids_cricketerId_fkey" FOREIGN KEY ("cricketerId") REFERENCES "game_cricketers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_bids" ADD CONSTRAINT "game_bids_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "game_participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_player_match_scores" ADD CONSTRAINT "game_player_match_scores_gameMatchId_fkey" FOREIGN KEY ("gameMatchId") REFERENCES "game_matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_player_match_scores" ADD CONSTRAINT "game_player_match_scores_cricketerId_fkey" FOREIGN KEY ("cricketerId") REFERENCES "game_cricketers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "point_system_configs" ADD CONSTRAINT "point_system_configs_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
