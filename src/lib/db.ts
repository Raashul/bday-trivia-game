import postgres from 'postgres';
import type { LeaderboardEntry } from './events';

const sql = postgres(process.env.DATABASE_URL!, { max: 10, ssl: { rejectUnauthorized: false } });

export interface QuestionRecord {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  category?: string;
}

export const db = {
  async createPlayer(player: { id: string; name: string }) {
    await sql`
      INSERT INTO players (id, name) VALUES (${player.id}, ${player.name})
      ON CONFLICT (id) DO NOTHING
    `;
  },

  async createResponse(response: {
    playerId: string;
    questionId: string;
    selectedIdx: number;
    isCorrect: boolean;
    points: number;
  }) {
    await sql`
      INSERT INTO responses (player_id, question_id, selected_idx, is_correct, points)
      VALUES (${response.playerId}, ${response.questionId}, ${response.selectedIdx}, ${response.isCorrect}, ${response.points})
      ON CONFLICT (player_id, question_id) DO NOTHING
    `;
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const rows = await sql`
      SELECT
        p.id           AS "playerId",
        p.name,
        COALESCE(SUM(r.points), 0)::int                              AS "totalPoints",
        COALESCE(COUNT(*) FILTER (WHERE r.is_correct), 0)::int       AS "correctCount"
      FROM players p
      LEFT JOIN responses r ON r.player_id = p.id
      GROUP BY p.id, p.name, p.created_at
      ORDER BY "totalPoints" DESC, "correctCount" DESC, p.created_at ASC
    `;
    return rows.map((row, i) => ({ ...row, rank: i + 1 })) as LeaderboardEntry[];
  },

  async createGame(code: string) {
    await sql`INSERT INTO games (code) VALUES (${code})`;
  },

  async getGame(code: string) {
    const rows = await sql`SELECT code, status FROM games WHERE code = ${code}`;
    return (rows[0] as { code: string; status: string } | undefined) ?? null;
  },

  async setGameStatus(code: string, status: 'finished' | 'killed') {
    await sql`UPDATE games SET status = ${status}, finished_at = now() WHERE code = ${code}`;
  },

  async deletePlayer(playerId: string) {
    await sql`DELETE FROM players WHERE id = ${playerId}`;
  },

  // Wipe both tables so old game data never bleeds into a new game.
  // CASCADE clears responses via the FK.
  async resetForNewGame() {
    await sql`TRUNCATE players CASCADE`;
  },

  // Re-insert current lobby players after a reset.
  async syncPlayers(players: { id: string; name: string }[]) {
    for (const p of players) {
      await sql`
        INSERT INTO players (id, name) VALUES (${p.id}, ${p.name})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  },

  async addQuestion(question: {
    id: string;
    prompt: string;
    options: string[];
    answer: number;
    category?: string;
  }) {
    await sql`
      INSERT INTO questions (id, prompt, options, answer, category)
      VALUES (
        ${question.id},
        ${question.prompt},
        ${sql.json(question.options)},
        ${question.answer},
        ${question.category ?? null}
      )
    `;
  },

  async getQuestions(): Promise<QuestionRecord[]> {
    const rows = await sql`
      SELECT id, prompt, options, answer, category
      FROM questions
      ORDER BY created_at ASC
    `;
    return rows as unknown as QuestionRecord[];
  },
};
