-- Ensure auth schema and functions exist for local development if not in Supabase environment
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY
);

CREATE OR REPLACE FUNCTION auth.uid() 
RETURNS UUID 
LANGUAGE sql STABLE
AS $$
  SELECT null::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() 
RETURNS TEXT 
LANGUAGE sql STABLE
AS $$
  SELECT 'anon'::text;
$$;

-- Create the spiritual_masters table
CREATE TABLE IF NOT EXISTS spiritual_masters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE spiritual_masters ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid duplication errors
DROP POLICY IF EXISTS "Allow public read access to spiritual_masters" ON spiritual_masters;
DROP POLICY IF EXISTS "Allow superadmin write access to spiritual_masters" ON spiritual_masters;

-- Create policy for public read access
CREATE POLICY "Allow public read access to spiritual_masters" ON spiritual_masters
    FOR SELECT USING (true);

-- Create policy for superadmin write access
CREATE POLICY "Allow superadmin write access to spiritual_masters" ON spiritual_masters
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (
                8 = ANY(users.role)
                OR 8 = ANY(users.role::integer[])
                OR '8' = ANY(users.role::text[])
                OR 'super_admin' = ANY(users.role::text[])
                OR users.role::text = 'super_admin'
                OR users.role::text = '8'
            )
        )
    );

