-- ==============================================================================
-- SpendSense — Supabase Database Schema & Row Level Security (RLS) Policies
-- ==============================================================================

-- 1. Profiles Table (linked to Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Accounts Table
create table if not exists public.accounts (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  institution text not null,
  type text not null check (type in ('checking', 'savings', 'credit', 'wallet', 'cash')),
  balance numeric(14, 2) not null default 0.00,
  account_number_mask text default '••••0000',
  currency text default 'INR',
  credit_limit numeric(14, 2),
  statement_due text,
  apy numeric(5, 2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Budget Categories Table
create table if not exists public.budget_categories (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  allocated numeric(14, 2) not null default 0.00,
  spent numeric(14, 2) not null default 0.00,
  category_group text not null,
  period text default 'monthly',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. Recurring Payments Table
create table if not exists public.recurring_payments (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  amount numeric(14, 2) not null,
  frequency text not null check (frequency in ('weekly', 'monthly', 'yearly')),
  category text not null,
  payment_method text not null,
  next_payment_date date not null,
  status text not null default 'active' check (status in ('active', 'paused')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 5. Transactions Table
create table if not exists public.transactions (
  id text primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null default current_date,
  merchant text not null,
  description text,
  amount numeric(14, 2) not null,
  type text not null check (type in ('expense', 'income', 'transfer')),
  category text not null,
  account_id text references public.accounts(id) on delete set null,
  payment_method text not null default 'UPI',
  status text not null default 'cleared' check (status in ('cleared', 'pending', 'reconciled')),
  tags text[] default array[]::text[],
  notes text,
  receipt_ref text,
  tax_deductible boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==============================================================================
-- Enable Row Level Security (RLS) on all tables
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.budget_categories enable row level security;
alter table public.recurring_payments enable row level security;
alter table public.transactions enable row level security;

-- ==============================================================================
-- RLS Policies: User ownership enforcement (auth.uid() = user_id)
-- ==============================================================================

-- Profiles Policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Accounts Policies
drop policy if exists "Users can view own accounts" on public.accounts;
create policy "Users can view own accounts"
  on public.accounts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own accounts" on public.accounts;
create policy "Users can insert own accounts"
  on public.accounts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own accounts" on public.accounts;
create policy "Users can update own accounts"
  on public.accounts for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own accounts" on public.accounts;
create policy "Users can delete own accounts"
  on public.accounts for delete
  using (auth.uid() = user_id);

-- Budget Categories Policies
drop policy if exists "Users can view own budget categories" on public.budget_categories;
create policy "Users can view own budget categories"
  on public.budget_categories for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own budget categories" on public.budget_categories;
create policy "Users can insert own budget categories"
  on public.budget_categories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own budget categories" on public.budget_categories;
create policy "Users can update own budget categories"
  on public.budget_categories for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own budget categories" on public.budget_categories;
create policy "Users can delete own budget categories"
  on public.budget_categories for delete
  using (auth.uid() = user_id);

-- Recurring Payments Policies
drop policy if exists "Users can view own recurring payments" on public.recurring_payments;
create policy "Users can view own recurring payments"
  on public.recurring_payments for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own recurring payments" on public.recurring_payments;
create policy "Users can insert own recurring payments"
  on public.recurring_payments for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own recurring payments" on public.recurring_payments;
create policy "Users can update own recurring payments"
  on public.recurring_payments for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own recurring payments" on public.recurring_payments;
create policy "Users can delete own recurring payments"
  on public.recurring_payments for delete
  using (auth.uid() = user_id);

-- Transactions Policies
drop policy if exists "Users can view own transactions" on public.transactions;
create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own transactions" on public.transactions;
create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own transactions" on public.transactions;
create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- ==============================================================================
-- Automatic Trigger: Create a profile entry when a user signs up
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
