-- =============================================
-- RFM Case Submit Portal — Supabase Setup
-- Paste this entire script into Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- =============================================

-- 1. Cases table
create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null default '',
  dba text default '',
  case_type text not null default 'low-risk',
  branch_mode text,
  status text not null default 'incomplete',
  conditionals jsonb default '{}',
  created_at timestamptz default now()
);

-- 2. Case documents (tracks each uploaded file)
create table if not exists case_documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  item_id text not null,
  label text not null,
  category text not null,
  file_name text not null,
  file_path text not null,
  file_size bigint default 0,
  file_type text default '',
  created_at timestamptz default now()
);

-- 3. Shareholder KYC
create table if not exists shareholders (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  name text default '',
  percentage text default '',
  created_at timestamptz default now()
);

-- 4. Shareholder documents (passport, EID per shareholder)
create table if not exists shareholder_documents (
  id uuid primary key default gen_random_uuid(),
  shareholder_id uuid not null references shareholders(id) on delete cascade,
  doc_type text not null, -- 'passport' or 'eid'
  file_name text not null,
  file_path text not null,
  file_size bigint default 0,
  file_type text default '',
  created_at timestamptz default now()
);

-- 5. OCR extracted data
create table if not exists ocr_data (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  source text not null, -- 'mdf' or 'trade-license'
  data jsonb not null default '{}',
  raw_text text,
  created_at timestamptz default now()
);

-- 6. Indexes for performance
create index if not exists idx_case_documents_case_id on case_documents(case_id);
create index if not exists idx_shareholders_case_id on shareholders(case_id);
create index if not exists idx_shareholder_documents_sh_id on shareholder_documents(shareholder_id);
create index if not exists idx_ocr_data_case_id on ocr_data(case_id);
create index if not exists idx_cases_created_at on cases(created_at desc);

-- 7. Enable Row Level Security but allow all access (no auth)
alter table cases enable row level security;
alter table case_documents enable row level security;
alter table shareholders enable row level security;
alter table shareholder_documents enable row level security;
alter table ocr_data enable row level security;

-- Allow anon full access (no login required)
create policy "Allow all access to cases" on cases for all using (true) with check (true);
create policy "Allow all access to case_documents" on case_documents for all using (true) with check (true);
create policy "Allow all access to shareholders" on shareholders for all using (true) with check (true);
create policy "Allow all access to shareholder_documents" on shareholder_documents for all using (true) with check (true);
create policy "Allow all access to ocr_data" on ocr_data for all using (true) with check (true);

-- 8. Create storage bucket for documents
insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', true)
on conflict (id) do nothing;

-- Allow anon to upload/read/delete from storage
create policy "Allow public uploads" on storage.objects for insert with check (bucket_id = 'case-documents');
create policy "Allow public reads" on storage.objects for select using (bucket_id = 'case-documents');
create policy "Allow public deletes" on storage.objects for delete using (bucket_id = 'case-documents');
