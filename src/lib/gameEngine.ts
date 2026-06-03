import { nanoid } from 'nanoid';
import type { Server, Socket } from 'socket.io';
import { db, type QuestionRecord } from './db';
import type {
  ClientToServerEvents,
  GameStatePayload,
  InterServerEvents,
  LeaderboardEntry,
  Phase,
  Player,
  ServerToClientEvents,
  SocketData,
  SubmissionUpdatePayload,
} from './events';
import { computePoints } from './scoring';

type IoType = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type SocketType = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

interface PlayerRecord {
  id: string;
  name: string;
  socketId: string | null;
}

interface GameState {
  gameCode: string | null;
  phase: Phase;
  currentIndex: number;
  questions: QuestionRecord[];
  players: Map<string, PlayerRecord>;
  adminSocketIds: Set<string>;
  submissions: Map<string, number>;
  lastReveal: {
    correctIdx: number;
    correctPlayers: { id: string; name: string }[];
    leaderboardTop5: LeaderboardEntry[];
  } | null;
}

// No I, O, L to avoid visual confusion with 1, 0
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ';
function generateCode(): string {
  return Array.from(
    { length: 3 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join('');
}

export function setupSocketHandlers(io: IoType) {
  const state: GameState = {
    gameCode: null,
    phase: 'LOBBY',
    currentIndex: 0,
    questions: [],
    players: new Map(),
    adminSocketIds: new Set(),
    submissions: new Map(),
    lastReveal: null,
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  function isAdmin(socket: SocketType) {
    return state.adminSocketIds.has(socket.id);
  }

  function playerBySocket(socketId: string): PlayerRecord | undefined {
    for (const p of state.players.values()) {
      if (p.socketId === socketId) return p;
    }
  }

  function playerIdBySocket(socketId: string): string | undefined {
    return playerBySocket(socketId)?.id;
  }

  function getPlayersArray(): Player[] {
    return [...state.players.values()].map(({ id, name }) => ({ id, name }));
  }

  function safeQuestion() {
    const q = state.questions[state.currentIndex];
    if (!q) return undefined;
    return { id: q.id, prompt: q.prompt, options: q.options, category: q.category };
  }

  function buildStateFor(playerId?: string): GameStatePayload {
    const base: GameStatePayload = {
      phase: state.phase,
      currentIndex: state.currentIndex,
      totalQuestions: state.questions.length,
      question: safeQuestion(),
    };
    if (playerId !== undefined) {
      base.alreadySubmitted = state.submissions.has(playerId);
      base.selectedIdx = state.submissions.get(playerId) ?? null;
    }
    return base;
  }

  // Scope all broadcasts to the active game room.
  function room() {
    return state.gameCode ? io.to(state.gameCode) : io;
  }

  function broadcastState() {
    for (const [playerId, player] of state.players) {
      if (!player.socketId) continue;
      io.sockets.sockets.get(player.socketId)?.emit('game:state', buildStateFor(playerId));
    }
    for (const adminId of state.adminSocketIds) {
      if (playerIdBySocket(adminId)) continue;
      io.sockets.sockets.get(adminId)?.emit('game:state', buildStateFor());
    }
  }

  function broadcastSubmissionUpdate() {
    const count = state.submissions.size;
    const totalPlayers = state.players.size;
    room().emit('game:submissionUpdate', { count, totalPlayers });
    const submittedIds = [...state.submissions.keys()];
    for (const adminId of state.adminSocketIds) {
      io.sockets.sockets.get(adminId)?.emit('game:submissionUpdate', {
        count,
        totalPlayers,
        submittedIds,
      });
    }
  }

  function sendCurrentStateTo(socket: SocketType) {
    const playerId = playerIdBySocket(socket.id);
    socket.emit('game:state', buildStateFor(playerId));

    if (state.phase === 'LOBBY') {
      socket.emit('lobby:update', { players: getPlayersArray() });
    }
    if (state.phase === 'QUESTION_ACTIVE' || state.phase === 'LOCKED') {
      const data: SubmissionUpdatePayload = {
        count: state.submissions.size,
        totalPlayers: state.players.size,
      };
      if (isAdmin(socket)) data.submittedIds = [...state.submissions.keys()];
      socket.emit('game:submissionUpdate', data);
    }
    if (state.phase === 'REVEALED' && state.lastReveal) {
      socket.emit('game:reveal', state.lastReveal);
    }
    if (state.phase === 'FINISHED') {
      db.getLeaderboard().then((lb) =>
        socket.emit('game:finished', { leaderboardFull: lb })
      );
    }
  }

  // ── Connection ───────────────────────────────────────────────────────────

  io.on('connection', (socket) => {
    // Do NOT send state immediately — wait for game:join or admin:auth.

    // ── admin:auth ─────────────────────────────────────────────────────────

    socket.on('admin:auth', ({ password }, callback) => {
      const ok = password === process.env.ADMIN_PASSWORD;
      if (ok) state.adminSocketIds.add(socket.id);
      callback({ ok });
      if (ok && state.gameCode) {
        socket.join(state.gameCode);
        sendCurrentStateTo(socket);
      }
    });

    // ── admin:createGame ───────────────────────────────────────────────────

    socket.on('admin:createGame', async (callback) => {
      if (!isAdmin(socket)) return;

      // Kill any existing active game so the old code becomes invalid.
      if (state.gameCode) {
        await db.setGameStatus(state.gameCode, 'killed');
        room().emit('game:closed', { reason: 'killed' });
      }

      let code: string;
      let attempts = 0;
      do {
        code = generateCode();
        attempts++;
      } while ((await db.getGame(code)) !== null && attempts < 20);

      await db.createGame(code);

      state.gameCode = code;
      state.phase = 'LOBBY';
      state.currentIndex = 0;
      state.questions = [];
      state.submissions.clear();
      state.lastReveal = null;
      state.players.clear();

      socket.join(code);
      callback({ code });
    });

    // ── game:join ──────────────────────────────────────────────────────────

    socket.on('game:join', async ({ code }, callback) => {
      if (!state.gameCode || code !== state.gameCode) {
        const game = await db.getGame(code);
        if (!game) {
          callback({ ok: false, error: 'Game not found.' });
        } else {
          callback({ ok: false, error: 'This game has already ended.' });
        }
        return;
      }

      socket.join(code);
      sendCurrentStateTo(socket);
      callback({ ok: true });
    });

    // ── admin:killGame ─────────────────────────────────────────────────────

    socket.on('admin:killGame', async () => {
      if (!isAdmin(socket)) return;
      if (!state.gameCode) return;

      const code = state.gameCode;
      await db.setGameStatus(code, 'killed');
      room().emit('game:closed', { reason: 'killed' });

      state.gameCode = null;
      state.phase = 'LOBBY';
      state.currentIndex = 0;
      state.questions = [];
      state.submissions.clear();
      state.lastReveal = null;
      state.players.clear();
    });

    // ── player:join ────────────────────────────────────────────────────────

    socket.on('player:join', async ({ name }, callback) => {
      if (state.phase !== 'LOBBY') {
        socket.emit('error', { message: 'Game already in progress.' });
        return;
      }

      let finalName = name.trim().slice(0, 30);
      const existingNames = new Set([...state.players.values()].map((p) => p.name));
      if (existingNames.has(finalName)) {
        let suffix = 2;
        while (existingNames.has(`${finalName} (${suffix})`)) suffix++;
        finalName = `${finalName} (${suffix})`;
      }

      const playerId = nanoid();
      await db.createPlayer({ id: playerId, name: finalName });
      state.players.set(playerId, { id: playerId, name: finalName, socketId: socket.id });

      callback({ playerId });
      room().emit('lobby:update', { players: getPlayersArray() });
    });

    // ── player:rejoin ──────────────────────────────────────────────────────

    socket.on('player:rejoin', ({ playerId }) => {
      const player = state.players.get(playerId);
      if (!player) {
        socket.emit('error', { message: 'Player not found. Please rejoin.' });
        return;
      }
      player.socketId = socket.id;
      sendCurrentStateTo(socket);
    });

    // ── player:leave ───────────────────────────────────────────────────────

    socket.on('player:leave', async () => {
      if (state.phase !== 'LOBBY') return;
      const playerId = playerIdBySocket(socket.id);
      if (!playerId) return;
      state.players.delete(playerId);
      await db.deletePlayer(playerId);
      room().emit('lobby:update', { players: getPlayersArray() });
    });

    // ── admin:startGame ────────────────────────────────────────────────────

    socket.on('admin:startGame', async () => {
      if (!isAdmin(socket)) return;
      if (state.phase !== 'LOBBY') return;
      if (state.players.size === 0) {
        socket.emit('error', { message: 'No players have joined yet.' });
        return;
      }

      const questions = await db.getQuestions();
      if (questions.length === 0) {
        socket.emit('error', { message: 'No questions configured. Add some first.' });
        return;
      }

      await db.resetForNewGame();
      await db.syncPlayers([...state.players.values()]);

      state.questions = questions;
      state.currentIndex = 0;
      state.submissions.clear();
      state.lastReveal = null;
      state.phase = 'QUESTION_ACTIVE';

      broadcastState();
    });

    // ── player:submitAnswer ────────────────────────────────────────────────

    socket.on('player:submitAnswer', ({ questionId, selectedIdx }) => {
      if (state.phase !== 'QUESTION_ACTIVE') return;
      const currentQuestion = state.questions[state.currentIndex];
      if (!currentQuestion || currentQuestion.id !== questionId) return;
      const playerId = playerIdBySocket(socket.id);
      if (!playerId) return;
      if (state.submissions.has(playerId)) return;
      state.submissions.set(playerId, selectedIdx);
      broadcastSubmissionUpdate();
    });

    // ── admin:lock ─────────────────────────────────────────────────────────

    socket.on('admin:lock', () => {
      if (!isAdmin(socket)) return;
      if (state.phase !== 'QUESTION_ACTIVE') return;
      state.phase = 'LOCKED';
      broadcastState();
    });

    // ── admin:reveal ───────────────────────────────────────────────────────

    socket.on('admin:reveal', async () => {
      if (!isAdmin(socket)) return;
      if (state.phase !== 'LOCKED') return;

      const currentQuestion = state.questions[state.currentIndex];
      const correctIdx = currentQuestion.answer;
      const correctPlayerIds: string[] = [];

      await Promise.all(
        [...state.players.keys()].map(async (playerId) => {
          const selectedIdx = state.submissions.get(playerId) ?? -1;
          const isCorrect = selectedIdx === correctIdx;
          const points = computePoints(isCorrect);
          if (isCorrect) correctPlayerIds.push(playerId);
          await db.createResponse({ playerId, questionId: currentQuestion.id, selectedIdx, isCorrect, points });
        })
      );

      const leaderboard = await db.getLeaderboard();
      const correctPlayers = correctPlayerIds.map((id) => ({
        id,
        name: state.players.get(id)?.name ?? id,
      }));

      state.lastReveal = { correctIdx, correctPlayers, leaderboardTop5: leaderboard.slice(0, 5) };
      state.phase = 'REVEALED';

      room().emit('game:reveal', state.lastReveal);
      broadcastState();
    });

    // ── admin:nextQuestion ─────────────────────────────────────────────────

    socket.on('admin:nextQuestion', async () => {
      if (!isAdmin(socket)) return;
      if (state.phase !== 'REVEALED') return;

      const isLast = state.currentIndex >= state.questions.length - 1;

      if (isLast) {
        state.phase = 'FINISHED';
        state.lastReveal = null;
        if (state.gameCode) await db.setGameStatus(state.gameCode, 'finished');
        broadcastState();
        const lb = await db.getLeaderboard();
        room().emit('game:finished', { leaderboardFull: lb });
      } else {
        state.currentIndex++;
        state.submissions.clear();
        state.lastReveal = null;
        state.phase = 'QUESTION_ACTIVE';
        broadcastState();
      }
    });

    // ── admin:playAgain ────────────────────────────────────────────────────

    socket.on('admin:playAgain', async () => {
      if (!isAdmin(socket)) return;
      await db.resetForNewGame();

      state.phase = 'LOBBY';
      state.currentIndex = 0;
      state.questions = [];
      state.submissions.clear();
      state.lastReveal = null;
      await db.syncPlayers([...state.players.values()]);

      broadcastState();
      room().emit('lobby:update', { players: getPlayersArray() });
    });

    // ── disconnect ─────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      state.adminSocketIds.delete(socket.id);
      const player = playerBySocket(socket.id);
      if (player) player.socketId = null;
    });
  });
}