-- Seed spiritual_masters table with initial list
INSERT INTO spiritual_masters (name) VALUES
('HG Acyuta Priya Das RNS (APD)'),
('HG Advaita Acharya Das BTS (AAD)'),
('HG Adikarta Das (AKD)'),
('HH Asita Krishna Swami TKG (AKS)'),
('HH Atmanivedana Swami BSDS (AVS)'),
('HH Bhakti Ananda Haridas Goswami (BAHG) BSDS'),
('HH Bhakti Anugraha Janardana Swami GKG (BAJS)'),
('HH Bhakti Asraya Vaisnava Swami GKG (BAVS)'),
('HH Bhaktivaibhava Swami (BVS)'),
('HH Bhakti Bhagavatamrita Kesava Swami PVS (BBKS)'),
('HH Bhakti Bhrnga Govinda Swami (BBGS)'),
('HH Bhakti Caitanya Swami (BCAIS)'),
('HH Bhakti Carudesna Swami BTS (BCDS)'),
('HH Bhakti Dayita Adipurusha Swami GGS (BDAS)'),
('HH Bhakti Dhira Damodara Swami BTS (BDDS)'),
('HH Bhakti Gaurava Narayan Swami TKG (BGNS)'),
('HH Bhakti Gauravani Goswami (BGVG)'),
('HH Bhakti Prabhava Swami BCS (BPRS)'),
('HH Bhakti Prabhupada-vrata Damodara Swami (BPDS)'),
('HH Bhakti Pran Gopinath Swami GGS (BPGS)'),
('HH Bhakti Prema Swami BCS (BHPS)'),
('HH Bhakti Raghava Swami (BRS)'),
('HH Bhakti Ratnakara Ambarisa Swami GKG (BRAS)'),
('HH Bhakti Sundar Goswami (BSG)'),
('HH Bhakti Vasudeva Swami BTS (BHVS)'),
('HH Bhakti Vijnana Goswami RNS (BVG)'),
('HH Bhakti Vikasa Swami (BVKS)'),
('HH Bhaktivyasa Tirtha Swami BSDS (BVTS)'),
('HH Bhakti VV Narasimha Swami (BVVNS)'),
('HH Bhakti-bhusana Swami (BBS)'),
('HH Bhaktimarga Swami (BMS)'),
('HH Bhaktipada Goswami SRS (BPG)'),
('HG Bhurijana Das (BJD)'),
('HH Bir Krsna Das Goswami (BKG)'),
('HG Caitanya Avatari Das JPS (CAD)'),
('HG Caitanya Candra Caran Das JPS (CCCD)'),
('HH Candra Mukha Swami HDG (CMKS)'),
('HH Candramauli Swami (CMS)'),
('HG Caru Das (CD)'),
('HH Danavir Goswami (DG)'),
('HH Dayavan Swami RSD (DS)'),
('HG Devakinandan Das MVG (DND)'),
('HH Devamrita Swami (DAS)'),
('HH Dhanvantari Swami (DVS)'),
('HH Dhirasanta Das Goswami (DDG) '),
('HG Drutakarma Das (DKD)'),
('HH Gauranga Prem Swami JPS (GRPS)'),
('HH Giridhari Swami (GDS)'),
('HG Gopaswami Das (GSD)'),
('HH Guru Prasad Swami (GPS)'),
('HH Haladhara Swami GGS (HDS)'),
('HH Hanumatpresaka Swami (HPS)'),
('HG Harivilas Das (HVD)'),
('HH Hrdayananda dasa Goswami (HDG)'),
('HH Indradyumna Swami (IDS)'),
('HH Janananda dasa Goswami (JG)'),
('HH Jayadvaita Swami (JAS)'),
('HH Jayapataka Swami (JPS)'),
('HG Jivananda Das (JND)'),
('HG Kalakantha Das (KKD)'),
('HH Kavicandra Swami (KVCS)'),
('HH Kesava Bharati dasa Goswami (KBDG)'),
('HG Kratu Das (KRD)'),
('HG Kripamoya Das (KMD)'),
('HH Krsna Ksetra Swami (KRKS)'),
('HH Lokanath Swami (LOK)'),
('HG Madana-mohana Das MG (MM)'),
('HG Madan Gopal Das SDG (MGD)'),
('HG Madhu Sevita Das (MSD)'),
('HH. Mahadyuti Swami (MDS)'),
('HG Mahaman Das (MMD)'),
('HH Mahaprabhu Swami SRS (MPS)'),
('HG Mahatma Das (MD)'),
('HH Mahavisnu Swami (MVS)'),
('HG Mani Bandha Das NRS (MBD)'),
('HG Manonatha Das (MND)'),
('HG Matsya Avatara Das (MAD)'),
('HG Medhavi Das (MDD)'),
('HG Narayani Devi Dasi (NDD)'),
('HH Navayogendra Swami (NYS)'),
('HH Niranjana Swami (NRS)'),
('HG Partha Sarathi Das Goswami (PSDG)'),
('HG Patita Pavana Das IDS (PPD)'),
('HH Prabodhananda Saraswati Swami GKG (PSS)'),
('HH Prahladananda Swami (PAS)'),
('HH Purushatraya Swami (PTS)'),
('HG Radhacaran Das TKG (RCD)'),
('HG Radha Govinda Das SRS (RGD)'),
('HH Radha Govinda Swami (RGM)'),
('HG Radha Krishna Das TKG (RKD)'),
('HH Radhanath Swami (RNS)'),
('HH Rama Govinda Swami KDS (RMGS)'),
('HH Ravindra Svarupa Das (RVSD)'),
('HG Revati Raman Das JPS (RRD)'),
('HH Romapada Swami (RPS)'),
('HH Rtadhvaja Swami (RTS)'),
('HH Sacinandana Swami (SNS)'),
('HG Samik Rsi Das (SRD)'),
('HG Sankarsana Das (SDA)'),
('HG Satyadeva Das (SDD)'),
('HG Sikhi Mahiti Das (SMD)'),
('HH Sivarama Swami (SRS)'),
('HH Smita Krsna Swami (SKS)'),
('HG Sridhama Das (SD)'),
('HG Srivas Das BTS (SVD)'),
('HH Subhaga Swami (SSM)'),
('HG Sundarananda Das GGS (SND)'),
('HH. Sukadeva Swami RNS (SDS)'),
('HG Umapati Das GKG (UPD)'),
('HH Vaisesika Das (VSD)'),
('HH Varsana Swami (VS)'),
('HG Vatsala Das (VD)'),
('HG Vasu Srestha Das JPS (VSD)'),
('HH Vedavyasapriya Swami (VVPS)'),
('HG Virabahu Das (VBD)'),
('HH Yadunandana Swami SDG (YNS)'),
('HH Yamunacarya Das Goswami HDG (YDG)')
ON CONFLICT (name) DO NOTHING;
