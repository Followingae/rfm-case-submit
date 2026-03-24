-- ============================================================
-- RFM PORTAL — COMPREHENSIVE SEED DATA
-- 60 cases, 10 users, full OCR, analytics, returns, etc.
-- Run in Supabase SQL Editor (requires service_role / superuser)
-- ============================================================
-- PRESERVES existing velocity case + 5 existing users.
-- Adds 5 new auth users + 59 new cases + all supporting data.
-- ============================================================

SET session_replication_role = 'replica';

-- ============================================================
-- HELPER FUNCTIONS (dropped at end)
-- ============================================================

-- Single document insert helper
CREATE OR REPLACE FUNCTION _sd(p_case UUID, p_item TEXT, p_label TEXT, p_cat TEXT, p_fname TEXT, p_conf DOUBLE PRECISION, p_dtype TEXT, p_sig BOOLEAN, p_stamp BOOLEAN) RETURNS VOID AS $fn$
BEGIN
  INSERT INTO case_documents (case_id, item_id, label, category, file_name, file_path, file_size, file_type, ai_metadata)
  VALUES (p_case, p_item, p_label, p_cat, p_fname, 'cases/' || p_case || '/' || p_fname,
    (100000 + floor(random()*400000))::bigint,
    CASE WHEN p_fname LIKE '%.jpg' OR p_fname LIKE '%.jpeg' THEN 'image/jpeg' ELSE 'application/pdf' END,
    jsonb_build_object('confidence', round(p_conf::numeric, 2), 'detectedDocType', p_dtype, 'hasSignature', p_sig, 'hasStamp', p_stamp));
END; $fn$ LANGUAGE plpgsql;

-- Low-risk docs (9 required)
CREATE OR REPLACE FUNCTION _docs_lr(c UUID) RETURNS VOID AS $fn$
BEGIN
  PERFORM _sd(c,'mdf','MDF','Forms','mdf.pdf',0.90+random()*0.08,'mdf',true,true);
  PERFORM _sd(c,'ack-form','MAF','Forms','maf.pdf',0.88+random()*0.10,'acknowledgment_form',true,true);
  PERFORM _sd(c,'signed-svr','SVR','Forms','svr.pdf',0.85+random()*0.10,'site_visit_report',true,false);
  PERFORM _sd(c,'trade-license','Trade License','Legal','tl.pdf',0.93+random()*0.06,'trade_license',false,true);
  PERFORM _sd(c,'main-moa','MOA','Legal','moa.pdf',0.87+random()*0.10,'moa',false,true);
  PERFORM _sd(c,'vat-cert','VAT Certificate','Legal','vat.pdf',0.90+random()*0.08,'vat_certificate',false,true);
  PERFORM _sd(c,'iban-proof','IBAN Proof','Banking','iban.pdf',0.88+random()*0.10,'iban_proof',false,false);
  PERFORM _sd(c,'shop-photos','Shop Photos','Premises','photos.jpg',0.80+random()*0.10,'shop_photos',false,false);
  PERFORM _sd(c,'tenancy-ejari','Tenancy / Ejari','Premises','ejari.pdf',0.90+random()*0.08,'tenancy_contract',false,true);
END; $fn$ LANGUAGE plpgsql;

-- High-risk docs (low-risk + 4 extra)
CREATE OR REPLACE FUNCTION _docs_hr(c UUID) RETURNS VOID AS $fn$
BEGIN
  PERFORM _docs_lr(c);
  PERFORM _sd(c,'bank-statement','Bank Statement','Banking','bs.pdf',0.88+random()*0.08,'bank_statement',false,false);
  PERFORM _sd(c,'supplier-invoice','Supplier Invoice','Legal','supplier.pdf',0.85+random()*0.10,'supplier_invoice',false,true);
  PERFORM _sd(c,'pep-form','PEP Form','Forms','pep.pdf',0.90+random()*0.08,'pep_form',true,true);
  PERFORM _sd(c,'aml-policy','AML Policy','Legal','aml.pdf',0.82+random()*0.10,'aml_policy',false,false);
END; $fn$ LANGUAGE plpgsql;

-- E-invoice docs (low-risk minus premises + einvoice extras)
CREATE OR REPLACE FUNCTION _docs_ei(c UUID) RETURNS VOID AS $fn$
BEGIN
  PERFORM _sd(c,'mdf','MDF','Forms','mdf.pdf',0.90+random()*0.08,'mdf',true,true);
  PERFORM _sd(c,'ack-form','MAF','Forms','maf.pdf',0.88+random()*0.10,'acknowledgment_form',true,true);
  PERFORM _sd(c,'trade-license','Trade License','Legal','tl.pdf',0.93+random()*0.06,'trade_license',false,true);
  PERFORM _sd(c,'main-moa','MOA','Legal','moa.pdf',0.87+random()*0.10,'moa',false,true);
  PERFORM _sd(c,'vat-cert','VAT Certificate','Legal','vat.pdf',0.90+random()*0.08,'vat_certificate',false,true);
  PERFORM _sd(c,'iban-proof','IBAN Proof','Banking','iban.pdf',0.88+random()*0.10,'iban_proof',false,false);
  PERFORM _sd(c,'aml-questionnaire','AML Questionnaire','Forms','aml-q.pdf',0.86+random()*0.10,'aml_questionnaire',true,true);
  PERFORM _sd(c,'addendum','Addendum','Forms','addendum.pdf',0.88+random()*0.08,'addendum',true,true);
  PERFORM _sd(c,'branch-form','Branch Form','Forms','branch.pdf',0.87+random()*0.10,'branch_form',true,true);
  PERFORM _sd(c,'merchant-risk-assessment','Merchant Risk Assessment','Forms','mra.pdf',0.85+random()*0.10,'merchant_risk_assessment',true,false);
END; $fn$ LANGUAGE plpgsql;

-- Payment gateway docs
CREATE OR REPLACE FUNCTION _docs_pg(c UUID) RETURNS VOID AS $fn$
BEGIN
  PERFORM _sd(c,'mdf','MDF','Forms','mdf.pdf',0.90+random()*0.08,'mdf',true,true);
  PERFORM _sd(c,'ack-form','MAF','Forms','maf.pdf',0.88+random()*0.10,'acknowledgment_form',true,true);
  PERFORM _sd(c,'trade-license','Trade License','Legal','tl.pdf',0.93+random()*0.06,'trade_license',false,true);
  PERFORM _sd(c,'main-moa','MOA','Legal','moa.pdf',0.87+random()*0.10,'moa',false,true);
  PERFORM _sd(c,'vat-cert','VAT Certificate','Legal','vat.pdf',0.90+random()*0.08,'vat_certificate',false,true);
  PERFORM _sd(c,'iban-proof','IBAN Proof','Banking','iban.pdf',0.88+random()*0.10,'iban_proof',false,false);
  PERFORM _sd(c,'pg-questionnaire','PG Questionnaire','Forms','pgq.pdf',0.86+random()*0.10,'pg_questionnaire',true,true);
END; $fn$ LANGUAGE plpgsql;

-- Additional MID docs
CREATE OR REPLACE FUNCTION _docs_am(c UUID) RETURNS VOID AS $fn$
BEGIN
  PERFORM _sd(c,'mdf','MDF','Forms','mdf.pdf',0.90+random()*0.08,'mdf',true,true);
  PERFORM _sd(c,'justification-letter','Justification Letter','Forms','justification.pdf',0.88+random()*0.08,'justification_letter',true,true);
  PERFORM _sd(c,'trade-license','Trade License','Legal','tl.pdf',0.93+random()*0.06,'trade_license',false,true);
  PERFORM _sd(c,'shop-photos','Shop Photos','Premises','photos.jpg',0.80+random()*0.10,'shop_photos',false,false);
END; $fn$ LANGUAGE plpgsql;

-- New location docs
CREATE OR REPLACE FUNCTION _docs_nl(c UUID) RETURNS VOID AS $fn$
BEGIN
  PERFORM _sd(c,'branch-form','Branch Form','Forms','branch.pdf',0.87+random()*0.10,'branch_form',true,true);
  PERFORM _sd(c,'signed-svr','SVR','Forms','svr.pdf',0.85+random()*0.10,'site_visit_report',true,false);
  PERFORM _sd(c,'trade-license','Trade License','Legal','tl.pdf',0.93+random()*0.06,'trade_license',false,true);
  PERFORM _sd(c,'shop-photos','Shop Photos','Premises','photos.jpg',0.80+random()*0.10,'shop_photos',false,false);
  PERFORM _sd(c,'tenancy-ejari','Tenancy / Ejari','Premises','ejari.pdf',0.90+random()*0.08,'tenancy_contract',false,true);
END; $fn$ LANGUAGE plpgsql;

-- Fee schedule: POS only (17 card types)
CREATE OR REPLACE FUNCTION _fees_pos(p UUID, s TEXT, i TEXT, cl TEXT) RETURNS VOID AS $fn$
BEGIN
  INSERT INTO ocr_fee_schedule (case_id,card_type,pos_rate) VALUES
    (p,'Visa Standard',s),(p,'Mastercard Standard',s),(p,'Visa Premium',s),(p,'Mastercard Premium',s),
    (p,'Standard Jaywan',s),(p,'Premium Jaywan',s),(p,'Mercury',s),(p,'Corporate Card',s),
    (p,'Issued Non-UAE',i),(p,'Super Premium',i),(p,'JCB',i),(p,'UnionPay',i),(p,'Rupay',i),(p,'Other Card Schemes',i),
    (p,'Club/Diners/Discover',cl),(p,'Alipay+','1.65%'),(p,'WeChat Pay','1.65%');
END; $fn$ LANGUAGE plpgsql;

-- Fee schedule: ECOM only
CREATE OR REPLACE FUNCTION _fees_ecom(p UUID, s TEXT, i TEXT, cl TEXT) RETURNS VOID AS $fn$
BEGIN
  INSERT INTO ocr_fee_schedule (case_id,card_type,ecom_rate) VALUES
    (p,'Visa Standard',s),(p,'Mastercard Standard',s),(p,'Visa Premium',s),(p,'Mastercard Premium',s),
    (p,'Standard Jaywan',s),(p,'Premium Jaywan',s),(p,'Mercury',s),(p,'Corporate Card',s),
    (p,'Issued Non-UAE',i),(p,'Super Premium',i),(p,'JCB',i),(p,'UnionPay',i),(p,'Rupay',i),(p,'Other Card Schemes',i),
    (p,'Club/Diners/Discover',cl),(p,'Alipay+','1.65%'),(p,'WeChat Pay','1.65%');
END; $fn$ LANGUAGE plpgsql;

-- Fee schedule: POS + ECOM
CREATE OR REPLACE FUNCTION _fees_both(p UUID, ps TEXT, es TEXT, i TEXT, cl TEXT) RETURNS VOID AS $fn$
BEGIN
  INSERT INTO ocr_fee_schedule (case_id,card_type,pos_rate,ecom_rate) VALUES
    (p,'Visa Standard',ps,es),(p,'Mastercard Standard',ps,es),(p,'Visa Premium',ps,es),(p,'Mastercard Premium',ps,es),
    (p,'Standard Jaywan',ps,es),(p,'Premium Jaywan',ps,es),(p,'Mercury',ps,es),(p,'Corporate Card',ps,es),
    (p,'Issued Non-UAE',i,i),(p,'Super Premium',i,i),(p,'JCB',i,i),(p,'UnionPay',i,i),(p,'Rupay',i,i),(p,'Other Card Schemes',i,i),
    (p,'Club/Diners/Discover',cl,cl),(p,'Alipay+','1.65%','1.65%'),(p,'WeChat Pay','1.65%','1.65%');
END; $fn$ LANGUAGE plpgsql;


-- ============================================================
-- MAIN DATA BLOCK
-- ============================================================
DO $$
DECLARE
  -- ── Existing users (DO NOT CHANGE) ──
  v_admin  UUID := '8278f8a8-9b61-4102-9969-dc0e7b9b094c';
  v_zain   UUID := '4ac67e4d-7f8f-43e3-bb1b-47576af62477';
  v_sales1 UUID := '6712cf7f-9398-4be0-931b-44bbe0737ee6';
  v_proc1  UUID := '1853218a-3859-4e2e-9648-fa3fa4a02034';
  v_sales2 UUID := 'afd738a3-5576-4172-a233-dfec63c2dd54';

  -- ── New users ──
  v_sarah  UUID := 'b0000001-0000-0000-0000-000000000001';
  v_omar   UUID := 'b0000002-0000-0000-0000-000000000002';
  v_fatima UUID := 'b0000003-0000-0000-0000-000000000003';
  v_khalid UUID := 'b0000004-0000-0000-0000-000000000004';
  v_rania  UUID := 'b0000005-0000-0000-0000-000000000005';

  -- ── Existing case (velocity) ──
  c0 UUID := '626130f3-225a-46ad-b77c-96d395b0a4e6';

  -- ── New case UUIDs (59 cases: c1–c59) ──
  c1  UUID := gen_random_uuid(); c2  UUID := gen_random_uuid(); c3  UUID := gen_random_uuid();
  c4  UUID := gen_random_uuid(); c5  UUID := gen_random_uuid(); c6  UUID := gen_random_uuid();
  c7  UUID := gen_random_uuid(); c8  UUID := gen_random_uuid(); c9  UUID := gen_random_uuid();
  c10 UUID := gen_random_uuid(); c11 UUID := gen_random_uuid(); c12 UUID := gen_random_uuid();
  c13 UUID := gen_random_uuid(); c14 UUID := gen_random_uuid(); c15 UUID := gen_random_uuid();
  c16 UUID := gen_random_uuid(); c17 UUID := gen_random_uuid(); c18 UUID := gen_random_uuid();
  c19 UUID := gen_random_uuid(); c20 UUID := gen_random_uuid(); c21 UUID := gen_random_uuid();
  c22 UUID := gen_random_uuid(); c23 UUID := gen_random_uuid(); c24 UUID := gen_random_uuid();
  c25 UUID := gen_random_uuid(); c26 UUID := gen_random_uuid(); c27 UUID := gen_random_uuid();
  c28 UUID := gen_random_uuid(); c29 UUID := gen_random_uuid(); c30 UUID := gen_random_uuid();
  c31 UUID := gen_random_uuid(); c32 UUID := gen_random_uuid(); c33 UUID := gen_random_uuid();
  c34 UUID := gen_random_uuid(); c35 UUID := gen_random_uuid(); c36 UUID := gen_random_uuid();
  c37 UUID := gen_random_uuid(); c38 UUID := gen_random_uuid(); c39 UUID := gen_random_uuid();
  c40 UUID := gen_random_uuid(); c41 UUID := gen_random_uuid(); c42 UUID := gen_random_uuid();
  c43 UUID := gen_random_uuid(); c44 UUID := gen_random_uuid(); c45 UUID := gen_random_uuid();
  c46 UUID := gen_random_uuid(); c47 UUID := gen_random_uuid(); c48 UUID := gen_random_uuid();
  c49 UUID := gen_random_uuid(); c50 UUID := gen_random_uuid(); c51 UUID := gen_random_uuid();
  c52 UUID := gen_random_uuid(); c53 UUID := gen_random_uuid(); c54 UUID := gen_random_uuid();
  c55 UUID := gen_random_uuid(); c56 UUID := gen_random_uuid(); c57 UUID := gen_random_uuid();
  c58 UUID := gen_random_uuid(); c59 UUID := gen_random_uuid();

  -- ── Shareholder UUIDs ──
  s1  UUID := gen_random_uuid(); s2  UUID := gen_random_uuid(); s3  UUID := gen_random_uuid();
  s4  UUID := gen_random_uuid(); s5  UUID := gen_random_uuid(); s6  UUID := gen_random_uuid();
  s7  UUID := gen_random_uuid(); s8  UUID := gen_random_uuid(); s9  UUID := gen_random_uuid();
  s10 UUID := gen_random_uuid(); s11 UUID := gen_random_uuid(); s12 UUID := gen_random_uuid();
  s13 UUID := gen_random_uuid(); s14 UUID := gen_random_uuid(); s15 UUID := gen_random_uuid();
  s16 UUID := gen_random_uuid(); s17 UUID := gen_random_uuid(); s18 UUID := gen_random_uuid();
  s19 UUID := gen_random_uuid(); s20 UUID := gen_random_uuid(); s21 UUID := gen_random_uuid();
  s22 UUID := gen_random_uuid(); s23 UUID := gen_random_uuid(); s24 UUID := gen_random_uuid();
  s25 UUID := gen_random_uuid(); s26 UUID := gen_random_uuid(); s27 UUID := gen_random_uuid();
  s28 UUID := gen_random_uuid(); s29 UUID := gen_random_uuid(); s30 UUID := gen_random_uuid();
  s31 UUID := gen_random_uuid(); s32 UUID := gen_random_uuid(); s33 UUID := gen_random_uuid();
  s34 UUID := gen_random_uuid(); s35 UUID := gen_random_uuid(); s36 UUID := gen_random_uuid();
  s37 UUID := gen_random_uuid(); s38 UUID := gen_random_uuid(); s39 UUID := gen_random_uuid();
  s40 UUID := gen_random_uuid();

BEGIN

-- ════════════════════════════════════════════════════════════
-- PHASE 0: AUTH USERS (5 new)
-- ════════════════════════════════════════════════════════════

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous)
VALUES
  ('00000000-0000-0000-0000-000000000000', v_sarah,  'authenticated','authenticated','sarah.ahmed@rfmloyaltyco.ae',  crypt('RFMdemo2026!',gen_salt('bf')), now(),'{"provider":"email","providers":["email"]}','{"full_name":"Sarah Ahmed","role":"sales"}',      now(),now(),false,false),
  ('00000000-0000-0000-0000-000000000000', v_omar,   'authenticated','authenticated','omar.hassan@rfmloyaltyco.ae', crypt('RFMdemo2026!',gen_salt('bf')), now(),'{"provider":"email","providers":["email"]}','{"full_name":"Omar Hassan","role":"sales"}',      now(),now(),false,false),
  ('00000000-0000-0000-0000-000000000000', v_fatima, 'authenticated','authenticated','fatima.ali@rfmloyaltyco.ae',  crypt('RFMdemo2026!',gen_salt('bf')), now(),'{"provider":"email","providers":["email"]}','{"full_name":"Fatima Ali","role":"processing"}',   now(),now(),false,false),
  ('00000000-0000-0000-0000-000000000000', v_khalid, 'authenticated','authenticated','khalid.noor@rfmloyaltyco.ae', crypt('RFMdemo2026!',gen_salt('bf')), now(),'{"provider":"email","providers":["email"]}','{"full_name":"Khalid Noor","role":"processing"}',  now(),now(),false,false),
  ('00000000-0000-0000-0000-000000000000', v_rania,  'authenticated','authenticated','rania.malik@rfmloyaltyco.ae', crypt('RFMdemo2026!',gen_salt('bf')), now(),'{"provider":"email","providers":["email"]}','{"full_name":"Rania Malik","role":"management"}',  now(),now(),false,false)
ON CONFLICT (id) DO NOTHING;

-- Auth identities (required for login)
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at) VALUES
  (v_sarah,  v_sarah,  v_sarah::text,  jsonb_build_object('sub',v_sarah::text, 'email','sarah.ahmed@rfmloyaltyco.ae', 'email_verified',true,'phone_verified',false), 'email',now(),now(),now()),
  (v_omar,   v_omar,   v_omar::text,   jsonb_build_object('sub',v_omar::text,  'email','omar.hassan@rfmloyaltyco.ae','email_verified',true,'phone_verified',false), 'email',now(),now(),now()),
  (v_fatima, v_fatima, v_fatima::text, jsonb_build_object('sub',v_fatima::text,'email','fatima.ali@rfmloyaltyco.ae', 'email_verified',true,'phone_verified',false), 'email',now(),now(),now()),
  (v_khalid, v_khalid, v_khalid::text, jsonb_build_object('sub',v_khalid::text,'email','khalid.noor@rfmloyaltyco.ae','email_verified',true,'phone_verified',false), 'email',now(),now(),now()),
  (v_rania,  v_rania,  v_rania::text,  jsonb_build_object('sub',v_rania::text, 'email','rania.malik@rfmloyaltyco.ae','email_verified',true,'phone_verified',false), 'email',now(),now(),now())
