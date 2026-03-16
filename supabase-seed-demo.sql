-- ============================================================
-- RFM PORTAL — DEMO SEED DATA FOR BOARD PITCH
-- Run AFTER all migrations. Run supabase-wipe-test-data.sql first if re-seeding.
-- ============================================================

-- Bypass RLS for seeding
SET session_replication_role = 'replica';

-- ============================================================
-- 1. USERS (7 profiles — passwords set via Supabase Auth dashboard)
-- ============================================================
-- NOTE: Create these users in Supabase Auth dashboard first, then
-- update the UUIDs below to match. The trigger auto-creates profiles,
-- but we UPDATE them here with correct roles and names.

-- Placeholder UUIDs — REPLACE with real auth.users IDs after creating accounts
DO $$
DECLARE
  v_admin     UUID := '00000000-0000-0000-0000-000000000001';
  v_sarah     UUID := '00000000-0000-0000-0000-000000000002';
  v_omar      UUID := '00000000-0000-0000-0000-000000000003';
  v_fatima    UUID := '00000000-0000-0000-0000-000000000004';
  v_khalid    UUID := '00000000-0000-0000-0000-000000000005';
  v_rania     UUID := '00000000-0000-0000-0000-000000000006';
  v_board     UUID := '00000000-0000-0000-0000-000000000007';

  -- Case UUIDs
  c1  UUID := gen_random_uuid();
  c2  UUID := gen_random_uuid();
  c3  UUID := gen_random_uuid();
  c4  UUID := gen_random_uuid();
  c5  UUID := gen_random_uuid();
  c6  UUID := gen_random_uuid();
  c7  UUID := gen_random_uuid();
  c8  UUID := gen_random_uuid();
  c9  UUID := gen_random_uuid();
  c10 UUID := gen_random_uuid();
  c11 UUID := gen_random_uuid();
  c12 UUID := gen_random_uuid();
  c13 UUID := gen_random_uuid();
  c14 UUID := gen_random_uuid();
  c15 UUID := gen_random_uuid();
  c16 UUID := gen_random_uuid();
  c17 UUID := gen_random_uuid();
  c18 UUID := gen_random_uuid();

  -- Shareholder UUIDs
  s1 UUID := gen_random_uuid();
  s2 UUID := gen_random_uuid();
  s3 UUID := gen_random_uuid();
  s4 UUID := gen_random_uuid();
  s5 UUID := gen_random_uuid();
  s6 UUID := gen_random_uuid();
  s7 UUID := gen_random_uuid();
  s8 UUID := gen_random_uuid();
BEGIN

-- ── Profiles ──
INSERT INTO profiles (id, email, full_name, role, is_active) VALUES
  (v_admin,  'admin@rfmloyalty.com',   'Admin User',    'superadmin',  true),
  (v_sarah,  'sarah@rfmloyalty.com',   'Sarah Ahmed',   'sales',       true),
  (v_omar,   'omar@rfmloyalty.com',    'Omar Hassan',   'sales',       true),
  (v_fatima, 'fatima@rfmloyalty.com',  'Fatima Ali',    'processing',  true),
  (v_khalid, 'khalid@rfmloyalty.com',  'Khalid Noor',   'processing',  true),
  (v_rania,  'rania@rfmloyalty.com',   'Rania Malik',   'management',  true),
  (v_board,  'board@rfmloyalty.com',   'Board Demo',    'management',  true)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- 2. CASES (18 cases across all types and statuses)
-- ============================================================
INSERT INTO cases (id, legal_name, dba, case_type, status, created_by, assigned_to, submitted_at, reviewed_at, reviewed_by, readiness_score, readiness_tier, created_at) VALUES
  -- LOW RISK (6) — Sarah & Omar
  (c1,  'Al Baraka Trading LLC',         'Baraka Fresh',       'low-risk', 'incomplete',   v_sarah, NULL,     NULL, NULL, NULL, 35, 'red',    '2026-01-08 09:00:00+04'),
  (c2,  'Gulf Star Electronics FZE',     'Gulf Star',          'low-risk', 'complete',     v_sarah, NULL,     NULL, NULL, NULL, 72, 'amber',  '2026-01-15 10:30:00+04'),
  (c3,  'Noor Al Hayat Pharmacy LLC',    'Noor Pharmacy',      'low-risk', 'submitted',    v_sarah, NULL,     '2026-02-05 14:00:00+04', NULL, NULL, 88, 'green', '2026-01-22 11:00:00+04'),
  (c4,  'Desert Rose Restaurant LLC',    'Desert Rose',        'low-risk', 'in_review',    v_omar,  v_fatima, '2026-02-10 09:00:00+04', NULL, NULL, 91, 'green', '2026-02-01 08:30:00+04'),
  (c5,  'Emirates Auto Parts Trading',   'EAP Trading',        'low-risk', 'active',       v_sarah, v_fatima, '2026-02-12 10:00:00+04', '2026-02-18 16:00:00+04', v_fatima, 95, 'green', '2026-02-03 09:15:00+04'),
  (c6,  'Skyline Fashion Boutique LLC',  'Skyline Fashion',    'low-risk', 'returned',     v_omar,  v_khalid, '2026-02-20 11:00:00+04', '2026-02-25 14:30:00+04', v_khalid, 52, 'amber', '2026-02-14 10:00:00+04'),

  -- HIGH RISK (3) — Omar & Sarah
  (c7,  'Global Commodities DMCC',       'GC Trading',         'high-risk', 'submitted',   v_omar,  NULL,     '2026-02-22 09:00:00+04', NULL, NULL, 82, 'green', '2026-02-08 14:00:00+04'),
  (c8,  'Pinnacle Financial Services',   'Pinnacle FS',        'high-risk', 'approved',    v_sarah, v_fatima, '2026-02-15 10:00:00+04', '2026-02-28 11:00:00+04', v_fatima, 90, 'green', '2026-02-06 11:30:00+04'),
  (c9,  'Arabian Gulf Exchange LLC',     'AG Exchange',        'high-risk', 'escalated',   v_omar,  v_khalid, '2026-03-01 09:00:00+04', NULL, NULL, 78, 'green', '2026-02-18 13:00:00+04'),

  -- E-INVOICE (3) — Sarah
  (c10, 'Smart Solutions IT LLC',        'SmartSol',           'einvoice', 'complete',     v_sarah, NULL,     NULL, NULL, NULL, 65, 'amber',  '2026-02-20 10:00:00+04'),
  (c11, 'Digital Commerce Group FZE',    'DCG',                'einvoice', 'submitted',    v_sarah, NULL,     '2026-03-05 09:30:00+04', NULL, NULL, 85, 'green', '2026-02-25 14:00:00+04'),
  (c12, 'Cloud Kitchen Concepts LLC',    'CloudEats',          'einvoice', 'active',       v_omar,  v_fatima, '2026-02-10 11:00:00+04', '2026-02-20 15:00:00+04', v_fatima, 92, 'green', '2026-01-28 09:00:00+04'),

  -- PAYMENT GATEWAY (3) — Omar
  (c13, 'TechPay Solutions FZCO',        'TechPay',            'payment-gateway', 'in_review', v_omar, v_khalid, '2026-03-02 10:00:00+04', NULL, NULL, 87, 'green', '2026-02-22 08:00:00+04'),
  (c14, 'E-Market Hub LLC',             'E-Market',           'payment-gateway', 'approved',  v_sarah, v_fatima, '2026-02-18 09:00:00+04', '2026-03-05 10:00:00+04', v_fatima, 93, 'green', '2026-02-10 11:00:00+04'),
  (c15, 'Luxury Deals Online FZE',      'LuxDeals',           'payment-gateway', 'exported',  v_omar, v_khalid, '2026-02-01 10:00:00+04', '2026-02-15 14:00:00+04', v_khalid, 96, 'green', '2026-01-20 09:00:00+04'),

  -- ADDITIONAL MID (2) — Sarah
  (c16, 'Al Futtaim Retail Group',       'AF Retail',          'additional-mid', 'active',           v_sarah, v_fatima, '2026-01-25 10:00:00+04', '2026-02-05 11:00:00+04', v_fatima, 88, 'green', '2026-01-12 08:30:00+04'),
  (c17, 'Majid Al Futtaim Leisure',      'MAF Leisure',        'additional-mid', 'renewal_pending',  v_sarah, NULL,     '2026-02-08 09:00:00+04', '2026-02-20 14:00:00+04', v_fatima, 85, 'green', '2026-01-18 10:00:00+04'),

  -- NEW LOCATION (2) — Omar
  (c18, 'Carrefour Hypermarket',         'Carrefour JLT',      'new-location', 'approved', v_omar, v_khalid, '2026-03-08 09:00:00+04', '2026-03-12 16:00:00+04', v_khalid, 94, 'green', '2026-03-01 11:00:00+04');

