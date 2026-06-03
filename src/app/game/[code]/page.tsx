'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, Star, Lock, Eye, ChevronRight, Trophy, RotateCcw, X } from 'lucide-react';
import { getSocket } from '@/lib/socketClient';
import type {
  GameStatePayload,
  LeaderboardEntry,
  Player,
  RevealPayload,
  FinishedPayload,
  SubmissionUpdatePayload,
} from '@/lib/events';

// ── Option colours ───────────────────────────────────────────────────────────

const OPTION_COLORS = [
  'from-blue-600 to-blue-700',
  'from-orange-500 to-orange-600',
  'from-green-600 to-green-700',
  'from-pink-600 to-pink-700',
];

// ── Option button ────────────────────────────────────────────────────────────

function OptionButton({
  label, index, selected, disabled, revealState, onClick,
}: {
  label: string; index: number; selected: boolean; disabled: boolean;
  revealState?: 'correct' | 'wrong' | 'neutral'; onClick: () => void;
}) {
  const letters = ['A', 'B', 'C', 'D'];
  let bg = `bg-gradient-to-r ${OPTION_COLORS[index]}`;
  if (revealState === 'correct') bg = 'bg-green-500';
  if (revealState === 'wrong') bg = 'bg-red-500/70';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-2xl px-5 py-4 text-left font-semibold text-white flex items-center gap-3 min-h-[56px] transition-all ${bg} ${selected && !revealState ? 'ring-2 ring-white' : ''} ${disabled && !revealState ? 'opacity-60' : ''}`}
      whileTap={disabled ? {} : { scale: 0.97 }}
      animate={revealState === 'correct' ? { scale: [1, 1.03, 1] } : {}}
    >
      <span className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center text-sm flex-shrink-0">
        {letters[index]}
      </span>
      {label}
    </motion.button>
  );
}

// ── Leaderboard panel ────────────────────────────────────────────────────────

function LeaderboardPanel({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <div className="px-4 py-2 bg-white/5 flex items-center gap-2">
        <Trophy size={14} className="text-yellow-400" />
        <span className="text-xs font-semibold uppercase tracking-widest text-white/60">Top 5</span>
      </div>
      <ul className="divide-y divide-white/5">
        <AnimatePresence initial={false}>
          {entries.map((e) => (
            <motion.li key={e.playerId} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-5 text-center text-sm font-bold text-white/40">
                {e.rank === 1 ? '👑' : e.rank}
              </span>
              <span className="flex-1 text-sm font-medium truncate">{e.name}</span>
              <span className="text-sm font-bold text-purple-300">{e.totalPoints}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}

// ── Final results modal ──────────────────────────────────────────────────────

function FinalResults({ leaderboard, isAdmin, onPlayAgain }: {
  leaderboard: LeaderboardEntry[]; isAdmin: boolean; onPlayAgain: () => void;
}) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({ particleCount: 200, spread: 120, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } }), 400);
    });
  }, []);

  const winners = leaderboard.filter((e) => e.rank === 1);
  const bottom3 = leaderboard.slice(-3).reverse();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-md bg-[#1a1030] rounded-3xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-6 py-5 bg-gradient-to-r from-purple-900/60 to-pink-900/60 text-center">
          <div className="text-4xl mb-1">🏆</div>
          <h2 className="text-2xl font-bold">Final Results</h2>
          {winners.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-center gap-1">
              {winners.map((w) => (
                <span key={w.playerId} className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-300 rounded-full px-3 py-0.5 text-sm font-semibold">
                  <Star size={12} fill="currentColor" /> {w.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {leaderboard.map((e) => (
            <motion.div key={e.playerId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: e.rank * 0.04 }}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${e.rank === 1 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-white/5'}`}>
              <span className="w-6 text-center font-bold text-white/50 text-sm">
                {e.rank === 1 ? '👑' : e.rank}
              </span>
              <span className="flex-1 font-medium">{e.name}</span>
              <div className="text-right">
                <div className="font-bold text-purple-300">{e.totalPoints} pts</div>
                <div className="text-xs text-white/40">{e.correctCount} correct</div>
              </div>
            </motion.div>
          ))}
          {bottom3.length > 0 && leaderboard.length > 3 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
              className="rounded-2xl bg-red-900/20 border border-red-500/30 p-4 text-center mt-4">
              <div className="text-2xl mb-1">🥃</div>
              <p className="font-bold text-red-300 text-sm">Bottom 3 — you know the rules!</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                {bottom3.map((e) => (
                  <motion.span key={e.playerId} animate={{ rotate: [-2, 2, -2] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                    className="bg-red-500/20 text-red-200 rounded-full px-3 py-0.5 text-sm font-medium">
                    {e.name}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </div>
        {isAdmin && (
          <div className="p-4 border-t border-white/10">
            <button onClick={onPlayAgain}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 py-3 font-semibold transition-colors">
              <RotateCcw size={16} /> Play Again
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Code badge (always visible) ───────────────────────────────────────────────

function CodeBadge({ code }: { code: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
      <span className="text-white/40 text-xs">Game</span>
      <span className="font-black text-sm tracking-widest text-purple-300">{code}</span>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function GameCodePage() {
  const params = useParams();
  const code = (params.code as string).toUpperCase();
  const router = useRouter();
  const socket = getSocket();

  // Gate state
  const [joining, setJoining] = useState(true);
  const [gameError, setGameError] = useState<string | null>(null);

  // Identity
  const [isAdmin, setIsAdmin] = useState(false);
  const isAdminRef = useRef(false);
  const [playerJoined, setPlayerJoined] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [submittingName, setSubmittingName] = useState(false);

  // Lobby
  const [players, setPlayers] = useState<Player[]>([]);

  // Game
  const [gameState, setGameState] = useState<GameStatePayload | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionUpdatePayload>({ count: 0, totalPlayers: 0 });
  const [reveal, setReveal] = useState<RevealPayload | null>(null);
  const [finished, setFinished] = useState<FinishedPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const storedPlayerId = localStorage.getItem('playerId');
    const storedAdmin = localStorage.getItem('isAdmin');
    const storedPassword = localStorage.getItem('adminPassword');

    // Register listeners first.
    socket.on('lobby:update', ({ players }) => setPlayers(players));

    socket.on('game:state', (state) => {
      setGameState(state);
      if (state.alreadySubmitted) {
        setConfirmed(true);
        setSelectedIdx(state.selectedIdx ?? null);
      }
      if (state.phase === 'QUESTION_ACTIVE' && !state.alreadySubmitted) {
        setSelectedIdx(null);
        setConfirmed(false);
        setReveal(null);
      }
    });

    socket.on('game:submissionUpdate', setSubmissions);

    socket.on('game:reveal', (data) => {
      setReveal(data);
      setLeaderboard(data.leaderboardTop5);
    });

    socket.on('game:finished', setFinished);

    socket.on('game:closed', () => {
      if (isAdminRef.current) {
        router.push('/');
      } else {
        setGameError('The host has closed the game.');
      }
    });

    // Join the game room first, then authenticate.
    socket.emit('game:join', { code }, ({ ok, error }) => {
      if (!ok) {
        setGameError(error ?? 'Invalid game code.');
        setJoining(false);
        return;
      }
      setJoining(false);

      if (storedPlayerId) {
        socket.emit('player:rejoin', { playerId: storedPlayerId });
        setPlayerJoined(true);
      }
      if (storedAdmin === 'true' && storedPassword) {
        socket.emit('admin:auth', { password: storedPassword }, ({ ok }) => {
          if (ok) {
            isAdminRef.current = true;
            setIsAdmin(true);
          }
        });
      }
    });

    return () => {
      socket.off('lobby:update');
      socket.off('game:state');
      socket.off('game:submissionUpdate');
      socket.off('game:reveal');
      socket.off('game:finished');
      socket.off('game:closed');
    };
  }, []);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || submittingName) return;
    setSubmittingName(true);
    setNameError('');
    socket.emit('player:join', { name: name.trim() }, ({ playerId }) => {
      localStorage.setItem('playerId', playerId);
      setPlayerJoined(true);
      setSubmittingName(false);
    });
  }

  function handleLeave() {
    socket.emit('player:leave');
    localStorage.removeItem('playerId');
    setPlayerJoined(false);
    setName('');
  }

  const handleSelect = useCallback((idx: number) => {
    if (confirmed || gameState?.phase !== 'QUESTION_ACTIVE') return;
    setSelectedIdx(idx);
  }, [confirmed, gameState?.phase]);

  const handleConfirm = useCallback(() => {
    if (selectedIdx === null || confirmed || !gameState?.question) return;
    setConfirmed(true);
    socket.emit('player:submitAnswer', { questionId: gameState.question.id, selectedIdx });
  }, [selectedIdx, confirmed, gameState?.question]);

  function getRevealState(index: number) {
    if (!reveal || gameState?.phase !== 'REVEALED') return undefined;
    if (index === reveal.correctIdx) return 'correct' as const;
    if (index === selectedIdx && index !== reveal.correctIdx) return 'wrong' as const;
    return 'neutral' as const;
  }

  // ── Render gates ────────────────────────────────────────────────────────

  if (joining) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white/40 text-sm">Connecting…</div>
      </div>
    );
  }

  if (gameError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-5xl">🚫</div>
        <h1 className="text-2xl font-bold">Game Unavailable</h1>
        <p className="text-white/50">{gameError}</p>
        <a href="/" className="text-purple-400 text-sm hover:text-purple-300 transition-colors">
          Back to home
        </a>
      </div>
    );
  }

  const phase = gameState?.phase ?? 'LOBBY';

  // ── Lobby ────────────────────────────────────────────────────────────────

  if (phase === 'LOBBY') {
    const allSubmitted = submissions.count >= submissions.totalPlayers && submissions.totalPlayers > 0;
    return (
      <div className="flex min-h-screen flex-col items-center justify-start px-4 py-10">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <div className="text-4xl mb-2">🎂</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Birthday Trivia
          </h1>
          <div className="mt-3 flex justify-center">
            <CodeBadge code={code} />
          </div>
        </motion.div>

        <div className="w-full max-w-sm space-y-5">
          {/* Player join / joined */}
          {!isAdmin && (
            !playerJoined ? (
              <motion.form onSubmit={handleJoin} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <input
                  type="text" placeholder="Your name" value={name}
                  onChange={(e) => setName(e.target.value)} maxLength={30}
                  className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
                />
                {nameError && <p className="text-red-400 text-sm">{nameError}</p>}
                <button type="submit" disabled={!name.trim() || submittingName}
                  className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 py-3 font-semibold text-white transition-colors min-h-[44px]">
                  {submittingName ? 'Joining…' : 'Join Game'}
                </button>
              </motion.form>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-center text-white/70 text-sm">
                  You&rsquo;re in! Waiting for the host to start…
                </div>
                <button onClick={handleLeave}
                  className="w-full rounded-xl border border-white/15 text-white/50 hover:text-white hover:border-white/30 transition-colors py-3 text-sm font-medium">
                  Change name
                </button>
              </motion.div>
            )
          )}

          {/* Player list */}
          <div>
            <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-widest mb-3">
              <span>{players.length} player{players.length !== 1 ? 's' : ''} joined</span>
            </div>
            <ul className="space-y-2">
              <AnimatePresence initial={false}>
                {players.map((p) => (
                  <motion.li key={p.id}
                    initial={{ opacity: 0, scale: 0.85, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85 }} transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold">
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className="font-medium">{p.name}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>

          {/* Admin controls */}
          {isAdmin && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 border-t border-white/10 pt-4">
              <div className="flex items-center gap-2 text-yellow-400 text-sm font-medium">
                <Crown size={14} /> Host mode
              </div>
              <button onClick={() => socket.emit('admin:startGame')} disabled={players.length === 0}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 py-4 font-bold text-lg text-white transition-all min-h-[56px] shadow-lg shadow-purple-900/40">
                Start Game 🚀
              </button>
              {players.length === 0 && (
                <p className="text-white/40 text-xs text-center">Waiting for players to join</p>
              )}
              <button onClick={() => { if (confirm('Kill this game? All players will be disconnected.')) socket.emit('admin:killGame'); }}
                className="w-full flex items-center justify-center gap-2 text-white/30 hover:text-red-400 text-xs transition-colors py-2">
                <X size={12} /> Kill Game
              </button>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // ── Game ─────────────────────────────────────────────────────────────────

  const { question, currentIndex, totalQuestions } = gameState!;
  const allSubmitted = submissions.count >= submissions.totalPlayers && submissions.totalPlayers > 0;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-white/10">
        <motion.div className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          initial={{ width: 0 }}
          animate={{ width: totalQuestions > 0 ? `${((currentIndex + 1) / totalQuestions) * 100}%` : '0%' }}
          transition={{ duration: 0.4 }} />
      </div>

      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full gap-6">
        <div className="flex items-center justify-between text-white/40 text-xs uppercase tracking-widest">
          <span>Question {currentIndex + 1} of {totalQuestions}</span>
          <CodeBadge code={code} />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          {question && (
            <motion.div key={question.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <p className="text-xl font-bold leading-snug">{question.prompt}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Options */}
        <AnimatePresence mode="wait">
          {question && (
            <motion.div key={`opts-${question.id}`} className="space-y-3"
              initial="hidden" animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.07 } }, hidden: {} }}>
              {question.options.map((opt, i) => (
                <motion.div key={i} variants={{ hidden: { opacity: 0, x: -15 }, visible: { opacity: 1, x: 0 } }}>
                  <OptionButton label={opt} index={i} selected={selectedIdx === i} disabled={confirmed || phase === 'LOCKED' || phase === 'REVEALED'}
                    revealState={getRevealState(i)} onClick={() => handleSelect(i)} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player: confirm / waiting */}
        {!isAdmin && phase === 'QUESTION_ACTIVE' && (
          <AnimatePresence>
            {!confirmed ? (
              <motion.button key="confirm" onClick={handleConfirm} disabled={selectedIdx === null}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="w-full rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-30 py-4 font-bold text-lg transition-colors min-h-[56px]">
                Confirm Answer
              </motion.button>
            ) : (
              <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-center text-white/50 text-sm py-2">
                ✓ Submitted — waiting for others…
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {!isAdmin && phase === 'LOCKED' && !confirmed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center text-white/40 text-sm py-2">
            Locked — you didn&apos;t answer in time
          </motion.div>
        )}

        {/* Reveal */}
        {phase === 'REVEALED' && reveal && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
            <p className="text-xs uppercase tracking-widest text-white/40 font-semibold">Got it right</p>
            {reveal.correctPlayers.length === 0 ? (
              <p className="text-white/50 text-sm">Nobody got it right!</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {reveal.correctPlayers.map(({ id, name }) => (
                  <span key={id} className="bg-green-500/20 text-green-300 rounded-full px-3 py-0.5 text-sm font-medium">
                    ✓ {name}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {leaderboard.length > 0 && <LeaderboardPanel entries={leaderboard} />}
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <motion.div initial={{ y: 80 }} animate={{ y: 0 }}
          className="sticky bottom-0 border-t border-white/10 bg-[#0f0a1e]/90 backdrop-blur-md px-4 py-4">
          <div className="max-w-lg mx-auto space-y-3">
            {(phase === 'QUESTION_ACTIVE' || phase === 'LOCKED') && (
              <div className="text-center text-white/50 text-sm">
                {submissions.count} / {submissions.totalPlayers} answered
              </div>
            )}
            {phase === 'QUESTION_ACTIVE' && (
              <motion.button onClick={() => socket.emit('admin:lock')}
                animate={allSubmitted ? { scale: [1, 1.02, 1] } : {}}
                transition={{ repeat: allSubmitted ? Infinity : 0, duration: 1 }}
                className={`w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-bold text-base transition-all min-h-[56px] ${allSubmitted ? 'bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-900/40' : 'bg-white/10 hover:bg-white/20'}`}>
                <Lock size={18} /> Lock Answers
              </motion.button>
            )}
            {phase === 'LOCKED' && (
              <button onClick={() => socket.emit('admin:reveal')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-yellow-600 hover:bg-yellow-500 py-4 font-bold text-base transition-colors min-h-[56px]">
                <Eye size={18} /> Show Answer
              </button>
            )}
            {phase === 'REVEALED' && (
              <button onClick={() => socket.emit('admin:nextQuestion')}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 py-4 font-bold text-base transition-all min-h-[56px]">
                {currentIndex >= totalQuestions - 1 ? <>Finish Game 🏁</> : <><ChevronRight size={18} /> Next Question</>}
              </button>
            )}
            <button onClick={() => { if (confirm('Kill this game?')) socket.emit('admin:killGame'); }}
              className="w-full flex items-center justify-center gap-2 text-white/20 hover:text-red-400 text-xs transition-colors py-1">
              <X size={12} /> Kill Game
            </button>
          </div>
        </motion.div>
      )}

      {finished && (
        <FinalResults leaderboard={finished.leaderboardFull} isAdmin={isAdmin}
          onPlayAgain={() => {
            setFinished(null); setReveal(null); setLeaderboard([]);
            socket.emit('admin:playAgain');
          }} />
      )}
    </div>
  );
}
