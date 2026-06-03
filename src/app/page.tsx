'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getSocket } from '@/lib/socketClient';

export default function HomePage() {
  const router = useRouter();
  const socket = getSocket();

  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [authError, setAuthError] = useState('');
  const [gameCode, setGameCode] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('adminPassword');
    if (stored) {
      socket.emit('admin:auth', { password: stored }, ({ ok }) => {
        if (ok) setIsAdmin(true);
      });
    }
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    socket.emit('admin:auth', { password }, ({ ok }) => {
      if (ok) {
        localStorage.setItem('isAdmin', 'true');
        localStorage.setItem('adminPassword', password);
        setIsAdmin(true);
      } else {
        setAuthError('Wrong password');
      }
    });
  }

  function handleCreateGame() {
    setCreating(true);
    socket.emit('admin:createGame', ({ code }) => {
      setGameCode(code);
      setCreating(false);
    });
  }

  function handleGoToLobby() {
    if (gameCode) router.push(`/game/${gameCode}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 text-center"
      >
        <div className="text-5xl mb-2">🎂</div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          Birthday Trivia
        </h1>
        <p className="text-white/40 text-sm mt-1">Host control panel</p>
      </motion.div>

      <div className="w-full max-w-sm space-y-6">
        <AnimatePresence mode="wait">
          {!isAdmin ? (
            <motion.form
              key="auth"
              onSubmit={handleAuth}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <input
                type="password"
                placeholder="Host password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base"
              />
              {authError && <p className="text-red-400 text-sm">{authError}</p>}
              <button
                type="submit"
                disabled={!password}
                className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 py-3 font-semibold text-white transition-colors min-h-[44px]"
              >
                Login as Host
              </button>
            </motion.form>
          ) : !gameCode ? (
            <motion.div
              key="create"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <p className="text-white/50 text-sm text-center">Ready to host a game?</p>
              <button
                onClick={handleCreateGame}
                disabled={creating}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 py-4 font-bold text-lg text-white transition-all min-h-[56px] shadow-lg shadow-purple-900/40"
              >
                {creating ? 'Creating…' : 'Create Game 🎉'}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="code"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 text-center"
            >
              <div>
                <p className="text-white/50 text-sm mb-3">Share this code with your players</p>
                <div className="flex justify-center gap-3">
                  {gameCode.split('').map((letter, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="w-20 h-24 rounded-2xl bg-gradient-to-b from-purple-600 to-purple-800 border border-purple-500/40 flex items-center justify-center text-5xl font-black tracking-widest shadow-lg shadow-purple-900/50"
                    >
                      {letter}
                    </motion.div>
                  ))}
                </div>
                <p className="text-white/30 text-xs mt-3">
                  Players join at <span className="text-white/60 font-mono">/game/{gameCode}</span>
                </p>
              </div>
              <button
                onClick={handleGoToLobby}
                className="w-full rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 py-4 font-semibold text-white transition-colors min-h-[56px]"
              >
                Go to Lobby →
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