ON CONFLICT DO NOTHING;

-- Profiles (trigger creates them, but we UPDATE to set correct roles)
-- Wait for trigger, then update
INSERT INTO profiles (id, email, full_name, role, is_active) VALUES
  (v_sarah,  'sarah.ahmed@rfmloyaltyco.ae',  'Sarah Ahmed',  'sales',      true),
  (v_omar,   'omar.hassan@rfmloyaltyco.ae',  'Omar Hassan',  'sales',      true),
  (v_fatima, 'fatima.ali@rfmloyaltyco.ae',   'Fatima Ali',   'processing', true),
  (v_khalid, 'khalid.noor@rfmloyaltyco.ae',  'Khalid Noor',  'processing', true),
  (v_rania,  'rania.malik@rfmloyaltyco.ae',  'Rania Malik',  'management', true)
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, is_active = EXCLUDED.is_active;


-- ════════════════════════════════════════════════════════════
-- PHASE 1: CASES (59 new — velocity c0 already exists)
-- ════════════════════════════════════════════════════════════
-- Columns: id, legal_name, dba, case_type, status, created_by, assigned_to, submitted_at, reviewed_at, reviewed_by, readiness_score, readiness_tier, created_at

INSERT INTO cases (id, legal_name, dba, case_type, status, created_by, assigned_to, submitted_at, reviewed_at, reviewed_by, readiness_score, readiness_tier, created_at) VALUES
  -- ── LOW RISK (20 new) ─────────────────────────────────────
  -- c1: incomplete (Mar)
  (c1,  'Al Baraka Trading LLC',         'Baraka Fresh',       'low-risk','incomplete', v_sales1, NULL, NULL, NULL, NULL, 32,'red',   '2026-03-03 09:00:00+04'),
  -- c2: incomplete (Mar)
  (c2,  'Gulf Star Electronics FZE',     'Gulf Star',          'low-risk','incomplete', v_sarah,  NULL, NULL, NULL, NULL, 28,'red',   '2026-03-10 10:30:00+04'),
  -- c3: complete (Mar)
  (c3,  'Noor Al Hayat Pharmacy LLC',    'Noor Pharmacy',      'low-risk','complete',   v_omar,   NULL, NULL, NULL, NULL, 78,'amber', '2026-03-05 11:00:00+04'),
  -- c4: complete (Mar)
  (c4,  'Desert Rose Restaurant LLC',    'Desert Rose',        'low-risk','complete',   v_sales2, NULL, NULL, NULL, NULL, 82,'green', '2026-03-12 08:30:00+04'),
  -- c5: submitted 2h ago (unassigned)
  (c5,  'Emirates Auto Parts Trading',   'EAP Trading',        'low-risk','submitted',  v_sales1, NULL, now()-interval '2 hours', NULL, NULL, 88,'green','2026-03-18 09:00:00+04'),
  -- c6: submitted 6h ago (unassigned)
  (c6,  'Skyline Fashion Boutique LLC',  'Skyline Fashion',    'low-risk','submitted',  v_sarah,  NULL, now()-interval '6 hours', NULL, NULL, 85,'green','2026-03-15 10:00:00+04'),
  -- c7: submitted 15h ago (assigned)
  (c7,  'Al Safwa General Trading LLC',  'Al Safwa Trading',   'low-risk','submitted',  v_omar,   v_fatima, now()-interval '15 hours', NULL, NULL, 90,'green','2026-03-10 09:00:00+04'),
  -- c8: submitted 36h ago (assigned — SLA breach)
  (c8,  'Jumeirah Coffee Roasters LLC',  'Jumeirah Coffee',    'low-risk','submitted',  v_sarah,  v_khalid, now()-interval '36 hours', NULL, NULL, 87,'green','2026-03-08 14:00:00+04'),
  -- c9: in_review
  (c9,  'Royal Spice Restaurant LLC',    'Royal Spice',        'low-risk','in_review',  v_sales2, v_proc1,  '2026-03-14 09:00:00+04', NULL, NULL, 91,'green','2026-03-07 08:00:00+04'),
  -- c10: in_review
  (c10, 'Bin Hamdan Auto Services LLC',  'Bin Hamdan Auto',    'low-risk','in_review',  v_sarah,  v_fatima, '2026-03-16 10:00:00+04', NULL, NULL, 89,'green','2026-03-11 11:00:00+04'),
  -- c11: approved (Feb)
  (c11, 'Oasis Supermarket LLC',         'Oasis Market',       'low-risk','approved',   v_omar,   v_khalid, '2026-02-10 09:00:00+04','2026-02-14 15:00:00+04', v_khalid, 93,'green','2026-02-01 08:00:00+04'),
  -- c12: returned (1x) (Feb)
  (c12, 'Marina Flowers LLC',            'Marina Blooms',      'low-risk','returned',   v_sarah,  v_khalid, '2026-02-18 09:00:00+04','2026-02-22 14:00:00+04', v_khalid, 55,'amber','2026-02-08 10:00:00+04'),
  -- c13: returned (2x — twice) (Feb)
  (c13, 'Sunrise Bakery LLC',            'Sunrise Bakery',     'low-risk','returned',   v_sales2, v_proc1,  '2026-02-12 10:00:00+04','2026-02-16 11:00:00+04', v_proc1, 48,'red','2026-02-06 09:00:00+04'),
  -- c14: exported (Dec)
  (c14, 'Golden Sands Real Estate LLC',  'Golden Sands',       'low-risk','exported',   v_omar,   v_fatima, '2025-12-10 09:00:00+04','2025-12-18 14:00:00+04', v_fatima, 95,'green','2025-12-01 08:00:00+04'),
  -- c15: exported (Dec)
  (c15, 'Palm Jewellers LLC',            'Palm Jewellers',     'low-risk','exported',   v_sarah,  v_khalid, '2025-12-20 10:00:00+04','2025-12-28 16:00:00+04', v_khalid, 94,'green','2025-12-10 11:00:00+04'),
  -- c16: active (Oct)
  (c16, 'Dubai Fresh Market LLC',        'Fresh Market',       'low-risk','active',     v_sales1, v_proc1,  '2025-10-12 09:00:00+04','2025-10-20 15:00:00+04', v_proc1, 96,'green','2025-10-03 08:00:00+04'),
  -- c17: active (Oct)
  (c17, 'Al Jazeera Electronics LLC',    'AJ Electronics',     'low-risk','active',     v_sarah,  v_fatima, '2025-10-22 10:00:00+04','2025-10-30 14:00:00+04', v_fatima, 92,'green','2025-10-15 09:00:00+04'),
  -- c18: active (Nov)
  (c18, 'Burj Construction Materials',   'Burj Materials',     'low-risk','active',     v_omar,   v_khalid, '2025-11-10 09:00:00+04','2025-11-18 16:00:00+04', v_khalid, 94,'green','2025-11-02 10:00:00+04'),
  -- c19: active (Nov)
  (c19, 'Creek Side Textiles LLC',       'Creek Textiles',     'low-risk','active',     v_sales2, v_proc1,  '2025-11-22 10:00:00+04','2025-11-30 15:00:00+04', v_proc1, 91,'green','2025-11-14 08:00:00+04'),
  -- c20: active (Nov)
  (c20, 'Deira Gold Souk Trading',       'Deira Gold',         'low-risk','active',     v_sarah,  v_fatima, '2025-12-02 09:00:00+04','2025-12-10 14:00:00+04', v_fatima, 93,'green','2025-11-25 11:00:00+04'),

  -- ── HIGH RISK (9 new) ────────────────────────────────────
  -- c21: incomplete (Mar)
  (c21, 'Global Commodities DMCC',       'GC Trading',         'high-risk','incomplete', v_omar,   NULL, NULL, NULL, NULL, 22,'red',   '2026-03-08 14:00:00+04'),
  -- c22: complete (Feb)
  (c22, 'Pinnacle Financial Services',   'Pinnacle FS',        'high-risk','complete',   v_sarah,  NULL, NULL, NULL, NULL, 75,'amber', '2026-02-03 11:30:00+04'),
  -- c23: submitted 8h ago (unassigned)
  (c23, 'Arabian Gulf Exchange LLC',     'AG Exchange',        'high-risk','submitted',  v_sales1, NULL, now()-interval '8 hours', NULL, NULL, 83,'green','2026-03-12 09:00:00+04'),
  -- c24: submitted 48h ago (assigned — SLA breach)
  (c24, 'Al Ghurair Precious Metals',    'AG Precious',        'high-risk','submitted',  v_omar,   v_khalid, now()-interval '48 hours', NULL, NULL, 80,'green','2026-03-06 10:00:00+04'),
  -- c25: in_review (Feb)
  (c25, 'Falcon Money Exchange LLC',     'Falcon FX',          'high-risk','in_review',  v_sarah,  v_fatima, '2026-02-15 09:00:00+04', NULL, NULL, 86,'green','2026-02-05 08:00:00+04'),
  -- c26: escalated — sanctions (Feb)
  (c26, 'Royal Exchange House LLC',      'Royal Exchange',     'high-risk','escalated',  v_omar,   v_proc1,  '2026-02-20 10:00:00+04', NULL, NULL, 78,'amber','2026-02-10 09:00:00+04'),
  -- c27: escalated — PEP (Feb)
  (c27, 'Gulf Bullion DMCC',             'Gulf Bullion',       'high-risk','escalated',  v_sarah,  v_fatima, '2026-02-25 09:00:00+04', NULL, NULL, 76,'amber','2026-02-07 14:00:00+04'),
  -- c28: active (Nov)
  (c28, 'Al Waha Money Transfer LLC',    'Al Waha Transfer',   'high-risk','active',     v_sales1, v_khalid, '2025-11-15 10:00:00+04','2025-11-25 14:00:00+04', v_khalid, 90,'green','2025-11-08 09:00:00+04'),
  -- c29: suspended (Jan)
  (c29, 'Dubai Gold Refinery DMCC',      'DG Refinery',        'high-risk','suspended',  v_sarah,  v_proc1,  '2026-01-12 09:00:00+04','2026-01-20 16:00:00+04', v_proc1, 72,'amber','2026-01-05 10:00:00+04'),

  -- ── E-INVOICE (9 new) ────────────────────────────────────
  -- c30: incomplete (Mar)
  (c30, 'Smart Solutions IT LLC',        'SmartSol',           'einvoice','incomplete', v_omar,   NULL, NULL, NULL, NULL, 18,'red',   '2026-03-14 10:00:00+04'),
  -- c31: complete (Feb)
  (c31, 'Digital Commerce Group FZE',    'DCG',                'einvoice','complete',   v_sales2, NULL, NULL, NULL, NULL, 70,'amber', '2026-02-20 14:00:00+04'),
  -- c32: submitted 4h ago (unassigned)
  (c32, 'OrderNow Technologies FZCO',    'OrderNow',           'einvoice','submitted',  v_sarah,  NULL, now()-interval '4 hours', NULL, NULL, 86,'green','2026-03-16 08:00:00+04'),
  -- c33: submitted 20h ago (assigned)
  (c33, 'PayFlex Solutions LLC',         'PayFlex',            'einvoice','submitted',  v_omar,   v_fatima, now()-interval '20 hours', NULL, NULL, 84,'green','2026-03-13 11:00:00+04'),
  -- c34: in_review (Feb)
  (c34, 'Cloud Kitchen Concepts LLC',    'CloudEats',          'einvoice','in_review',  v_sarah,  v_khalid, '2026-02-22 10:00:00+04', NULL, NULL, 88,'green','2026-02-10 09:00:00+04'),
  -- c35: approved (Jan)
  (c35, 'TechBridge Solutions FZE',      'TechBridge',         'einvoice','approved',   v_sales1, v_proc1,  '2026-01-28 09:00:00+04','2026-02-05 14:00:00+04', v_proc1, 92,'green','2026-01-22 10:00:00+04'),
  -- c36: returned (1x) (Feb)
  (c36, 'Al Salam E-Services LLC',       'Al Salam Digital',   'einvoice','returned',   v_sales2, v_fatima, '2026-02-28 10:00:00+04','2026-03-05 11:00:00+04', v_fatima, 52,'amber','2026-02-14 08:00:00+04'),
  -- c37: active (Dec)
  (c37, 'Noon Food Delivery LLC',        'NoonFood',           'einvoice','active',     v_omar,   v_khalid, '2025-12-12 09:00:00+04','2025-12-22 15:00:00+04', v_khalid, 93,'green','2025-12-05 10:00:00+04'),
  -- c38: active (Dec)
  (c38, 'Careem Marketplace LLC',        'Careem Market',      'einvoice','active',     v_sarah,  v_proc1,  '2025-12-22 10:00:00+04','2026-01-05 14:00:00+04', v_proc1, 91,'green','2025-12-15 09:00:00+04'),
  -- c39: renewal_pending (Jan)
  (c39, 'Zomato UAE FZE',                'Zomato UAE',         'einvoice','renewal_pending', v_sales1, v_fatima, '2026-01-15 09:00:00+04','2026-01-25 16:00:00+04', v_fatima, 88,'green','2026-01-08 08:00:00+04'),

  -- ── PAYMENT GATEWAY (10 new) ─────────────────────────────
  -- c40: incomplete (Mar)
  (c40, 'TechPay Solutions FZCO',        'TechPay',            'payment-gateway','incomplete', v_sarah, NULL, NULL, NULL, NULL, 15,'red','2026-03-17 09:00:00+04'),
  -- c41: complete (Feb)
  (c41, 'E-Market Hub LLC',              'E-Market',           'payment-gateway','complete',   v_omar,  NULL, NULL, NULL, NULL, 74,'amber','2026-02-22 11:00:00+04'),
  -- c42: submitted 10h ago (unassigned)
  (c42, 'Luxury Deals Online FZE',       'LuxDeals',           'payment-gateway','submitted',  v_sales2, NULL, now()-interval '10 hours', NULL, NULL, 85,'green','2026-03-14 10:00:00+04'),
  -- c43: submitted 42h ago (assigned — SLA breach)
  (c43, 'Modanisa UAE FZCO',             'Modanisa',           'payment-gateway','submitted',  v_sarah, v_proc1, now()-interval '42 hours', NULL, NULL, 82,'green','2026-03-09 08:00:00+04'),
  -- c44: in_review (Feb)
  (c44, 'Namshi FZCO',                   'Namshi',             'payment-gateway','in_review',  v_omar,  v_fatima, '2026-02-25 09:00:00+04', NULL, NULL, 87,'green','2026-02-12 14:00:00+04'),
  -- c45: approved (Jan)
  (c45, 'Amazon Payment Services FZE',   'Amazon PS',          'payment-gateway','approved',   v_sales1, v_khalid, '2026-02-02 10:00:00+04','2026-02-10 15:00:00+04', v_khalid, 95,'green','2026-01-28 09:00:00+04'),
  -- c46: returned (1x) (Feb)
  (c46, 'Talabat Digital LLC',            'Talabat Pay',        'payment-gateway','returned',   v_sarah, v_proc1,  '2026-02-24 09:00:00+04','2026-03-02 14:00:00+04', v_proc1, 50,'amber','2026-02-16 10:00:00+04'),
  -- c47: exported (Dec)
  (c47, 'Shopify MENA FZE',              'Shopify MENA',       'payment-gateway','exported',   v_omar,  v_fatima, '2025-12-28 10:00:00+04','2026-01-08 14:00:00+04', v_fatima, 96,'green','2025-12-20 08:00:00+04'),
  -- c48: active (Dec)
  (c48, 'Mumzworld FZCO',                'Mumzworld',          'payment-gateway','active',     v_sales2, v_khalid, '2025-12-15 09:00:00+04','2025-12-25 15:00:00+04', v_khalid, 93,'green','2025-12-08 10:00:00+04'),
  -- c49: active (Dec)
  (c49, 'Ounass FZCO',                   'Ounass',             'payment-gateway','active',     v_sarah, v_proc1,  '2026-01-05 10:00:00+04','2026-01-15 14:00:00+04', v_proc1, 91,'green','2025-12-18 09:00:00+04'),

  -- ── ADDITIONAL MID (6 new) ───────────────────────────────
  -- c50: incomplete (Mar)
  (c50, 'Al Futtaim Retail Group',       'AF Retail',          'additional-mid','incomplete', v_sales1, NULL, NULL, NULL, NULL, 20,'red','2026-03-20 08:30:00+04'),
  -- c51: submitted 30h ago (assigned)
  (c51, 'Majid Al Futtaim Leisure',      'MAF Leisure',        'additional-mid','submitted',  v_sarah, v_khalid, now()-interval '30 hours', NULL, NULL, 84,'green','2026-02-25 10:00:00+04'),
  -- c52: approved (Jan)
  (c52, 'Lulu Hypermarket Group',        'Lulu JBR',           'additional-mid','approved',   v_omar,  v_proc1,  '2026-01-25 09:00:00+04','2026-02-02 14:00:00+04', v_proc1, 90,'green','2026-01-18 08:00:00+04'),
  -- c53: active (Oct)
  (c53, 'BinDawood Retail LLC',          'BinDawood',          'additional-mid','active',     v_sales2, v_fatima, '2025-10-30 10:00:00+04','2025-11-08 15:00:00+04', v_fatima, 89,'green','2025-10-22 09:00:00+04'),
  -- c54: active (Dec)
  (c54, 'Landmark Group Retail',         'Landmark Home',      'additional-mid','active',     v_sarah, v_khalid, '2025-12-20 09:00:00+04','2025-12-30 14:00:00+04', v_khalid, 92,'green','2025-12-12 10:00:00+04'),
  -- c55: renewal_pending (Jan)
  (c55, 'Sharaf DG Retail',              'Sharaf DG',          'additional-mid','renewal_pending', v_omar, v_proc1, '2026-01-20 10:00:00+04','2026-01-30 15:00:00+04', v_proc1, 86,'green','2026-01-12 08:00:00+04'),

  -- ── NEW LOCATION (4 new) ─────────────────────────────────
  -- c56: returned (2x) (Feb)
  (c56, 'Carrefour Hypermarket',         'Carrefour JLT',      'new-location','returned', v_sales1, v_fatima, '2026-02-25 09:00:00+04','2026-03-04 14:00:00+04', v_fatima, 45,'red','2026-02-18 10:00:00+04'),
  -- c57: in_review (Feb)
  (c57, 'Spinneys Dubai',                'Spinneys MBR',       'new-location','in_review', v_sarah, v_khalid, '2026-03-05 10:00:00+04', NULL, NULL, 88,'green','2026-02-28 09:00:00+04'),
  -- c58: active (Sep)
  (c58, 'IKEA Al Ain',                   'IKEA AA',            'new-location','active',  v_omar,  v_proc1,  '2025-09-15 09:00:00+04','2025-09-25 15:00:00+04', v_proc1, 95,'green','2025-09-05 10:00:00+04'),
  -- c59: closed (Sep)
  (c59, 'Virgin Megastore',              'Virgin DFC',         'new-location','closed',  v_sales2, v_fatima, '2025-09-20 10:00:00+04','2025-10-01 14:00:00+04', v_fatima, 90,'green','2025-09-12 08:00:00+04');


-- ════════════════════════════════════════════════════════════
-- PHASE 2: STATUS HISTORY (full lifecycle for every case)
-- ════════════════════════════════════════════════════════════