-- ============================================================
-- 3. CASE DOCUMENTS (key docs per case — 6-10 each)
-- ============================================================
-- Helper: realistic ai_metadata
-- We'll insert core docs for each case with item_ids matching checklist-config

INSERT INTO case_documents (case_id, item_id, label, category, file_name, file_path, file_size, file_type, ai_metadata, created_at) VALUES
  -- c1 (incomplete — only 3 docs)
  (c1, 'mdf',            'MDF Schedule 01',   'Forms',    'mdf_baraka.pdf',         'cases/'||c1||'/mdf.pdf',           245000, 'application/pdf', '{"confidence":0.92,"detectedDocType":"mdf","hasSignature":true,"hasStamp":true}', '2026-01-08 09:30:00+04'),
  (c1, 'trade-license',  'Trade License',     'Legal',    'tl_baraka.pdf',          'cases/'||c1||'/tl.pdf',            180000, 'application/pdf', '{"confidence":0.95,"detectedDocType":"trade_license"}', '2026-01-08 09:35:00+04'),
  (c1, 'iban-proof',     'IBAN Proof',        'Banking',  'iban_baraka.pdf',        'cases/'||c1||'/iban.pdf',          95000,  'application/pdf', '{"confidence":0.88,"detectedDocType":"iban_proof"}', '2026-01-08 09:40:00+04'),

  -- c2 (complete — 8 docs)
  (c2, 'mdf',            'MDF Schedule 01',   'Forms',    'mdf_gulfstar.pdf',       'cases/'||c2||'/mdf.pdf',           320000, 'application/pdf', '{"confidence":0.94,"detectedDocType":"mdf","hasSignature":true,"hasStamp":true}', '2026-01-15 10:30:00+04'),
  (c2, 'trade-license',  'Trade License',     'Legal',    'tl_gulfstar.pdf',        'cases/'||c2||'/tl.pdf',            200000, 'application/pdf', '{"confidence":0.96,"detectedDocType":"trade_license"}', '2026-01-15 10:35:00+04'),
  (c2, 'iban-proof',     'IBAN Proof',        'Banking',  'iban_gulfstar.pdf',      'cases/'||c2||'/iban.pdf',          110000, 'application/pdf', '{"confidence":0.90,"detectedDocType":"iban_proof"}', '2026-01-15 10:40:00+04'),
  (c2, 'vat-cert',       'VAT Certificate',   'Legal',    'vat_gulfstar.pdf',       'cases/'||c2||'/vat.pdf',           150000, 'application/pdf', '{"confidence":0.93,"detectedDocType":"vat_certificate"}', '2026-01-15 10:45:00+04'),
  (c2, 'main-moa',       'MOA',               'Legal',    'moa_gulfstar.pdf',       'cases/'||c2||'/moa.pdf',           280000, 'application/pdf', '{"confidence":0.89,"detectedDocType":"moa"}', '2026-01-15 10:50:00+04'),
  (c2, 'ack-form',       'MAF',               'Forms',    'maf_gulfstar.pdf',       'cases/'||c2||'/maf.pdf',           120000, 'application/pdf', '{"confidence":0.91,"detectedDocType":"acknowledgment_form"}', '2026-01-15 10:55:00+04'),
  (c2, 'shop-photos',    'Shop Photos',       'Premises', 'photos_gulfstar.jpg',    'cases/'||c2||'/photos.jpg',        2500000,'image/jpeg', '{"confidence":0.85,"detectedDocType":"shop_photos"}', '2026-01-15 11:00:00+04'),
  (c2, 'tenancy-ejari',  'Tenancy / Ejari',   'Premises', 'ejari_gulfstar.pdf',     'cases/'||c2||'/ejari.pdf',         175000, 'application/pdf', '{"confidence":0.92,"detectedDocType":"tenancy_contract"}', '2026-01-15 11:05:00+04'),

  -- c3 (submitted — 10 docs, green readiness)
  (c3, 'mdf',            'MDF Schedule 01',   'Forms',    'mdf_noor.pdf',           'cases/'||c3||'/mdf.pdf',           350000, 'application/pdf', '{"confidence":0.96,"detectedDocType":"mdf","hasSignature":true,"hasStamp":true}', '2026-01-22 11:00:00+04'),
  (c3, 'trade-license',  'Trade License',     'Legal',    'tl_noor.pdf',            'cases/'||c3||'/tl.pdf',            210000, 'application/pdf', '{"confidence":0.97,"detectedDocType":"trade_license"}', '2026-01-22 11:10:00+04'),
  (c3, 'iban-proof',     'IBAN Proof',        'Banking',  'iban_noor.pdf',          'cases/'||c3||'/iban.pdf',          105000, 'application/pdf', '{"confidence":0.93,"detectedDocType":"iban_proof"}', '2026-01-22 11:15:00+04'),
  (c3, 'vat-cert',       'VAT Certificate',   'Legal',    'vat_noor.pdf',           'cases/'||c3||'/vat.pdf',           160000, 'application/pdf', '{"confidence":0.94,"detectedDocType":"vat_certificate"}', '2026-01-22 11:20:00+04'),
  (c3, 'main-moa',       'MOA',               'Legal',    'moa_noor.pdf',           'cases/'||c3||'/moa.pdf',           290000, 'application/pdf', '{"confidence":0.91,"detectedDocType":"moa"}', '2026-01-22 11:25:00+04'),
  (c3, 'ack-form',       'MAF',               'Forms',    'maf_noor.pdf',           'cases/'||c3||'/maf.pdf',           130000, 'application/pdf', '{"confidence":0.90,"detectedDocType":"acknowledgment_form"}', '2026-01-22 11:30:00+04'),
  (c3, 'shop-photos',    'Shop Photos',       'Premises', 'photos_noor.jpg',        'cases/'||c3||'/photos.jpg',        3200000,'image/jpeg', '{"confidence":0.87,"detectedDocType":"shop_photos"}', '2026-01-22 11:35:00+04'),
  (c3, 'tenancy-ejari',  'Tenancy / Ejari',   'Premises', 'ejari_noor.pdf',         'cases/'||c3||'/ejari.pdf',         180000, 'application/pdf', '{"confidence":0.93,"detectedDocType":"tenancy_contract"}', '2026-01-22 11:40:00+04'),
  (c3, 'signed-svr',     'SVR',               'Forms',    'svr_noor.pdf',           'cases/'||c3||'/svr.pdf',           95000,  'application/pdf', '{"confidence":0.88,"detectedDocType":"site_visit_report","hasSignature":true}', '2026-01-22 11:45:00+04'),
  (c3, 'bank-statement', 'Bank Statement',    'Banking',  'bs_noor.pdf',            'cases/'||c3||'/bs.pdf',            220000, 'application/pdf', '{"confidence":0.91,"detectedDocType":"bank_statement"}', '2026-01-22 11:50:00+04'),

  -- c5 (active — full docs)
  (c5, 'mdf',            'MDF Schedule 01',   'Forms',    'mdf_eap.pdf',            'cases/'||c5||'/mdf.pdf',           310000, 'application/pdf', '{"confidence":0.97,"detectedDocType":"mdf","hasSignature":true,"hasStamp":true}', '2026-02-03 09:15:00+04'),
  (c5, 'trade-license',  'Trade License',     'Legal',    'tl_eap.pdf',             'cases/'||c5||'/tl.pdf',            195000, 'application/pdf', '{"confidence":0.98,"detectedDocType":"trade_license"}', '2026-02-03 09:20:00+04'),
  (c5, 'iban-proof',     'IBAN Proof',        'Banking',  'iban_eap.pdf',           'cases/'||c5||'/iban.pdf',          100000, 'application/pdf', '{"confidence":0.95,"detectedDocType":"iban_proof"}', '2026-02-03 09:25:00+04'),
  (c5, 'vat-cert',       'VAT Certificate',   'Legal',    'vat_eap.pdf',            'cases/'||c5||'/vat.pdf',           155000, 'application/pdf', '{"confidence":0.96,"detectedDocType":"vat_certificate"}', '2026-02-03 09:30:00+04'),
  (c5, 'main-moa',       'MOA',               'Legal',    'moa_eap.pdf',            'cases/'||c5||'/moa.pdf',           275000, 'application/pdf', '{"confidence":0.93,"detectedDocType":"moa"}', '2026-02-03 09:35:00+04'),
  (c5, 'tenancy-ejari',  'Tenancy / Ejari',   'Premises', 'ejari_eap.pdf',          'cases/'||c5||'/ejari.pdf',         170000, 'application/pdf', '{"confidence":0.94,"detectedDocType":"tenancy_contract"}', '2026-02-03 09:40:00+04'),
  (c5, 'shop-photos',    'Shop Photos',       'Premises', 'photos_eap.jpg',         'cases/'||c5||'/photos.jpg',        2800000,'image/jpeg', '{"confidence":0.86,"detectedDocType":"shop_photos"}', '2026-02-03 09:45:00+04'),

  -- c8 (high-risk approved)
  (c8, 'mdf',            'MDF Schedule 01',   'Forms',    'mdf_pinnacle.pdf',       'cases/'||c8||'/mdf.pdf',           380000, 'application/pdf', '{"confidence":0.95,"detectedDocType":"mdf","hasSignature":true,"hasStamp":true}', '2026-02-06 11:30:00+04'),
  (c8, 'trade-license',  'Trade License',     'Legal',    'tl_pinnacle.pdf',        'cases/'||c8||'/tl.pdf',            220000, 'application/pdf', '{"confidence":0.97,"detectedDocType":"trade_license"}', '2026-02-06 11:35:00+04'),
  (c8, 'iban-proof',     'IBAN Proof',        'Banking',  'iban_pinnacle.pdf',      'cases/'||c8||'/iban.pdf',          115000, 'application/pdf', '{"confidence":0.94,"detectedDocType":"iban_proof"}', '2026-02-06 11:40:00+04'),

  -- c12 (einvoice active)
  (c12, 'mdf',           'MDF Schedule 01',   'Forms',    'mdf_cloudeats.pdf',      'cases/'||c12||'/mdf.pdf',          290000, 'application/pdf', '{"confidence":0.93,"detectedDocType":"mdf","hasSignature":true,"hasStamp":true}', '2026-01-28 09:00:00+04'),
  (c12, 'trade-license', 'Trade License',     'Legal',    'tl_cloudeats.pdf',       'cases/'||c12||'/tl.pdf',           185000, 'application/pdf', '{"confidence":0.96,"detectedDocType":"trade_license"}', '2026-01-28 09:10:00+04'),

  -- c18 (new-location approved — current month for MID targets)
  (c18, 'mdf',           'MDF Schedule 01',   'Forms',    'mdf_carrefour.pdf',      'cases/'||c18||'/mdf.pdf',          340000, 'application/pdf', '{"confidence":0.98,"detectedDocType":"mdf","hasSignature":true,"hasStamp":true}', '2026-03-01 11:00:00+04'),
  (c18, 'trade-license', 'Trade License',     'Legal',    'tl_carrefour.pdf',       'cases/'||c18||'/tl.pdf',           215000, 'application/pdf', '{"confidence":0.99,"detectedDocType":"trade_license"}', '2026-03-01 11:05:00+04'),
  (c18, 'shop-photos',   'Shop Photos',       'Premises', 'photos_carrefour.jpg',   'cases/'||c18||'/photos.jpg',       4100000,'image/jpeg', '{"confidence":0.90,"detectedDocType":"shop_photos"}', '2026-03-01 11:10:00+04');

