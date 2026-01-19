import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create auctioneer user
  const auctioneerPassword = await bcrypt.hash('auctioneer123', 10);
  const auctioneer = await prisma.user.upsert({
    where: { email: 'auctioneer@fantasy-ipl.com' },
    update: {},
    create: {
      email: 'auctioneer@fantasy-ipl.com',
      password: auctioneerPassword,
      name: 'Auctioneer',
      teamName: 'Auction House',
      role: 'auctioneer',
    },
  });
  console.log('Created auctioneer:', auctioneer.email);

  // Create player users
  const playerPassword = await bcrypt.hash('player123', 10);
  const playerNames = [
    { name: 'Rahul Sharma', teamName: 'Chennai Champions' },
    { name: 'Priya Patel', teamName: 'Mumbai Mavericks' },
    { name: 'Vikram Singh', teamName: 'Bangalore Blazers' },
    { name: 'Neha Gupta', teamName: 'Delhi Daredevils' },
    { name: 'Arjun Reddy', teamName: 'Hyderabad Hawks' },
    { name: 'Sneha Kumar', teamName: 'Kolkata Kings' },
    { name: 'Aditya Verma', teamName: 'Rajasthan Royals' },
  ];

  for (let i = 0; i < playerNames.length; i++) {
    const player = await prisma.user.upsert({
      where: { email: `player${i + 1}@fantasy-ipl.com` },
      update: {},
      create: {
        email: `player${i + 1}@fantasy-ipl.com`,
        password: playerPassword,
        name: playerNames[i].name,
        teamName: playerNames[i].teamName,
        role: 'player',
        budgetRemaining: 200,
      },
    });
    console.log('Created player:', player.email);
  }

  // Create sample cricketers
  const sampleCricketers = [
    // Batsmen
    { firstName: 'Virat', lastName: 'Kohli', playerType: 'batsman', isForeign: false, iplTeam: 'Royal Challengers Bengaluru', battingRecord: { average: 37.25, strikeRate: 130.02 } },
    { firstName: 'Rohit', lastName: 'Sharma', playerType: 'batsman', isForeign: false, iplTeam: 'Mumbai Indians', battingRecord: { average: 31.17, strikeRate: 130.62 } },
    { firstName: 'Shubman', lastName: 'Gill', playerType: 'batsman', isForeign: false, iplTeam: 'Gujarat Titans', battingRecord: { average: 35.50, strikeRate: 128.45 } },
    { firstName: 'Faf', lastName: 'du Plessis', playerType: 'batsman', isForeign: true, iplTeam: 'Royal Challengers Bengaluru', battingRecord: { average: 34.75, strikeRate: 135.20 } },
    { firstName: 'David', lastName: 'Warner', playerType: 'batsman', isForeign: true, iplTeam: 'Delhi Capitals', battingRecord: { average: 42.10, strikeRate: 139.85 } },
    { firstName: 'Jos', lastName: 'Buttler', playerType: 'batsman', isForeign: true, iplTeam: 'Rajasthan Royals', battingRecord: { average: 38.95, strikeRate: 150.12 } },

    // Bowlers
    { firstName: 'Jasprit', lastName: 'Bumrah', playerType: 'bowler', isForeign: false, iplTeam: 'Mumbai Indians', bowlingRecord: { average: 24.32, economy: 7.41 } },
    { firstName: 'Mohammed', lastName: 'Shami', playerType: 'bowler', isForeign: false, iplTeam: 'Gujarat Titans', bowlingRecord: { average: 27.18, economy: 8.12 } },
    { firstName: 'Yuzvendra', lastName: 'Chahal', playerType: 'bowler', isForeign: false, iplTeam: 'Rajasthan Royals', bowlingRecord: { average: 22.85, economy: 7.65 } },
    { firstName: 'Rashid', lastName: 'Khan', playerType: 'bowler', isForeign: true, iplTeam: 'Gujarat Titans', bowlingRecord: { average: 21.45, economy: 6.55 } },
    { firstName: 'Trent', lastName: 'Boult', playerType: 'bowler', isForeign: true, iplTeam: 'Rajasthan Royals', bowlingRecord: { average: 28.92, economy: 8.25 } },

    // All-rounders
    { firstName: 'Hardik', lastName: 'Pandya', playerType: 'allrounder', isForeign: false, iplTeam: 'Mumbai Indians', battingRecord: { average: 28.50, strikeRate: 147.25 }, bowlingRecord: { average: 30.15, economy: 8.85 } },
    { firstName: 'Ravindra', lastName: 'Jadeja', playerType: 'allrounder', isForeign: false, iplTeam: 'Chennai Super Kings', battingRecord: { average: 26.32, strikeRate: 130.45 }, bowlingRecord: { average: 29.75, economy: 7.62 } },
    { firstName: 'Andre', lastName: 'Russell', playerType: 'allrounder', isForeign: true, iplTeam: 'Kolkata Knight Riders', battingRecord: { average: 29.15, strikeRate: 177.88 }, bowlingRecord: { average: 24.65, economy: 9.31 } },
    { firstName: 'Glenn', lastName: 'Maxwell', playerType: 'allrounder', isForeign: true, iplTeam: 'Royal Challengers Bengaluru', battingRecord: { average: 24.85, strikeRate: 155.32 }, bowlingRecord: { average: 35.42, economy: 8.15 } },

    // Wicketkeepers
    { firstName: 'Rishabh', lastName: 'Pant', playerType: 'wicketkeeper', isForeign: false, iplTeam: 'Delhi Capitals', battingRecord: { average: 35.12, strikeRate: 147.85 } },
    { firstName: 'MS', lastName: 'Dhoni', playerType: 'wicketkeeper', isForeign: false, iplTeam: 'Chennai Super Kings', battingRecord: { average: 39.58, strikeRate: 135.92 } },
    { firstName: 'KL', lastName: 'Rahul', playerType: 'wicketkeeper', isForeign: false, iplTeam: 'Lucknow Super Giants', battingRecord: { average: 47.25, strikeRate: 135.12 } },
    { firstName: 'Quinton', lastName: 'de Kock', playerType: 'wicketkeeper', isForeign: true, iplTeam: 'Lucknow Super Giants', battingRecord: { average: 32.85, strikeRate: 140.25 } },

    // More batsmen to fill pool
    { firstName: 'Ruturaj', lastName: 'Gaikwad', playerType: 'batsman', isForeign: false, iplTeam: 'Chennai Super Kings', battingRecord: { average: 42.15, strikeRate: 133.42 } },
    { firstName: 'Yashasvi', lastName: 'Jaiswal', playerType: 'batsman', isForeign: false, iplTeam: 'Rajasthan Royals', battingRecord: { average: 38.75, strikeRate: 145.32 } },
    { firstName: 'Devdutt', lastName: 'Padikkal', playerType: 'batsman', isForeign: false, iplTeam: 'Rajasthan Royals', battingRecord: { average: 31.25, strikeRate: 125.85 } },
    { firstName: 'Suryakumar', lastName: 'Yadav', playerType: 'batsman', isForeign: false, iplTeam: 'Mumbai Indians', battingRecord: { average: 32.45, strikeRate: 145.75 } },

    // More bowlers
    { firstName: 'Kuldeep', lastName: 'Yadav', playerType: 'bowler', isForeign: false, iplTeam: 'Delhi Capitals', bowlingRecord: { average: 25.85, economy: 7.92 } },
    { firstName: 'Arshdeep', lastName: 'Singh', playerType: 'bowler', isForeign: false, iplTeam: 'Punjab Kings', bowlingRecord: { average: 28.45, economy: 8.65 } },
    { firstName: 'Mohammed', lastName: 'Siraj', playerType: 'bowler', isForeign: false, iplTeam: 'Royal Challengers Bengaluru', bowlingRecord: { average: 26.75, economy: 8.42 } },
  ];

  let order = 1;
  for (const cricketer of sampleCricketers) {
    await prisma.cricketer.upsert({
      where: {
        id: `seed-${cricketer.firstName.toLowerCase()}-${cricketer.lastName.toLowerCase()}`,
      },
      update: {},
      create: {
        id: `seed-${cricketer.firstName.toLowerCase()}-${cricketer.lastName.toLowerCase()}`,
        firstName: cricketer.firstName,
        lastName: cricketer.lastName,
        playerType: cricketer.playerType as 'batsman' | 'bowler' | 'wicketkeeper' | 'allrounder',
        isForeign: cricketer.isForeign,
        iplTeam: cricketer.iplTeam,
        battingRecord: cricketer.battingRecord || null,
        bowlingRecord: cricketer.bowlingRecord || null,
        auctionOrder: order++,
      },
    });
  }
  console.log(`Created ${sampleCricketers.length} cricketers`);

  // Create initial auction state
  await prisma.auctionState.upsert({
    where: { id: 'default-auction-state' },
    update: {},
    create: {
      id: 'default-auction-state',
      auctionStatus: 'not_started',
    },
  });
  console.log('Created auction state');

  // Create initial league state
  await prisma.leagueState.upsert({
    where: { id: 'default-league-state' },
    update: {},
    create: {
      id: 'default-league-state',
      mode: 'pre_auction',
    },
  });
  console.log('Created league state');

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