INSERT INTO case_status_history (case_id, from_status, to_status, changed_by, note, created_at) VALUES
  -- ── c1 Al Baraka (incomplete) ──
  (c1, NULL,'incomplete', v_sales1, 'Case created', '2026-03-03 09:00:00+04'),

  -- ── c2 Gulf Star (incomplete) ──
  (c2, NULL,'incomplete', v_sarah, 'Case created', '2026-03-10 10:30:00+04'),

  -- ── c3 Noor Pharmacy (complete) ──
  (c3, NULL,'incomplete', v_omar, 'Case created', '2026-03-05 11:00:00+04'),
  (c3, 'incomplete','complete', v_omar, 'All documents uploaded', '2026-03-08 16:00:00+04'),

  -- ── c4 Desert Rose (complete) ──
  (c4, NULL,'incomplete', v_sales2, 'Case created', '2026-03-12 08:30:00+04'),
  (c4, 'incomplete','complete', v_sales2, 'Checklist complete', '2026-03-15 14:00:00+04'),

  -- ── c5 EAP Trading (submitted 2h ago) ──
  (c5, NULL,'incomplete', v_sales1, 'Case created', '2026-03-18 09:00:00+04'),
  (c5, 'incomplete','complete', v_sales1, 'All docs uploaded', '2026-03-20 15:00:00+04'),
  (c5, 'complete','submitted', v_sales1, 'Submitted for review', now()-interval '2 hours'),

  -- ── c6 Skyline Fashion (submitted 6h ago) ──
  (c6, NULL,'incomplete', v_sarah, 'Case created', '2026-03-15 10:00:00+04'),
  (c6, 'incomplete','complete', v_sarah, 'Documents ready', '2026-03-18 16:00:00+04'),
  (c6, 'complete','submitted', v_sarah, 'Submitted for review', now()-interval '6 hours'),

  -- ── c7 Al Safwa (submitted 15h, assigned) ──
  (c7, NULL,'incomplete', v_omar, 'Case created', '2026-03-10 09:00:00+04'),
  (c7, 'incomplete','complete', v_omar, 'All documents uploaded', '2026-03-14 14:00:00+04'),
  (c7, 'complete','submitted', v_omar, 'Submitted for review', now()-interval '15 hours'),

  -- ── c8 Jumeirah Coffee (submitted 36h, SLA breach) ──
  (c8, NULL,'incomplete', v_sarah, 'Case created', '2026-03-08 14:00:00+04'),
  (c8, 'incomplete','complete', v_sarah, 'Checklist complete', '2026-03-12 17:00:00+04'),
  (c8, 'complete','submitted', v_sarah, 'Submitted for review', now()-interval '36 hours'),

  -- ── c9 Royal Spice (in_review) ──
  (c9, NULL,'incomplete', v_sales2, 'Case created', '2026-03-07 08:00:00+04'),
  (c9, 'incomplete','complete', v_sales2, 'Documents uploaded', '2026-03-12 15:00:00+04'),
  (c9, 'complete','submitted', v_sales2, 'Submitted', '2026-03-14 09:00:00+04'),
  (c9, 'submitted','in_review', v_proc1, 'Picked up for review', '2026-03-15 09:00:00+04'),

  -- ── c10 Bin Hamdan (in_review) ──
  (c10, NULL,'incomplete', v_sarah, 'Case created', '2026-03-11 11:00:00+04'),
  (c10, 'incomplete','complete', v_sarah, 'All docs ready', '2026-03-15 16:00:00+04'),
  (c10, 'complete','submitted', v_sarah, 'Submitted', '2026-03-16 10:00:00+04'),
  (c10, 'submitted','in_review', v_fatima, 'Picked up for review', '2026-03-17 09:00:00+04'),

  -- ── c11 Oasis Supermarket (approved) ──
  (c11, NULL,'incomplete', v_omar, 'Case created', '2026-02-01 08:00:00+04'),
  (c11, 'incomplete','complete', v_omar, 'Documents uploaded', '2026-02-06 16:00:00+04'),
  (c11, 'complete','submitted', v_omar, 'Submitted for review', '2026-02-10 09:00:00+04'),
  (c11, 'submitted','in_review', v_khalid, 'Picked up', '2026-02-11 09:00:00+04'),
  (c11, 'in_review','approved', v_khalid, 'All documents verified', '2026-02-14 15:00:00+04'),

  -- ── c12 Marina Flowers (returned 1x) ──
  (c12, NULL,'incomplete', v_sarah, 'Case created', '2026-02-08 10:00:00+04'),
  (c12, 'incomplete','complete', v_sarah, 'Uploaded', '2026-02-15 15:00:00+04'),
  (c12, 'complete','submitted', v_sarah, 'Submitted', '2026-02-18 09:00:00+04'),
  (c12, 'submitted','in_review', v_khalid, 'Picked up', '2026-02-19 09:00:00+04'),
  (c12, 'in_review','returned', v_khalid, 'Missing bank statement, blurry shop photos', '2026-02-22 14:00:00+04'),

  -- ── c13 Sunrise Bakery (returned 2x) ──
  (c13, NULL,'incomplete', v_sales2, 'Case created', '2026-02-06 09:00:00+04'),
  (c13, 'incomplete','complete', v_sales2, 'Uploaded', '2026-02-10 16:00:00+04'),
  (c13, 'complete','submitted', v_sales2, 'Submitted', '2026-02-12 10:00:00+04'),
  (c13, 'submitted','in_review', v_proc1, 'Picked up', '2026-02-13 09:00:00+04'),
  (c13, 'in_review','returned', v_proc1, 'TL expired, MOA missing signatories', '2026-02-16 11:00:00+04'),
  (c13, 'returned','submitted', v_sales2, 'Resubmitted with fixes', '2026-02-20 10:00:00+04'),
  (c13, 'submitted','in_review', v_proc1, 'Picked up again', '2026-02-21 09:00:00+04'),
  (c13, 'in_review','returned', v_proc1, 'TL still shows old activities', '2026-02-24 14:00:00+04'),

  -- ── c14 Golden Sands (exported) ──
  (c14, NULL,'incomplete', v_omar, 'Case created', '2025-12-01 08:00:00+04'),
  (c14, 'incomplete','complete', v_omar, 'Documents ready', '2025-12-06 16:00:00+04'),
  (c14, 'complete','submitted', v_omar, 'Submitted', '2025-12-10 09:00:00+04'),
  (c14, 'submitted','in_review', v_fatima, 'Picked up', '2025-12-11 09:00:00+04'),
  (c14, 'in_review','approved', v_fatima, 'Verified', '2025-12-18 14:00:00+04'),
  (c14, 'approved','exported', v_fatima, 'Exported to bank', '2025-12-22 10:00:00+04'),

  -- ── c15 Palm Jewellers (exported) ──
  (c15, NULL,'incomplete', v_sarah, 'Case created', '2025-12-10 11:00:00+04'),
  (c15, 'incomplete','complete', v_sarah, 'All docs', '2025-12-16 15:00:00+04'),
  (c15, 'complete','submitted', v_sarah, 'Submitted', '2025-12-20 10:00:00+04'),
  (c15, 'submitted','in_review', v_khalid, 'Picked up', '2025-12-21 09:00:00+04'),
  (c15, 'in_review','approved', v_khalid, 'All clear', '2025-12-28 16:00:00+04'),
  (c15, 'approved','exported', v_khalid, 'Exported', '2026-01-02 10:00:00+04'),

  -- ── c16 Fresh Market (active, Oct) ──
  (c16, NULL,'incomplete', v_sales1, 'Case created', '2025-10-03 08:00:00+04'),
  (c16, 'incomplete','complete', v_sales1, 'Done', '2025-10-08 16:00:00+04'),
  (c16, 'complete','submitted', v_sales1, 'Submitted', '2025-10-12 09:00:00+04'),
  (c16, 'submitted','in_review', v_proc1, 'Picked up', '2025-10-13 09:00:00+04'),
  (c16, 'in_review','approved', v_proc1, 'Approved', '2025-10-20 15:00:00+04'),
  (c16, 'approved','active', v_proc1, 'Merchant activated', '2025-10-25 10:00:00+04'),

  -- ── c17 AJ Electronics (active, Oct) ──
  (c17, NULL,'incomplete', v_sarah, NULL, '2025-10-15 09:00:00+04'),
  (c17, 'incomplete','complete', v_sarah, NULL, '2025-10-20 16:00:00+04'),
  (c17, 'complete','submitted', v_sarah, NULL, '2025-10-22 10:00:00+04'),
  (c17, 'submitted','in_review', v_fatima, NULL, '2025-10-23 09:00:00+04'),
  (c17, 'in_review','approved', v_fatima, NULL, '2025-10-30 14:00:00+04'),
  (c17, 'approved','active', v_fatima, 'Activated', '2025-11-03 10:00:00+04'),

  -- ── c18 Burj Materials (active, Nov) ──
  (c18, NULL,'incomplete', v_omar, NULL, '2025-11-02 10:00:00+04'),
  (c18, 'incomplete','complete', v_omar, NULL, '2025-11-07 16:00:00+04'),
  (c18, 'complete','submitted', v_omar, NULL, '2025-11-10 09:00:00+04'),
  (c18, 'submitted','in_review', v_khalid, NULL, '2025-11-11 09:00:00+04'),
  (c18, 'in_review','approved', v_khalid, NULL, '2025-11-18 16:00:00+04'),
  (c18, 'approved','active', v_khalid, 'Activated', '2025-11-22 10:00:00+04'),

  -- ── c19 Creek Textiles (active, Nov) ──
  (c19, NULL,'incomplete', v_sales2, NULL, '2025-11-14 08:00:00+04'),
  (c19, 'incomplete','complete', v_sales2, NULL, '2025-11-19 16:00:00+04'),
  (c19, 'complete','submitted', v_sales2, NULL, '2025-11-22 10:00:00+04'),
  (c19, 'submitted','in_review', v_proc1, NULL, '2025-11-23 09:00:00+04'),
  (c19, 'in_review','approved', v_proc1, NULL, '2025-11-30 15:00:00+04'),
  (c19, 'approved','active', v_proc1, NULL, '2025-12-03 10:00:00+04'),

  -- ── c20 Deira Gold (active, Nov) ──
  (c20, NULL,'incomplete', v_sarah, NULL, '2025-11-25 11:00:00+04'),
  (c20, 'incomplete','complete', v_sarah, NULL, '2025-11-30 16:00:00+04'),
  (c20, 'complete','submitted', v_sarah, NULL, '2025-12-02 09:00:00+04'),
  (c20, 'submitted','in_review', v_fatima, NULL, '2025-12-03 09:00:00+04'),
  (c20, 'in_review','approved', v_fatima, NULL, '2025-12-10 14:00:00+04'),
  (c20, 'approved','active', v_fatima, NULL, '2025-12-14 10:00:00+04'),

  -- ── HIGH RISK status histories ──

  -- c21 Global Commodities (incomplete)
  (c21, NULL,'incomplete', v_omar, 'Case created', '2026-03-08 14:00:00+04'),

  -- c22 Pinnacle FS (complete)
  (c22, NULL,'incomplete', v_sarah, NULL, '2026-02-03 11:30:00+04'),
  (c22, 'incomplete','complete', v_sarah, 'All high-risk documents uploaded', '2026-02-10 16:00:00+04'),

  -- c23 Arabian Gulf Exchange (submitted 8h)
  (c23, NULL,'incomplete', v_sales1, NULL, '2026-03-12 09:00:00+04'),
  (c23, 'incomplete','complete', v_sales1, NULL, '2026-03-17 15:00:00+04'),
  (c23, 'complete','submitted', v_sales1, 'Submitted for review', now()-interval '8 hours'),

  -- c24 AG Precious (submitted 48h, SLA breach)
  (c24, NULL,'incomplete', v_omar, NULL, '2026-03-06 10:00:00+04'),
  (c24, 'incomplete','complete', v_omar, NULL, '2026-03-12 16:00:00+04'),
  (c24, 'complete','submitted', v_omar, NULL, now()-interval '48 hours'),

  -- c25 Falcon FX (in_review)
  (c25, NULL,'incomplete', v_sarah, NULL, '2026-02-05 08:00:00+04'),
  (c25, 'incomplete','complete', v_sarah, NULL, '2026-02-12 16:00:00+04'),
  (c25, 'complete','submitted', v_sarah, NULL, '2026-02-15 09:00:00+04'),
  (c25, 'submitted','in_review', v_fatima, 'Picked up for enhanced due diligence', '2026-02-17 09:00:00+04'),

  -- c26 Royal Exchange (escalated — sanctions)
  (c26, NULL,'incomplete', v_omar, NULL, '2026-02-10 09:00:00+04'),
  (c26, 'incomplete','complete', v_omar, NULL, '2026-02-17 16:00:00+04'),
  (c26, 'complete','submitted', v_omar, NULL, '2026-02-20 10:00:00+04'),
  (c26, 'submitted','in_review', v_proc1, NULL, '2026-02-21 09:00:00+04'),
  (c26, 'in_review','escalated', v_proc1, 'Sanctions exposure to Russia — requires management review', '2026-02-25 11:00:00+04'),

  -- c27 Gulf Bullion (escalated — PEP)
  (c27, NULL,'incomplete', v_sarah, NULL, '2026-02-07 14:00:00+04'),
  (c27, 'incomplete','complete', v_sarah, NULL, '2026-02-14 16:00:00+04'),
  (c27, 'complete','submitted', v_sarah, NULL, '2026-02-25 09:00:00+04'),
  (c27, 'submitted','in_review', v_fatima, NULL, '2026-02-26 09:00:00+04'),
  (c27, 'in_review','escalated', v_fatima, 'PEP individual identified — Royal Family connection', '2026-03-01 14:00:00+04'),

  -- c28 Al Waha Transfer (active, Nov)
  (c28, NULL,'incomplete', v_sales1, NULL, '2025-11-08 09:00:00+04'),
  (c28, 'incomplete','complete', v_sales1, NULL, '2025-11-12 16:00:00+04'),
  (c28, 'complete','submitted', v_sales1, NULL, '2025-11-15 10:00:00+04'),
  (c28, 'submitted','in_review', v_khalid, NULL, '2025-11-16 09:00:00+04'),
  (c28, 'in_review','approved', v_khalid, 'Enhanced DD complete', '2025-11-25 14:00:00+04'),
  (c28, 'approved','active', v_khalid, NULL, '2025-11-28 10:00:00+04'),

  -- c29 DG Refinery (suspended, Jan)
  (c29, NULL,'incomplete', v_sarah, NULL, '2026-01-05 10:00:00+04'),
  (c29, 'incomplete','complete', v_sarah, NULL, '2026-01-10 16:00:00+04'),
  (c29, 'complete','submitted', v_sarah, NULL, '2026-01-12 09:00:00+04'),
  (c29, 'submitted','in_review', v_proc1, NULL, '2026-01-13 09:00:00+04'),
  (c29, 'in_review','approved', v_proc1, NULL, '2026-01-20 16:00:00+04'),
  (c29, 'approved','active', v_proc1, NULL, '2026-01-24 10:00:00+04'),
  (c29, 'active','suspended', v_proc1, 'AML compliance concerns — pending investigation', '2026-02-15 11:00:00+04'),

  -- ── E-INVOICE status histories ──

  (c30, NULL,'incomplete', v_omar, NULL, '2026-03-14 10:00:00+04'),

  (c31, NULL,'incomplete', v_sales2, NULL, '2026-02-20 14:00:00+04'),
  (c31, 'incomplete','complete', v_sales2, NULL, '2026-02-28 16:00:00+04'),

  (c32, NULL,'incomplete', v_sarah, NULL, '2026-03-16 08:00:00+04'),
  (c32, 'incomplete','complete', v_sarah, NULL, '2026-03-19 16:00:00+04'),
  (c32, 'complete','submitted', v_sarah, NULL, now()-interval '4 hours'),

  (c33, NULL,'incomplete', v_omar, NULL, '2026-03-13 11:00:00+04'),
  (c33, 'incomplete','complete', v_omar, NULL, '2026-03-17 16:00:00+04'),
  (c33, 'complete','submitted', v_omar, NULL, now()-interval '20 hours'),

  (c34, NULL,'incomplete', v_sarah, NULL, '2026-02-10 09:00:00+04'),
  (c34, 'incomplete','complete', v_sarah, NULL, '2026-02-18 16:00:00+04'),
  (c34, 'complete','submitted', v_sarah, NULL, '2026-02-22 10:00:00+04'),
  (c34, 'submitted','in_review', v_khalid, NULL, '2026-02-23 09:00:00+04'),

  (c35, NULL,'incomplete', v_sales1, NULL, '2026-01-22 10:00:00+04'),
  (c35, 'incomplete','complete', v_sales1, NULL, '2026-01-26 16:00:00+04'),
  (c35, 'complete','submitted', v_sales1, NULL, '2026-01-28 09:00:00+04'),
  (c35, 'submitted','in_review', v_proc1, NULL, '2026-01-29 09:00:00+04'),
  (c35, 'in_review','approved', v_proc1, 'E-invoice docs verified', '2026-02-05 14:00:00+04'),

  (c36, NULL,'incomplete', v_sales2, NULL, '2026-02-14 08:00:00+04'),
  (c36, 'incomplete','complete', v_sales2, NULL, '2026-02-24 16:00:00+04'),
  (c36, 'complete','submitted', v_sales2, NULL, '2026-02-28 10:00:00+04'),
  (c36, 'submitted','in_review', v_fatima, NULL, '2026-03-01 09:00:00+04'),
  (c36, 'in_review','returned', v_fatima, 'AML questionnaire unsigned, addendum missing stamp', '2026-03-05 11:00:00+04'),

  (c37, NULL,'incomplete', v_omar, NULL, '2025-12-05 10:00:00+04'),
  (c37, 'incomplete','complete', v_omar, NULL, '2025-12-10 16:00:00+04'),
  (c37, 'complete','submitted', v_omar, NULL, '2025-12-12 09:00:00+04'),
  (c37, 'submitted','in_review', v_khalid, NULL, '2025-12-13 09:00:00+04'),
  (c37, 'in_review','approved', v_khalid, NULL, '2025-12-22 15:00:00+04'),
  (c37, 'approved','active', v_khalid, NULL, '2025-12-26 10:00:00+04'),

  (c38, NULL,'incomplete', v_sarah, NULL, '2025-12-15 09:00:00+04'),
  (c38, 'incomplete','complete', v_sarah, NULL, '2025-12-20 16:00:00+04'),
  (c38, 'complete','submitted', v_sarah, NULL, '2025-12-22 10:00:00+04'),
  (c38, 'submitted','in_review', v_proc1, NULL, '2025-12-23 09:00:00+04'),
  (c38, 'in_review','approved', v_proc1, NULL, '2026-01-05 14:00:00+04'),
  (c38, 'approved','active', v_proc1, NULL, '2026-01-08 10:00:00+04'),

  (c39, NULL,'incomplete', v_sales1, NULL, '2026-01-08 08:00:00+04'),
  (c39, 'incomplete','complete', v_sales1, NULL, '2026-01-13 16:00:00+04'),
  (c39, 'complete','submitted', v_sales1, NULL, '2026-01-15 09:00:00+04'),
  (c39, 'submitted','in_review', v_fatima, NULL, '2026-01-16 09:00:00+04'),
  (c39, 'in_review','approved', v_fatima, NULL, '2026-01-25 16:00:00+04'),
  (c39, 'approved','active', v_fatima, NULL, '2026-01-28 10:00:00+04'),
  (c39, 'active','renewal_pending', v_fatima, 'TL expiring — renewal required', '2026-03-10 08:00:00+04'),

  -- ── PAYMENT GATEWAY status histories ──

  (c40, NULL,'incomplete', v_sarah, NULL, '2026-03-17 09:00:00+04'),

  (c41, NULL,'incomplete', v_omar, NULL, '2026-02-22 11:00:00+04'),
  (c41, 'incomplete','complete', v_omar, NULL, '2026-03-02 16:00:00+04'),

  (c42, NULL,'incomplete', v_sales2, NULL, '2026-03-14 10:00:00+04'),
  (c42, 'incomplete','complete', v_sales2, NULL, '2026-03-18 16:00:00+04'),
  (c42, 'complete','submitted', v_sales2, NULL, now()-interval '10 hours'),

  (c43, NULL,'incomplete', v_sarah, NULL, '2026-03-09 08:00:00+04'),
  (c43, 'incomplete','complete', v_sarah, NULL, '2026-03-14 16:00:00+04'),
  (c43, 'complete','submitted', v_sarah, NULL, now()-interval '42 hours'),

  (c44, NULL,'incomplete', v_omar, NULL, '2026-02-12 14:00:00+04'),
  (c44, 'incomplete','complete', v_omar, NULL, '2026-02-20 16:00:00+04'),
  (c44, 'complete','submitted', v_omar, NULL, '2026-02-25 09:00:00+04'),
  (c44, 'submitted','in_review', v_fatima, NULL, '2026-02-26 09:00:00+04'),

  (c45, NULL,'incomplete', v_sales1, NULL, '2026-01-28 09:00:00+04'),
  (c45, 'incomplete','complete', v_sales1, NULL, '2026-02-01 16:00:00+04'),
  (c45, 'complete','submitted', v_sales1, NULL, '2026-02-02 10:00:00+04'),
  (c45, 'submitted','in_review', v_khalid, NULL, '2026-02-03 09:00:00+04'),
  (c45, 'in_review','approved', v_khalid, 'PG integration docs verified', '2026-02-10 15:00:00+04'),

  (c46, NULL,'incomplete', v_sarah, NULL, '2026-02-16 10:00:00+04'),
  (c46, 'incomplete','complete', v_sarah, NULL, '2026-02-21 16:00:00+04'),
  (c46, 'complete','submitted', v_sarah, NULL, '2026-02-24 09:00:00+04'),
  (c46, 'submitted','in_review', v_proc1, NULL, '2026-02-25 09:00:00+04'),
  (c46, 'in_review','returned', v_proc1, 'PG questionnaire incomplete, IBAN mismatch', '2026-03-02 14:00:00+04'),

  (c47, NULL,'incomplete', v_omar, NULL, '2025-12-20 08:00:00+04'),
  (c47, 'incomplete','complete', v_omar, NULL, '2025-12-25 16:00:00+04'),
  (c47, 'complete','submitted', v_omar, NULL, '2025-12-28 10:00:00+04'),
  (c47, 'submitted','in_review', v_fatima, NULL, '2025-12-29 09:00:00+04'),
  (c47, 'in_review','approved', v_fatima, NULL, '2026-01-08 14:00:00+04'),
  (c47, 'approved','exported', v_fatima, 'Exported to bank', '2026-01-12 10:00:00+04'),

  (c48, NULL,'incomplete', v_sales2, NULL, '2025-12-08 10:00:00+04'),
  (c48, 'incomplete','complete', v_sales2, NULL, '2025-12-12 16:00:00+04'),
  (c48, 'complete','submitted', v_sales2, NULL, '2025-12-15 09:00:00+04'),
  (c48, 'submitted','in_review', v_khalid, NULL, '2025-12-16 09:00:00+04'),
  (c48, 'in_review','approved', v_khalid, NULL, '2025-12-25 15:00:00+04'),
  (c48, 'approved','active', v_khalid, NULL, '2025-12-28 10:00:00+04'),

  (c49, NULL,'incomplete', v_sarah, NULL, '2025-12-18 09:00:00+04'),
  (c49, 'incomplete','complete', v_sarah, NULL, '2025-12-28 16:00:00+04'),
  (c49, 'complete','submitted', v_sarah, NULL, '2026-01-05 10:00:00+04'),
  (c49, 'submitted','in_review', v_proc1, NULL, '2026-01-06 09:00:00+04'),
  (c49, 'in_review','approved', v_proc1, NULL, '2026-01-15 14:00:00+04'),
  (c49, 'approved','active', v_proc1, NULL, '2026-01-18 10:00:00+04'),

  -- ── ADDITIONAL MID status histories ──

  (c50, NULL,'incomplete', v_sales1, NULL, '2026-03-20 08:30:00+04'),

  (c51, NULL,'incomplete', v_sarah, NULL, '2026-02-25 10:00:00+04'),
  (c51, 'incomplete','complete', v_sarah, NULL, '2026-03-05 16:00:00+04'),
  (c51, 'complete','submitted', v_sarah, NULL, now()-interval '30 hours'),

  (c52, NULL,'incomplete', v_omar, NULL, '2026-01-18 08:00:00+04'),
  (c52, 'incomplete','complete', v_omar, NULL, '2026-01-23 16:00:00+04'),
  (c52, 'complete','submitted', v_omar, NULL, '2026-01-25 09:00:00+04'),
  (c52, 'submitted','in_review', v_proc1, NULL, '2026-01-26 09:00:00+04'),
  (c52, 'in_review','approved', v_proc1, NULL, '2026-02-02 14:00:00+04'),

  (c53, NULL,'incomplete', v_sales2, NULL, '2025-10-22 09:00:00+04'),
  (c53, 'incomplete','complete', v_sales2, NULL, '2025-10-28 16:00:00+04'),
  (c53, 'complete','submitted', v_sales2, NULL, '2025-10-30 10:00:00+04'),
  (c53, 'submitted','in_review', v_fatima, NULL, '2025-10-31 09:00:00+04'),
  (c53, 'in_review','approved', v_fatima, NULL, '2025-11-08 15:00:00+04'),
  (c53, 'approved','active', v_fatima, NULL, '2025-11-12 10:00:00+04'),

  (c54, NULL,'incomplete', v_sarah, NULL, '2025-12-12 10:00:00+04'),
  (c54, 'incomplete','complete', v_sarah, NULL, '2025-12-18 16:00:00+04'),
  (c54, 'complete','submitted', v_sarah, NULL, '2025-12-20 09:00:00+04'),
  (c54, 'submitted','in_review', v_khalid, NULL, '2025-12-21 09:00:00+04'),
  (c54, 'in_review','approved', v_khalid, NULL, '2025-12-30 14:00:00+04'),
  (c54, 'approved','active', v_khalid, NULL, '2026-01-03 10:00:00+04'),

  (c55, NULL,'incomplete', v_omar, NULL, '2026-01-12 08:00:00+04'),
  (c55, 'incomplete','complete', v_omar, NULL, '2026-01-18 16:00:00+04'),
  (c55, 'complete','submitted', v_omar, NULL, '2026-01-20 10:00:00+04'),
  (c55, 'submitted','in_review', v_proc1, NULL, '2026-01-21 09:00:00+04'),
  (c55, 'in_review','approved', v_proc1, NULL, '2026-01-30 15:00:00+04'),
  (c55, 'approved','active', v_proc1, NULL, '2026-02-03 10:00:00+04'),
  (c55, 'active','renewal_pending', v_proc1, 'TL renewal due', '2026-03-12 08:00:00+04'),

  -- ── NEW LOCATION status histories ──

  (c56, NULL,'incomplete', v_sales1, NULL, '2026-02-18 10:00:00+04'),
  (c56, 'incomplete','complete', v_sales1, NULL, '2026-02-22 16:00:00+04'),
  (c56, 'complete','submitted', v_sales1, NULL, '2026-02-25 09:00:00+04'),
  (c56, 'submitted','in_review', v_fatima, NULL, '2026-02-26 09:00:00+04'),
  (c56, 'in_review','returned', v_fatima, 'Shop photos don''t match tenancy address', '2026-03-04 14:00:00+04'),
  (c56, 'returned','submitted', v_sales1, 'Resubmitted', '2026-03-08 10:00:00+04'),
  (c56, 'submitted','in_review', v_fatima, NULL, '2026-03-09 09:00:00+04'),
  (c56, 'in_review','returned', v_fatima, 'Tenancy still shows old location', '2026-03-14 11:00:00+04'),

  (c57, NULL,'incomplete', v_sarah, NULL, '2026-02-28 09:00:00+04'),
  (c57, 'incomplete','complete', v_sarah, NULL, '2026-03-03 16:00:00+04'),
  (c57, 'complete','submitted', v_sarah, NULL, '2026-03-05 10:00:00+04'),
  (c57, 'submitted','in_review', v_khalid, NULL, '2026-03-06 09:00:00+04'),

  (c58, NULL,'incomplete', v_omar, NULL, '2025-09-05 10:00:00+04'),
  (c58, 'incomplete','complete', v_omar, NULL, '2025-09-12 16:00:00+04'),
  (c58, 'complete','submitted', v_omar, NULL, '2025-09-15 09:00:00+04'),
  (c58, 'submitted','in_review', v_proc1, NULL, '2025-09-16 09:00:00+04'),
  (c58, 'in_review','approved', v_proc1, NULL, '2025-09-25 15:00:00+04'),
  (c58, 'approved','active', v_proc1, NULL, '2025-09-28 10:00:00+04'),

  (c59, NULL,'incomplete', v_sales2, NULL, '2025-09-12 08:00:00+04'),
  (c59, 'incomplete','complete', v_sales2, NULL, '2025-09-18 16:00:00+04'),
  (c59, 'complete','submitted', v_sales2, NULL, '2025-09-20 10:00:00+04'),
  (c59, 'submitted','in_review', v_fatima, NULL, '2025-09-21 09:00:00+04'),
  (c59, 'in_review','approved', v_fatima, NULL, '2025-10-01 14:00:00+04'),
  (c59, 'approved','active', v_fatima, NULL, '2025-10-05 10:00:00+04'),
  (c59, 'active','closed', v_admin, 'Merchant ceased operations', '2026-02-01 10:00:00+04');