-- ============================================================
-- 4. SHAREHOLDERS + KYC
-- ============================================================
INSERT INTO shareholders (id, case_id, name, percentage) VALUES
  (s1, c3, 'Ahmed Al Noor',       '60'),
  (s2, c3, 'Fatima Al Noor',      '40'),
  (s3, c5, 'Rashid Al Maktoum',   '100'),
  (s4, c8, 'James Wilson',        '51'),
  (s5, c8, 'Mohammad Reza',       '49'),
  (s6, c12, 'Ali Qassim',         '70'),
  (s7, c12, 'Huda Qassim',        '30'),
  (s8, c18, 'Corporate Entity',   '100');

-- ============================================================
-- 5. OCR TRADE LICENSE (with expiry edge cases)
-- ============================================================
INSERT INTO ocr_trade_license (case_id, license_number, issue_date, expiry_date, business_name, legal_form, activities, authority, confidence_score) VALUES
  (c1,  'TL-2024-001234', '15/01/2024', '14/01/2025', 'Al Baraka Trading LLC',       'LLC', 'General Trading', 'DED',   0.95),  -- EXPIRED
  (c2,  'TL-2024-005678', '01/06/2024', '31/05/2026', 'Gulf Star Electronics FZE',    'FZE', 'Electronics Trading', 'JAFZA', 0.97),
  (c3,  'TL-2023-009012', '10/03/2023', '09/03/2026', 'Noor Al Hayat Pharmacy LLC',   'LLC', 'Pharmacy', 'DED',   0.96),
  (c4,  'TL-2025-001111', '01/01/2025', '31/12/2025', 'Desert Rose Restaurant LLC',   'LLC', 'Restaurant', 'DED',   0.94),
  (c5,  'TL-2024-002222', '15/04/2024', '14/04/2027', 'Emirates Auto Parts Trading',  'LLC', 'Auto Parts', 'DED',   0.98),
  (c6,  'TL-2024-003333', '01/07/2024', '30/06/2025', 'Skyline Fashion Boutique LLC', 'LLC', 'Fashion Retail', 'DED', 0.93),
  (c7,  'TL-2023-004444', '20/09/2023', '19/09/2026', 'Global Commodities DMCC',      'DMCC','Commodities Trading', 'DMCC', 0.96),
  (c8,  'TL-2024-005555', '01/03/2024', '28/02/2027', 'Pinnacle Financial Services',  'LLC', 'Financial Services', 'DED', 0.97),
  (c9,  'TL-2023-006666', '15/11/2023', '14/04/2026', 'Arabian Gulf Exchange LLC',    'LLC', 'Money Exchange', 'DED', 0.95),  -- Expiring within 30d
  (c12, 'TL-2024-007777', '01/05/2024', '30/04/2027', 'Cloud Kitchen Concepts LLC',   'LLC', 'Food Delivery', 'DED', 0.96),
  (c14, 'TL-2024-008888', '01/08/2024', '31/07/2027', 'E-Market Hub LLC',            'LLC', 'E-Commerce', 'DED',   0.98),
  (c16, 'TL-2023-009999', '10/10/2023', '09/10/2026', 'Al Futtaim Retail Group',      'LLC', 'Retail', 'DED',      0.97),
  (c18, 'TL-2025-010101', '01/01/2025', '31/12/2027', 'Carrefour Hypermarket',        'LLC', 'Hypermarket', 'DED', 0.99);

