import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { subsApi, usersApi, cricketersApi, leagueApi } from '../services/api';
import type { User, Cricketer } from '../types';
import Navbar from '../components/common/Navbar';
import Avatar from '../components/common/Avatar';
import { getPlayerTypeLabel, validateSubstitution } from '../utils/validation';

interface SnakeOrderEntry {
  userId: string;
  user: User;
  position: number;
}

const getPlayerTypeConfig = (type: string) => {
  const configs: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    batsman: { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
    bowler: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
    allrounder: { color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
    wicketkeeper: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
  };
  return configs[type] || configs.batsman;
};

export default function Subs() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentRound, setCurrentRound] = useState<1 | 2>(1);
  const [snakeOrder, setSnakeOrder] = useState<SnakeOrderEntry[]>([]);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [teams, setTeams] = useState<Record<string, Cricketer[]>>({});
  const [availablePool, setAvailablePool] = useState<Cricketer[]>([]);

  const [selectedSubOut, setSelectedSubOut] = useState<string>('');
  const [selectedSubIn, setSelectedSubIn] = useState<string>('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAuctioneer = user?.role === 'auctioneer';

  // Redirect non-auctioneers
  useEffect(() => {
    if (user && !isAuctioneer) {
      navigate('/auction');
    }
  }, [user, isAuctioneer, navigate]);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [playersRes, cricketersRes] = await Promise.all([
          usersApi.getAll(),
          cricketersApi.getAll(),
        ]);

        const playerList = playersRes.data.filter((p) => p.role === 'player');

        // Get unpicked cricketers
        const unpicked = cricketersRes.data.filter((c) => !c.isPicked && !c.wasSkipped);
        setAvailablePool(unpicked);

        // Fetch teams for all players
        const teamsData: Record<string, Cricketer[]> = {};
        for (const player of playerList) {
          const teamRes = await usersApi.getTeam(player.id);
          teamsData[player.id] = teamRes.data;
        }
        setTeams(teamsData);
      } catch (err) {
        setError('Failed to load data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch snake order when round changes
  useEffect(() => {
    const fetchSnakeOrder = async () => {
      try {
        const res = await subsApi.getSnakeOrder(currentRound);
        setSnakeOrder(res.data);
      } catch (err) {
        console.error('Failed to fetch snake order', err);
      }
    };
    fetchSnakeOrder();
  }, [currentRound]);

  const currentPlayer = snakeOrder[currentPosition]?.user;
  const currentTeam = currentPlayer ? teams[currentPlayer.id] || [] : [];

  const handleStartSubsPeriod = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      await leagueApi.startSubsPeriod(currentRound);
      setSuccess(`Substitution period (Round ${currentRound}) started`);
      setCurrentPosition(0);
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to start substitution period';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndSubsPeriod = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      await leagueApi.endSubsPeriod();
      setSuccess('Substitution period ended');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to end substitution period';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidate = () => {
    if (!selectedSubOut || !selectedSubIn || !currentPlayer) {
      setValidationMessage('Please select both players');
      setIsValid(false);
      return;
    }

    const subOut = currentTeam.find((c) => c.id === selectedSubOut);
    const subIn = availablePool.find((c) => c.id === selectedSubIn);

    if (!subOut || !subIn) {
      setValidationMessage('Invalid selection');
      setIsValid(false);
      return;
    }

    const result = validateSubstitution(currentTeam, subOut, subIn);
    setIsValid(result.valid);
    setValidationMessage(result.valid ? 'Substitution is valid!' : result.message || 'Invalid');
  };

  const handleConfirmSub = async () => {
    if (!isValid || !currentPlayer) return;

    try {
      setIsProcessing(true);
      setError(null);
      await subsApi.create({
        subOutId: selectedSubOut,
        subInId: selectedSubIn,
        round: currentRound,
      });

      // Update local state
      const subOut = currentTeam.find((c) => c.id === selectedSubOut)!;
      const subIn = availablePool.find((c) => c.id === selectedSubIn)!;

      setTeams((prev) => ({
        ...prev,
        [currentPlayer.id]: prev[currentPlayer.id]
          .filter((c) => c.id !== selectedSubOut)
          .concat(subIn),
      }));

      setAvailablePool((prev) =>
        prev.filter((c) => c.id !== selectedSubIn).concat(subOut)
      );

      // Move to next player
      setCurrentPosition((prev) => prev + 1);
      setSelectedSubOut('');
      setSelectedSubIn('');
      setValidationMessage(null);
      setIsValid(null);
      setSuccess('Substitution confirmed');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to confirm substitution';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipSub = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      await subsApi.skip(currentRound);
      setCurrentPosition((prev) => prev + 1);
      setSelectedSubOut('');
      setSelectedSubIn('');
      setValidationMessage(null);
      setIsValid(null);
      setSuccess('Player skipped their substitution');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to skip';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get selected player details for preview
  const selectedSubOutPlayer = currentTeam.find((c) => c.id === selectedSubOut);
  const selectedSubInPlayer = availablePool.find((c) => c.id === selectedSubIn);

  if (isLoading) {
    return (
      <div className="min-h-screen stadium-gradient">
        <Navbar />
        <div className="flex items-center justify-center h-96">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-amber-500/20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen stadium-gradient">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-display text-white tracking-wide">Substitutions</h1>
              <p className="text-slate-400">Manage player substitutions in snake draft order</p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <span className="text-red-400">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400/60 hover:text-red-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-emerald-400">{success}</span>
            </div>
            <button onClick={() => setSuccess(null)} className="text-emerald-400/60 hover:text-emerald-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Controls & Current Sub */}
          <div className="lg:col-span-2 space-y-6">
            {/* Round Selection & Controls */}
            <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-lg font-display text-white tracking-wide">Substitution Round</h2>
                  </div>

                  {/* Round Toggle */}
                  <div className="flex p-1 rounded-xl bg-white/5 border border-white/10">
                    <button
                      onClick={() => setCurrentRound(1)}
                      className={`px-5 py-2 rounded-lg font-display text-sm tracking-wide transition-all ${
                        currentRound === 1
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Round 1
                    </button>
                    <button
                      onClick={() => setCurrentRound(2)}
                      className={`px-5 py-2 rounded-lg font-display text-sm tracking-wide transition-all ${
                        currentRound === 2
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-lg shadow-amber-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      Round 2
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={handleStartSubsPeriod}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-medium hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Start Subs Period
                  </button>
                  <button
                    onClick={handleEndSubsPeriod}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-medium hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                    End Subs Period
                  </button>
                </div>
              </div>
            </div>

            {/* Current Player's Turn */}
            {currentPlayer && currentPosition < snakeOrder.length && (
              <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '0.2s' }}>
                {/* Player Header */}
                <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-transparent">
                  <div className="flex items-center gap-4">
                    <Avatar url={currentPlayer.avatarUrl} name={currentPlayer.name} size="lg" />
                    <div className="flex-1">
                      <h3 className="text-xl font-display text-white tracking-wide">{currentPlayer.teamName}</h3>
                      <p className="text-slate-400">{currentPlayer.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-sm">
                        Turn {currentPosition + 1} / {snakeOrder.length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-6">
                  {/* Substitution Selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Sub Out */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-red-400 mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sub Out (From Team)
                      </label>
                      <select
                        value={selectedSubOut}
                        onChange={(e) => {
                          setSelectedSubOut(e.target.value);
                          setValidationMessage(null);
                          setIsValid(null);
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 outline-none transition-all appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                      >
                        <option value="" className="bg-slate-900">Select player to remove...</option>
                        {currentTeam.map((c) => (
                          <option key={c.id} value={c.id} className="bg-slate-900">
                            {c.firstName} {c.lastName} ({getPlayerTypeLabel(c.playerType)})
                            {c.isForeign ? ' ⭐' : ''}
                          </option>
                        ))}
                      </select>

                      {/* Selected Player Preview */}
                      {selectedSubOutPlayer && (
                        <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden">
                              {selectedSubOutPlayer.pictureUrl ? (
                                <img src={selectedSubOutPlayer.pictureUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-display">
                                  {selectedSubOutPlayer.firstName[0]}{selectedSubOutPlayer.lastName[0]}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white text-sm">{selectedSubOutPlayer.firstName} {selectedSubOutPlayer.lastName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {(() => {
                                  const config = getPlayerTypeConfig(selectedSubOutPlayer.playerType);
                                  return (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bgColor} ${config.borderColor} border ${config.color}`}>
                                      {getPlayerTypeLabel(selectedSubOutPlayer.playerType)}
                                    </span>
                                  );
                                })()}
                                {selectedSubOutPlayer.isForeign && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 border border-amber-500/30 text-amber-400">
                                    Foreign
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transfer Arrow (desktop only) */}
                    <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      {/* This is positioned in the grid gap */}
                    </div>

                    {/* Sub In */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-emerald-400 mb-3">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                        Sub In (From Pool)
                      </label>
                      <select
                        value={selectedSubIn}
                        onChange={(e) => {
                          setSelectedSubIn(e.target.value);
                          setValidationMessage(null);
                          setIsValid(null);
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all appearance-none cursor-pointer"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                      >
                        <option value="" className="bg-slate-900">Select player to add...</option>
                        {availablePool.map((c) => (
                          <option key={c.id} value={c.id} className="bg-slate-900">
                            {c.firstName} {c.lastName} ({getPlayerTypeLabel(c.playerType)}) - {c.iplTeam}
                            {c.isForeign ? ' ⭐' : ''}
                          </option>
                        ))}
                      </select>

                      {/* Selected Player Preview */}
                      {selectedSubInPlayer && (
                        <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden">
                              {selectedSubInPlayer.pictureUrl ? (
                                <img src={selectedSubInPlayer.pictureUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-display">
                                  {selectedSubInPlayer.firstName[0]}{selectedSubInPlayer.lastName[0]}
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-white text-sm">{selectedSubInPlayer.firstName} {selectedSubInPlayer.lastName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {(() => {
                                  const config = getPlayerTypeConfig(selectedSubInPlayer.playerType);
                                  return (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${config.bgColor} ${config.borderColor} border ${config.color}`}>
                                      {getPlayerTypeLabel(selectedSubInPlayer.playerType)}
                                    </span>
                                  );
                                })()}
                                {selectedSubInPlayer.isForeign && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 border border-amber-500/30 text-amber-400">
                                    Foreign
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500">{selectedSubInPlayer.iplTeam}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Transfer Visual (between the two cards on mobile) */}
                  {selectedSubOutPlayer && selectedSubInPlayer && (
                    <div className="flex items-center justify-center py-2 md:hidden">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                          <span className="text-red-400 text-xs font-display">OUT</span>
                        </div>
                        <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                          <span className="text-emerald-400 text-xs font-display">IN</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Validation Message */}
                  {validationMessage && (
                    <div
                      className={`p-4 rounded-xl flex items-center gap-3 ${
                        isValid
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'bg-red-500/10 border border-red-500/30'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isValid ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                        {isValid ? (
                          <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </div>
                      <span className={isValid ? 'text-emerald-400' : 'text-red-400'}>{validationMessage}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={handleValidate}
                      disabled={!selectedSubOut || !selectedSubIn || isProcessing}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 font-medium hover:bg-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Validate Sub
                    </button>
                    <button
                      onClick={handleConfirmSub}
                      disabled={!isValid || isProcessing}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-black font-display tracking-wide hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm Sub
                    </button>
                    <button
                      onClick={handleSkipSub}
                      disabled={isProcessing}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 font-medium hover:bg-orange-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                      No Sub (Skip)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Round Complete */}
            {currentPosition >= snakeOrder.length && snakeOrder.length > 0 && (
              <div className="glass-card overflow-hidden animate-scale-in">
                <div className="p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-display text-white tracking-wide mb-2">
                    Round {currentRound} Complete
                  </h3>
                  <p className="text-slate-400">All players have had their turn</p>

                  {currentRound === 1 && (
                    <button
                      onClick={() => {
                        setCurrentRound(2);
                        setCurrentPosition(0);
                      }}
                      className="mt-6 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black font-display tracking-wide hover:shadow-lg hover:shadow-amber-500/20 transition-all"
                    >
                      Proceed to Round 2
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right: Snake Order */}
          <div className="space-y-4">
            <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="px-5 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-display text-white tracking-wide">Snake Order</h3>
                    <p className="text-xs text-slate-500">Round {currentRound}</p>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-purple-300">
                    {currentRound === 1 ? '8th → 1st place' : '1st → 8th place'}
                  </p>
                </div>

                <div className="space-y-2">
                  {snakeOrder.map((entry, index) => {
                    const isCurrent = index === currentPosition;
                    const isCompleted = index < currentPosition;

                    return (
                      <div
                        key={entry.userId}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                          isCurrent
                            ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 ring-2 ring-amber-500/20'
                            : isCompleted
                            ? 'bg-white/5 border border-white/5 opacity-50'
                            : 'bg-white/5 border border-white/5 hover:border-white/10'
                        }`}
                      >
                        <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-display ${
                          isCurrent
                            ? 'bg-amber-500 text-black'
                            : isCompleted
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-white/10 text-slate-400'
                        }`}>
                          {isCompleted ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            index + 1
                          )}
                        </span>
                        <Avatar url={entry.user.avatarUrl} name={entry.user.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isCurrent ? 'text-amber-400' : 'text-white'}`}>
                            {entry.user.teamName}
                          </p>
                        </div>
                        {isCurrent && (
                          <span className="px-2 py-1 rounded-lg bg-amber-500 text-black text-[10px] font-display uppercase tracking-wider animate-pulse">
                            Active
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="glass-card p-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
              <h4 className="text-xs font-display text-slate-400 uppercase tracking-wider mb-3">Legend</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/30 text-red-400">BAT</span>
                  <span className="text-slate-500">Batsman</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-400">BWL</span>
                  <span className="text-slate-500">Bowler</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-purple-500/20 border border-purple-500/30 text-purple-400">AR</span>
                  <span className="text-slate-500">Allrounder</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">WK</span>
                  <span className="text-slate-500">Wicketkeeper</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-400">⭐</span>
                  <span className="text-slate-500">Foreign Player</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
