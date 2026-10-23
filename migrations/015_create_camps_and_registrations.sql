-- Migration 015: Create camps and camp_registrations tables
-- Enables dynamic camp hosting by Super Admin with configurable dates, meal matrix, accommodation, and IDT passcodes.

CREATE TABLE IF NOT EXISTS camps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    venue VARCHAR(255) DEFAULT 'Central VOICE, Pune',
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'completed')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    late_fee NUMERIC(10, 2) DEFAULT 0,
    
    -- Configurable lists and matrices
    tracks JSONB NOT NULL DEFAULT '[]'::jsonb,
    participant_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    meal_pricing JSONB NOT NULL DEFAULT '[]'::jsonb,
    accommodation_pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
    special_waivers JSONB NOT NULL DEFAULT '{}'::jsonb,
    payment_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS camp_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    camp_id UUID NOT NULL REFERENCES camps(id) ON DELETE CASCADE,
    group_id VARCHAR(100), -- Batch ID for multi-participant registrations under one POC
    
    -- Point of Contact
    poc_name VARCHAR(255) NOT NULL,
    poc_contact VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    
    -- Participant Details
    parent_temple VARCHAR(255),
    voice_name VARCHAR(255),
    participant_name VARCHAR(255) NOT NULL,
    whatsapp VARCHAR(20) NOT NULL,
    counselor_name VARCHAR(255),
    gender VARCHAR(50) NOT NULL,
    age INTEGER,
    married_since_year INTEGER,
    camp_track VARCHAR(100) NOT NULL,
    participant_type VARCHAR(100) NOT NULL,
    
    -- Meals & Accommodation
    first_meal_date VARCHAR(50) NOT NULL,
    first_meal_type VARCHAR(20) NOT NULL,
    last_meal_date VARCHAR(50) NOT NULL,
    last_meal_type VARCHAR(20) NOT NULL,
    dinner_type VARCHAR(50) DEFAULT 'Dinner Meal',
    accommodation VARCHAR(10) DEFAULT 'No',
    
    -- Financials & Calculation breakdown
    meal_cost NUMERIC(10, 2) DEFAULT 0,
    acc_cost NUMERIC(10, 2) DEFAULT 0,
    ac_cost NUMERIC(10, 2) DEFAULT 0,
    late_fee NUMERIC(10, 2) DEFAULT 0,
    entry_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    coupon_code VARCHAR(100),
    
    -- Payment & Verification
    payment_method VARCHAR(50) NOT NULL, -- 'RAZORPAY', 'IDT', 'FREE', 'CASH'
    payment_status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
    payment_id VARCHAR(255), -- Razorpay payment ID
    order_id VARCHAR(255),   -- Razorpay order ID
    deduction_source VARCHAR(255), -- IDT VOICE Name / Dept
    passcode VARCHAR(100),         -- IDT Passcode used
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lightning fast lookups & filtering
CREATE INDEX IF NOT EXISTS idx_camps_slug ON camps(slug);
CREATE INDEX IF NOT EXISTS idx_camps_status ON camps(status);
CREATE INDEX IF NOT EXISTS idx_camp_reg_camp_id ON camp_registrations(camp_id);
CREATE INDEX IF NOT EXISTS idx_camp_reg_group_id ON camp_registrations(group_id);
CREATE INDEX IF NOT EXISTS idx_camp_reg_email ON camp_registrations(email);
CREATE INDEX IF NOT EXISTS idx_camp_reg_poc_contact ON camp_registrations(poc_contact);
CREATE INDEX IF NOT EXISTS idx_camp_reg_counselor ON camp_registrations(counselor_name);
CREATE INDEX IF NOT EXISTS idx_camp_reg_voice ON camp_registrations(voice_name);
