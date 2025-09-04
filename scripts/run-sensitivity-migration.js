// Execute sensitivity and power calculation database migration
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🔄 Running amplification assessment database migration...\n')

  const queries = [
    // Create component_specifications table
    {
      name: 'Create component_specifications table',
      query: `
        CREATE TABLE IF NOT EXISTS component_specifications (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
          sensitivity_db_mw DECIMAL(5,1), 
          sensitivity_vrms DECIMAL(5,1),   
          measurement_condition VARCHAR(100), 
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(component_id)
        );`
    },
    
    // Add new columns to components table
    {
      name: 'Add power calculation columns to components table',
      query: `
        ALTER TABLE components 
        ADD COLUMN IF NOT EXISTS power_required_mw DECIMAL(6,1),
        ADD COLUMN IF NOT EXISTS voltage_required_v DECIMAL(4,2),
        ADD COLUMN IF NOT EXISTS amplification_difficulty VARCHAR(20) 
          CHECK (amplification_difficulty IN ('easy', 'moderate', 'demanding', 'very_demanding'));`
    },

    // Create indexes
    {
      name: 'Create performance indexes',
      query: `
        CREATE INDEX IF NOT EXISTS idx_components_amp_difficulty ON components(amplification_difficulty);
        CREATE INDEX IF NOT EXISTS idx_component_specifications_component_id ON component_specifications(component_id);`
    },

    // Create power calculation function
    {
      name: 'Create power calculation function',
      query: `
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
        $$ LANGUAGE plpgsql;`
    },

    // Create trigger for components table  
    {
      name: 'Create component trigger',
      query: `
        DROP TRIGGER IF EXISTS update_power_requirements ON components;
        CREATE TRIGGER update_power_requirements
            BEFORE INSERT OR UPDATE ON components
            FOR EACH ROW
            EXECUTE FUNCTION calculate_power_requirements();`
    },

    // Create specification update function
    {
      name: 'Create specification update function',
      query: `
        CREATE OR REPLACE FUNCTION update_component_power_on_spec_change()
        RETURNS TRIGGER AS $$
        BEGIN
            -- Touch the component record to trigger power requirement recalculation
            UPDATE components
            SET updated_at = NOW()
            WHERE id = NEW.component_id;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;`
    },

    // Create trigger for specifications table
    {
      name: 'Create specification trigger',
      query: `
        DROP TRIGGER IF EXISTS update_component_on_specification_change ON component_specifications;
        CREATE TRIGGER update_component_on_specification_change
            AFTER INSERT OR UPDATE ON component_specifications
            FOR EACH ROW
            EXECUTE FUNCTION update_component_power_on_spec_change();`
    },

    // Enable RLS and create policies
    {
      name: 'Setup Row Level Security',
      query: `
        ALTER TABLE component_specifications ENABLE ROW LEVEL SECURITY;
        
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Allow authenticated read access" ON component_specifications;
        DROP POLICY IF EXISTS "Service role full access" ON component_specifications;
        
        -- Create new policies
        CREATE POLICY "Allow authenticated read access" ON component_specifications
            FOR SELECT USING (auth.role() IS NOT NULL);
        
        CREATE POLICY "Service role full access" ON component_specifications
            FOR ALL USING (auth.role() = 'service_role');`
    },

    // Add comments for documentation
    {
      name: 'Add documentation comments',
      query: `
        COMMENT ON TABLE component_specifications IS 'Detailed audio specifications for components including sensitivity measurements';
        COMMENT ON COLUMN component_specifications.sensitivity_db_mw IS 'Sensitivity in dB/mW (preferred measurement)';
        COMMENT ON COLUMN component_specifications.sensitivity_vrms IS 'Sensitivity in dB/V (alternative measurement)';
        COMMENT ON COLUMN component_specifications.measurement_condition IS 'Conditions under which sensitivity was measured';
        
        COMMENT ON COLUMN components.power_required_mw IS 'Power required in milliwatts to reach 110 dB SPL';
        COMMENT ON COLUMN components.voltage_required_v IS 'Voltage required to reach 110 dB SPL';
        COMMENT ON COLUMN components.amplification_difficulty IS 'Amplification difficulty: easy, moderate, demanding, very_demanding';`
    }
  ]

  // Execute each query
  for (const { name, query } of queries) {
    console.log(`📋 ${name}...`)
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: query.trim() })
      
      if (error) {
        console.error(`❌ Error in ${name}:`, error)
        // Don't exit - some errors might be expected (like "already exists")
      } else {
        console.log(`✅ ${name} completed`)
      }
    } catch (err) {
      console.error(`❌ Exception in ${name}:`, err)
    }
  }

  // Test the setup by checking if tables exist
  console.log('\n🔍 Verifying migration...')
  
  try {
    const { data: specs, error: specsError } = await supabase
      .from('component_specifications')
      .select('id')
      .limit(1)
    
    if (specsError) {
      console.error('❌ component_specifications table not accessible:', specsError.message)
    } else {
      console.log('✅ component_specifications table created successfully')
    }

    // Check if new columns were added
    const { data: components, error: componentsError } = await supabase
      .from('components')
      .select('id, power_required_mw, voltage_required_v, amplification_difficulty')
      .limit(1)

    if (componentsError) {
      console.error('❌ New columns not accessible:', componentsError.message)
    } else {
      console.log('✅ New columns added to components table successfully')
    }

  } catch (err) {
    console.error('❌ Verification failed:', err)
  }

  console.log('\n🎯 Migration completed! Ready for sensitivity data population.')
}

if (require.main === module) {
  runMigration()
}

module.exports = { runMigration }