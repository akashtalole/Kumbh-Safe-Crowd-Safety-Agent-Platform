-- Seed demo users (password hashes match the demo accounts from mock-data)
-- All use same hash: "verystrongpassword" for simplicity
INSERT INTO users (email, password_hash, name, role, is_active) VALUES
  ('rajesh.patil@kumbhsafe.in', 'verystrongpassword', 'Rajesh Patil', 'super_admin', true),
  ('operator.iccc@kumbhsafe.in', 'verystrongpassword', 'Amit Sharma', 'iccc_operator', true),
  ('nashik.commander@kumbhsafe.in', 'verystrongpassword', 'Vikram Shinde', 'zone_commander', true),
  ('medical.officer@kumbhsafe.in', 'verystrongpassword', 'Dr. Priya Nair', 'medical_officer', true),
  ('field.officer@kumbhsafe.in', 'verystrongpassword', 'Suresh Kumar', 'field_officer', true)
ON CONFLICT (email) DO NOTHING;
COMMIT;

-- Seed demo zones
INSERT INTO zones (name, current_density, max_capacity_per_sqm, density_status, area_sqm, total_pilgrims, coordinates_x, coordinates_y) VALUES
  ('Kushavart Kund Core', 7.9, 7.0, 'BLACK', 5000, 39500, 19.4150, 73.8500),
  ('Ramkund East', 5.2, 7.0, 'RED', 8000, 41600, 19.4155, 73.8520),
  ('Trimbak Temple Approach', 3.8, 7.0, 'ORANGE', 6500, 24700, 19.4180, 73.8480)
ON CONFLICT DO NOTHING;
COMMIT;

-- Seed demo alerts
INSERT INTO alerts (zone_id, alert_type, severity, message, status) 
SELECT z.id, 'DENSITY', 'CRITICAL', 'CRITICAL: Kushavart Kund Core density 7.9 p/m² — EVACUATE ZONE', 'OPEN'
FROM zones z WHERE z.name = 'Kushavart Kund Core'
UNION ALL
SELECT z.id, 'MEDICAL_EMERGENCY', 'CRITICAL', 'Multiple heat exhaustion cases reported', 'OPEN'
FROM zones z WHERE z.name = 'Ramkund East'
UNION ALL
SELECT z.id, 'LOST_CHILD', 'WARNING', 'Child reported missing, age 7', 'OPEN'
FROM zones z WHERE z.name = 'Trimbak Temple Approach'
ON CONFLICT DO NOTHING;
COMMIT;

-- Seed demo pilgrims
INSERT INTO pilgrims (name, phone, age, registration_id, status) VALUES
  ('Ramesh Sharma', '9876543210', 62, 'KUMBH2027001', 'ACTIVE'),
  ('Priya Desai', '9876543211', 45, 'KUMBH2027002', 'ACTIVE'),
  ('Vikram Singh', '9876543212', 38, 'KUMBH2027003', 'ACTIVE'),
  ('Anjali Gupta', '9876543213', 51, 'KUMBH2027004', 'ACTIVE'),
  ('Suresh Patel', '9876543214', 40, 'KUMBH2027005', 'ACTIVE')
ON CONFLICT (registration_id) DO NOTHING;
COMMIT;

-- Seed demo ambulances
INSERT INTO ambulances (name, driver_name, status, vehicle_number) VALUES
  ('Ambulance-1', 'Rajesh Rane', 'AVAILABLE', 'MH-01-AB-1001'),
  ('Ambulance-2', 'Mukesh Desai', 'AVAILABLE', 'MH-01-AB-1002'),
  ('Ambulance-3', 'Arjun Nair', 'DISPATCHED', 'MH-01-AB-1003'),
  ('Ambulance-4', 'Deepak Kumar', 'AVAILABLE', 'MH-01-AB-1004'),
  ('Ambulance-5', 'Sanjay Patel', 'ON_DUTY', 'MH-01-AB-1005')
ON CONFLICT DO NOTHING;
COMMIT;
