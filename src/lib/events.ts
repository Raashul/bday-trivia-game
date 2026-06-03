// Shared Socket.IO event names and payload types — imported by both server and client.

export type Phase =
  | 'LOBBY'
  | 'QUESTION_ACTIVE'
  | 'LOCKED'
  | 'REVEALED'
  | 'FINISHED';

export interface Player {
  id: string;
  name: string;
}

// Question shape sent to clients — answer index is intentionally omitted during active/locked phases.
export interface QuestionPayload {
  id: string;
  prompt: string;
  options: string[];
  category?: string;
}

export interface LeaderboardEntry {
  playerId: string;
  name: string;
  totalPoints: number;
  correctCount: number;
  rank: number;
}

// ── Server → Client ─────────────────────────────────────────────────────────

export interface GameStatePayload {
  phase: Phase;
  currentIndex: number;
  totalQuestions: number;
  question?: QuestionPayload;
  alreadySubmitted?: boolean;  // set for the specific player's socket
  selectedIdx?: number | null; // which option the player picked (post-submit)
}

export interface SubmissionUpdatePayload {
  count: number;
  totalPlayers: number;
  submittedIds?: string[]; // admin-only
}

export interface RevealPayload {
  correctIdx: number;
  correctPlayers: { id: string; name: string }[];
  leaderboardTop5: LeaderboardEntry[];
}

export interface FinishedPayload {
  leaderboardFull: LeaderboardEntry[];
}

export interface ServerToClientEvents {
  'lobby:update': (data: { players: Player[] }) => void;
  'game:state': (data: GameStatePayload) => void;
  'game:submissionUpdate': (data: SubmissionUpdatePayload) => void;
  'game:reveal': (data: RevealPayload) => void;
  'game:finished': (data: FinishedPayload) => void;
  'game:closed': (data: { reason: string }) => void;
  error: (data: { message: string }) => void;
}

// ── Client → Server ─────────────────────────────────────────────────────────

export interface ClientToServerEvents {
  'player:join': (
    data: { name: string },
    callback: (res: { playerId: string }) => void
  ) => void;
  'player:rejoin': (data: { playerId: string }) => void;
  'admin:auth': (
    data: { password: string },
    callback: (res: { ok: boolean }) => void
  ) => void;
  'admin:startGame': () => void;
  'player:submitAnswer': (data: {
    questionId: string;
    selectedIdx: number;
  }) => void;
  'admin:lock': () => void;
  'admin:reveal': () => void;
  'admin:nextQuestion': () => void;
  'admin:playAgain': () => void;
  'player:leave': () => void;
  'admin:createGame': (callback: (res: { code: string }) => void) => void;
  'game:join': (
    data: { code: string },
    callback: (res: { ok: boolean; error?: string }) => void
  ) => void;
  'admin:killGame': () => void;
}

export interface InterServerEvents {}
export interface SocketData {}
