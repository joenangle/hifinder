-- Migration: Add sensitivity and power calculation fields
-- This script adds comprehensive amplification assessment capabilities

-- Create component_specifications table for detailed audio specs
CREATE TABLE IF NOT EXISTS component_specifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
    sensitivity_db_mw DECIMAL(5,1), -- Primary sensitivity measurement in dB/mW
    sensitivity_vrms DECIMAL(5,1),   -- Alternative measurement in dB/V (some manufacturers use this)
    measurement_condition VARCHAR(100), -- e.g., "1kHz", "500Hz-2kHz average"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one spec record per component
    UNIQUE(component_id)
);

-- Add calculated power requirements to components table (denormalized for performance)
ALTER TABLE components 
ADD COLUMN IF NOT EXISTS power_required_mw DECIMAL(6,1), -- milliwatts for 110 dB SPL
ADD COLUMN IF NOT EXISTS voltage_required_v DECIMAL(4,2), -- volts for 110 dB SPL  
ADD COLUMN IF NOT EXISTS amplification_difficulty VARCHAR(20) -- 'easy', 'moderate', 'demanding', 'very_demanding'
    CHECK (amplification_difficulty IN ('easy', 'moderate', 'demanding', 'very_demanding'));

-- Create index for filtering by amplification difficulty
CREATE INDEX IF NOT EXISTS idx_components_amp_difficulty ON components(amplification_difficulty);

-- Create index for component specifications
CREATE INDEX IF NOT EXISTS idx_component_specifications_component_id ON component_specifications(component_id);

-- Create function to automatically calculate power requirements
CREATE OR REPLACE FUNCTION calculate_power_requirements()
RETURNS TRIGGER AS $$
DECLARE
    sensitivity DECIMAL;
    target_spl CONSTANT INTEGER := 110;
    power_mw DECIMAL;
    voltage_v DECIMAL;
    difficulty VARCHAR(20);
BEGIN
    -- Get sensitivity from specifications if exists
    SELECT sensitivity_db_mw INTO sensitivity
    FROM component_specifications
    WHERE component_id = NEW.id;
    
    -- Only calculate if we have both impedance and sensitivity
    IF NEW.impedance IS NOT NULL AND sensitivity IS NOT NULL THEN
        -- Calculate power needed (in mW) using: Power = 10^((Target_SPL - Sensitivity_dB)/10)
        power_mw := POWER(10, (target_spl - sensitivity) / 10.0);
        
        -- Calculate voltage needed using: V = sqrt(P * R)
        voltage_v := SQRT((power_mw / 1000.0) * NEW.impedance);
        
        -- Determine difficulty based on both power and voltage requirements
        IF power_mw <= 10 AND voltage_v <= 1.0 THEN
            difficulty := 'easy';
        ELSIF power_mw <= 50 AND voltage_v <= 2.5 THEN
            difficulty := 'moderate';
        ELSIF power_mw <= 200 AND voltage_v <= 5.0 THEN
            difficulty := 'demanding';
        ELSE
            difficulty := 'very_demanding';
        END IF;
        
        -- Update the record
        NEW.power_required_mw := ROUND(power_mw::numeric, 1);
        NEW.voltage_required_v := ROUND(voltage_v::numeric, 2);
        NEW.amplification_difficulty := difficulty;
        NEW.needs_amp := (difficulty != 'easy');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for components table
DROP TRIGGER IF EXISTS update_power_requirements ON components;
CREATE TRIGGER update_power_requirements
    BEFORE INSERT OR UPDATE ON components
    FOR EACH ROW
    EXECUTE FUNCTION calculate_power_requirements();

-- Create function to update component when specifications change
CREATE OR REPLACE FUNCTION update_component_power_on_spec_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Touch the component record to trigger power requirement recalculation
    UPDATE components
    SET updated_at = NOW()
    WHERE id = NEW.component_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for when specifications are updated
DROP TRIGGER IF EXISTS update_component_on_specification_change ON component_specifications;
CREATE TRIGGER update_component_on_specification_change
    AFTER INSERT OR UPDATE ON component_specifications
    FOR EACH ROW
    EXECUTE FUNCTION update_component_power_on_spec_change();

-- Add helpful comments
COMMENT ON TABLE component_specifications IS 'Detailed audio specifications for components including sensitivity measurements';
COMMENT ON COLUMN component_specifications.sensitivity_db_mw IS 'Sensitivity in dB/mW (preferred measurement)';
COMMENT ON COLUMN component_specifications.sensitivity_vrms IS 'Sensitivity in dB/V (alternative measurement)';
COMMENT ON COLUMN component_specifications.measurement_condition IS 'Conditions under which sensitivity was measured';

COMMENT ON COLUMN components.power_required_mw IS 'Power required in milliwatts to reach 110 dB SPL';
COMMENT ON COLUMN components.voltage_required_v IS 'Voltage required to reach 110 dB SPL';
COMMENT ON COLUMN components.amplification_difficulty IS 'Amplification difficulty: easy, moderate, demanding, very_demanding';

-- Enable RLS for component_specifications if needed
ALTER TABLE component_specifications ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read specifications
CREATE POLICY "Allow authenticated read access" ON component_specifications
    FOR SELECT USING (auth.role() IS NOT NULL);

-- Policy to allow service role full access
CREATE POLICY "Service role full access" ON component_specifications
    FOR ALL USING (auth.role() = 'service_role');

-- Display completion message
SELECT 'Database schema updated successfully! Component specifications table created and power calculation triggers installed.' AS status;