-- Profiles table (extends Supabase auth.users with app-specific data)
-- Supabase Auth handles: email, password, sessions, JWT tokens
-- This table stores EXTRA fields that Supabase doesn't manage
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL,  -- links to Supabase auth.users.id
  full_name VARCHAR(255) NOT NULL,
  address TEXT,
  role VARCHAR(20) DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN')),
  is_disabled BOOLEAN DEFAULT FALSE,
  is_member BOOLEAN DEFAULT FALSE,
  membership_started_at TIMESTAMP,
  membership_expires_at TIMESTAMP,
  membership_fee_last_paid DECIMAL(10, 2),
  membership_last_payment_method VARCHAR(20),
  membership_last_transaction_id VARCHAR(255),
  credit_card_token VARCHAR(255),
  language_preference VARCHAR(5) DEFAULT 'EN' CHECK (language_preference IN ('TH', 'EN', 'ZH')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_auth_id ON profiles(auth_id);
CREATE INDEX idx_profiles_member_active ON profiles(is_member, membership_expires_at);

-- Courts table (Person 2 will use this)
CREATE TABLE courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  price_per_hour DECIMAL(10, 2) NOT NULL,
  allowed_shoes VARCHAR(255),
  current_status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (current_status IN ('AVAILABLE', 'RENOVATE', 'DAMAGED')),
  opening_time TIME NOT NULL,
  closing_time TIME NOT NULL,
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Bookings table (Person 3 will use this)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- references Supabase auth.users.id
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  booking_status VARCHAR(20) DEFAULT 'CONFIRMED' CHECK (booking_status IN ('CONFIRMED', 'CANCELLED', 'WAITLIST')),
  payment_method VARCHAR(20) CHECK (payment_method IN ('CREDIT_CARD', 'BANK_TRANSFER', 'PROMPTPAY')),
  transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Equipment Rental table (Person 3 will use this)
CREATE TABLE equipment_rental (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  equipment_type VARCHAR(50) NOT NULL CHECK (equipment_type IN ('RACKET', 'SHUTTLECOCK')),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL
);

-- Waitlist table (Person 4 will use this)
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- references Supabase auth.users.id
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  preferred_time_slot VARCHAR(20),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'NOTIFIED', 'EXPIRED')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Reviews table (Person 5 will use this)
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- references Supabase auth.users.id
  court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment_text TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Community matchmaking tables
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL,  -- references Supabase auth.users.id
  title VARCHAR(255) NOT NULL,
  game_name VARCHAR(255) NOT NULL,
  game_date_time TIMESTAMP NOT NULL,
  location TEXT NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  description TEXT,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FULL', 'CANCELLED')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE party_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,  -- references Supabase auth.users.id
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (party_id, user_id)
);

-- Performance indexes for < 2s search
CREATE INDEX idx_courts_name ON courts(name);
CREATE INDEX idx_courts_location ON courts(location_lat, location_lng);
CREATE INDEX idx_courts_price ON courts(price_per_hour);
CREATE INDEX idx_courts_status ON courts(current_status);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_court_time ON bookings(court_id, start_time, end_time);
CREATE INDEX idx_reviews_court ON reviews(court_id);
CREATE INDEX idx_waitlist_court ON waitlist(court_id, status);

-- Idempotent compatibility updates for existing databases.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_member BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_started_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_fee_last_paid DECIMAL(10, 2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_last_payment_method VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_last_transaction_id VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);
CREATE INDEX idx_parties_status_datetime ON parties(status, game_date_time);
CREATE INDEX idx_parties_host ON parties(host_id, created_at);
CREATE INDEX idx_party_participants_party ON party_participants(party_id, joined_at);
CREATE INDEX idx_party_participants_user ON party_participants(user_id, joined_at);