-- ════════════════════════════════════════════════════════════
-- PHASE 3: DOCUMENTS (all non-incomplete cases)
-- ════════════════════════════════════════════════════════════

-- Incomplete cases: 2-3 partial docs
PERFORM _sd(c1, 'mdf','MDF','Forms','mdf.pdf',0.92,'mdf',true,true);
PERFORM _sd(c1, 'trade-license','Trade License','Legal','tl.pdf',0.94,'trade_license',false,true);
PERFORM _sd(c2, 'mdf','MDF','Forms','mdf.pdf',0.90,'mdf',true,true);
PERFORM _sd(c2, 'iban-proof','IBAN Proof','Banking','iban.pdf',0.88,'iban_proof',false,false);
PERFORM _sd(c21,'mdf','MDF','Forms','mdf.pdf',0.91,'mdf',true,true);
PERFORM _sd(c21,'trade-license','Trade License','Legal','tl.pdf',0.93,'trade_license',false,true);
PERFORM _sd(c21,'bank-statement','Bank Statement','Banking','bs.pdf',0.87,'bank_statement',false,false);
PERFORM _sd(c30,'mdf','MDF','Forms','mdf.pdf',0.89,'mdf',true,true);
PERFORM _sd(c40,'mdf','MDF','Forms','mdf.pdf',0.90,'mdf',true,true);
PERFORM _sd(c50,'mdf','MDF','Forms','mdf.pdf',0.91,'mdf',true,true);
PERFORM _sd(c50,'trade-license','Trade License','Legal','tl.pdf',0.93,'trade_license',false,true);

-- Complete + submitted + ... low-risk cases
PERFORM _docs_lr(c3);  PERFORM _docs_lr(c4);  PERFORM _docs_lr(c5);
PERFORM _docs_lr(c6);  PERFORM _docs_lr(c7);  PERFORM _docs_lr(c8);
PERFORM _docs_lr(c9);  PERFORM _docs_lr(c10); PERFORM _docs_lr(c11);
PERFORM _docs_lr(c12); PERFORM _docs_lr(c13); PERFORM _docs_lr(c14);
PERFORM _docs_lr(c15); PERFORM _docs_lr(c16); PERFORM _docs_lr(c17);
PERFORM _docs_lr(c18); PERFORM _docs_lr(c19); PERFORM _docs_lr(c20);

-- High-risk cases (complete+)
PERFORM _docs_hr(c22); PERFORM _docs_hr(c23); PERFORM _docs_hr(c24);
PERFORM _docs_hr(c25); PERFORM _docs_hr(c26); PERFORM _docs_hr(c27);
PERFORM _docs_hr(c28); PERFORM _docs_hr(c29);

-- E-invoice cases (complete+)
PERFORM _docs_ei(c31); PERFORM _docs_ei(c32); PERFORM _docs_ei(c33);
PERFORM _docs_ei(c34); PERFORM _docs_ei(c35); PERFORM _docs_ei(c36);
PERFORM _docs_ei(c37); PERFORM _docs_ei(c38); PERFORM _docs_ei(c39);

-- Payment gateway cases (complete+)
PERFORM _docs_pg(c41); PERFORM _docs_pg(c42); PERFORM _docs_pg(c43);
PERFORM _docs_pg(c44); PERFORM _docs_pg(c45); PERFORM _docs_pg(c46);
PERFORM _docs_pg(c47); PERFORM _docs_pg(c48); PERFORM _docs_pg(c49);

-- Additional MID cases (complete+)
PERFORM _docs_am(c51); PERFORM _docs_am(c52); PERFORM _docs_am(c53);
PERFORM _docs_am(c54); PERFORM _docs_am(c55);

-- New location cases (complete+)
PERFORM _docs_nl(c56); PERFORM _docs_nl(c57); PERFORM _docs_nl(c58);
PERFORM _docs_nl(c59);


-- ════════════════════════════════════════════════════════════
-- PHASE 4: SHAREHOLDERS
-- ════════════════════════════════════════════════════════════

INSERT INTO shareholders (id, case_id, name, percentage) VALUES
  -- Low risk
  (s1,  c3,  'Ahmed Al Noor',       '60'), (s2,  c3,  'Fatima Al Noor',      '40'),
  (s3,  c5,  'Rashid Al Maktoum',   '100'),
  (s4,  c9,  'Hamad Al Shamsi',     '51'), (s5,  c9,  'Priya Sharma',        '49'),
  (s6,  c11, 'Khalid bin Saeed',    '100'),
  (s7,  c14, 'Mohamed Al Falasi',   '60'), (s8,  c14, 'Ali Raza',            '40'),
  (s9,  c16, 'Saeed Al Tayer',      '100'),
  (s10, c17, 'Noura Al Ketbi',      '70'), (s11, c17, 'Mark Thompson',       '30'),
  (s12, c18, 'Abdullah Saif',       '100'),
  (s13, c20, 'Amna Al Dhaheri',     '55'), (s14, c20, 'Rajan Patel',         '45'),
  -- High risk
  (s15, c22, 'James Wilson',        '51'), (s16, c22, 'Mohammad Reza',       '49'),
  (s17, c25, 'Salem Al Nuaimi',     '100'),
  (s18, c26, 'Viktor Petrov',       '40'), (s19, c26, 'Ahmed bin Rashid',    '60'),
  (s20, c27, 'Sheikh Hamdan Al Qasimi','70'), (s21, c27, 'David Chen',      '30'),
  (s22, c28, 'Tariq bin Zayed',     '100'),
  (s23, c29, 'Faisal Al Ghurair',   '55'), (s24, c29, 'Yuri Volkov',        '45'),
  -- E-invoice
  (s25, c34, 'Ali Qassim',          '70'), (s26, c34, 'Huda Qassim',        '30'),
  (s27, c37, 'Omar bin Said',       '100'),
  (s28, c38, 'Layla Hassan',        '60'), (s29, c38, 'Raj Mehta',           '40'),
  -- Payment gateway
  (s30, c44, 'Sami Al Suwaidi',     '100'),
  (s31, c47, 'Pierre Dupont',       '50'), (s32, c47, 'Fatima Al Mazrouei', '50'),
  (s33, c48, 'Hessa Al Mansoori',   '100'),
  (s34, c49, 'Charles Laurent',     '60'), (s35, c49, 'Maha Al Hashimi',    '40'),
  -- Additional MID
  (s36, c53, 'Ibrahim BinDawood',   '100'),
  (s37, c54, 'Maha Al Tayer',       '65'), (s38, c54, 'John Smith',          '35'),
  -- New location
  (s39, c58, 'Corporate Entity',    '100'),
  (s40, c59, 'Corporate Entity',    '100');


-- ════════════════════════════════════════════════════════════
-- PHASE 5: OCR — TRADE LICENSE (all submitted+ cases = ~45)
-- ════════════════════════════════════════════════════════════

