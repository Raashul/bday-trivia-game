-- Birthday Trivia Party — Database Schema

create table if not exists questions (
  id          text primary key,
  prompt      text not null,
  options     jsonb not null,        -- string[2-4]
  answer      int  not null,         -- 0-based index into options
  category    text,
  created_at  timestamptz not null default now()
);

create table if not exists players (
  id          text primary key,      -- nanoid, stored client-side in localStorage
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists responses (
  id           bigserial primary key,
  player_id    text not null references players(id),
  question_id  text not null references questions(id),
  selected_idx int  not null,        -- -1 if player did not submit
  is_correct   boolean not null,
  points       int  not null,
  created_at   timestamptz not null default now(),
  unique (player_id, question_id)
);
