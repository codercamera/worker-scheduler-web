import { Pool } from 'pg';

const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });

if (process.env.NODE_ENV !== 'production') globalForDb.pool = pool;

export async function ensureSchema() {
  await pool.query(`
    create table if not exists workers (
      id bigserial primary key,
      full_name text not null,
      role_title text,
      email text,
      phone text,
      active boolean not null default true,
      weekly_target_hours numeric(5,2) not null default 40,
      created_at timestamptz not null default now()
    );

    create table if not exists shifts (
      id bigserial primary key,
      worker_id bigint not null references workers(id) on delete cascade,
      title text not null,
      starts_at timestamptz not null,
      ends_at timestamptz not null,
      status text not null default 'scheduled',
      notes text,
      created_at timestamptz not null default now(),
      constraint valid_shift_range check (ends_at > starts_at)
    );

    create index if not exists idx_shifts_worker_time on shifts(worker_id, starts_at, ends_at);
  `);
}
