import type { Cricketer } from '../../types';

interface CricketerCardProps {
  cricketer: Cricketer;
  showPrice?: boolean;
  variant?: 'default' | 'compact';
}

const getPlayerTypeConfig = (type: string) => {
  const configs: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
    batsman: { label: 'Batsman', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
    bowler: { label: 'Bowler', color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
    allrounder: { label: 'All-Rounder', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
    wicketkeeper: { label: 'Wicketkeeper', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  };
  return configs[type] || configs.batsman;
};

export default function CricketerCard({ cricketer, showPrice, variant = 'default' }: CricketerCardProps) {
  const fullName = `${cricketer.firstName} ${cricketer.lastName}`;
  const typeConfig = getPlayerTypeConfig(cricketer.playerType);

  if (variant === 'compact') {
    return (
      <div className="cricketer-card card-holographic p-4">
        <div className="flex items-center gap-3">
          {/* Player Image */}
          <div className="w-12 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-slate-800">
            {cricketer.pictureUrl ? (
              <img src={cricketer.pictureUrl} alt={fullName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">{fullName}</p>
            <p className="text-slate-500 text-sm">{cricketer.iplTeam}</p>
          </div>
          {showPrice && cricketer.pricePaid && (
            <span className="text-amber-400 font-mono font-bold">${cricketer.pricePaid.toFixed(0)}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="cricketer-card card-holographic overflow-hidden">
      {/* Card Header - Player Type Stripe */}
      <div className={`h-1 ${typeConfig.bgColor.replace('/10', '')}`} />

      <div className="p-6">
        {/* Top Section - Image & Basic Info */}
        <div className="flex gap-5">
          {/* Player Image */}
          <div className="relative">
            <div className="w-28 h-28 rounded-xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 ring-2 ring-white/10">
              {cricketer.pictureUrl ? (
                <img
                  src={cricketer.pictureUrl}
                  alt={fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-16 h-16 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
              )}
            </div>
            {/* Foreign Badge */}
            {cricketer.isForeign && (
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
              </div>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-2xl font-display text-white tracking-wide truncate">
              {fullName}
            </h3>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`badge ${typeConfig.bgColor} ${typeConfig.borderColor} ${typeConfig.color}`}>
                {typeConfig.label}
              </span>
              <span className="badge bg-white/5 border border-white/10 text-slate-400">
                {cricketer.iplTeam}
              </span>
            </div>

            {showPrice && cricketer.pricePaid !== null && cricketer.pricePaid !== undefined && (
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-display text-amber-400">
                  ${cricketer.pricePaid.toFixed(0)}
                </span>
                <span className="text-sm text-slate-500">paid</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          {/* Batting Stats */}
          {cricketer.battingRecord && (Object.keys(cricketer.battingRecord).length > 0) && (
            <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-red-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xs font-display text-red-400 tracking-wider">BATTING</span>
              </div>
              <div className="space-y-2">
                {cricketer.battingRecord.runs !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Runs</span>
                    <span className="text-sm font-mono text-white">{cricketer.battingRecord.runs}</span>
                  </div>
                )}
                {cricketer.battingRecord.average !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Average</span>
                    <span className="text-sm font-mono text-white">{cricketer.battingRecord.average.toFixed(1)}</span>
                  </div>
                )}
                {cricketer.battingRecord.strikeRate !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Strike Rate</span>
                    <span className="text-sm font-mono text-white">{cricketer.battingRecord.strikeRate.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bowling Stats */}
          {cricketer.bowlingRecord && (Object.keys(cricketer.bowlingRecord).length > 0) && (
            <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-xs font-display text-blue-400 tracking-wider">BOWLING</span>
              </div>
              <div className="space-y-2">
                {cricketer.bowlingRecord.wickets !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Wickets</span>
                    <span className="text-sm font-mono text-white">{cricketer.bowlingRecord.wickets}</span>
                  </div>
                )}
                {cricketer.bowlingRecord.average !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Average</span>
                    <span className="text-sm font-mono text-white">{cricketer.bowlingRecord.average.toFixed(1)}</span>
                  </div>
                )}
                {cricketer.bowlingRecord.economy !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-500">Economy</span>
                    <span className="text-sm font-mono text-white">{cricketer.bowlingRecord.economy.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* News Articles */}
        {cricketer.newsArticles && cricketer.newsArticles.length > 0 && (
          <div className="mt-5 pt-5 border-t border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              <span className="text-xs font-display text-slate-500 tracking-wider">RECENT NEWS</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {cricketer.newsArticles.slice(0, 3).map((article, index) => (
                <a
                  key={index}
                  href={article}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Article {index + 1}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