INSERT INTO ocr_trade_license (case_id, license_number, issue_date, expiry_date, business_name, legal_form, activities, authority, confidence_score) VALUES
  -- Expiry edge cases:
  -- EXPIRED: c13, c29, c39, c56
  -- <30 days: c16, c20, c28, c55, c19, c34
  -- 30-90 days: c14, c17, c37, c53
  -- Valid: rest
  (c3,  'TL-2024-003001','10/03/2024','09/03/2027','Noor Al Hayat Pharmacy LLC','LLC','Pharmacy','DED',0.96),
  (c4,  'TL-2025-004001','01/01/2025','31/12/2027','Desert Rose Restaurant LLC','LLC','Restaurant','DED',0.94),
  (c5,  'TL-2024-005001','15/04/2024','14/04/2028','Emirates Auto Parts Trading','LLC','Auto Parts Trading','DED',0.98),
  (c6,  'TL-2025-006001','01/06/2025','31/05/2028','Skyline Fashion Boutique LLC','LLC','Fashion Retail','DED',0.93),
  (c7,  'TL-2024-007001','20/09/2024','19/09/2027','Al Safwa General Trading LLC','LLC','General Trading','DED',0.96),
  (c8,  'TL-2025-008001','01/03/2025','28/02/2028','Jumeirah Coffee Roasters LLC','LLC','Food & Beverage','DED',0.97),
  (c9,  'TL-2024-009001','15/11/2024','14/11/2027','Royal Spice Restaurant LLC','LLC','Restaurant','DED',0.95),
  (c10, 'TL-2025-010001','01/08/2025','31/07/2028','Bin Hamdan Auto Services LLC','LLC','Auto Services','DED',0.94),
  (c11, 'TL-2024-011001','01/05/2024','30/04/2027','Oasis Supermarket LLC','LLC','Retail Trade','DED',0.97),
  (c12, 'TL-2024-012001','01/07/2024','30/06/2027','Marina Flowers LLC','LLC','Flower Trading','DED',0.93),
  (c13, 'TL-2023-013001','15/01/2023','14/01/2026','Sunrise Bakery LLC','LLC','Bakery','DED',0.95),  -- EXPIRED
  (c14, 'TL-2023-014001','10/10/2023','09/06/2026','Golden Sands Real Estate LLC','LLC','Real Estate','DED',0.97),  -- 30-90d
  (c15, 'TL-2024-015001','01/06/2024','31/05/2027','Palm Jewellers LLC','LLC','Jewellery Trading','DED',0.96),
  (c16, 'TL-2023-016001','20/04/2023','19/04/2026','Dubai Fresh Market LLC','LLC','Fresh Food Trading','DED',0.98),  -- <30d
  (c17, 'TL-2023-017001','01/09/2023','31/05/2026','Al Jazeera Electronics LLC','LLC','Electronics Trading','DED',0.95),  -- 30-90d
  (c18, 'TL-2024-018001','01/03/2024','28/02/2028','Burj Construction Materials','LLC','Construction Materials','DED',0.96),
  (c19, 'TL-2023-019001','15/05/2023','14/04/2026','Creek Side Textiles LLC','LLC','Textile Trading','DED',0.94),  -- <30d
  (c20, 'TL-2023-020001','01/08/2023','10/04/2026','Deira Gold Souk Trading','LLC','Gold Trading','DED',0.97),  -- <30d
  (c22, 'TL-2024-022001','01/03/2024','28/02/2027','Pinnacle Financial Services','LLC','Financial Services','DIFC',0.97),
  (c23, 'TL-2023-023001','20/09/2023','19/09/2026','Arabian Gulf Exchange LLC','LLC','Money Exchange','DED',0.96),
  (c24, 'TL-2024-024001','01/01/2024','31/12/2026','Al Ghurair Precious Metals','DMCC','Precious Metals','DMCC',0.98),
  (c25, 'TL-2024-025001','01/05/2024','30/04/2027','Falcon Money Exchange LLC','LLC','Currency Exchange','DED',0.95),
  (c26, 'TL-2023-026001','15/11/2023','14/11/2026','Royal Exchange House LLC','LLC','Money Transfer','DED',0.94),
  (c27, 'TL-2024-027001','01/06/2024','31/05/2027','Gulf Bullion DMCC','DMCC','Gold & Bullion Trading','DMCC',0.96),
  (c28, 'TL-2023-028001','01/08/2023','15/04/2026','Al Waha Money Transfer LLC','LLC','Money Transfer','DED',0.97),  -- <30d
  (c29, 'TL-2023-029001','01/01/2023','31/12/2025','Dubai Gold Refinery DMCC','DMCC','Gold Refinery','DMCC',0.95),  -- EXPIRED
  (c31, 'TL-2024-031001','01/07/2024','30/06/2027','Digital Commerce Group FZE','FZE','E-Commerce','JAFZA',0.96),
  (c32, 'TL-2025-032001','01/01/2025','31/12/2027','OrderNow Technologies FZCO','FZCO','IT Services','DAFZA',0.97),
  (c33, 'TL-2024-033001','01/04/2024','31/03/2027','PayFlex Solutions LLC','LLC','Payment Services','DED',0.94),
  (c34, 'TL-2023-034001','15/06/2023','14/04/2026','Cloud Kitchen Concepts LLC','LLC','Food Delivery','DED',0.96),  -- <30d
  (c35, 'TL-2024-035001','01/08/2024','31/07/2027','TechBridge Solutions FZE','FZE','IT Solutions','RAKEZ',0.98),
  (c36, 'TL-2024-036001','01/10/2024','30/09/2027','Al Salam E-Services LLC','LLC','E-Services','DED',0.93),
  (c37, 'TL-2023-037001','01/12/2023','30/06/2026','Noon Food Delivery LLC','LLC','Food Delivery','DED',0.95),  -- 30-90d
  (c38, 'TL-2024-038001','01/03/2024','28/02/2028','Careem Marketplace LLC','LLC','Technology','DED',0.97),
  (c39, 'TL-2023-039001','01/04/2023','31/03/2026','Zomato UAE FZE','FZE','Food Technology','DAFZA',0.96),  -- EXPIRED (renewal_pending)
  (c41, 'TL-2024-041001','01/06/2024','31/05/2027','E-Market Hub LLC','LLC','E-Commerce','DED',0.95),
  (c42, 'TL-2025-042001','01/01/2025','31/12/2027','Luxury Deals Online FZE','FZE','Online Retail','JAFZA',0.97),
  (c43, 'TL-2024-043001','01/09/2024','31/08/2027','Modanisa UAE FZCO','FZCO','Fashion E-Commerce','DAFZA',0.94),
  (c44, 'TL-2024-044001','01/04/2024','31/03/2027','Namshi FZCO','FZCO','E-Commerce','DAFZA',0.96),
  (c45, 'TL-2024-045001','01/07/2024','30/06/2027','Amazon Payment Services FZE','FZE','Payment Services','ADGM',0.99),
  (c46, 'TL-2024-046001','01/08/2024','31/07/2027','Talabat Digital LLC','LLC','Food Delivery','DED',0.95),
  (c47, 'TL-2024-047001','01/05/2024','30/04/2027','Shopify MENA FZE','FZE','E-Commerce Platform','JAFZA',0.98),
  (c48, 'TL-2024-048001','01/10/2024','30/09/2027','Mumzworld FZCO','FZCO','E-Commerce','DAFZA',0.96),
  (c49, 'TL-2024-049001','01/06/2024','31/05/2027','Ounass FZCO','FZCO','Luxury E-Commerce','DAFZA',0.97),
  (c51, 'TL-2024-051001','01/02/2024','31/01/2027','Majid Al Futtaim Leisure','LLC','Entertainment','DED',0.95),
  (c52, 'TL-2024-052001','01/04/2024','31/03/2027','Lulu Hypermarket Group','LLC','Hypermarket','DED',0.98),
  (c53, 'TL-2023-053001','01/11/2023','31/05/2026','BinDawood Retail LLC','LLC','Retail','DED',0.97),  -- 30-90d
  (c54, 'TL-2024-054001','01/06/2024','31/05/2027','Landmark Group Retail','LLC','Fashion Retail','DED',0.96),
  (c55, 'TL-2023-055001','01/04/2023','15/04/2026','Sharaf DG Retail','LLC','Electronics Retail','DED',0.95),  -- <30d (renewal_pending)
  (c56, 'TL-2024-056001','01/08/2024','31/07/2027','Carrefour Hypermarket','LLC','Hypermarket','DED',0.98),
  (c57, 'TL-2025-057001','01/01/2025','31/12/2027','Spinneys Dubai','LLC','Supermarket','DED',0.97),
  (c58, 'TL-2023-058001','01/09/2023','31/08/2026','IKEA Al Ain','LLC','Furniture Retail','DED',0.99),
  (c59, 'TL-2023-059001','01/06/2023','31/05/2026','Virgin Megastore','FZE','Electronics Retail','JAFZA',0.96);


-- ════════════════════════════════════════════════════════════
-- PHASE 5b: OCR — MERCHANT DETAILS
-- ════════════════════════════════════════════════════════════

INSERT INTO ocr_merchant_details (case_id, merchant_legal_name, doing_business_as, emirate, country, address, mobile_no, email_1, contact_name, bank_name, iban, swift_code, product_pos, product_ecom, confidence_score) VALUES
  (c5,  'Emirates Auto Parts Trading','EAP Trading',     'Dubai',     'UAE','Al Quoz Industrial 3','0503456789','info@eap.ae','Rashid M.','Mashreq','AE090461234567890123456','BOMLAEAD',true,false,0.97),
  (c7,  'Al Safwa General Trading LLC','Al Safwa Trading','Dubai',     'UAE','Deira, Naif Road','0501234567','info@alsafwa.ae','Ali Hassan','Emirates NBD','AE070331234567890123456','EBILAEAD',true,false,0.95),
  (c9,  'Royal Spice Restaurant LLC','Royal Spice',      'Dubai',     'UAE','JBR, The Walk','0509876543','royal@spice.ae','Hamad S.','ADCB','AE080321234567890123456','ADCBAEAA',true,false,0.96),
  (c11, 'Oasis Supermarket LLC','Oasis Market',          'Sharjah',   'UAE','Al Nahda, Sharjah','0504567890','info@oasis.ae','Khalid S.','RAK Bank','AE100401234567890123456','NABORAEA',true,false,0.94),
  (c14, 'Golden Sands Real Estate LLC','Golden Sands',   'Abu Dhabi', 'UAE','Al Reem Island','0505678901','info@gsre.ae','Mohamed F.','FAB','AE120351234567890123456','NBADORAE',true,true,0.97),
  (c16, 'Dubai Fresh Market LLC','Fresh Market',          'Dubai',     'UAE','Al Barsha Mall','0506789012','info@fresh.ae','Saeed T.','Dubai Islamic Bank','AE140471234567890123456','DUIBAEAD',true,false,0.98),
  (c17, 'Al Jazeera Electronics LLC','AJ Electronics',   'Ajman',     'UAE','City Centre Ajman','0507890123','info@aje.ae','Noura K.','Emirates NBD','AE150331234567890123457','EBILAEAD',true,true,0.95),
  (c18, 'Burj Construction Materials','Burj Materials',   'RAK',       'UAE','RAK Industrial Zone','0508901234','info@burj.ae','Abdullah S.','RAK Bank','AE160401234567890123458','NABORAEA',true,false,0.96),
  (c19, 'Creek Side Textiles LLC','Creek Textiles',       'Dubai',     'UAE','Textile Souk, Bur Dubai','0501122334','info@creek.ae','Ahmed R.','Mashreq','AE170461234567890123459','BOMLAEAD',true,false,0.94),
  (c20, 'Deira Gold Souk Trading','Deira Gold',          'Dubai',     'UAE','Gold Souk, Deira','0502233445','info@deiragold.ae','Amna D.','CBD','AE180471234567890123460','CBDUAEAD',true,false,0.97),
  (c25, 'Falcon Money Exchange LLC','Falcon FX',          'Dubai',     'UAE','Al Fahidi, Bur Dubai','0503344556','info@falcon.ae','Salem N.','HSBC','AE190401234567890123461','BBMEAEAD',true,true,0.95),
  (c26, 'Royal Exchange House LLC','Royal Exchange',      'Abu Dhabi', 'UAE','Hamdan Street','0504455667','ops@royal-ex.ae','Viktor P.','Standard Chartered','AE200401234567890123462','SCBLAEAD',true,true,0.94),
  (c27, 'Gulf Bullion DMCC','Gulf Bullion',               'Dubai',     'UAE','JLT Cluster G','0505566778','info@gullion.ae','Sheikh H.','Citibank','AE210401234567890123463','CIABORAE',true,true,0.96),
  (c28, 'Al Waha Money Transfer LLC','Al Waha Transfer',  'Sharjah',   'UAE','King Faisal Road','0506677889','ops@alwaha.ae','Tariq Z.','RAK Bank','AE220401234567890123464','NABORAEA',true,false,0.97),
  (c29, 'Dubai Gold Refinery DMCC','DG Refinery',        'Dubai',     'UAE','DMCC JLT','0507788990','info@dgr.ae','Faisal G.','Emirates NBD','AE230331234567890123465','EBILAEAD',true,true,0.95),
  (c35, 'TechBridge Solutions FZE','TechBridge',          'RAK',       'UAE','RAKEZ Free Zone','0508899001','info@techbridge.ae','Ali T.','FAB','AE240351234567890123466','NBADORAE',false,true,0.98),
  (c37, 'Noon Food Delivery LLC','NoonFood',              'Dubai',     'UAE','Dubai Internet City','0509900112','ops@noon.ae','Omar S.','ADCB','AE250321234567890123467','ADCBAEAA',false,true,0.95),
  (c38, 'Careem Marketplace LLC','Careem Market',         'Dubai',     'UAE','Dubai Media City','0501011223','team@careem.ae','Layla H.','Mashreq','AE260461234567890123468','BOMLAEAD',false,true,0.97),
  (c39, 'Zomato UAE FZE','Zomato UAE',                    'Dubai',     'UAE','DAFZA','0502122334','ops@zomato.ae','Raj M.','HSBC','AE270401234567890123469','BBMEAEAD',false,true,0.96),
  (c45, 'Amazon Payment Services FZE','Amazon PS',        'Abu Dhabi', 'UAE','ADGM, Al Maryah','0503233445','biz@amazon.ae','Ahmed K.','Citibank','AE280401234567890123470','CIABORAE',false,true,0.99),
  (c47, 'Shopify MENA FZE','Shopify MENA',               'Dubai',     'UAE','JAFZA One','0504344556','ops@shopify.ae','Pierre D.','Standard Chartered','AE290401234567890123471','SCBLAEAD',false,true,0.98),
  (c48, 'Mumzworld FZCO','Mumzworld',                    'Dubai',     'UAE','DAFZA','0505455667','info@mumz.ae','Hessa M.','FAB','AE300351234567890123472','NBADORAE',false,true,0.96),
  (c49, 'Ounass FZCO','Ounass',                           'Dubai',     'UAE','DAFZA','0506566778','luxury@ounass.ae','Charles L.','Emirates NBD','AE310331234567890123473','EBILAEAD',false,true,0.97),
  (c52, 'Lulu Hypermarket Group','Lulu JBR',              'Abu Dhabi', 'UAE','Al Wahda Mall','0507677889','ops@lulu.ae','Yusuf A.','FAB','AE320351234567890123474','NBADORAE',true,false,0.98),
  (c53, 'BinDawood Retail LLC','BinDawood',               'Fujairah',  'UAE','City Centre Fujairah','0508788990','info@bindawood.ae','Ibrahim B.','Emirates NBD','AE330331234567890123475','EBILAEAD',true,false,0.97),
  (c54, 'Landmark Group Retail','Landmark Home',          'Dubai',     'UAE','Dubai Festival City','0509899001','ops@landmark.ae','Maha T.','ADCB','AE340321234567890123476','ADCBAEAA',true,true,0.96),
  (c55, 'Sharaf DG Retail','Sharaf DG',                   'Dubai',     'UAE','Mall of the Emirates','0501900112','info@sharaf.ae','Omar H.','Dubai Islamic Bank','AE350471234567890123477','DUIBAEAD',true,false,0.95),
  (c58, 'IKEA Al Ain','IKEA AA',                          'Abu Dhabi', 'UAE','Al Ain Mall','0502011223','ops@ikea.ae','Store Mgr','ADCB','AE360321234567890123478','ADCBAEAA',true,false,0.99),
  (c59, 'Virgin Megastore','Virgin DFC',                  'Dubai',     'UAE','Dubai Festival City','0503122334','info@virgin.ae','Store Mgr','Mashreq','AE370461234567890123479','BOMLAEAD',true,false,0.96);


-- ════════════════════════════════════════════════════════════
-- PHASE 5c: OCR — PASSPORT DATA
-- ════════════════════════════════════════════════════════════

INSERT INTO ocr_passport_data (case_id, shareholder_id, surname, given_names, passport_number, nationality, date_of_birth, sex, expiry_date, is_expired, confidence) VALUES
  (c3,  'sh-'||s1,  'AL NOOR',    'AHMED',    'P1234567','UAE','15/06/1985','M','20/04/2026',false,95),  -- expiring <30d
  (c3,  'sh-'||s2,  'AL NOOR',    'FATIMA',   'P2345678','UAE','22/11/1988','F','15/09/2028',false,94),
  (c5,  'sh-'||s3,  'AL MAKTOUM', 'RASHID',   'P3456789','UAE','03/03/1978','M','01/12/2029',false,97),
  (c9,  'sh-'||s4,  'AL SHAMSI',  'HAMAD',    'P4567890','UAE','10/07/1982','M','30/06/2028',false,96),
  (c9,  'sh-'||s5,  'SHARMA',     'PRIYA',    'P5678901','IND','18/02/1985','F','15/08/2027',false,93),
  (c11, 'sh-'||s6,  'BIN SAEED',  'KHALID',   'P6789012','UAE','05/09/1980','M','20/03/2029',false,95),
  (c14, 'sh-'||s7,  'AL FALASI',  'MOHAMED',  'P7890123','UAE','14/04/1975','M','28/02/2028',false,94),
  (c14, 'sh-'||s8,  'RAZA',       'ALI',      'P8901234','PAK','20/08/1979','M','10/11/2027',false,92),
  (c17, 'sh-'||s10, 'AL KETBI',   'NOURA',    'P9012345','UAE','01/03/1990','F','15/01/2030',false,96),
  (c17, 'sh-'||s11, 'THOMPSON',   'MARK',     'P0123456','GBR','12/07/1978','M','25/03/2026',false,95),  -- expiring <30d
  (c20, 'sh-'||s13, 'AL DHAHERI', 'AMNA',     'PA123456','UAE','08/11/1986','F','20/05/2029',false,94),
  (c20, 'sh-'||s14, 'PATEL',      'RAJAN',    'PA234567','IND','25/01/1981','M','10/09/2027',false,93),
  (c22, 'sh-'||s15, 'WILSON',     'JAMES',    'PA345678','GBR','10/07/1980','M','25/01/2026',true,96),   -- EXPIRED
  (c22, 'sh-'||s16, 'REZA',       'MOHAMMAD', 'PA456789','IRN','18/02/1975','M','30/06/2028',false,93),
  (c25, 'sh-'||s17, 'AL NUAIMI',  'SALEM',    'PA567890','UAE','20/05/1983','M','15/12/2029',false,95),
  (c26, 'sh-'||s18, 'PETROV',     'VIKTOR',   'PA678901','RUS','03/09/1977','M','20/08/2027',false,94),
  (c26, 'sh-'||s19, 'BIN RASHID', 'AHMED',    'PA789012','UAE','15/04/1981','M','10/05/2029',false,96),
  (c27, 'sh-'||s20, 'AL QASIMI',  'HAMDAN',   'PA890123','UAE','28/12/1970','M','05/10/2028',false,95),
  (c27, 'sh-'||s21, 'CHEN',       'DAVID',    'PA901234','USA','15/06/1984','M','30/04/2026',false,94),  -- expiring ~30d
  (c29, 'sh-'||s23, 'AL GHURAIR', 'FAISAL',   'PB012345','UAE','10/01/1972','M','15/07/2028',false,96),
  (c29, 'sh-'||s24, 'VOLKOV',     'YURI',     'PB123456','RUS','22/03/1976','M','20/01/2026',true,93),   -- EXPIRED
  (c34, 'sh-'||s25, 'QASSIM',     'ALI',      'PB234567','UAE','05/09/1982','M','11/11/2027',false,95),
  (c34, 'sh-'||s26, 'QASSIM',     'HUDA',     'PB345678','UAE','14/04/1986','F','20/08/2029',false,94),
  (c38, 'sh-'||s28, 'HASSAN',     'LAYLA',    'PB456789','UAE','20/07/1988','F','15/06/2030',false,96),
  (c38, 'sh-'||s29, 'MEHTA',      'RAJ',      'PB567890','IND','05/12/1983','M','30/09/2028',false,93),
  (c47, 'sh-'||s31, 'DUPONT',     'PIERRE',   'PB678901','FRA','18/03/1979','M','25/11/2027',false,94),
  (c47, 'sh-'||s32, 'AL MAZROUEI','FATIMA',   'PB789012','UAE','25/08/1985','F','10/03/2030',false,96),
  (c49, 'sh-'||s34, 'LAURENT',    'CHARLES',  'PB890123','FRA','12/05/1981','M','20/07/2028',false,95),
  (c49, 'sh-'||s35, 'AL HASHIMI', 'MAHA',     'PB901234','UAE','08/10/1987','F','15/04/2030',false,94),
  (c54, 'sh-'||s37, 'AL TAYER',   'MAHA',     'PC012345','UAE','20/02/1980','F','10/01/2029',false,96),
  (c54, 'sh-'||s38, 'SMITH',      'JOHN',     'PC123456','GBR','15/09/1976','M','05/05/2026',false,93);  -- expiring ~40d


-- ════════════════════════════════════════════════════════════
-- PHASE 5d: OCR — EID DATA (matching passport holders)
-- ════════════════════════════════════════════════════════════

