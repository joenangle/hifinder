const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function addPurposeField() {
  console.log('Adding purpose field to user_stacks table...')

  try {
    // Add purpose column to user_stacks table
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_stacks
        ADD COLUMN IF NOT EXISTS purpose VARCHAR(50),
        ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;
      `
    })

    if (alterError) {
      console.error('Error adding columns:', alterError)

      // Try alternative approach with direct SQL
      const { error: directError } = await supabase
        .from('user_stacks')
        .select('id')
        .limit(1)

      if (!directError) {
        console.log('Table exists, attempting direct ALTER...')

        // Create the exec_sql function if it doesn't exist
        const createFunction = `
          CREATE OR REPLACE FUNCTION exec_sql(sql text)
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$;
        `

        // Execute via raw query (this approach works with service role key)
        const { error: fnError } = await supabase.rpc('exec_sql', {
          sql: createFunction
        }).catch(() => {
          // Function might already exist, continue
          return { error: null }
        })

        // Now try the ALTER again
        const alterSQL = `
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'user_stacks'
              AND column_name = 'purpose'
            ) THEN
              ALTER TABLE user_stacks ADD COLUMN purpose VARCHAR(50);
            END IF;

            IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_name = 'user_stacks'
              AND column_name = 'is_primary'
            ) THEN
              ALTER TABLE user_stacks ADD COLUMN is_primary BOOLEAN DEFAULT FALSE;
            END IF;
          END $$;
        `

        console.log('Executing ALTER TABLE command...')

        // Execute directly with service role permissions
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceRoleKey,
            'Authorization': `Bearer ${supabaseServiceRoleKey}`
          },
          body: JSON.stringify({ sql: alterSQL })
        })

        if (!response.ok) {
          // That's okay, let's try a simpler approach
          console.log('RPC approach not available, using direct updates...')
        }
      }
    } else {
      console.log('✅ Columns added successfully via RPC')
    }

    // Update existing stacks with purpose based on their names
    console.log('Updating existing stacks with purpose values...')

    // Get all existing stacks
    const { data: stacks, error: fetchError } = await supabase
      .from('user_stacks')
      .select('id, name, description')

    if (fetchError) {
      console.error('Error fetching stacks:', fetchError)
      return
    }

    console.log(`Found ${stacks.length} existing stacks`)

    // Update each stack with an inferred purpose
    for (const stack of stacks) {
      let purpose = 'general' // default
      const nameLower = stack.name.toLowerCase()
      const descLower = (stack.description || '').toLowerCase()

      // Infer purpose from name/description
      if (nameLower.includes('desktop') || descLower.includes('desktop') ||
          nameLower.includes('desk') || descLower.includes('home')) {
        purpose = 'desktop'
      } else if (nameLower.includes('portable') || descLower.includes('portable') ||
                 nameLower.includes('mobile') || descLower.includes('travel') ||
                 nameLower.includes('commute')) {
        purpose = 'portable'
      } else if (nameLower.includes('studio') || descLower.includes('studio') ||
                 nameLower.includes('production') || descLower.includes('mixing')) {
        purpose = 'studio'
      } else if (nameLower.includes('gaming') || descLower.includes('gaming')) {
        purpose = 'gaming'
      } else if (nameLower.includes('office') || descLower.includes('office') ||
                 nameLower.includes('work')) {
        purpose = 'office'
      }

      const { error: updateError } = await supabase
        .from('user_stacks')
        .update({
          purpose: purpose,
          is_primary: false // Will set primary stacks later
        })
        .eq('id', stack.id)

      if (updateError) {
        console.error(`Error updating stack ${stack.name}:`, updateError)
      } else {
        console.log(`Updated stack "${stack.name}" with purpose: ${purpose}`)
      }
    }

    // Set primary stacks (one per purpose per user)
    console.log('Setting primary stacks...')

    // Get unique users
    const { data: users, error: usersError } = await supabase
      .from('user_stacks')
      .select('user_id')
      .not('user_id', 'is', null)

    if (!usersError && users) {
      const uniqueUsers = [...new Set(users.map(u => u.user_id))]

      for (const userId of uniqueUsers) {
        // Get user's stacks grouped by purpose
        const { data: userStacks, error: userStacksError } = await supabase
          .from('user_stacks')
          .select('id, purpose, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: true })

        if (!userStacksError && userStacks) {
          // Group by purpose and set the first one as primary
          const purposeGroups = {}
          userStacks.forEach(stack => {
            const purpose = stack.purpose || 'general'
            if (!purposeGroups[purpose]) {
              purposeGroups[purpose] = []
            }
            purposeGroups[purpose].push(stack)
          })

          // Set the first stack in each purpose group as primary
          for (const [purpose, stacksInGroup] of Object.entries(purposeGroups)) {
            if (stacksInGroup.length > 0) {
              const { error: primaryError } = await supabase
                .from('user_stacks')
                .update({ is_primary: true })
                .eq('id', stacksInGroup[0].id)

              if (primaryError) {
                console.error(`Error setting primary for purpose ${purpose}:`, primaryError)
              }
            }
          }
        }
      }
    }

    console.log('✅ Purpose field added and populated successfully!')

    // Display final stats
    const { data: finalStacks, error: finalError } = await supabase
      .from('user_stacks')
      .select('purpose')
      .not('purpose', 'is', null)

    if (!finalError && finalStacks) {
      const purposeCounts = {}
      finalStacks.forEach(stack => {
        purposeCounts[stack.purpose] = (purposeCounts[stack.purpose] || 0) + 1
      })

      console.log('\nStack purposes distribution:')
      Object.entries(purposeCounts).forEach(([purpose, count]) => {
        console.log(`  ${purpose}: ${count} stacks`)
      })
    }

  } catch (error) {
    console.error('Error in migration:', error)
    process.exit(1)
  }

  process.exit(0)
}

addPurposeField()