-- ============================================================
-- 6. OCR MERCHANT DETAILS
-- ============================================================
INSERT INTO ocr_merchant_details (case_id, merchant_legal_name, doing_business_as, emirate, country, address, mobile_no, email_1, contact_name, bank_name, iban, swift_code, product_pos, product_ecom, confidence_score) VALUES
  (c1,  'Al Baraka Trading LLC',       'Baraka Fresh',    'Dubai',     'UAE', 'Deira, Dubai',           '+971501234567', 'info@baraka.ae',    'Ahmed Khan',   'Emirates NBD',  'AE070331234567890123456', 'EABORAEAXXX', true,  false, 0.92),
  (c3,  'Noor Al Hayat Pharmacy LLC',  'Noor Pharmacy',   'Abu Dhabi', 'UAE', 'Khalifa City, Abu Dhabi', '+971502345678', 'noor@pharmacy.ae',  'Ahmed Al Noor','ADCB',          'AE080321234567890123456', 'ADCBAEAAXXX', true,  false, 0.96),
  (c5,  'Emirates Auto Parts Trading', 'EAP Trading',     'Dubai',     'UAE', 'Al Quoz, Dubai',         '+971503456789', 'info@eap.ae',       'Rashid M.',    'Mashreq',       'AE090461234567890123456', 'BOMLAEAD',    true,  true,  0.97),
  (c7,  'Global Commodities DMCC',     'GC Trading',      'Dubai',     'UAE', 'JLT, Dubai',             '+971504567890', 'info@gcdmcc.ae',    'Khalil Ahmad', 'RAK Bank',      'AE100401234567890123456', 'NABORAEAXXX', true,  true,  0.96),
  (c8,  'Pinnacle Financial Services', 'Pinnacle FS',     'Dubai',     'UAE', 'DIFC, Dubai',            '+971505678901', 'ops@pinnacle.ae',   'James Wilson', 'HSBC',          'AE110401234567890123456', 'BBMEAEAD',    true,  true,  0.95),
  (c12, 'Cloud Kitchen Concepts LLC',  'CloudEats',       'Sharjah',   'UAE', 'Al Nahda, Sharjah',      '+971506789012', 'hello@cloudeats.ae','Ali Qassim',   'FAB',           'AE120351234567890123456', 'NBADORAE',    false, true,  0.93),
  (c14, 'E-Market Hub LLC',           'E-Market',        'Dubai',     'UAE', 'Business Bay, Dubai',    '+971507890123', 'team@emarket.ae',   'Layla Hassan', 'Emirates NBD',  'AE130331234567890123456', 'EABORAEAXXX', false, true,  0.98),
  (c18, 'Carrefour Hypermarket',       'Carrefour JLT',   'Dubai',     'UAE', 'JLT Cluster D, Dubai',   '+971508901234', 'ops@carrefour.ae',  'Store Mgr',    'CBD',           'AE140471234567890123456', 'CBDUAEADXXX', true,  false, 0.99);

