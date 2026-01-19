import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { reportsApi, matchesApi } from '../services/api';
import type { Match, ReportData } from '../types';
import Navbar from '../components/common/Navbar';
import Avatar from '../components/common/Avatar';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Reports() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatchNumber, setSelectedMatchNumber] = useState<number | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEmailing, setIsEmailing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAuctioneer = user?.role === 'auctioneer';

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setIsLoading(true);
        const res = await matchesApi.getAll();
        setMatches(res.data.filter((m) => m.scoresPopulated));
      } catch (err) {
        setError('Failed to load matches');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMatches();
  }, []);

  const handleGenerateReport = async () => {
    if (!selectedMatchNumber) return;

    try {
      setIsGenerating(true);
      setError(null);
      const res = await reportsApi.generate(selectedMatchNumber);
      setReportData(res.data);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to generate report';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedMatchNumber) return;

    try {
      const res = await reportsApi.downloadPdf(selectedMatchNumber);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fantasy-ipl-report-match-${selectedMatchNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to download PDF';
      setError(errorMessage);
    }
  };

  const handleEmailToAll = async () => {
    if (!selectedMatchNumber || !isAuctioneer) return;

    try {
      setIsEmailing(true);
      setError(null);
      await reportsApi.emailToAll(selectedMatchNumber);
      setSuccess('Report emailed to all players!');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send emails';
      setError(errorMessage);
    } finally {
      setIsEmailing(false);
    }
  };

  const chartData = reportData
    ? {
        labels: Array.from(
          { length: reportData.pointsProgression[0]?.points.length || 0 },
          (_, i) => `Match ${i + 1}`
        ),
        datasets: reportData.pointsProgression.map((player) => ({
          label: player.teamName,
          data: player.points,
          borderColor: player.color,
          backgroundColor: `${player.color}20`,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: player.color,
          pointBorderColor: '#0A0A0F',
          pointBorderWidth: 2,
        })),
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94A3B8',
          font: {
            family: 'DM Sans',
            size: 12,
          },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 15, 0.95)',
        titleColor: '#F8FAFC',
        bodyColor: '#94A3B8',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          family: 'Bebas Neue',
          size: 14,
        },
        bodyFont: {
          family: 'JetBrains Mono',
          size: 12,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#64748B',
          font: {
            family: 'JetBrains Mono',
            size: 11,
          },
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#64748B',
          font: {
            family: 'DM Sans',
            size: 11,
          },
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
          <div className="spinner mb-4" />
          <p className="text-slate-500 font-body">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-display text-white tracking-wide">League Reports</h1>
            <p className="text-slate-500">View standings, stats, and performance trends</p>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-red-400">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-emerald-400">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-emerald-300 p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Match Selection Card */}
        <div className="glass-card p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="input-label mb-2 block">Select Match</label>
              <div className="relative">
                <select
                  value={selectedMatchNumber || ''}
                  onChange={(e) => {
                    setSelectedMatchNumber(e.target.value ? parseInt(e.target.value) : null);
                    setReportData(null);
                  }}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                >
                  <option value="" className="bg-slate-900">Select a scored match...</option>
                  {matches.map((match) => (
                    <option key={match.id} value={match.matchNumber} className="bg-slate-900">
                      Match {match.matchNumber}: {match.team1} vs {match.team2}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 items-end">
              <button
                onClick={handleGenerateReport}
                disabled={!selectedMatchNumber || isGenerating}
                className="px-6 py-3 rounded-xl font-display tracking-wide bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </>
                )}
              </button>

              {reportData && (
                <>
                  <button
                    onClick={handleDownloadPdf}
                    className="px-6 py-3 rounded-xl font-display tracking-wide bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </button>

                  {isAuctioneer && (
                    <button
                      onClick={handleEmailToAll}
                      disabled={isEmailing}
                      className="px-6 py-3 rounded-xl font-display tracking-wide bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                      {isEmailing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          Email to All
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Report Content */}
        {reportData && (
          <div className="space-y-6 animate-slide-up">
            {/* Report Header */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 p-8 text-center">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 mb-4">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span className="text-sm text-purple-300 font-medium">League Report</span>
                </div>
                <h2 className="text-4xl font-display text-white tracking-wide mb-2">Fantasy IPL League</h2>
                <p className="text-lg text-slate-400">
                  Match {reportData.matchNumber} &bull; {new Date(reportData.matchDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Rankings Table */}
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-display text-white tracking-wide">Current Standings</h3>
                  <p className="text-sm text-slate-500">Player rankings after Match {reportData.matchNumber}</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-6 py-4 text-left text-xs font-display text-slate-500 uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-4 text-left text-xs font-display text-slate-500 uppercase tracking-wider">Change</th>
                      <th className="px-6 py-4 text-left text-xs font-display text-slate-500 uppercase tracking-wider">Player</th>
                      <th className="px-6 py-4 text-left text-xs font-display text-slate-500 uppercase tracking-wider">Team</th>
                      <th className="px-6 py-4 text-right text-xs font-display text-slate-500 uppercase tracking-wider">Points</th>
                      <th className="px-6 py-4 text-right text-xs font-display text-slate-500 uppercase tracking-wider">Prev</th>
                      <th className="px-6 py-4 text-right text-xs font-display text-slate-500 uppercase tracking-wider">+/-</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reportData.rankings.map((ranking) => {
                      const rankChange = ranking.previousRank
                        ? ranking.previousRank - ranking.rank
                        : 0;
                      return (
                        <tr key={ranking.user.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display text-lg ${
                              ranking.rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black' :
                              ranking.rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-black' :
                              ranking.rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' :
                              'bg-white/5 text-slate-400'
                            }`}>
                              {ranking.rank}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {rankChange > 0 && (
                              <div className="flex items-center gap-1 text-emerald-400">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="font-mono text-sm">{rankChange}</span>
                              </div>
                            )}
                            {rankChange < 0 && (
                              <div className="flex items-center gap-1 text-red-400">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                <span className="font-mono text-sm">{Math.abs(rankChange)}</span>
                              </div>
                            )}
                            {rankChange === 0 && <span className="text-slate-600">-</span>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar url={ranking.user.avatarUrl} name={ranking.user.name} size="sm" />
                              <span className="font-medium text-white">{ranking.user.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{ranking.user.teamName}</td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-xl font-mono text-amber-400 font-bold">{ranking.totalPoints}</span>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-500 font-mono">{ranking.previousPoints}</td>
                          <td className="px-6 py-4 text-right">
                            <span className={`font-mono ${ranking.pointsChange > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                              +{ranking.pointsChange}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Points Chart */}
            {chartData && (
              <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-display text-white tracking-wide">Points Progression</h3>
                    <p className="text-sm text-slate-500">Cumulative points over all matches</p>
                  </div>
                </div>
                <div className="p-6">
                  <div className="h-96">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            )}

            {/* Fun Stats */}
            <div className="glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-display text-white tracking-wide">Match Highlights</h3>
                  <p className="text-sm text-slate-500">Notable achievements from this match</p>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reportData.funStats.topScorer && (
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-5 group hover:border-amber-500/40 transition-colors">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl" />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs font-display text-amber-400 uppercase tracking-wider">Top Scorer</span>
                        </div>
                        <p className="text-xl font-display text-white mb-1">{reportData.funStats.topScorer.user.teamName}</p>
                        <p className="text-3xl font-mono text-amber-400 font-bold">{reportData.funStats.topScorer.points} <span className="text-sm text-amber-400/60">pts</span></p>
                      </div>
                    </div>
                  )}

                  {reportData.funStats.mostBatsmanPoints && (
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/20 p-5 group hover:border-red-500/40 transition-colors">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 rounded-full blur-2xl" />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="text-xs font-display text-red-400 uppercase tracking-wider">Most from Batsmen</span>
                        </div>
                        <p className="text-xl font-display text-white mb-1">{reportData.funStats.mostBatsmanPoints.user.teamName}</p>
                        <p className="text-3xl font-mono text-red-400 font-bold">{reportData.funStats.mostBatsmanPoints.points} <span className="text-sm text-red-400/60">pts</span></p>
                      </div>
                    </div>
                  )}

                  {reportData.funStats.mostBowlerPoints && (
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 p-5 group hover:border-blue-500/40 transition-colors">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-display text-blue-400 uppercase tracking-wider">Most from Bowlers</span>
                        </div>
                        <p className="text-xl font-display text-white mb-1">{reportData.funStats.mostBowlerPoints.user.teamName}</p>
                        <p className="text-3xl font-mono text-blue-400 font-bold">{reportData.funStats.mostBowlerPoints.points} <span className="text-sm text-blue-400/60">pts</span></p>
                      </div>
                    </div>
                  )}

                  {reportData.funStats.mostForeignerPoints && (
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 p-5 group hover:border-purple-500/40 transition-colors">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-2xl" />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                          </svg>
                          <span className="text-xs font-display text-purple-400 uppercase tracking-wider">Most from Foreigners</span>
                        </div>
                        <p className="text-xl font-display text-white mb-1">{reportData.funStats.mostForeignerPoints.user.teamName}</p>
                        <p className="text-3xl font-mono text-purple-400 font-bold">{reportData.funStats.mostForeignerPoints.points} <span className="text-sm text-purple-400/60">pts</span></p>
                      </div>
                    </div>
                  )}

                  {reportData.funStats.bestValuePick && (
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-5 group hover:border-emerald-500/40 transition-colors">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-display text-emerald-400 uppercase tracking-wider">Best Value Pick</span>
                        </div>
                        <p className="text-xl font-display text-white mb-1">
                          {reportData.funStats.bestValuePick.cricketer.firstName} {reportData.funStats.bestValuePick.cricketer.lastName}
                        </p>
                        <p className="text-3xl font-mono text-emerald-400 font-bold">
                          {reportData.funStats.bestValuePick.pointsPerDollar.toFixed(2)} <span className="text-sm text-emerald-400/60">pts/$</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {reportData.funStats.worstValuePick && (
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 p-5 group hover:border-rose-500/40 transition-colors">
                      <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full blur-2xl" />
                      <div className="relative">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-display text-rose-400 uppercase tracking-wider">Worst Value Pick</span>
                        </div>
                        <p className="text-xl font-display text-white mb-1">
                          {reportData.funStats.worstValuePick.cricketer.firstName} {reportData.funStats.worstValuePick.cricketer.lastName}
                        </p>
                        <p className="text-3xl font-mono text-rose-400 font-bold">
                          {reportData.funStats.worstValuePick.pointsPerDollar.toFixed(2)} <span className="text-sm text-rose-400/60">pts/$</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-slate-600 text-sm py-6 border-t border-white/5">
              <p className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Generated by Fantasy IPL Auction League
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!reportData && matches.length === 0 && (
          <div className="glass-card p-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 flex items-center justify-center">
              <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-display text-white mb-2">No Reports Available</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Reports will be available after match scores have been entered by the auctioneer.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
