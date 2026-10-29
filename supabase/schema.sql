-- Enable UUID generator
create extension if not exists "uuid-ossp";

-- Drop legacy/template tables if they exist to avoid collision
drop table if exists public.expense_splits cascade;
drop table if exists public.expenses cascade;
drop table if exists public.group_members cascade;
drop table if exists public.trips cascade;

create table public.trips (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  currency text default 'INR',
  created_at timestamptz default now()
);

create table public.group_members (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  name text not null,
  upi_id text,
  diet_tag text check (diet_tag in ('veg', 'egg', 'non_veg')) default 'veg',
  drinks_alcohol boolean default false,
  created_at timestamptz default now()
);

create table public.expenses (
  id uuid primary key default uuid_generate_v4(),
  trip_id uuid references public.trips(id) on delete cascade not null,
  title text not null,
  paid_by_member_id uuid references public.group_members(id) not null,
  total_amount numeric(10,2) not null,
  tax_and_tip numeric(10,2) default 0,
  input_source text check (input_source in ('receipt', 'voice', 'text')) default 'text',
  raw_ai_payload jsonb,
  created_at timestamptz default now()
);

create table public.expense_splits (
  id uuid primary key default uuid_generate_v4(),
  expense_id uuid references public.expenses(id) on delete cascade not null,
  member_id uuid references public.group_members(id) on delete cascade not null,
  owed_amount numeric(10,2) not null,
  unique (expense_id, member_id)
);

-- Enable real-time replication
do $$
begin
  alter publication supabase_realtime add table public.trips;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.group_members;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.expenses;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.expense_splits;
exception when others then null;
end $$;