INSERT INTO ocr_eid_data (case_id, shareholder_id, id_number, name, nationality, expiry_date, date_of_birth, gender, is_expired, confidence) VALUES
  (c3,  'sh-'||s1,  '784-1985-1234567-1','Ahmed Al Noor',    'UAE','10/04/2026','15/06/1985','M',false,94),  -- <30d
  (c3,  'sh-'||s2,  '784-1988-2345678-2','Fatima Al Noor',   'UAE','20/12/2028','22/11/1988','F',false,93),
  (c5,  'sh-'||s3,  '784-1978-3456789-3','Rashid Al Maktoum','UAE','15/01/2030','03/03/1978','M',false,96),
  (c9,  'sh-'||s4,  '784-1982-4567890-4','Hamad Al Shamsi',  'UAE','30/07/2028','10/07/1982','M',false,95),
  (c9,  'sh-'||s5,  '784-1985-5678901-5','Priya Sharma',     'IND','15/08/2027','18/02/1985','F',false,92),
  (c11, 'sh-'||s6,  '784-1980-6789012-6','Khalid bin Saeed', 'UAE','20/04/2029','05/09/1980','M',false,95),
  (c14, 'sh-'||s7,  '784-1975-7890123-7','Mohamed Al Falasi','UAE','28/03/2028','14/04/1975','M',false,94),
  (c17, 'sh-'||s10, '784-1990-9012345-9','Noura Al Ketbi',   'UAE','15/02/2030','01/03/1990','F',false,96),
  (c20, 'sh-'||s13, '784-1986-0123456-0','Amna Al Dhaheri',  'UAE','20/06/2029','08/11/1986','F',false,94),
  (c22, 'sh-'||s15, '784-1980-1111111-1','James Wilson',     'GBR','05/03/2026','10/07/1980','M',false,95),  -- <30d
  (c25, 'sh-'||s17, '784-1983-2222222-2','Salem Al Nuaimi',  'UAE','15/01/2030','20/05/1983','M',false,95),
  (c26, 'sh-'||s19, '784-1981-3333333-3','Ahmed bin Rashid', 'UAE','10/06/2029','15/04/1981','M',false,96),
  (c27, 'sh-'||s20, '784-1970-4444444-4','Hamdan Al Qasimi', 'UAE','05/11/2028','28/12/1970','M',false,95),
  (c29, 'sh-'||s23, '784-1972-5555555-5','Faisal Al Ghurair','UAE','15/08/2028','10/01/1972','M',false,96),
  (c34, 'sh-'||s25, '784-1982-6666666-6','Ali Qassim',       'UAE','01/12/2027','05/09/1982','M',false,95),
  (c34, 'sh-'||s26, '784-1986-7777777-7','Huda Qassim',      'UAE','15/09/2029','14/04/1986','F',false,94),
  (c38, 'sh-'||s28, '784-1988-8888888-8','Layla Hassan',     'UAE','15/07/2030','20/07/1988','F',false,96),
  (c47, 'sh-'||s32, '784-1985-9999999-9','Fatima Al Mazrouei','UAE','10/04/2030','25/08/1985','F',false,96),
  (c49, 'sh-'||s35, '784-1987-0000000-0','Maha Al Hashimi',  'UAE','15/05/2030','08/10/1987','F',false,94),
  (c54, 'sh-'||s37, '784-1980-1112233-1','Maha Al Tayer',    'UAE','10/02/2029','20/02/1980','F',false,96);


-- ════════════════════════════════════════════════════════════
-- PHASE 5e: OCR — KYC PROFILE
-- ════════════════════════════════════════════════════════════

INSERT INTO ocr_kyc_profile (case_id, projected_monthly_volume, projected_monthly_count, source_of_income, exact_business_nature, years_in_uae, sanctions_exposure, has_other_acquirer) VALUES
  (c5,  '180000', '350','Business Revenue','Automotive parts trading','8','[]',false),
  (c9,  '120000', '800','Business Revenue','Restaurant operations','5','[]',false),
  (c11, '200000', '1500','Business Revenue','Supermarket retail','10','[]',false),
  (c14, '500000', '200','Business Revenue','Real estate brokerage','12','[]',true),
  (c16, '250000', '2000','Business Revenue','Fresh food wholesale & retail','15','[]',false),
  (c17, '150000', '600','Business Revenue','Electronics retail','7','[]',true),
  (c18, '350000', '150','Business Revenue','Construction materials supply','9','[]',false),
  (c20, '800000', '500','Business Revenue','Gold & jewellery trading','20','[]',false),
  (c22, '800000', '1000','Financial Services','Payment processing','6','[]',false),
  (c23, '2000000','5000','Exchange Services','Currency exchange','20','[{"country":"Iran","has_business":true,"percentage":"3","goods":"Remittances"}]',true),
  (c25, '1500000','3000','Exchange Services','Money exchange','12','[]',false),
  (c26, '3000000','2000','Exchange Services','International money transfer','18','[{"country":"Russia","has_business":true,"percentage":"8","goods":"Wire transfers"}]',true),
  (c27, '5000000','1500','Commodities Trading','Gold & bullion wholesale','25','[{"country":"Sudan","has_business":true,"percentage":"2","goods":"Raw gold"}]',false),
  (c28, '1200000','4000','Transfer Services','Money transfer services','15','[]',false),
  (c29, '2500000','800','Refining Services','Gold refinery operations','22','[{"country":"Russia","has_business":true,"percentage":"5","goods":"Raw materials"},{"country":"Iran","has_business":true,"percentage":"2","goods":"Scrap gold"}]',true),
  (c35, '300000', '5000','SaaS Revenue','IT solutions & e-invoicing','4','[]',false),
  (c37, '500000', '15000','Platform Revenue','Food delivery operations','3','[]',false),
  (c38, '1000000','30000','Platform Revenue','Ride-hailing & marketplace','5','[]',false),
  (c39, '400000', '10000','Platform Revenue','Food technology','3','[]',false),
  (c45, '2000000','50000','E-Commerce','Online payment services','4','[]',false),
  (c47, '800000', '20000','SaaS Revenue','E-commerce platform','3','[]',false),
  (c48, '350000', '8000','E-Commerce','Mother & baby e-commerce','6','[]',false),
  (c49, '600000', '5000','E-Commerce','Luxury e-commerce','5','[]',false),
  (c52, '1500000','10000','Retail Revenue','Hypermarket operations','30','[]',false),
  (c53, '400000', '3000','Retail Revenue','General retail','8','[]',false),
  (c54, '700000', '5000','Retail Revenue','Fashion & home retail','20','[]',false);


-- ════════════════════════════════════════════════════════════
-- PHASE 5f: OCR — PEP DATA
-- ════════════════════════════════════════════════════════════

INSERT INTO ocr_pep_data (case_id, is_pep, pep_individuals, risk_level, confidence) VALUES
  (c22, false,'[]','low',90),
  (c23, false,'[]','medium',88),
  (c25, false,'[]','low',92),
  (c26, false,'[]','medium',85),
  (c27, true, '[{"name":"Sheikh Hamdan Al Qasimi","position":"Royal Family Member","relationship":"Majority Shareholder"}]','high',88),
  (c28, false,'[]','low',90),
  (c29, true, '[{"name":"Faisal Al Ghurair","position":"Former Government Trade Advisor","relationship":"Majority Shareholder"}]','high',86),
  (c20, false,'[]','low',91),
  (c14, false,'[]','low',93),
  (c35, false,'[]','low',92),
  (c45, false,'[]','low',95),
  (c47, false,'[]','low',94);


-- ════════════════════════════════════════════════════════════
-- PHASE 5g: OCR — BANK STATEMENT
-- ════════════════════════════════════════════════════════════

INSERT INTO ocr_bank_statement (case_id, bank_name, account_holder, iban, currency, period, opening_balance, closing_balance, total_credits, total_debits, confidence) VALUES
  (c5,  'Mashreq','Emirates Auto Parts Trading','AE090461234567890123456','AED','Feb 2026','340000','385000','220000','175000',93),
  (c9,  'ADCB','Royal Spice Restaurant LLC','AE080321234567890123456','AED','Feb 2026','85000','92000','65000','58000',91),
  (c11, 'RAK Bank','Oasis Supermarket LLC','AE100401234567890123456','AED','Jan 2026','210000','245000','150000','115000',92),
  (c16, 'DIB','Dubai Fresh Market LLC','AE140471234567890123456','AED','Feb 2026','420000','465000','280000','235000',94),
  (c20, 'CBD','Deira Gold Souk Trading','AE180471234567890123460','AED','Feb 2026','890000','1050000','680000','520000',95),
  (c22, 'HSBC','Pinnacle Financial Services','AE190401234567890123461','AED','Jan 2026','890000','1020000','650000','520000',95),
  (c25, 'HSBC','Falcon Money Exchange LLC','AE190401234567890123461','AED','Feb 2026','1200000','1350000','900000','750000',93),
  (c26, 'Standard Chartered','Royal Exchange House LLC','AE200401234567890123462','AED','Jan 2026','2500000','2800000','1500000','1200000',94),
  (c27, 'Citibank','Gulf Bullion DMCC','AE210401234567890123463','AED','Feb 2026','4200000','4800000','3000000','2400000',96),
  (c28, 'RAK Bank','Al Waha Money Transfer LLC','AE220401234567890123464','AED','Jan 2026','980000','1100000','750000','630000',92),
  (c29, 'Emirates NBD','Dubai Gold Refinery DMCC','AE230331234567890123465','AED','Dec 2025','2100000','2350000','1800000','1550000',94),
  (c37, 'ADCB','Noon Food Delivery LLC','AE250321234567890123467','AED','Feb 2026','380000','420000','310000','270000',91),
  (c38, 'Mashreq','Careem Marketplace LLC','AE260461234567890123468','AED','Feb 2026','750000','830000','580000','500000',93),
  (c45, 'Citibank','Amazon Payment Services FZE','AE280401234567890123470','AED','Jan 2026','1800000','2100000','1500000','1200000',97),
  (c48, 'FAB','Mumzworld FZCO','AE300351234567890123472','AED','Feb 2026','280000','320000','210000','170000',92),
  (c52, 'FAB','Lulu Hypermarket Group','AE320351234567890123474','AED','Jan 2026','1200000','1400000','900000','700000',95),
  (c54, 'ADCB','Landmark Group Retail','AE340321234567890123476','AED','Feb 2026','550000','620000','400000','330000',93);


-- ════════════════════════════════════════════════════════════
-- PHASE 5h: OCR — VAT CERT
-- ════════════════════════════════════════════════════════════

INSERT INTO ocr_vat_cert (case_id, trn_number, business_name, registration_date, expiry_date, business_address, confidence) VALUES
  (c5,  '100345678901234','Emirates Auto Parts Trading','15/06/2019','31/12/2027','Al Quoz, Dubai',96),
  (c9,  '100456789012345','Royal Spice Restaurant LLC','01/03/2020','31/12/2027','JBR, Dubai',93),
  (c11, '100567890123456','Oasis Supermarket LLC','01/01/2019','31/12/2026','Al Nahda, Sharjah',94),
  (c14, '100678901234567','Golden Sands Real Estate LLC','15/09/2018','31/12/2026','Al Reem, Abu Dhabi',95),
  (c16, '100789012345678','Dubai Fresh Market LLC','01/06/2018','15/04/2026',  'Al Barsha, Dubai',96),  -- <30d
  (c17, '100890123456789','Al Jazeera Electronics LLC','01/01/2020','31/12/2027','City Centre, Ajman',93),
  (c18, '100901234567890','Burj Construction Materials','15/03/2019','31/12/2027','RAK Industrial Zone',94),
  (c19, '101012345678901','Creek Side Textiles LLC','01/07/2019','20/04/2026', 'Bur Dubai',92),  -- <30d
  (c20, '101123456789012','Deira Gold Souk Trading','01/01/2018','31/12/2026','Deira, Dubai',97),
  (c25, '101234567890123','Falcon Money Exchange LLC','15/04/2019','31/12/2027','Bur Dubai',95),
  (c28, '101345678901234','Al Waha Money Transfer LLC','01/09/2018','31/12/2026','Sharjah',94),
  (c35, '101456789012345','TechBridge Solutions FZE','01/01/2022','31/12/2027','RAKEZ',96),
  (c37, '101567890123456','Noon Food Delivery LLC','15/06/2021','31/12/2026','DIC, Dubai',93),
  (c38, '101678901234567','Careem Marketplace LLC','01/03/2020','31/12/2027','DMC, Dubai',97),
  (c39, '101789012345678','Zomato UAE FZE','01/09/2021','31/03/2026','DAFZA, Dubai',94),  -- EXPIRED-ish
  (c45, '101890123456789','Amazon Payment Services FZE','01/01/2020','31/12/2028','ADGM, Abu Dhabi',99),
  (c47, '101901234567890','Shopify MENA FZE','15/06/2021','31/12/2027','JAFZA, Dubai',96),
  (c48, '102012345678901','Mumzworld FZCO','01/03/2020','31/12/2027','DAFZA, Dubai',95),
  (c49, '102123456789012','Ounass FZCO','01/09/2019','31/12/2027','DAFZA, Dubai',97),
  (c52, '102234567890123','Lulu Hypermarket Group','01/01/2018','31/12/2027','Abu Dhabi',98),
  (c53, '102345678901234','BinDawood Retail LLC','15/04/2019','31/12/2026','Fujairah',95),
  (c54, '102456789012345','Landmark Group Retail','01/07/2018','31/12/2027','DFC, Dubai',96),
  (c55, '102567890123456','Sharaf DG Retail','01/01/2019','30/04/2026','MOE, Dubai',93),  -- ~30d
  (c58, 'TRN-058-001',    'IKEA Al Ain','01/06/2018','31/12/2027','Al Ain, Abu Dhabi',98);


-- ════════════════════════════════════════════════════════════
-- PHASE 5i: OCR — MOA
-- ════════════════════════════════════════════════════════════

INSERT INTO ocr_moa (case_id, company_name, shareholders, share_percentages, registration_number, legal_form, authorized_capital, confidence) VALUES
  (c3,  'Noor Al Hayat Pharmacy LLC', ARRAY['Ahmed Al Noor','Fatima Al Noor'],   ARRAY['60%','40%'], 'LLC-2012-45678','LLC','300,000 AED',91),
  (c5,  'Emirates Auto Parts Trading', ARRAY['Rashid Al Maktoum'],               ARRAY['100%'],      'LLC-2016-56789','LLC','500,000 AED',93),
  (c9,  'Royal Spice Restaurant LLC',  ARRAY['Hamad Al Shamsi','Priya Sharma'],  ARRAY['51%','49%'], 'LLC-2019-67890','LLC','200,000 AED',92),
  (c11, 'Oasis Supermarket LLC',       ARRAY['Khalid bin Saeed'],                ARRAY['100%'],      'LLC-2014-78901','LLC','500,000 AED',94),
  (c14, 'Golden Sands Real Estate LLC', ARRAY['Mohamed Al Falasi','Ali Raza'],   ARRAY['60%','40%'], 'LLC-2011-89012','LLC','1,000,000 AED',93),
  (c16, 'Dubai Fresh Market LLC',      ARRAY['Saeed Al Tayer'],                  ARRAY['100%'],      'LLC-2010-90123','LLC','750,000 AED',95),
  (c17, 'Al Jazeera Electronics LLC',  ARRAY['Noura Al Ketbi','Mark Thompson'],  ARRAY['70%','30%'], 'LLC-2017-01234','LLC','400,000 AED',92),
  (c18, 'Burj Construction Materials', ARRAY['Abdullah Saif'],                   ARRAY['100%'],      'LLC-2015-12345','LLC','1,500,000 AED',94),
  (c20, 'Deira Gold Souk Trading',    ARRAY['Amna Al Dhaheri','Rajan Patel'],   ARRAY['55%','45%'], 'LLC-2005-23456','LLC','2,000,000 AED',95),
  (c22, 'Pinnacle Financial Services', ARRAY['James Wilson','Mohammad Reza'],    ARRAY['51%','49%'], 'LLC-2018-34567','LLC','1,000,000 AED',95),
  (c25, 'Falcon Money Exchange LLC',   ARRAY['Salem Al Nuaimi'],                 ARRAY['100%'],      'LLC-2012-45678','LLC','500,000 AED',93),
  (c26, 'Royal Exchange House LLC',    ARRAY['Ahmed bin Rashid','Viktor Petrov'],ARRAY['60%','40%'], 'LLC-2008-56789','LLC','3,000,000 AED',92),
  (c27, 'Gulf Bullion DMCC',          ARRAY['Sheikh Hamdan Al Qasimi','David Chen'],ARRAY['70%','30%'],'DMCC-2002-67890','DMCC','5,000,000 AED',94),
  (c28, 'Al Waha Money Transfer LLC', ARRAY['Tariq bin Zayed'],                  ARRAY['100%'],      'LLC-2009-78901','LLC','1,000,000 AED',95),
  (c29, 'Dubai Gold Refinery DMCC',   ARRAY['Faisal Al Ghurair','Yuri Volkov'], ARRAY['55%','45%'], 'DMCC-2004-89012','DMCC','10,000,000 AED',93),
  (c34, 'Cloud Kitchen Concepts LLC',  ARRAY['Ali Qassim','Huda Qassim'],       ARRAY['70%','30%'], 'LLC-2021-90123','LLC','200,000 AED',92),
  (c37, 'Noon Food Delivery LLC',     ARRAY['Omar bin Said'],                    ARRAY['100%'],      'LLC-2020-01234','LLC','500,000 AED',94),
  (c38, 'Careem Marketplace LLC',     ARRAY['Layla Hassan','Raj Mehta'],         ARRAY['60%','40%'], 'LLC-2019-12345','LLC','1,000,000 AED',95),
  (c45, 'Amazon Payment Services FZE',ARRAY['Corporate Entity'],                 ARRAY['100%'],      'FZE-2018-23456','FZE','5,000,000 AED',98),
  (c47, 'Shopify MENA FZE',           ARRAY['Pierre Dupont','Fatima Al Mazrouei'],ARRAY['50%','50%'],'FZE-2020-34567','FZE','2,000,000 AED',96),
  (c48, 'Mumzworld FZCO',             ARRAY['Hessa Al Mansoori'],               ARRAY['100%'],      'FZCO-2018-45678','FZCO','1,000,000 AED',94),
  (c49, 'Ounass FZCO',                ARRAY['Charles Laurent','Maha Al Hashimi'],ARRAY['60%','40%'],'FZCO-2017-56789','FZCO','3,000,000 AED',95),
  (c52, 'Lulu Hypermarket Group',     ARRAY['Corporate Entity'],                 ARRAY['100%'],      'LLC-1995-67890','LLC','50,000,000 AED',98),
  (c53, 'BinDawood Retail LLC',       ARRAY['Ibrahim BinDawood'],               ARRAY['100%'],      'LLC-2016-78901','LLC','2,000,000 AED',96),
  (c54, 'Landmark Group Retail',      ARRAY['Maha Al Tayer','John Smith'],       ARRAY['65%','35%'], 'LLC-2004-89012','LLC','10,000,000 AED',95),
  (c58, 'IKEA Al Ain',                ARRAY['Corporate Entity'],                 ARRAY['100%'],      'LLC-2010-90123','LLC','20,000,000 AED',99);


-- ════════════════════════════════════════════════════════════
-- PHASE 5j: OCR — FEE SCHEDULE (17 card types per case)
-- ════════════════════════════════════════════════════════════

-- POS-only merchants (low-risk, high-risk physical, add-mid, new-loc)
PERFORM _fees_pos(c5,  '1.75%','2.80%','3.50%');
PERFORM _fees_pos(c7,  '1.85%','2.90%','3.60%');
PERFORM _fees_pos(c9,  '1.75%','2.80%','3.50%');
PERFORM _fees_pos(c11, '1.85%','2.80%','3.50%');
PERFORM _fees_pos(c12, '1.75%','2.80%','3.50%');
PERFORM _fees_pos(c13, '2.10%','3.00%','3.75%');
PERFORM _fees_pos(c16, '1.65%','2.50%','3.25%');
PERFORM _fees_pos(c18, '1.85%','2.80%','3.50%');
PERFORM _fees_pos(c19, '1.75%','2.80%','3.50%');
PERFORM _fees_pos(c28, '2.10%','3.00%','3.75%');
PERFORM _fees_pos(c52, '1.50%','2.50%','3.25%');
PERFORM _fees_pos(c53, '1.65%','2.50%','3.25%');
PERFORM _fees_pos(c55, '1.75%','2.80%','3.50%');
PERFORM _fees_pos(c56, '1.85%','2.80%','3.50%');
PERFORM _fees_pos(c58, '1.50%','2.50%','3.25%');