-- ============================================================
-- 7. OCR PASSPORT DATA (with expiry edge cases)
-- ============================================================
INSERT INTO ocr_passport_data (case_id, shareholder_id, surname, given_names, passport_number, nationality, date_of_birth, sex, expiry_date, is_expired, confidence) VALUES
  (c3, 'sh1', 'AL NOOR',    'AHMED',    'P1234567', 'UAE',    '15/06/1985', 'M', '20/04/2026', false, 95),  -- Expiring within 35d
  (c3, 'sh2', 'AL NOOR',    'FATIMA',   'P2345678', 'UAE',    '22/11/1988', 'F', '15/09/2028', false, 94),
  (c5, 'sh3', 'AL MAKTOUM', 'RASHID',   'P3456789', 'UAE',    '03/03/1978', 'M', '01/12/2029', false, 97),
  (c8, 'sh4', 'WILSON',     'JAMES',    'P4567890', 'GBR',    '10/07/1980', 'M', '25/01/2026', true,  96),  -- EXPIRED
  (c8, 'sh5', 'REZA',       'MOHAMMAD', 'P5678901', 'IRN',    '18/02/1975', 'M', '30/06/2028', false, 93),
  (c12,'sh6', 'QASSIM',     'ALI',      'P6789012', 'UAE',    '05/09/1982', 'M', '11/11/2027', false, 95),
  (c12,'sh7', 'QASSIM',     'HUDA',     'P7890123', 'UAE',    '14/04/1986', 'F', '20/08/2029', false, 94);

-- ============================================================
-- 8. OCR EID DATA
-- ============================================================
INSERT INTO ocr_eid_data (case_id, shareholder_id, id_number, name, nationality, expiry_date, date_of_birth, gender, is_expired, confidence) VALUES
  (c3, 'sh1', '784-1985-1234567-1', 'Ahmed Al Noor',    'UAE', '10/04/2026', '15/06/1985', 'M', false, 94),  -- Expiring soon
  (c3, 'sh2', '784-1988-2345678-2', 'Fatima Al Noor',   'UAE', '20/12/2028', '22/11/1988', 'F', false, 93),
  (c5, 'sh3', '784-1978-3456789-3', 'Rashid Al Maktoum','UAE', '15/01/2030', '03/03/1978', 'M', false, 96),
  (c8, 'sh4', '784-1980-4567890-4', 'James Wilson',     'GBR', '05/03/2026', '10/07/1980', 'M', false, 95),
  (c8, 'sh5', '784-1975-5678901-5', 'Mohammad Reza',    'IRN', '28/09/2027', '18/02/1975', 'M', false, 92),
  (c12,'sh6', '784-1982-6789012-6', 'Ali Qassim',       'UAE', '01/05/2028', '05/09/1982', 'M', false, 95),
  (c12,'sh7', '784-1986-7890123-7', 'Huda Qassim',      'UAE', '15/03/2029', '14/04/1986', 'F', false, 94);

-- ============================================================
-- 9. OCR KYC PROFILE
-- ============================================================
INSERT INTO ocr_kyc_profile (case_id, projected_monthly_volume, projected_monthly_count, source_of_income, exact_business_nature, years_in_uae, sanctions_exposure, has_other_acquirer) VALUES
  (c3,  '250000',  '500',  'Business Revenue',     'Pharmaceutical retail',    '12', '[]', false),
  (c5,  '180000',  '350',  'Business Revenue',     'Automotive parts trading', '8',  '[]', false),
  (c7,  '1500000', '200',  'Commodity Trading',    'Gold & commodity trading', '15', '[{"country":"Russia","has_business":true,"percentage":"5","goods":"Raw materials"}]', true),
  (c8,  '800000',  '1000', 'Financial Services',   'Payment processing',       '6',  '[]', false),
  (c9,  '2000000', '5000', 'Exchange Services',    'Currency exchange',        '20', '[{"country":"Iran","has_business":true,"percentage":"3","goods":"Remittances"}]', true),
  (c12, '120000',  '3000', 'Food Delivery',        'Cloud kitchen operations', '3',  '[]', false),
  (c14, '500000',  '8000', 'E-Commerce',           'Online marketplace',       '5',  '[]', false);

