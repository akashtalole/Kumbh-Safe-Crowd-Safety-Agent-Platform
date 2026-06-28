CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'iccc_operator', 'zone_commander', 'medical_officer', 'field_officer')),
  zone_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_users_email ON users(email);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_users_role ON users(role);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_users_zone_id ON users(zone_id);
COMMIT;
