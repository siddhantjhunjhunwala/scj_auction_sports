import { Link, useLocation } from 'react-router-dom';

type AuctionStatus = 'not_started' | 'in_progress' | 'paused' | 'completed';
type GameStatus = 'pre_auction' | 'auction_active' | 'auction_paused' | 'auction_ended' | 'scoring' | 'completed';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  showWhen: AuctionStatus[];
  creatorOnly?: boolean;
}

interface Props {
  gameId: string;
  auctionStatus?: AuctionStatus;
  gameStatus?: GameStatus;
  isCreator: boolean;
}

// Map game status to auction status for navigation purposes
function mapGameStatusToAuctionStatus(gameStatus: GameStatus): AuctionStatus {
  switch (gameStatus) {
    case 'pre_auction':
      return 'not_started';
    case 'auction_active':
      return 'in_progress';
    case 'auction_paused':
      return 'paused';
    case 'auction_ended':
    case 'scoring':
    case 'completed':
      return 'completed';
    default:
      return 'not_started';
  }
}

export default function AuctionNavigation({ gameId, auctionStatus, gameStatus, isCreator }: Props) {
  const location = useLocation();

  // Determine the effective auction status
  const effectiveStatus: AuctionStatus = auctionStatus || (gameStatus ? mapGameStatusToAuctionStatus(gameStatus) : 'not_started');

  const navItems: NavItem[] = [
    {
      label: 'Lobby',
      path: `/game/${gameId}/lobby`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
      showWhen: ['not_started', 'paused', 'completed'],
    },
    {
      label: 'Auction',
      path: `/game/${gameId}/auction`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ),
      showWhen: ['not_started', 'in_progress', 'paused', 'completed'],
    },
    {
      label: 'Players',
      path: `/game/${gameId}/players`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      showWhen: ['not_started', 'paused', 'completed'],
    },
    {
      label: 'My Team',
      path: `/game/${gameId}/dashboard`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      showWhen: ['not_started', 'in_progress', 'paused', 'completed'],
    },
    {
      label: 'Leaderboard',
      path: `/game/${gameId}/leaderboard`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 21V11M16 21V7M12 21V15M4 21h16" />
        </svg>
      ),
      showWhen: ['paused', 'completed'],
    },
    {
      label: 'Scoring',
      path: `/game/${gameId}/scoring`,
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      showWhen: ['completed'],
      creatorOnly: true,
    },
  ];

  const visibleItems = navItems.filter(
    item =>
      item.showWhen.includes(effectiveStatus) &&
      (!item.creatorOnly || isCreator)
  );

  // Don't show navigation if only one item would be visible
  if (visibleItems.length <= 1) return null;

  return (
    <nav className="mb-6">
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)]/80 backdrop-blur-sm border border-[var(--glass-border)]">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm font-medium
                  transition-all duration-200
                  ${isActive
                    ? 'bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white shadow-lg shadow-[var(--accent-purple)]/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }
                `}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Status indicator */}
      <div className="flex justify-center mt-3">
        <div className={`
          inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium
          ${effectiveStatus === 'in_progress'
            ? 'bg-[var(--accent-emerald)]/10 text-[var(--accent-emerald)] border border-[var(--accent-emerald)]/30'
            : effectiveStatus === 'paused'
            ? 'bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30'
            : effectiveStatus === 'completed'
            ? 'bg-[var(--accent-purple)]/10 text-[var(--accent-purple)] border border-[var(--accent-purple)]/30'
            : 'bg-[var(--bg-tertiary)] text-[var(--text-tertiary)] border border-[var(--glass-border)]'
          }
        `}>
          <span className={`
            w-2 h-2 rounded-full
            ${effectiveStatus === 'in_progress'
              ? 'bg-[var(--accent-emerald)] animate-pulse'
              : effectiveStatus === 'paused'
              ? 'bg-[var(--accent-gold)]'
              : effectiveStatus === 'completed'
              ? 'bg-[var(--accent-purple)]'
              : 'bg-[var(--text-muted)]'
            }
          `} />
          {effectiveStatus === 'in_progress' && 'Auction Live'}
          {effectiveStatus === 'paused' && 'Auction Paused'}
          {effectiveStatus === 'completed' && 'Auction Ended'}
          {effectiveStatus === 'not_started' && 'Waiting to Start'}
        </div>
      </div>
    </nav>
  );
}