-- ============================================================
-- 10. OCR PEP DATA (edge case — one PEP flagged)
-- ============================================================
INSERT INTO ocr_pep_data (case_id, is_pep, pep_individuals, risk_level, confidence) VALUES
  (c7, false, '[]',  'low',  90),
  (c9, true,  '[{"name":"Saeed Al Rashid","position":"Former Ministry Advisor","relationship":"Shareholder"}]', 'high', 88);

-- ============================================================
-- 11. OCR BANK STATEMENT
-- ============================================================
INSERT INTO ocr_bank_statement (case_id, bank_name, account_holder, iban, currency, period, opening_balance, closing_balance, total_credits, total_debits, confidence) VALUES
  (c3, 'ADCB',         'Noor Al Hayat Pharmacy LLC',  'AE080321234567890123456', 'AED', 'Jan 2026',  '125000', '148000', '95000',  '72000',  91),
  (c5, 'Mashreq',      'Emirates Auto Parts Trading',  'AE090461234567890123456', 'AED', 'Jan 2026',  '340000', '385000', '220000', '175000', 93),
  (c8, 'HSBC',         'Pinnacle Financial Services',  'AE110401234567890123456', 'AED', 'Jan 2026',  '890000', '1020000','650000', '520000', 95);

-- ============================================================
-- 12. OCR VAT CERT
-- ============================================================
INSERT INTO ocr_vat_cert (case_id, trn_number, business_name, registration_date, expiry_date, business_address, confidence) VALUES
  (c3,  '100234567890003', 'Noor Al Hayat Pharmacy LLC',  '01/01/2018', '31/12/2026', 'Khalifa City, Abu Dhabi', 94),
  (c5,  '100345678901234', 'Emirates Auto Parts Trading',  '15/06/2019', '31/12/2027', 'Al Quoz, Dubai',          96),
  (c12, '100456789012345', 'Cloud Kitchen Concepts LLC',   '01/03/2023', '31/12/2026', 'Al Nahda, Sharjah',       93);

-- ============================================================
-- 13. OCR MOA
-- ============================================================
INSERT INTO ocr_moa (case_id, company_name, shareholders, share_percentages, registration_number, legal_form, authorized_capital, confidence) VALUES
  (c3,  'Noor Al Hayat Pharmacy LLC',  ARRAY['Ahmed Al Noor','Fatima Al Noor'],   ARRAY['60%','40%'],  'LLC-2012-45678', 'LLC', '300,000 AED', 91),
  (c5,  'Emirates Auto Parts Trading',  ARRAY['Rashid Al Maktoum'],                ARRAY['100%'],       'LLC-2016-56789', 'LLC', '500,000 AED', 93),
  (c8,  'Pinnacle Financial Services',  ARRAY['James Wilson','Mohammad Reza'],     ARRAY['51%','49%'],  'LLC-2018-67890', 'LLC', '1,000,000 AED', 95),
  (c12, 'Cloud Kitchen Concepts LLC',   ARRAY['Ali Qassim','Huda Qassim'],        ARRAY['70%','30%'],  'LLC-2021-78901', 'LLC', '200,000 AED', 92);

-- ============================================================
-- 14. OCR FEE SCHEDULE
-- ============================================================
INSERT INTO ocr_fee_schedule (case_id, card_type, pos_rate, ecom_rate, premium_rate, international_rate) VALUES
  (c5, 'Visa',       '1.75', '2.25', '2.50', '3.00'),
  (c5, 'Mastercard', '1.75', '2.25', '2.50', '3.00'),
  (c8, 'Visa',       '2.00', '2.50', '2.75', '3.25'),
  (c8, 'Mastercard', '2.00', '2.50', '2.75', '3.25'),
  (c14,'Visa',       NULL,   '2.00', NULL,   '2.75'),
  (c14,'Mastercard', NULL,   '2.00', NULL,   '2.75');

-- ============================================================
-- 15. OCR TENANCY
-- ============================================================
INSERT INTO ocr_tenancy (case_id, ejari_number, expiry_date, start_date, landlord_name, tenant_name, property_address, annual_rent, confidence) VALUES
  (c3, 'EJ-2025-001234', '31/12/2026', '01/01/2025', 'Al Falah Properties',  'Noor Al Hayat Pharmacy LLC', 'Shop 12, Khalifa City Mall', '180000', 93),
  (c5, 'EJ-2024-005678', '30/06/2026', '01/07/2024', 'Wasl Properties',      'Emirates Auto Parts Trading', 'Unit 5, Al Quoz Industrial', '240000', 95),
  (c18,'EJ-2025-009012', '31/12/2027', '01/01/2025', 'DMCC Properties',      'Carrefour Hypermarket',       'Cluster D, JLT',             '850000', 97);

