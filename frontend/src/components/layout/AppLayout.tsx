import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useGame } from '../../context/GameContext';

interface AppLayoutProps {
  children: ReactNode;
}

// User Avatar Dropdown Component
function UserDropdown({ user, onLogout }: { user: { name?: string; email?: string; avatarUrl?: string | null; teamName?: string } | null; onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--accent-gold)] to-[var(--accent-gold-dim)] flex items-center justify-center text-sm font-bold text-[var(--bg-deep)]">
          {initials}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {user?.teamName || user?.name || 'User'}
          </p>
        </div>
        <svg className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-secondary)] border border-[var(--glass-border)] rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in">
          <div className="p-4 border-b border-[var(--glass-border)]">
            <p className="text-sm font-medium text-[var(--text-primary)]">{user?.name}</p>
            <p className="text-xs text-[var(--text-tertiary)] truncate">{user?.email}</p>
          </div>
          <div className="p-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full text-left px-3 py-2 text-sm text-[var(--accent-red)] hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface NavItem {
  label: string;
  path: string;
  icon: ReactNode;
  requiresGame?: boolean;
  requiresAuctionStarted?: boolean;
  requiresAuctionEnded?: boolean;
}

interface NavSection {
  header: string;
  items: NavItem[];
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { currentGame, clearGame } = useGame();

  const gameId = currentGame?.id;
  const isCreator = currentGame?.createdById === user?.id;
  const auctionStarted = currentGame && currentGame.status !== 'pre_auction';
  const auctionEnded = currentGame && ['auction_ended', 'scoring', 'completed'].includes(currentGame.status);

  const handleLogout = () => {
    clearGame();
    logout();
    navigate('/login');
  };

  const handleExitGame = () => {
    clearGame();
    navigate('/home');
  };

  // Build navigation sections
  const NAV_SECTIONS: NavSection[] = [
    {
      header: 'Home',
      items: [
        {
          label: 'My Games',
          path: '/home',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          ),
        },
      ],
    },
    {
      header: 'Pre-Auction',
      items: [
        {
          label: 'Setup',
          path: gameId ? `/game/${gameId}/setup` : '#',
          requiresGame: true,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
          ),
        },
        {
          label: 'Points',
          path: gameId ? `/game/${gameId}/points` : '#',
          requiresGame: true,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
          ),
        },
      ],
    },
    {
      header: 'Auction',
      items: [
        {
          label: 'Live',
          path: gameId ? `/game/${gameId}/live` : '#',
          requiresGame: true,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
          ),
        },
        {
          label: 'List',
          path: gameId ? `/game/${gameId}/list` : '#',
          requiresGame: true,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          ),
        },
        {
          label: 'Results',
          path: gameId ? `/game/${gameId}/results` : '#',
          requiresGame: true,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-2.927 0" />
            </svg>
          ),
        },
      ],
    },
    {
      header: 'Post-Auction',
      items: [
        {
          label: 'Dash',
          path: gameId ? `/game/${gameId}/dash` : '#',
          requiresGame: true,
          requiresAuctionEnded: true,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          ),
        },
        {
          label: 'Leaderboard',
          path: gameId ? `/game/${gameId}/leaderboard` : '#',
          requiresGame: true,
          requiresAuctionEnded: true,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25" />
            </svg>
          ),
        },
      ],
    },
    {
      header: 'Subs',
      items: [
        {
          label: 'Subs',
          path: gameId ? `/game/${gameId}/subs` : '#',
          requiresGame: true,
          requiresAuctionEnded: true,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          ),
        },
      ],
    },
  ];

  const isActivePath = (path: string) => {
    if (path === '#') return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isItemDisabled = (item: NavItem) => {
    if (item.requiresGame && !currentGame) return true;
    if (item.requiresAuctionStarted && !auctionStarted) return true;
    if (item.requiresAuctionEnded && !auctionEnded) return true;
    return false;
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--glass-border)] flex flex-col fixed h-full z-40">
        {/* Logo / Game Info */}
        <div className="p-4 border-b border-[var(--glass-border)]">
          {currentGame ? (
            <div>
              <button
                onClick={handleExitGame}
                className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                <span className="text-xs">Exit Game</span>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-gold)]/20 flex items-center justify-center">
                  <span className="text-lg">{currentGame.logoUrl || '🏏'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {currentGame.name}
                  </h1>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {isCreator ? 'Auctioneer' : 'Player'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-gold)]/20 flex items-center justify-center">
                <span className="text-lg">🏏</span>
              </div>
              <h1 className="text-lg font-display text-[var(--text-primary)]">
                Fantasy IPL
              </h1>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          {NAV_SECTIONS.map((section) => (
            <div key={section.header} className="mb-6">
              <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 px-3">
                {section.header}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = isActivePath(item.path);
                  const isDisabled = isItemDisabled(item);
                  const itemKey = `${section.header}-${item.label}`;

                  if (isDisabled) {
                    return (
                      <div
                        key={itemKey}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-muted)] cursor-not-allowed opacity-40"
                        title={item.requiresGame ? 'Join or create a game first' : 'Available after auction ends'}
                      >
                        <span className="opacity-50">{item.icon}</span>
                        {item.label}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={itemKey}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border-l-2 border-[var(--accent-gold)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                    >
                      <span className={isActive ? 'text-[var(--accent-gold)]' : 'opacity-70'}>
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="h-16 bg-[var(--bg-secondary)]/80 backdrop-blur-md border-b border-[var(--glass-border)] sticky top-0 z-30">
          <div className="h-full px-6 flex items-center justify-end">
            <UserDropdown user={user} onLogout={handleLogout} />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
