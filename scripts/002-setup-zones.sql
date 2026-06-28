CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  zone_commander_id UUID,
  current_density DECIMAL(10, 2) DEFAULT 0,
  max_capacity_per_sqm DECIMAL(10, 2) DEFAULT 7.0,
  density_status VARCHAR(20) DEFAULT 'GREEN' CHECK (density_status IN ('GREEN', 'YELLOW', 'ORANGE', 'RED', 'BLACK')),
  coordinates_x DECIMAL(10, 6),
  coordinates_y DECIMAL(10, 6),
  area_sqm DECIMAL(15, 2),
  total_pilgrims INT DEFAULT 0,
  is_locked BOOLEAN DEFAULT false,
  locked_reason TEXT,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_zones_name ON zones(name);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_zones_status ON zones(density_status);
COMMIT;

CREATE INDEX ASYNC IF NOT EXISTS idx_zones_commander ON zones(zone_commander_id);
COMMIT;