-- POS + ECOM merchants
PERFORM _fees_both(c14, '1.85%','2.25%','2.80%','3.50%');
PERFORM _fees_both(c17, '1.75%','2.10%','2.80%','3.50%');
PERFORM _fees_both(c20, '2.10%','2.50%','3.00%','3.75%');
PERFORM _fees_both(c22, '2.00%','2.40%','3.00%','3.75%');
PERFORM _fees_both(c25, '2.10%','2.50%','3.00%','3.75%');
PERFORM _fees_both(c26, '2.25%','2.65%','3.25%','4.00%');
PERFORM _fees_both(c27, '2.40%','2.80%','3.50%','4.25%');
PERFORM _fees_both(c29, '2.25%','2.65%','3.25%','4.00%');
PERFORM _fees_both(c54, '1.75%','2.10%','2.80%','3.50%');

-- ECOM-only merchants (e-invoice, payment-gateway)
PERFORM _fees_ecom(c35, '2.00%','2.80%','3.50%');
PERFORM _fees_ecom(c37, '1.85%','2.80%','3.50%');
PERFORM _fees_ecom(c38, '1.75%','2.80%','3.50%');
PERFORM _fees_ecom(c39, '2.00%','2.80%','3.50%');
PERFORM _fees_ecom(c45, '1.50%','2.50%','3.25%');
PERFORM _fees_ecom(c47, '1.75%','2.50%','3.25%');
PERFORM _fees_ecom(c48, '1.85%','2.80%','3.50%');
PERFORM _fees_ecom(c49, '2.00%','2.80%','3.50%');


-- ════════════════════════════════════════════════════════════
-- PHASE 5k: OCR — TENANCY
-- ════════════════════════════════════════════════════════════

INSERT INTO ocr_tenancy (case_id, ejari_number, expiry_date, start_date, landlord_name, tenant_name, property_address, annual_rent, confidence) VALUES
  (c5,  'EJ-2024-005678','30/06/2027','01/07/2024','Wasl Properties','Emirates Auto Parts Trading','Unit 5, Al Quoz Industrial','240000',95),
  (c9,  'EJ-2024-009012','31/12/2027','01/01/2025','Emaar Properties','Royal Spice Restaurant LLC','The Walk, JBR','480000',93),
  (c11, 'EJ-2024-011234','30/06/2027','01/07/2024','Sahara Properties','Oasis Supermarket LLC','Shop 8, Al Nahda Sharjah','180000',92),
  (c14, 'EJ-2024-014567','31/12/2026','01/01/2024','Aldar Properties','Golden Sands Real Estate LLC','Unit 12, Al Reem Island','650000',94),
  (c16, 'EJ-2023-016890','15/04/2026','16/04/2023','Majid Al Futtaim','Dubai Fresh Market LLC','Unit A3, Al Barsha Mall','350000',96),  -- <30d
  (c17, 'EJ-2024-017123','30/09/2027','01/10/2024','Ajman Properties','Al Jazeera Electronics LLC','Shop 22, City Centre Ajman','150000',93),
  (c18, 'EJ-2024-018456','28/02/2028','01/03/2024','RAK Properties','Burj Construction Materials','Warehouse 7, RAK Industrial','120000',94),
  (c19, 'EJ-2023-019789','31/03/2026','01/04/2023','Dubai Properties','Creek Side Textiles LLC','Shop 15, Textile Souk','280000',91),  -- expired soon
  (c20, 'EJ-2023-020012','31/05/2026','01/06/2023','DLD Properties','Deira Gold Souk Trading','Shop 3, Gold Souk','420000',95),
  (c52, 'EJ-2024-052345','31/01/2027','01/02/2024','Aldar Properties','Lulu Hypermarket Group','Unit L1, Al Wahda Mall','850000',97),
  (c53, 'EJ-2023-053678','30/11/2026','01/12/2023','Fujairah Properties','BinDawood Retail LLC','Shop 5, City Centre Fujairah','120000',93),
  (c54, 'EJ-2024-054901','31/12/2027','01/01/2024','Al Futtaim Properties','Landmark Group Retail','Unit 30, DFC','550000',95),
  (c56, 'EJ-2024-056234','31/07/2027','01/08/2024','DMCC Properties','Carrefour Hypermarket','Cluster D, JLT','900000',97),
  (c57, 'EJ-2025-057567','31/12/2027','01/01/2025','Emaar Properties','Spinneys Dubai','MBR City Retail','380000',95),
  (c58, 'EJ-2023-058890','31/08/2026','01/09/2023','Al Ain Properties','IKEA Al Ain','Al Ain Mall, Ground Floor','750000',98);


-- ════════════════════════════════════════════════════════════
-- PHASE 6: CASE RETURN ITEMS
-- ════════════════════════════════════════════════════════════

INSERT INTO case_return_items (case_id, return_number, item_type, document_id, category, severity, feedback, resolved, created_by, created_at) VALUES
  -- c12 Marina Flowers (returned 1x)
  (c12, 1,'document','bank-statement','missing','required','No bank statement uploaded — only IBAN proof provided. Please upload latest 1-month bank statement.', false, v_khalid, '2026-02-22 14:00:00+04'),
  (c12, 1,'document','shop-photos','low_quality','recommended','Shop photos are blurry and signboard not clearly visible. Please retake.', false, v_khalid, '2026-02-22 14:00:00+04'),
  (c12, 1,'general',NULL,'general','required','Please ensure all documents have original stamp visible.', false, v_khalid, '2026-02-22 14:00:00+04'),

  -- c13 Sunrise Bakery (returned 2x)
  -- Return #1
  (c13, 1,'document','trade-license','expired','required','Trade license expired Jan 2026. Please upload renewed TL.', true, v_proc1, '2026-02-16 11:00:00+04'),
  (c13, 1,'document','main-moa','incorrect','required','MOA does not list authorized signatory. Please upload correct version.', true, v_proc1, '2026-02-16 11:00:00+04'),
  (c13, 1,'general',NULL,'general','recommended','Consider uploading bank statement for faster processing.', true, v_proc1, '2026-02-16 11:00:00+04'),
  -- Return #2
  (c13, 2,'document','trade-license','incorrect','required','Renewed TL still shows old activities (General Trading instead of Bakery).', false, v_proc1, '2026-02-24 14:00:00+04'),
  (c13, 2,'general',NULL,'general','required','Activities on TL must match the actual business nature.', false, v_proc1, '2026-02-24 14:00:00+04'),

  -- c36 Al Salam E-Services (returned 1x)
  (c36, 1,'document','aml-questionnaire','unclear','required','AML questionnaire not signed by MSO. Needs signature on page 3.', false, v_fatima, '2026-03-05 11:00:00+04'),
  (c36, 1,'document','addendum','missing','required','Addendum missing merchant stamp. Please re-stamp and upload.', false, v_fatima, '2026-03-05 11:00:00+04'),
  (c36, 1,'additional_request',NULL,'additional','recommended','Please provide updated screenshot of e-invoicing portal registration.', false, v_fatima, '2026-03-05 11:00:00+04'),

  -- c46 Talabat Pay (returned 1x)
  (c46, 1,'document','pg-questionnaire','incorrect','required','PG questionnaire Section B is incomplete — API integration details missing.', false, v_proc1, '2026-03-02 14:00:00+04'),
  (c46, 1,'document','iban-proof','incorrect','required','IBAN on proof doesn''t match IBAN in MDF Section 5.', false, v_proc1, '2026-03-02 14:00:00+04'),

  -- c56 Carrefour JLT (returned 2x)
  -- Return #1
  (c56, 1,'document','shop-photos','incorrect','required','Shop photos show old location (Mall of Emirates), not the new JLT branch.', true, v_fatima, '2026-03-04 14:00:00+04'),
  (c56, 1,'document','tenancy-ejari','incorrect','required','Tenancy contract address doesn''t match the new JLT location.', true, v_fatima, '2026-03-04 14:00:00+04'),
  -- Return #2
  (c56, 2,'document','tenancy-ejari','incorrect','required','Updated tenancy still shows address as Cluster C. New location is Cluster D.', false, v_fatima, '2026-03-14 11:00:00+04'),
  (c56, 2,'general',NULL,'general','required','Branch form must match exact unit number in tenancy.', false, v_fatima, '2026-03-14 11:00:00+04');


-- ════════════════════════════════════════════════════════════
-- PHASE 6b: CASE EXCEPTIONS
-- ════════════════════════════════════════════════════════════

INSERT INTO case_exceptions (case_id, item_id, reason, reason_category, notes, created_at) VALUES
  (c5,  'amended-moa','Single shareholder — no amendments','not-applicable','100% ownership',                    '2026-03-18 10:00:00+04'),
  (c9,  'poa','Both shareholders are signatories','not-applicable',NULL,                                          '2026-03-12 16:00:00+04'),
  (c11, 'vat-declaration','Combined with VAT certificate','combined-doc','FTA single document',                   '2026-02-05 11:00:00+04'),
  (c14, 'org-structure','Partners are individuals not companies','not-applicable',NULL,                            '2025-12-06 10:00:00+04'),
  (c16, 'amended-moa','Single shareholder — no amendments','not-applicable',NULL,                                 '2025-10-08 10:00:00+04'),
  (c17, 'bank-statement','New merchant — no acquirer history','not-applicable','First time POS',                   '2025-10-20 11:00:00+04'),
  (c18, 'vat-declaration','Combined with VAT certificate','combined-doc',NULL,                                    '2025-11-07 12:00:00+04'),
  (c20, 'personal-bank','Business account only — high volume','not-applicable','Monthly volume >30K AED',          '2025-11-30 10:00:00+04'),
  (c22, 'org-structure','DIFC entity — structure on TL','combined-doc',NULL,                                      '2026-02-10 11:00:00+04'),
  (c25, 'amended-moa','Single shareholder — no amendments','not-applicable','100% ownership',                     '2026-02-12 10:00:00+04'),
  (c28, 'personal-bank','Corporate entity — no personal account','not-applicable',NULL,                            '2025-11-12 11:00:00+04'),
  (c35, 'shop-photos','E-commerce only — no physical premises','not-applicable','Online SaaS business',            '2026-01-26 10:00:00+04'),
  (c37, 'shop-photos','E-commerce / delivery only','not-applicable','Cloud kitchen model',                         '2025-12-10 11:00:00+04'),
  (c38, 'shop-photos','Marketplace platform — no physical store','not-applicable','Technology company',             '2025-12-20 10:00:00+04'),
  (c39, 'shop-photos','E-commerce / delivery only','not-applicable','Food technology platform',                    '2026-01-13 11:00:00+04'),
  (c45, 'shop-photos','Payment gateway — no physical premises','not-applicable','FZE entity',                      '2026-02-01 10:00:00+04'),
  (c47, 'shop-photos','E-commerce platform — no physical store','not-applicable',NULL,                             '2025-12-25 11:00:00+04'),
  (c48, 'shop-photos','E-commerce — no physical premises','not-applicable',NULL,                                  '2025-12-12 10:00:00+04'),
  (c49, 'shop-photos','E-commerce — no physical premises','not-applicable',NULL,                                  '2025-12-28 11:00:00+04'),
  (c52, 'amended-moa','Corporate entity — no personal MOA amendments','not-applicable','Group company',            '2026-01-23 10:00:00+04'),
  (c58, 'amended-moa','Corporate entity — IKEA Group','not-applicable','Multinational',                            '2025-09-12 10:00:00+04');


-- ════════════════════════════════════════════════════════════
-- PHASE 6c: CASE NOTES
-- ════════════════════════════════════════════════════════════

INSERT INTO case_notes (case_id, author_id, note_type, content, created_at) VALUES
  -- Processing notes
  (c9,  v_proc1,  'processing','Reviewing merchant details. Restaurant in JBR — high foot traffic area. Bank statement looks healthy.','2026-03-16 11:00:00+04'),
  (c10, v_fatima, 'processing','Auto services company — checking TL activities match business description. IBAN verified.','2026-03-18 10:00:00+04'),
  (c11, v_khalid, 'processing','All documents verified. Single shareholder, clean KYC. Straightforward approval.','2026-02-14 14:00:00+04'),
  (c14, v_fatima, 'processing','Real estate case — both shareholders cleared. Bank statement shows healthy revenue.','2025-12-18 13:00:00+04'),
  (c16, v_proc1,  'processing','Long-standing business (15 years). All docs clear. Recommending approval.','2025-10-20 14:00:00+04'),
  (c25, v_fatima, 'processing','High-risk money exchange. Enhanced DD in progress. No sanctions flags.','2026-02-18 10:00:00+04'),
  (c34, v_khalid, 'processing','Cloud kitchen e-invoice setup. AML questionnaire complete. Checking addendum.','2026-02-24 11:00:00+04'),
  (c44, v_fatima, 'processing','Namshi PG integration — reviewing API documentation and security questionnaire.','2026-02-27 10:00:00+04'),
  (c45, v_khalid, 'processing','Amazon PS — corporate entity, all documents institutional quality. Fast-track approved.','2026-02-10 14:00:00+04'),
  (c57, v_khalid, 'processing','Spinneys new MBR location — checking tenancy matches branch form address.','2026-03-07 10:00:00+04'),

  -- Return reasons
  (c12, v_khalid, 'return_reason','Bank statement missing — only IBAN proof provided. Shop photos blurry. Need original stamps visible.','2026-02-22 14:30:00+04'),
  (c13, v_proc1,  'return_reason','Return #1: TL expired Jan 2026, MOA missing signatories.','2026-02-16 11:30:00+04'),
  (c13, v_proc1,  'return_reason','Return #2: Renewed TL still shows old activities. Must match actual business.','2026-02-24 14:30:00+04'),
  (c36, v_fatima, 'return_reason','AML questionnaire unsigned, addendum missing merchant stamp.','2026-03-05 11:30:00+04'),
  (c46, v_proc1,  'return_reason','PG questionnaire incomplete Section B. IBAN mismatch between proof and MDF.','2026-03-02 14:30:00+04'),
  (c56, v_fatima, 'return_reason','Return #1: Shop photos show old location. Tenancy wrong address.','2026-03-04 14:30:00+04'),
  (c56, v_fatima, 'return_reason','Return #2: Updated tenancy still wrong cluster (C vs D).','2026-03-14 11:30:00+04'),

  -- Escalation
  (c26, v_proc1,  'escalation','Sanctions exposure to Russia (8% wire transfers). Shareholder Viktor Petrov — Russian national. Escalating for management review.','2026-02-25 11:30:00+04'),
  (c27, v_fatima, 'escalation','PEP individual identified: Sheikh Hamdan Al Qasimi (Royal Family Member). 70% shareholder. Enhanced screening required.','2026-03-01 14:30:00+04'),

  -- General notes from sales
  (c3,  v_omar,   'general','Client requesting expedited processing — pharmacy opening next month.','2026-03-05 14:30:00+04'),
  (c5,  v_sales1, 'general','Auto parts dealer in Al Quoz. High monthly volume expected.','2026-03-18 10:30:00+04'),
  (c7,  v_omar,   'general','General trading company — been in business 8 years. Good references.','2026-03-10 10:30:00+04'),
  (c21, v_omar,   'general','DMCC entity — commodity trader. Expect high transaction volumes.','2026-03-08 15:00:00+04'),
  (c22, v_sarah,  'general','Pinnacle FS — high-risk financial services. Will need enhanced DD.','2026-02-03 12:00:00+04'),
  (c23, v_sales1, 'general','Currency exchange — large established business. 20 years in UAE.','2026-03-12 10:00:00+04'),
  (c32, v_sarah,  'general','OrderNow is a DAFZA tech startup — e-invoicing platform.','2026-03-16 09:00:00+04'),
  (c42, v_sales2, 'general','Luxury Deals — premium online retail. JAFZA free zone entity.','2026-03-14 11:00:00+04'),
  (c51, v_sarah,  'general','MAF Leisure — additional MID for new entertainment venue.','2026-02-25 11:00:00+04');


-- ════════════════════════════════════════════════════════════
-- PHASE 7: READINESS HISTORY
-- ════════════════════════════════════════════════════════════

INSERT INTO readiness_history (case_id, score, tier, computed_at) VALUES
  -- Progression: red → amber → green
  (c1, 12,'red','2026-03-03 10:00:00+04'), (c1, 32,'red','2026-03-06 14:00:00+04'),
  (c2, 10,'red','2026-03-10 11:00:00+04'), (c2, 28,'red','2026-03-12 15:00:00+04'),
  (c3, 35,'red','2026-03-05 12:00:00+04'), (c3, 55,'amber','2026-03-07 14:00:00+04'), (c3, 78,'amber','2026-03-08 17:00:00+04'),
  (c4, 40,'amber','2026-03-12 10:00:00+04'), (c4, 68,'amber','2026-03-14 14:00:00+04'), (c4, 82,'green','2026-03-15 15:00:00+04'),
  (c5, 45,'amber','2026-03-18 10:00:00+04'), (c5, 72,'amber','2026-03-19 14:00:00+04'), (c5, 88,'green','2026-03-20 16:00:00+04'),
  (c6, 50,'amber','2026-03-15 11:00:00+04'), (c6, 75,'amber','2026-03-17 14:00:00+04'), (c6, 85,'green','2026-03-18 17:00:00+04'),
  (c7, 42,'amber','2026-03-10 10:00:00+04'), (c7, 78,'amber','2026-03-13 14:00:00+04'), (c7, 90,'green','2026-03-14 15:00:00+04'),
  (c8, 38,'red','2026-03-08 15:00:00+04'), (c8, 65,'amber','2026-03-11 14:00:00+04'), (c8, 87,'green','2026-03-12 18:00:00+04'),
  (c9, 40,'amber','2026-03-07 09:00:00+04'), (c9, 75,'amber','2026-03-10 14:00:00+04'), (c9, 91,'green','2026-03-12 16:00:00+04'),
  (c10,35,'red','2026-03-11 12:00:00+04'), (c10,70,'amber','2026-03-14 14:00:00+04'), (c10,89,'green','2026-03-15 17:00:00+04'),
  (c11,45,'amber','2026-02-01 10:00:00+04'), (c11,78,'amber','2026-02-04 14:00:00+04'), (c11,93,'green','2026-02-06 17:00:00+04'),
  (c12,30,'red','2026-02-08 11:00:00+04'), (c12,55,'amber','2026-02-14 14:00:00+04'),
  (c13,25,'red','2026-02-06 10:00:00+04'), (c13,48,'red','2026-02-10 14:00:00+04'),
  (c14,50,'amber','2025-12-01 10:00:00+04'), (c14,80,'green','2025-12-04 14:00:00+04'), (c14,95,'green','2025-12-06 17:00:00+04'),
  (c16,55,'amber','2025-10-03 10:00:00+04'), (c16,82,'green','2025-10-06 14:00:00+04'), (c16,96,'green','2025-10-08 17:00:00+04'),
  (c17,48,'red','2025-10-15 10:00:00+04'), (c17,76,'amber','2025-10-18 14:00:00+04'), (c17,92,'green','2025-10-20 17:00:00+04'),
  (c18,42,'amber','2025-11-02 11:00:00+04'), (c18,78,'amber','2025-11-05 14:00:00+04'), (c18,94,'green','2025-11-07 17:00:00+04'),
  (c20,55,'amber','2025-11-25 12:00:00+04'), (c20,80,'green','2025-11-28 14:00:00+04'), (c20,93,'green','2025-11-30 17:00:00+04'),
  (c22,35,'red','2026-02-03 12:00:00+04'), (c22,58,'amber','2026-02-06 14:00:00+04'), (c22,75,'amber','2026-02-10 17:00:00+04'),
  (c23,40,'amber','2026-03-12 10:00:00+04'), (c23,70,'amber','2026-03-15 14:00:00+04'), (c23,83,'green','2026-03-17 16:00:00+04'),
  (c25,38,'red','2026-02-05 09:00:00+04'), (c25,65,'amber','2026-02-09 14:00:00+04'), (c25,86,'green','2026-02-12 17:00:00+04'),
  (c26,30,'red','2026-02-10 10:00:00+04'), (c26,60,'amber','2026-02-15 14:00:00+04'), (c26,78,'amber','2026-02-17 17:00:00+04'),
  (c27,25,'red','2026-02-07 15:00:00+04'), (c27,55,'amber','2026-02-11 14:00:00+04'), (c27,76,'amber','2026-02-14 17:00:00+04'),
  (c28,50,'amber','2025-11-08 10:00:00+04'), (c28,78,'amber','2025-11-10 14:00:00+04'), (c28,90,'green','2025-11-12 17:00:00+04'),
  (c29,40,'amber','2026-01-05 11:00:00+04'), (c29,65,'amber','2026-01-08 14:00:00+04'), (c29,72,'amber','2026-01-10 17:00:00+04'),
  (c35,50,'amber','2026-01-22 11:00:00+04'), (c35,78,'amber','2026-01-25 14:00:00+04'), (c35,92,'green','2026-01-26 17:00:00+04'),
  (c37,55,'amber','2025-12-05 11:00:00+04'), (c37,80,'green','2025-12-08 14:00:00+04'), (c37,93,'green','2025-12-10 17:00:00+04'),
  (c39,48,'red','2026-01-08 09:00:00+04'), (c39,75,'amber','2026-01-11 14:00:00+04'), (c39,88,'green','2026-01-13 17:00:00+04'),
  (c45,60,'amber','2026-01-28 10:00:00+04'), (c45,85,'green','2026-01-31 14:00:00+04'), (c45,95,'green','2026-02-01 17:00:00+04'),
  (c48,50,'amber','2025-12-08 11:00:00+04'), (c48,78,'amber','2025-12-10 14:00:00+04'), (c48,93,'green','2025-12-12 17:00:00+04'),
  (c52,55,'amber','2026-01-18 09:00:00+04'), (c52,80,'green','2026-01-21 14:00:00+04'), (c52,90,'green','2026-01-23 17:00:00+04'),
  (c56,20,'red','2026-02-18 11:00:00+04'), (c56,45,'red','2026-02-22 14:00:00+04'),
  (c58,60,'amber','2025-09-05 11:00:00+04'), (c58,85,'green','2025-09-10 14:00:00+04'), (c58,95,'green','2025-09-12 17:00:00+04');