-- ============================================================
-- 16. CASE STATUS HISTORY (audit trail)
-- ============================================================
INSERT INTO case_status_history (case_id, from_status, to_status, changed_by, note, created_at) VALUES
  -- c3: incomplete → complete → submitted
  (c3, NULL,          'incomplete', v_sarah, 'Case created',                    '2026-01-22 11:00:00+04'),
  (c3, 'incomplete',  'complete',   v_sarah, 'All documents uploaded',          '2026-02-04 16:00:00+04'),
  (c3, 'complete',    'submitted',  v_sarah, 'Submitted for review',            '2026-02-05 14:00:00+04'),

  -- c5: full lifecycle
  (c5, NULL,          'incomplete', v_sarah, 'Case created',                    '2026-02-03 09:15:00+04'),
  (c5, 'incomplete',  'complete',   v_sarah, 'All documents uploaded',          '2026-02-11 17:00:00+04'),
  (c5, 'complete',    'submitted',  v_sarah, 'Submitted for review',            '2026-02-12 10:00:00+04'),
  (c5, 'submitted',   'in_review',  v_fatima,'Picked up for review',            '2026-02-14 09:00:00+04'),
  (c5, 'in_review',   'approved',   v_fatima,'All documents verified',           '2026-02-18 16:00:00+04'),
  (c5, 'approved',    'active',     v_fatima,'Merchant activated',               '2026-02-20 10:00:00+04'),

  -- c6: submitted → returned
  (c6, NULL,          'incomplete', v_omar,  'Case created',                    '2026-02-14 10:00:00+04'),
  (c6, 'incomplete',  'complete',   v_omar,  'Documents uploaded',              '2026-02-19 15:00:00+04'),
  (c6, 'complete',    'submitted',  v_omar,  'Submitted for review',            '2026-02-20 11:00:00+04'),
  (c6, 'submitted',   'in_review',  v_khalid,'Picked up for review',            '2026-02-23 09:00:00+04'),
  (c6, 'in_review',   'returned',   v_khalid,'Missing bank statement, TL expired','2026-02-25 14:30:00+04'),

  -- c9: escalated
  (c9, NULL,          'incomplete', v_omar,  'Case created',                    '2026-02-18 13:00:00+04'),
  (c9, 'incomplete',  'complete',   v_omar,  'Documents uploaded',              '2026-02-28 16:00:00+04'),
  (c9, 'complete',    'submitted',  v_omar,  'Submitted for review',            '2026-03-01 09:00:00+04'),
  (c9, 'submitted',   'in_review',  v_khalid,'Picked up for review',            '2026-03-03 10:00:00+04'),
  (c9, 'in_review',   'escalated',  v_khalid,'PEP flagged — requires management review','2026-03-05 11:00:00+04'),

  -- c8: approved
  (c8, NULL,          'incomplete', v_sarah, 'Case created',                    '2026-02-06 11:30:00+04'),
  (c8, 'incomplete',  'complete',   v_sarah, 'All high-risk documents uploaded', '2026-02-14 17:00:00+04'),
  (c8, 'complete',    'submitted',  v_sarah, 'Submitted for review',            '2026-02-15 10:00:00+04'),
  (c8, 'submitted',   'in_review',  v_fatima,'Picked up for review',            '2026-02-20 09:00:00+04'),
  (c8, 'in_review',   'approved',   v_fatima,'Enhanced due diligence complete',  '2026-02-28 11:00:00+04');

-- ============================================================
-- 17. CASE NOTES
-- ============================================================
INSERT INTO case_notes (case_id, author_id, note_type, content, created_at) VALUES
  -- Processing notes
  (c5, v_fatima, 'processing',    'All documents verified. MDF complete, TL valid, KYC clear. Recommending approval.', '2026-02-18 15:30:00+04'),
  (c8, v_fatima, 'processing',    'High-risk case — enhanced due diligence performed. No adverse findings. Dual nationality shareholder (GBR/IRN) cleared.', '2026-02-27 14:00:00+04'),
  (c4, v_fatima, 'processing',    'Reviewing merchant details. Bank statement covers 3 months. Waiting for MDF section 5 clarification.', '2026-02-12 11:00:00+04'),

  -- Return reasons
  (c6, v_khalid, 'return_reason', 'Bank statement missing — only IBAN proof provided. Trade license expired Jan 2026. Please upload renewed TL and 3-month bank statement.', '2026-02-25 14:30:00+04'),

  -- Escalation
  (c9, v_khalid, 'escalation',   'PEP individual identified: Saeed Al Rashid (Former Ministry Advisor). Sanctions exposure to Iran (3% remittances). Escalating for management review.', '2026-03-05 11:00:00+04'),

  -- General notes
  (c3, v_sarah,  'general',      'Client requesting expedited processing — pharmacy opening next month.', '2026-02-05 14:30:00+04'),
  (c7, v_omar,   'general',      'DMCC entity — freezone documents submitted. Large commodity trader, expect high volumes.', '2026-02-08 14:30:00+04'),
  (c18,v_omar,   'general',      'New Carrefour location in JLT — existing merchant, additional location case.', '2026-03-01 11:30:00+04');

-- ============================================================
-- 18. CASE EXCEPTIONS
-- ============================================================
INSERT INTO case_exceptions (case_id, item_id, reason, reason_category, notes, created_at) VALUES
  (c2,  'amended-moa',   'Single shareholder — no amendments',     'not-applicable', 'FZE entity with single owner', '2026-01-15 11:10:00+04'),
  (c3,  'poa',           'Owner is sole signatory',                'not-applicable', NULL, '2026-01-22 12:00:00+04'),
  (c5,  'vat-declaration','Combined with VAT certificate',          'combined-doc',   'FTA single document', '2026-02-03 10:00:00+04'),
  (c8,  'org-structure',  'DIFC entity — structure on TL',          'combined-doc',   NULL, '2026-02-06 12:00:00+04'),
  (c6,  'bank-statement', 'Client to provide after return',         'other',          'Returned case — missing doc', '2026-02-25 15:00:00+04');

-- ============================================================
-- 19. SUBMISSION DETAILS (for submitted+ cases)
-- ============================================================
INSERT INTO submission_details (case_id, data) VALUES
  (c3, '{"requestDate":"05/02/2026","groupName":"","existingOrNew":"New","mcc":"5912","noOfLocations":"1","merchantLocation":"Abu Dhabi","mobileNumber":"+971502345678","contactPersonName":"Ahmed Al Noor","emailAddress":"noor@pharmacy.ae","natureOfBusiness":"Pharmaceutical retail","avgTransactionSize":"150","expectedMonthlySpend":"250000","rentalFee":"500","mso":"Sarah Ahmed","noOfTerminalsAndType":"2x Ingenico Move 5000","proposedRateStandard":"1.75","proposedRatePremium":"2.50","proposedRateInternational":"3.00"}'),
  (c5, '{"requestDate":"12/02/2026","groupName":"","existingOrNew":"New","mcc":"5531","noOfLocations":"1","merchantLocation":"Dubai","mobileNumber":"+971503456789","contactPersonName":"Rashid Al Maktoum","emailAddress":"info@eap.ae","natureOfBusiness":"Auto parts trading","avgTransactionSize":"500","expectedMonthlySpend":"180000","rentalFee":"750","mso":"Sarah Ahmed","noOfTerminalsAndType":"3x Ingenico Move 5000 + 1x ECOM","proposedRateStandard":"1.75","proposedRatePremium":"2.50","proposedRateInternational":"3.00"}'),
  (c8, '{"requestDate":"15/02/2026","groupName":"Pinnacle Group","existingOrNew":"New","mcc":"6012","noOfLocations":"1","merchantLocation":"Dubai","mobileNumber":"+971505678901","contactPersonName":"James Wilson","emailAddress":"ops@pinnacle.ae","natureOfBusiness":"Financial services / payment processing","avgTransactionSize":"2000","expectedMonthlySpend":"800000","rentalFee":"1000","mso":"Sarah Ahmed","noOfTerminalsAndType":"5x POS + ECOM","proposedRateStandard":"2.00","proposedRatePremium":"2.75","proposedRateInternational":"3.25"}');

