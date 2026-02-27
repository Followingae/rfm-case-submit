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

-- 3. Shareholder KYC (user-entered)
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
  doc_type text not null,
  file_name text not null,
  file_path text not null,
  file_size bigint default 0,
  file_type text default '',
  created_at timestamptz default now()
);

-- =============================================
-- OCR EXTRACTED DATA — Structured Tables
-- =============================================

-- 5. OCR: Merchant Details (MDF Schedule 01 — Sections 1, 2, 4, 5)
create table if not exists ocr_merchant_details (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,

  -- Section 1: Merchant Information
  merchant_legal_name text,
  doing_business_as text,
  emirate text,
  country text,
  address text,
  po_box text,
  mobile_no text,
  telephone_no text,
  email_1 text,
  email_2 text,
  shop_location text,
  business_type text,
  web_address text,

  -- Section 2: Contact Person
  contact_name text,
  contact_title text,
  contact_mobile text,
  contact_work_phone text,

  -- Section 4: POS Details
  num_terminals text,
  product_pos boolean default false,
  product_ecom boolean default false,
  product_mpos boolean default false,
  product_moto boolean default false,

  -- Section 5: Settlement Bank
  account_no text,
  iban text,
  account_title text,
  bank_name text,
  swift_code text,
  branch_name text,
  payment_plan text,

  -- Raw text for reference
  raw_text text,
  confidence_score real,
  extracted_at timestamptz default now(),

  constraint uq_ocr_merchant_case unique (case_id)
);

-- 6. OCR: Fee Schedule (MDF Schedule 01 — Section 3)
--    One row per card type so fees are queryable/comparable across merchants
create table if not exists ocr_fee_schedule (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  card_type text not null,        -- e.g. 'Visa', 'Mastercard', 'Debit', 'DCC'
  pos_rate text,                  -- percentage as string (OCR may have noise)
  ecom_rate text,
  created_at timestamptz default now()
);

-- 7. OCR: POS & ECOM Fees (one-off, rental, setup fees)
create table if not exists ocr_terminal_fees (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  fee_category text not null,     -- 'pos', 'mpos', 'ecom', 'other'
  fee_label text not null,        -- e.g. 'One-off Fee', 'Annual Rent', 'Setup Fee'
  amount text,                    -- AED amount as string
  created_at timestamptz default now()
);

-- 8. OCR: KYC Profile — Shareholders (MDF Schedule 02 — Section 1)
--    Shareholders extracted from the MDF KYC section (separate from user-uploaded KYC)
create table if not exists ocr_shareholders (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  shareholder_name text,
  shares_percentage text,
  nationality text,
  residence_status text,
  country_of_birth text,
  created_at timestamptz default now()
);

-- 9. OCR: KYC Business Profile (MDF Schedule 02 — Sections 1-5)
create table if not exists ocr_kyc_profile (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,

  -- Business projections
  projected_monthly_volume text,
  projected_monthly_count text,
  source_of_income text,
  income_country text,
  activity_details text,
  source_of_capital text,

  -- Business activities
  years_in_uae text,
  exact_business_nature text,

  -- Key suppliers (stored as JSONB array for flexibility)
  key_suppliers jsonb default '[]',
  -- Key customers
  key_customers jsonb default '[]',

  -- Sanctioned countries exposure (JSONB: [{country, has_business, percentage, goods}])
  sanctions_exposure jsonb default '[]',

  -- Existing banking (JSONB: [{bank, member_since, statements_submitted}])
  existing_banking jsonb default '[]',

  -- Other acquirer
  has_other_acquirer boolean,
  other_acquirer_names text,
  other_acquirer_years text,
  reason_for_magnati text,

  raw_text text,
  extracted_at timestamptz default now(),

  constraint uq_ocr_kyc_case unique (case_id)
);

-- 10. OCR: Trade License
create table if not exists ocr_trade_license (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,

  license_number text,
  issue_date text,
  expiry_date text,
  business_name text,
  legal_form text,
  activities text,
  authority text,             -- e.g. 'DED', 'JAFZA', 'DMCC'
  partners_listed text,       -- raw text of partners from TL

  raw_text text,
  confidence_score real,
  extracted_at timestamptz default now(),

  constraint uq_ocr_tl_case unique (case_id)
);

-- =============================================
-- INDEXES
-- =============================================

create index if not exists idx_case_documents_case_id on case_documents(case_id);
create index if not exists idx_shareholders_case_id on shareholders(case_id);
create index if not exists idx_shareholder_documents_sh_id on shareholder_documents(shareholder_id);
create index if not exists idx_cases_created_at on cases(created_at desc);
create index if not exists idx_ocr_merchant_case on ocr_merchant_details(case_id);
create index if not exists idx_ocr_fees_case on ocr_fee_schedule(case_id);
create index if not exists idx_ocr_terminal_fees_case on ocr_terminal_fees(case_id);
create index if not exists idx_ocr_shareholders_case on ocr_shareholders(case_id);
create index if not exists idx_ocr_kyc_case on ocr_kyc_profile(case_id);
create index if not exists idx_ocr_tl_case on ocr_trade_license(case_id);

-- =============================================
-- ROW LEVEL SECURITY — Open access (no auth)
-- =============================================

alter table cases enable row level security;
alter table case_documents enable row level security;
alter table shareholders enable row level security;
alter table shareholder_documents enable row level security;
alter table ocr_merchant_details enable row level security;
alter table ocr_fee_schedule enable row level security;
alter table ocr_terminal_fees enable row level security;
alter table ocr_shareholders enable row level security;
alter table ocr_kyc_profile enable row level security;
alter table ocr_trade_license enable row level security;

-- Permissive policies (anyone can read/write)
create policy "Allow all on cases" on cases for all using (true) with check (true);
create policy "Allow all on case_documents" on case_documents for all using (true) with check (true);
create policy "Allow all on shareholders" on shareholders for all using (true) with check (true);
create policy "Allow all on shareholder_documents" on shareholder_documents for all using (true) with check (true);
create policy "Allow all on ocr_merchant_details" on ocr_merchant_details for all using (true) with check (true);
create policy "Allow all on ocr_fee_schedule" on ocr_fee_schedule for all using (true) with check (true);
create policy "Allow all on ocr_terminal_fees" on ocr_terminal_fees for all using (true) with check (true);
create policy "Allow all on ocr_shareholders" on ocr_shareholders for all using (true) with check (true);
create policy "Allow all on ocr_kyc_profile" on ocr_kyc_profile for all using (true) with check (true);
create policy "Allow all on ocr_trade_license" on ocr_trade_license for all using (true) with check (true);

-- =============================================
-- STORAGE BUCKET
-- =============================================

insert into storage.buckets (id, name, public)
values ('case-documents', 'case-documents', true)
on conflict (id) do nothing;

create policy "Allow public uploads" on storage.objects for insert with check (bucket_id = 'case-documents');
create policy "Allow public reads" on storage.objects for select using (bucket_id = 'case-documents');
create policy "Allow public deletes" on storage.objects for delete using (bucket_id = 'case-documents');
