# Fantasy IPL Auction League

A real-time web application for managing an auction-based fantasy IPL cricket league with 8 players (7 players + 1 auctioneer).

## Features

- **Real-time Auction**: WebSocket-powered live bidding with synchronized timers
- **User Authentication**: JWT-based authentication with player and auctioneer roles
- **Team Management**: Build your dream team of 11 cricketers with budget constraints
- **Score Tracking**: Enter match scores and calculate fantasy points automatically
- **Substitutions**: Snake-draft style substitution system between rounds
- **Reports**: Generate PDF reports with rankings, charts, and fun stats

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- TailwindCSS for styling
- Socket.io-client for real-time updates
- Chart.js for visualizations
- React Router for navigation

### Backend
- Node.js with Express
- TypeScript
- Socket.io for WebSockets
- Prisma ORM with PostgreSQL
- JWT for authentication
- PDFKit for report generation
- Nodemailer for emails

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm or yarn

### Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE fantasy_ipl;
```

2. Update the `.env` file in the backend directory with your database URL.

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your database URL and JWT secret

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with sample data
npm run db:seed

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`.

## Default Login Credentials (After Seeding)

### Auctioneer
- Email: `auctioneer@fantasy-ipl.com`
- Password: `auctioneer123`

### Players
- Email: `player1@fantasy-ipl.com` through `player7@fantasy-ipl.com`
- Password: `player123`

## Application Modes

### 1. Pre-Auction Mode
- User registration and login
- Team name and avatar setup
- Auctioneer uploads cricketer database (CSV)
- Set auction order

### 2. Auction Mode
- Real-time bidding with 60-second timers
- Budget and team composition validation
- Auctioneer controls (start, pause, skip, add time)
- Live bid updates via WebSocket

### 3. Scoring Mode
- Create matches
- Enter player scores
- Automatic points calculation
- Manual or auto-populate from Cricinfo (if available)

### 4. Substitutions Mode
- Snake-draft order based on rankings
- Round 1: 8th → 1st place
- Round 2: 1st → 8th place
- Team composition validation

### 5. Reports Mode
- Generate match reports
- Rankings table with position changes
- Points progression chart
- Fun stats (top scorer, best value, etc.)
- PDF download
- Email to all players

## Points System

### Batting
- Playing XI: +4
- Runs: +1 per run
- Fours: +4 per four
- Sixes: +6 per six
- 25 runs: +4 bonus
- 50 runs: +8 bonus
- 75 runs: +12 bonus
- 100 runs: +16 bonus
- Duck: -2 (if out for 0)
- Strike Rate (min 10 balls):
  - ≥170: +6
  - 150-169: +4
  - 130-149: +2

### Bowling
- Wickets: +25 per wicket
- LBW/Bowled: +8 per dismissal
- Maidens: +6 per maiden
- Dot balls: +1 per dot
- 3 wickets: +4 bonus
- 4 wickets: +8 bonus
- 5 wickets: +12 bonus
- Economy (min 2 overs):
  - <5: +6
  - 5-5.99: +4
  - 6-6.99: +2

### Fielding
- Catches: +8 per catch
- 3+ catches: +4 bonus
- Stumpings: +12 per stumping
- Direct run-out: +12
- Indirect run-out: +6

## CSV Format for Cricketer Upload

```csv
first_name,last_name,player_type,is_foreign,ipl_team,batting_avg,batting_sr,bowling_avg,bowling_econ
Virat,Kohli,batsman,false,Royal Challengers Bengaluru,37.25,130.02,,
Jasprit,Bumrah,bowler,false,Mumbai Indians,,,24.32,7.41
Andre,Russell,allrounder,true,Kolkata Knight Riders,29.15,177.88,24.65,9.31
```

## Project Structure

```
fantasy-ipl/
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context providers
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── ...
├── backend/
│   ├── src/
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic
│   │   ├── socket/         # Socket.io handlers
│   │   ├── middleware/     # Express middleware
│   │   └── utils/          # Utility functions
│   └── prisma/
│       └── schema.prisma   # Database schema
└── README.md
```

## Deployment

### Frontend (Vercel/Netlify)
1. Connect your repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variable: `VITE_API_URL`

### Backend (Railway/Render)
1. Connect your repository
2. Set start command: `npm run start`
3. Add environment variables from `.env`
4. Provision PostgreSQL database

## License

MIT