-- ============================================================
-- 20. READINESS HISTORY
-- ============================================================
INSERT INTO readiness_history (case_id, score, tier, computed_at) VALUES
  (c1, 15, 'red',   '2026-01-08 10:00:00+04'),
  (c1, 35, 'red',   '2026-01-10 14:00:00+04'),
  (c2, 40, 'amber', '2026-01-15 11:00:00+04'),
  (c2, 72, 'amber', '2026-01-18 16:00:00+04'),
  (c3, 55, 'amber', '2026-01-22 12:00:00+04'),
  (c3, 78, 'green', '2026-02-01 10:00:00+04'),
  (c3, 88, 'green', '2026-02-05 13:00:00+04'),
  (c5, 60, 'amber', '2026-02-03 10:00:00+04'),
  (c5, 85, 'green', '2026-02-10 15:00:00+04'),
  (c5, 95, 'green', '2026-02-12 09:00:00+04'),
  (c6, 30, 'red',   '2026-02-14 11:00:00+04'),
  (c6, 52, 'amber', '2026-02-19 16:00:00+04');

-- ============================================================
-- 21. NOTIFICATIONS
-- ============================================================
INSERT INTO notifications (user_id, type, title, message, case_id, is_read, created_at) VALUES
  -- To processing (case submitted)
  (v_fatima, 'case_submitted', 'New case submitted',     'Noor Al Hayat Pharmacy LLC submitted by Sarah Ahmed',       c3,  true,  '2026-02-05 14:00:00+04'),
  (v_fatima, 'case_submitted', 'New case submitted',     'Emirates Auto Parts Trading submitted by Sarah Ahmed',       c5,  true,  '2026-02-12 10:00:00+04'),
  (v_khalid, 'case_submitted', 'New case submitted',     'Skyline Fashion Boutique LLC submitted by Omar Hassan',      c6,  true,  '2026-02-20 11:00:00+04'),
  (v_fatima, 'case_submitted', 'New case submitted',     'Pinnacle Financial Services submitted by Sarah Ahmed',       c8,  true,  '2026-02-15 10:00:00+04'),
  (v_khalid, 'case_submitted', 'New case submitted',     'Arabian Gulf Exchange LLC submitted by Omar Hassan',         c9,  false, '2026-03-01 09:00:00+04'),
  (v_fatima, 'case_submitted', 'New case submitted',     'TechPay Solutions submitted by Omar Hassan',                 c13, false, '2026-03-02 10:00:00+04'),

  -- To sales (case approved/returned)
  (v_sarah,  'case_approved',  'Case approved',          'Emirates Auto Parts Trading has been approved by Fatima Ali', c5,  true,  '2026-02-18 16:00:00+04'),
  (v_sarah,  'case_approved',  'Case approved',          'Pinnacle Financial Services has been approved by Fatima Ali', c8,  true,  '2026-02-28 11:00:00+04'),
  (v_omar,   'case_returned',  'Case returned',          'Skyline Fashion Boutique LLC returned — missing bank statement', c6, false, '2026-02-25 14:30:00+04'),
  (v_omar,   'case_escalated', 'Case escalated',         'Arabian Gulf Exchange LLC escalated — PEP flagged',           c9,  false, '2026-03-05 11:00:00+04'),
  (v_sarah,  'case_approved',  'Case approved',          'E-Market Hub LLC has been approved by Fatima Ali',            c14, false, '2026-03-05 10:00:00+04'),

  -- To processing (assignment)
  (v_fatima, 'case_assigned',  'Case assigned to you',   'Desert Rose Restaurant LLC assigned for review',              c4,  false, '2026-02-11 09:00:00+04'),
  (v_khalid, 'case_assigned',  'Case assigned to you',   'TechPay Solutions FZCO assigned for review',                  c13, false, '2026-03-03 09:00:00+04'),

  -- Expiry warnings
  (v_fatima, 'expiry_warning', 'Document expiring soon', 'Trade license for Al Baraka Trading LLC expired on 14/01/2025', c1, false, '2026-03-10 08:00:00+04'),
  (v_fatima, 'expiry_warning', 'KYC expiring soon',      'Passport for Ahmed Al Noor (Noor Pharmacy) expires 20/04/2026', c3, false, '2026-03-15 08:00:00+04'),
  (v_rania,  'expiry_warning', 'Document expiring soon', 'Arabian Gulf Exchange TL expires 14/04/2026',                    c9, false, '2026-03-15 08:00:00+04'),

  -- Management info
  (v_rania,  'info',           'Weekly summary',         '6 cases submitted this week. 2 approved, 1 returned, 1 escalated.', NULL, false, '2026-03-07 09:00:00+04'),
  (v_board,  'info',           'Monthly report ready',   'March analytics report is available in the Reports section.',        NULL, false, '2026-03-15 09:00:00+04');

END $$;

-- Re-enable RLS
SET session_replication_role = 'origin';

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- SELECT count(*) as cases FROM cases;
-- SELECT count(*) as docs FROM case_documents;
-- SELECT count(*) as shareholders FROM shareholders;
-- SELECT count(*) as notes FROM case_notes;
-- SELECT count(*) as history FROM case_status_history;
-- SELECT count(*) as notifications FROM notifications;
-- SELECT role, count(*) FROM profiles GROUP BY role;
-- SELECT status, count(*) FROM cases GROUP BY status;
-- SELECT case_type, count(*) FROM cases GROUP BY case_type;
