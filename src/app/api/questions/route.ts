import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

function checkAuth(req: NextRequest) {
  const pwd = req.headers.get('x-admin-password');
  return pwd === process.env.ADMIN_PASSWORD;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const body = await req.json().catch(() => null);
  if (!body) return badRequest('Invalid JSON');

  const { prompt, options, answer, category } = body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return badRequest('prompt is required');
  }
  if (!Array.isArray(options) || options.length < 2 || options.length > 4) {
    return badRequest('options must be an array of 2–4 strings');
  }
  if (typeof answer !== 'number' || answer < 0 || answer >= options.length) {
    return badRequest('answer must be a valid 0-based index into options');
  }

  const id = nanoid();
  await db.addQuestion({
    id,
    prompt: prompt.trim(),
    options,
    answer,
    category: category?.trim() || undefined,
  });

  return NextResponse.json({ id }, { status: 201 });
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();
  const questions = await db.getQuestions();
  return NextResponse.json(questions);
}