-- ════════════════════════════════════════════════════════════
-- PHASE 7b: NOTIFICATIONS
-- ════════════════════════════════════════════════════════════

INSERT INTO notifications (user_id, type, title, message, case_id, is_read, created_at) VALUES
  -- Case submitted → processing team
  (v_proc1,  'case_submitted','New case submitted','Emirates Auto Parts Trading submitted by Sales',                  c5,  false, now()-interval '2 hours'),
  (v_proc1,  'case_submitted','New case submitted','Skyline Fashion Boutique LLC submitted by Sarah Ahmed',           c6,  false, now()-interval '6 hours'),
  (v_fatima, 'case_submitted','New case submitted','Al Safwa General Trading submitted by Omar Hassan',               c7,  false, now()-interval '15 hours'),
  (v_khalid, 'case_submitted','New case submitted','Jumeirah Coffee Roasters submitted by Sarah Ahmed',               c8,  false, now()-interval '36 hours'),
  (v_proc1,  'case_submitted','New case submitted','Royal Spice Restaurant submitted by Sales Test',                  c9,  true,  '2026-03-14 09:00:00+04'),
  (v_fatima, 'case_submitted','New case submitted','Bin Hamdan Auto Services submitted by Sarah Ahmed',               c10, true,  '2026-03-16 10:00:00+04'),
  (v_khalid, 'case_submitted','New case submitted','Oasis Supermarket submitted by Omar Hassan',                      c11, true,  '2026-02-10 09:00:00+04'),
  (v_proc1,  'case_submitted','New case submitted','Arabian Gulf Exchange submitted by Sales',                        c23, false, now()-interval '8 hours'),
  (v_khalid, 'case_submitted','New case submitted','Al Ghurair Precious Metals submitted by Omar Hassan',             c24, false, now()-interval '48 hours'),
  (v_fatima, 'case_submitted','New case submitted','Falcon Money Exchange submitted by Sarah Ahmed',                  c25, true,  '2026-02-15 09:00:00+04'),
  (v_proc1,  'case_submitted','New case submitted','OrderNow Technologies submitted by Sarah Ahmed',                  c32, false, now()-interval '4 hours'),
  (v_fatima, 'case_submitted','New case submitted','PayFlex Solutions submitted by Omar Hassan',                      c33, false, now()-interval '20 hours'),
  (v_khalid, 'case_submitted','New case submitted','Cloud Kitchen Concepts submitted by Sarah Ahmed',                 c34, true,  '2026-02-22 10:00:00+04'),
  (v_proc1,  'case_submitted','New case submitted','Luxury Deals Online submitted by Sales Test',                     c42, false, now()-interval '10 hours'),
  (v_proc1,  'case_submitted','New case submitted','Modanisa UAE submitted by Sarah Ahmed',                           c43, false, now()-interval '42 hours'),
  (v_fatima, 'case_submitted','New case submitted','Namshi FZCO submitted by Omar Hassan',                            c44, true,  '2026-02-25 09:00:00+04'),
  (v_khalid, 'case_submitted','New case submitted','MAF Leisure submitted by Sarah Ahmed',                            c51, false, now()-interval '30 hours'),
  (v_khalid, 'case_submitted','New case submitted','Spinneys Dubai submitted by Sarah Ahmed',                         c57, true,  '2026-03-05 10:00:00+04'),

  -- Case approved → sales
  (v_omar,   'case_approved','Case approved','Oasis Supermarket approved by Khalid Noor',                            c11, true,  '2026-02-14 15:00:00+04'),
  (v_sales1, 'case_approved','Case approved','TechBridge Solutions approved by Processing',                           c35, true,  '2026-02-05 14:00:00+04'),
  (v_sales1, 'case_approved','Case approved','Amazon Payment Services approved by Khalid Noor',                      c45, true,  '2026-02-10 15:00:00+04'),
  (v_omar,   'case_approved','Case approved','Lulu Hypermarket approved by Processing',                              c52, false, '2026-02-02 14:00:00+04'),
  (v_sarah,  'case_approved','Case approved','Golden Sands RE approved by Fatima Ali',                               c14, true,  '2025-12-18 14:00:00+04'),
  (v_sarah,  'case_approved','Case approved','Palm Jewellers approved by Khalid Noor',                               c15, true,  '2025-12-28 16:00:00+04'),
  (v_omar,   'case_approved','Case approved','Shopify MENA approved by Fatima Ali',                                  c47, true,  '2026-01-08 14:00:00+04'),

  -- Case returned → sales
  (v_sarah,  'case_returned','Case returned','Marina Flowers returned — missing bank statement, blurry photos',       c12, false, '2026-02-22 14:00:00+04'),
  (v_sales2, 'case_returned','Case returned','Sunrise Bakery returned — TL expired, MOA issues',                     c13, true,  '2026-02-16 11:00:00+04'),
  (v_sales2, 'case_returned','Case returned','Sunrise Bakery returned again — TL activities mismatch',               c13, false, '2026-02-24 14:00:00+04'),
  (v_sales2, 'case_returned','Case returned','Al Salam E-Services returned — AML unsigned, addendum no stamp',       c36, false, '2026-03-05 11:00:00+04'),
  (v_sarah,  'case_returned','Case returned','Talabat Pay returned — PG questionnaire incomplete, IBAN mismatch',    c46, false, '2026-03-02 14:00:00+04'),
  (v_sales1, 'case_returned','Case returned','Carrefour JLT returned — wrong location photos',                       c56, true,  '2026-03-04 14:00:00+04'),
  (v_sales1, 'case_returned','Case returned','Carrefour JLT returned again — tenancy address still wrong',           c56, false, '2026-03-14 11:00:00+04'),

  -- Case escalated → management
  (v_zain,   'case_escalated','Case escalated','Royal Exchange House escalated — Russia sanctions exposure',           c26, false, '2026-02-25 11:00:00+04'),
  (v_rania,  'case_escalated','Case escalated','Royal Exchange House escalated — sanctions review needed',             c26, false, '2026-02-25 11:00:00+04'),
  (v_zain,   'case_escalated','Case escalated','Gulf Bullion escalated — PEP individual (Royal Family)',              c27, false, '2026-03-01 14:00:00+04'),
  (v_rania,  'case_escalated','Case escalated','Gulf Bullion escalated — PEP Royal Family connection',                c27, false, '2026-03-01 14:00:00+04'),

  -- Case assigned → processors
  (v_fatima, 'case_assigned','Case assigned to you','Al Safwa General Trading assigned for review',                   c7,  false, now()-interval '14 hours'),
  (v_khalid, 'case_assigned','Case assigned to you','Jumeirah Coffee Roasters assigned for review',                   c8,  true,  now()-interval '35 hours'),
  (v_proc1,  'case_assigned','Case assigned to you','Royal Spice Restaurant assigned for review',                     c9,  true,  '2026-03-15 09:00:00+04'),
  (v_fatima, 'case_assigned','Case assigned to you','Bin Hamdan Auto Services assigned for review',                   c10, true,  '2026-03-17 09:00:00+04'),
  (v_fatima, 'case_assigned','Case assigned to you','Namshi assigned for review',                                     c44, true,  '2026-02-26 09:00:00+04'),
  (v_khalid, 'case_assigned','Case assigned to you','Spinneys Dubai assigned for review',                             c57, true,  '2026-03-06 09:00:00+04'),

  -- Expiry warnings
  (v_proc1,  'expiry_warning','Document expiring soon','Trade license for Dubai Fresh Market expires 19/04/2026',      c16, false, '2026-03-19 08:00:00+04'),
  (v_proc1,  'expiry_warning','KYC expiring soon','Passport for Ahmed Al Noor (Noor Pharmacy) expires 20/04/2026',    c3,  false, '2026-03-20 08:00:00+04'),
  (v_fatima, 'expiry_warning','Document expiring soon','Creek Side Textiles TL expires 14/04/2026',                    c19, false, '2026-03-15 08:00:00+04'),
  (v_fatima, 'expiry_warning','Document expiring soon','Deira Gold Souk TL expires 10/04/2026',                        c20, false, '2026-03-10 08:00:00+04'),
  (v_khalid, 'expiry_warning','Document expiring soon','Al Waha Money Transfer TL expires 15/04/2026',                 c28, false, '2026-03-15 08:00:00+04'),
  (v_rania,  'expiry_warning','Document expiring soon','Sharaf DG TL expires 15/04/2026 — renewal pending',            c55, false, '2026-03-12 08:00:00+04'),
  (v_zain,   'expiry_warning','Document expiring soon','Zomato UAE TL expired 31/03/2026 — renewal pending',           c39, false, '2026-03-15 08:00:00+04'),
  (v_proc1,  'expiry_warning','KYC expiring soon','Passport for Mark Thompson (AJ Electronics) expires 25/03/2026',   c17, false, '2026-03-10 08:00:00+04'),

  -- Management info
  (v_zain,   'info','Weekly summary','12 cases submitted this week. 4 approved, 2 returned, 1 escalated.',            NULL, false, '2026-03-21 09:00:00+04'),
  (v_rania,  'info','Monthly report ready','March analytics report is available in the Reports section.',              NULL, false, '2026-03-20 09:00:00+04'),
  (v_zain,   'info','Q1 performance review','Q1 2026 team performance data is ready for review.',                     NULL, false, '2026-03-22 09:00:00+04');


-- ════════════════════════════════════════════════════════════
-- PHASE 7c: SUBMISSION DETAILS (key submitted+ cases)
-- ════════════════════════════════════════════════════════════

INSERT INTO submission_details (case_id, data) VALUES
  (c5,  '{"requestDate":"20/03/2026","groupName":"","existingOrNew":"New","mcc":"5531","noOfLocations":"1","merchantLocation":"Dubai","mobileNumber":"+971503456789","contactPersonName":"Rashid Al Maktoum","emailAddress":"info@eap.ae","natureOfBusiness":"Auto parts trading","avgTransactionSize":"500","expectedMonthlySpend":"180000","rentalFee":"750","mso":"Sales","noOfTerminalsAndType":"3x Move 5000","proposedRateStandard":"1.75%","proposedRatePremium":"2.10%","proposedRateInternational":"2.80%"}'),
  (c9,  '{"requestDate":"14/03/2026","groupName":"","existingOrNew":"New","mcc":"5812","noOfLocations":"1","merchantLocation":"Dubai","mobileNumber":"+971509876543","contactPersonName":"Hamad Al Shamsi","emailAddress":"royal@spice.ae","natureOfBusiness":"Restaurant","avgTransactionSize":"150","expectedMonthlySpend":"120000","rentalFee":"500","mso":"Sales Test","noOfTerminalsAndType":"2x Move 5000","proposedRateStandard":"1.75%","proposedRatePremium":"2.10%","proposedRateInternational":"2.80%"}'),
  (c11, '{"requestDate":"10/02/2026","groupName":"","existingOrNew":"New","mcc":"5411","noOfLocations":"1","merchantLocation":"Sharjah","mobileNumber":"+971504567890","contactPersonName":"Khalid bin Saeed","emailAddress":"info@oasis.ae","natureOfBusiness":"Supermarket retail","avgTransactionSize":"80","expectedMonthlySpend":"200000","rentalFee":"500","mso":"Omar Hassan","noOfTerminalsAndType":"4x Move 5000","proposedRateStandard":"1.85%","proposedRatePremium":"2.30%","proposedRateInternational":"2.80%"}'),
  (c22, '{"requestDate":"10/02/2026","groupName":"Pinnacle Group","existingOrNew":"New","mcc":"6012","noOfLocations":"1","merchantLocation":"Dubai","mobileNumber":"+971505678901","contactPersonName":"James Wilson","emailAddress":"ops@pinnacle.ae","natureOfBusiness":"Financial services / payment processing","avgTransactionSize":"2000","expectedMonthlySpend":"800000","rentalFee":"1000","mso":"Sarah Ahmed","noOfTerminalsAndType":"5x POS + ECOM","proposedRateStandard":"2.00%","proposedRatePremium":"2.40%","proposedRateInternational":"3.00%"}'),
  (c25, '{"requestDate":"15/02/2026","groupName":"","existingOrNew":"New","mcc":"6051","noOfLocations":"3","merchantLocation":"Dubai","mobileNumber":"+971503344556","contactPersonName":"Salem Al Nuaimi","emailAddress":"info@falcon.ae","natureOfBusiness":"Currency exchange","avgTransactionSize":"5000","expectedMonthlySpend":"1500000","rentalFee":"1500","mso":"Sarah Ahmed","noOfTerminalsAndType":"6x POS + ECOM","proposedRateStandard":"2.10%","proposedRatePremium":"2.50%","proposedRateInternational":"3.00%"}'),
  (c35, '{"requestDate":"28/01/2026","groupName":"","existingOrNew":"New","mcc":"5734","noOfLocations":"0","merchantLocation":"RAK","mobileNumber":"+971508899001","contactPersonName":"Ali T.","emailAddress":"info@techbridge.ae","natureOfBusiness":"IT solutions & e-invoicing","avgTransactionSize":"200","expectedMonthlySpend":"300000","rentalFee":"0","mso":"Sales","noOfTerminalsAndType":"ECOM only","proposedRateStandard":"2.00%","proposedRatePremium":"2.80%","proposedRateInternational":"2.80%"}'),
  (c45, '{"requestDate":"02/02/2026","groupName":"Amazon","existingOrNew":"New","mcc":"5399","noOfLocations":"0","merchantLocation":"Abu Dhabi","mobileNumber":"+971503233445","contactPersonName":"Ahmed K.","emailAddress":"biz@amazon.ae","natureOfBusiness":"Online payment services","avgTransactionSize":"350","expectedMonthlySpend":"2000000","rentalFee":"0","mso":"Sales","noOfTerminalsAndType":"PG only","proposedRateStandard":"1.50%","proposedRatePremium":"2.50%","proposedRateInternational":"2.50%"}'),
  (c52, '{"requestDate":"25/01/2026","groupName":"Lulu Group","existingOrNew":"Existing","mcc":"5411","noOfLocations":"1","merchantLocation":"Abu Dhabi","mobileNumber":"+971507677889","contactPersonName":"Yusuf A.","emailAddress":"ops@lulu.ae","natureOfBusiness":"Hypermarket","avgTransactionSize":"120","expectedMonthlySpend":"1500000","rentalFee":"750","mso":"Omar Hassan","noOfTerminalsAndType":"8x Move 5000","proposedRateStandard":"1.50%","proposedRatePremium":"2.50%","proposedRateInternational":"2.50%"}');


END $$;

-- ============================================================
-- CLEANUP HELPER FUNCTIONS
-- ============================================================
DROP FUNCTION IF EXISTS _sd;
DROP FUNCTION IF EXISTS _docs_lr;
DROP FUNCTION IF EXISTS _docs_hr;
DROP FUNCTION IF EXISTS _docs_ei;
DROP FUNCTION IF EXISTS _docs_pg;
DROP FUNCTION IF EXISTS _docs_am;
DROP FUNCTION IF EXISTS _docs_nl;
DROP FUNCTION IF EXISTS _fees_pos;
DROP FUNCTION IF EXISTS _fees_ecom;
DROP FUNCTION IF EXISTS _fees_both;

-- Re-enable RLS
SET session_replication_role = 'origin';

-- ============================================================
-- VERIFICATION QUERIES (uncomment to check)
-- ============================================================
-- SELECT 'profiles' as tbl, count(*) FROM profiles
-- UNION ALL SELECT 'cases', count(*) FROM cases
-- UNION ALL SELECT 'case_documents', count(*) FROM case_documents
-- UNION ALL SELECT 'case_status_history', count(*) FROM case_status_history
-- UNION ALL SELECT 'shareholders', count(*) FROM shareholders
-- UNION ALL SELECT 'case_notes', count(*) FROM case_notes
-- UNION ALL SELECT 'case_exceptions', count(*) FROM case_exceptions
-- UNION ALL SELECT 'case_return_items', count(*) FROM case_return_items
-- UNION ALL SELECT 'notifications', count(*) FROM notifications
-- UNION ALL SELECT 'readiness_history', count(*) FROM readiness_history
-- UNION ALL SELECT 'submission_details', count(*) FROM submission_details
-- UNION ALL SELECT 'ocr_trade_license', count(*) FROM ocr_trade_license
-- UNION ALL SELECT 'ocr_merchant_details', count(*) FROM ocr_merchant_details
-- UNION ALL SELECT 'ocr_passport_data', count(*) FROM ocr_passport_data
-- UNION ALL SELECT 'ocr_eid_data', count(*) FROM ocr_eid_data
-- UNION ALL SELECT 'ocr_kyc_profile', count(*) FROM ocr_kyc_profile
-- UNION ALL SELECT 'ocr_pep_data', count(*) FROM ocr_pep_data
-- UNION ALL SELECT 'ocr_bank_statement', count(*) FROM ocr_bank_statement
-- UNION ALL SELECT 'ocr_vat_cert', count(*) FROM ocr_vat_cert
-- UNION ALL SELECT 'ocr_moa', count(*) FROM ocr_moa
-- UNION ALL SELECT 'ocr_fee_schedule', count(*) FROM ocr_fee_schedule
-- UNION ALL SELECT 'ocr_tenancy', count(*) FROM ocr_tenancy
-- ORDER BY tbl;
