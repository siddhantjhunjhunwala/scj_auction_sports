-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('player', 'auctioneer');

-- CreateEnum
CREATE TYPE "PlayerType" AS ENUM ('batsman', 'bowler', 'wicketkeeper', 'allrounder');

-- CreateEnum
CREATE TYPE "AuctionStatus" AS ENUM ('not_started', 'in_progress', 'paused', 'completed');

-- CreateEnum
CREATE TYPE "LeagueMode" AS ENUM ('pre_auction', 'auction', 'scoring', 'subs', 'report');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "teamName" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'player',
    "budgetRemaining" DOUBLE PRECISION NOT NULL DEFAULT 200.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cricketers" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "playerType" "PlayerType" NOT NULL,
    "isForeign" BOOLEAN NOT NULL DEFAULT false,
    "iplTeam" TEXT NOT NULL,
    "battingRecord" JSONB,
    "bowlingRecord" JSONB,
    "pictureUrl" TEXT,
    "newsArticles" JSONB DEFAULT '[]',
    "isPicked" BOOLEAN NOT NULL DEFAULT false,
    "pickedByUserId" TEXT,
    "pricePaid" DOUBLE PRECISION,
    "pickOrder" INTEGER,
    "wasSkipped" BOOLEAN NOT NULL DEFAULT false,
    "auctionOrder" INTEGER,

    CONSTRAINT "cricketers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" TEXT NOT NULL,
    "cricketerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "team1" TEXT NOT NULL,
    "team2" TEXT NOT NULL,
    "matchDate" TIMESTAMP(3) NOT NULL,
    "scoresPopulated" BOOLEAN NOT NULL DEFAULT false,
    "isAutoPopulated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_match_scores" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
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

    CONSTRAINT "player_match_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "substitutions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subOutCricketerId" TEXT NOT NULL,
    "subInCricketerId" TEXT NOT NULL,
    "subRound" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "substitutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_state" (
    "id" TEXT NOT NULL,
    "currentCricketerId" TEXT,
    "auctionStatus" "AuctionStatus" NOT NULL DEFAULT 'not_started',
    "timerEndTime" TIMESTAMP(3),
    "timerPausedAt" TIMESTAMP(3),
    "currentHighBid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentHighBidderId" TEXT,
    "isFirstRound" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "auction_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_state" (
    "id" TEXT NOT NULL,
    "mode" "LeagueMode" NOT NULL DEFAULT 'pre_auction',
    "subsPeriodActive" BOOLEAN NOT NULL DEFAULT false,
    "currentSubUserId" TEXT,
    "currentSubRound" INTEGER,

    CONSTRAINT "league_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "matches_matchNumber_key" ON "matches"("matchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "player_match_scores_matchId_cricketerId_key" ON "player_match_scores"("matchId", "cricketerId");

-- CreateIndex
CREATE UNIQUE INDEX "auction_state_currentCricketerId_key" ON "auction_state"("currentCricketerId");

-- CreateIndex
CREATE UNIQUE INDEX "auction_state_currentHighBidderId_key" ON "auction_state"("currentHighBidderId");

-- CreateIndex
CREATE UNIQUE INDEX "league_state_currentSubUserId_key" ON "league_state"("currentSubUserId");

-- AddForeignKey
ALTER TABLE "cricketers" ADD CONSTRAINT "cricketers_pickedByUserId_fkey" FOREIGN KEY ("pickedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_cricketerId_fkey" FOREIGN KEY ("cricketerId") REFERENCES "cricketers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_scores" ADD CONSTRAINT "player_match_scores_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_scores" ADD CONSTRAINT "player_match_scores_cricketerId_fkey" FOREIGN KEY ("cricketerId") REFERENCES "cricketers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_subOutCricketerId_fkey" FOREIGN KEY ("subOutCricketerId") REFERENCES "cricketers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "substitutions" ADD CONSTRAINT "substitutions_subInCricketerId_fkey" FOREIGN KEY ("subInCricketerId") REFERENCES "cricketers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_state" ADD CONSTRAINT "auction_state_currentCricketerId_fkey" FOREIGN KEY ("currentCricketerId") REFERENCES "cricketers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_state" ADD CONSTRAINT "auction_state_currentHighBidderId_fkey" FOREIGN KEY ("currentHighBidderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_state" ADD CONSTRAINT "league_state_currentSubUserId_fkey" FOREIGN KEY ("currentSubUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
