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

    create table if not exists leave_requests (
      id bigserial primary key,
      worker_id bigint not null references workers(id) on delete cascade,
      leave_type text not null default 'annual',
      starts_on date not null,
      ends_on date not null,
      reason text,
      status text not null default 'pending',
      manager_note text,
      created_at timestamptz not null default now(),
      reviewed_at timestamptz,
      constraint valid_leave_range check (ends_on >= starts_on),
      constraint valid_leave_status check (status in ('pending','approved','rejected','cancelled'))
    );

    create table if not exists worker_availability (
      id bigserial primary key,
      worker_id bigint not null references workers(id) on delete cascade,
      weekday smallint not null check (weekday between 0 and 6),
      start_time time not null,
      end_time time not null,
      is_available boolean not null default true,
      note text,
      created_at timestamptz not null default now(),
      constraint valid_availability_range check (end_time > start_time)
    );

    create table if not exists app_users (
      id bigserial primary key,
      full_name text not null,
      email text not null,
      password_hash text not null,
      role text not null,
      active boolean not null default true,
      worker_id bigint references workers(id) on delete set null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint app_users_role_check check (role in ('admin','authorizer','hrm','worker'))
    );

    update app_users set worker_id=null where worker_id is not null and role<>'worker';

    with ranked as (
      select id,row_number() over(partition by worker_id order by created_at asc,id asc) as rn
      from app_users where worker_id is not null
    )
    update app_users u set worker_id=null from ranked r where u.id=r.id and r.rn>1;

    do $$
    begin
      if not exists(select 1 from pg_constraint where conname='app_users_worker_role_check') then
        alter table app_users add constraint app_users_worker_role_check check (worker_id is null or role='worker');
      end if;
    end $$;

    create unique index if not exists ux_app_users_email_lower on app_users(lower(email));
    create unique index if not exists ux_app_users_worker_id on app_users(worker_id) where worker_id is not null;

    create table if not exists user_sessions (
      id bigserial primary key,
      user_id bigint not null references app_users(id) on delete cascade,
      token_hash text not null unique,
      expires_at timestamptz not null,
      created_at timestamptz not null default now()
    );

    create index if not exists idx_shifts_worker_time on shifts(worker_id, starts_at, ends_at);
    create index if not exists idx_leave_worker_dates on leave_requests(worker_id, starts_on, ends_on);
    create index if not exists idx_leave_status on leave_requests(status);
    create index if not exists idx_availability_worker_weekday on worker_availability(worker_id, weekday);
    create index if not exists idx_user_sessions_user on user_sessions(user_id);
    create index if not exists idx_user_sessions_expiry on user_sessions(expires_at);
  `);
}
