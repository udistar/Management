-- ==============================================================================
-- PROJECT: MBox Manager Database Schema (Fresh Start Version)
-- DESCRIPTION: Full schema with UUID PKs and corrected data types.
-- NOTE: This script DROPS existing tables to ensure the new UUID/DATE structure is applied.
-- ==============================================================================

-- 0. Cleanup (기존 테이블/뷰 삭제 - 새로운 스키마 적용을 위해)
DROP VIEW IF EXISTS rental_status_view CASCADE;
DROP TABLE IF EXISTS sales_data CASCADE;
DROP TABLE IF EXISTS inout_data CASCADE;
DROP TABLE IF EXISTS purchase_data CASCADE;
DROP TABLE IF EXISTS rental_data CASCADE;
DROP TABLE IF EXISTS upload_metadata CASCADE;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Sales Data Table (매출 데이터)
CREATE TABLE sales_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  spec TEXT NOT NULL,
  client TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  transport NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_date ON sales_data(date);
CREATE INDEX idx_sales_client ON sales_data(client);

-- 2. In/Out Data Table (입출고 데이터)
CREATE TABLE inout_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  spec TEXT NOT NULL,
  client TEXT NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('in', 'out')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inout_date ON inout_data(date);
CREATE INDEX idx_inout_client ON inout_data(client);

-- 3. Purchase Data Table (매입 데이터)
CREATE TABLE purchase_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  spec TEXT NOT NULL,
  client TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_purchase_date ON purchase_data(date);
CREATE INDEX idx_purchase_client ON purchase_data(client);

-- 4. Rental Data Table (임대 현황)
CREATE TABLE rental_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  spec TEXT NOT NULL,
  client TEXT NOT NULL,
  address TEXT,
  contact TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- days_left 계산 뷰 (DATE 캐스팅 명시)
CREATE OR REPLACE VIEW rental_status_view AS
SELECT 
    *,
    CASE 
        WHEN end_date IS NULL THEN NULL 
        ELSE (end_date::DATE - CURRENT_DATE) 
    END as days_remaining
FROM rental_data;

CREATE INDEX idx_rental_client ON rental_data(client);
CREATE INDEX idx_rental_end_date ON rental_data(end_date);

-- 5. Upload Metadata Table (업로드 메타데이터)
CREATE TABLE upload_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sales_count INTEGER NOT NULL DEFAULT 0,
  inout_count INTEGER NOT NULL DEFAULT 0,
  purchase_count INTEGER NOT NULL DEFAULT 0,
  rental_count INTEGER NOT NULL DEFAULT 0,
  asset_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE inout_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_metadata ENABLE ROW LEVEL SECURITY;

-- 7. Advanced RLS Policies (모든 사용자 조회 가능하도록 수정)
CREATE POLICY "Public read" ON sales_data FOR SELECT USING (true);
CREATE POLICY "Public read" ON inout_data FOR SELECT USING (true);
CREATE POLICY "Public read" ON purchase_data FOR SELECT USING (true);
CREATE POLICY "Public read" ON rental_data FOR SELECT USING (true);
CREATE POLICY "Public read" ON upload_metadata FOR SELECT USING (true);

CREATE POLICY "Public read" ON sales_data FOR SELECT USING (true);
CREATE POLICY "Public read" ON inout_data FOR SELECT USING (true);
CREATE POLICY "Public read" ON purchase_data FOR SELECT USING (true);
CREATE POLICY "Public read" ON rental_data FOR SELECT USING (true);
CREATE POLICY "Public read" ON upload_metadata FOR SELECT USING (true);
 
-- 쓰기/수정/삭제 권한도 공개 (현재 인증 UI 미구현 대응)
CREATE POLICY "Public CUD" ON sales_data FOR ALL USING (true);
CREATE POLICY "Public CUD" ON inout_data FOR ALL USING (true);
CREATE POLICY "Public CUD" ON purchase_data FOR ALL USING (true);
CREATE POLICY "Public CUD" ON rental_data FOR ALL USING (true);
CREATE POLICY "Public CUD" ON upload_metadata FOR ALL USING (true);

-- 8. Storage Bucket Infrastructure
INSERT INTO storage.buckets (id, name, public) 
VALUES ('excel-files', 'excel-files', false)
ON CONFLICT (id) DO NOTHING;

-- 9. Storage Object Policies
CREATE POLICY "Auth Users can view objects" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'excel-files');

CREATE POLICY "Auth Users can upload objects" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'excel-files');

CREATE POLICY "Auth Users can delete objects" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'excel-files');

-- 10. Update Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sales_data_modtime BEFORE UPDATE ON sales_data FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_inout_data_modtime BEFORE UPDATE ON inout_data FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_purchase_data_modtime BEFORE UPDATE ON purchase_data FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_rental_data_modtime BEFORE UPDATE ON rental_data FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
