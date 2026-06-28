CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN ('DENSITY', 'LOST_CHILD', 'MEDICAL_EMERGENCY', 'SECURITY_THREAT', 'INFRASTRUCTURE')),
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
  message TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'ESCALATED', 'RESOLVED')),
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP,
  resolved_by UUID,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_alerts_zone ON alerts(zone_id);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_alerts_status ON alerts(status);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_alerts_severity ON alerts(severity);
COMMIT;

CREATE TABLE IF NOT EXISTS pilgrims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  age INT,
  zone_id UUID,
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOST', 'FOUND', 'DEPARTED')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_pilgrims_zone ON pilgrims(zone_id);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_pilgrims_status ON pilgrims(status);
COMMIT;

CREATE TABLE IF NOT EXISTS lost_found_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_type VARCHAR(20) NOT NULL CHECK (case_type IN ('LOST', 'FOUND')),
  description TEXT NOT NULL,
  pilgrim_id UUID,
  zone_id UUID,
  handler_id UUID,
  status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED', 'CLOSED')),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_lost_found_zone ON lost_found_cases(zone_id);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_lost_found_status ON lost_found_cases(status);
COMMIT;

CREATE TABLE IF NOT EXISTS ambulances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  driver_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'DISPATCHED', 'ON_DUTY', 'MAINTENANCE')),
  current_location VARCHAR(255),
  zone_id UUID,
  vehicle_number VARCHAR(50),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_ambulances_zone ON ambulances(zone_id);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_ambulances_status ON ambulances(status);
COMMIT;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details TEXT,
  created_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
COMMIT;
