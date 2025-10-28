// Admin interface for managing missing headphone requests
const { createClient } = require('@supabase/supabase-js')
const { MissingHeadphoneHandler } = require('./missing-headphones-automation.js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

class MissingHeadphoneAdmin {
  constructor() {
    this.handler = new MissingHeadphoneHandler()
  }

  // List all pending requests
  async listPendingRequests() {
    const { data, error } = await supabase
      .from('missing_headphone_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching requests:', error)
      return []
    }

    return data
  }

  // List all requests with stats
  async getRequestStats() {
    const { data, error } = await supabase
      .from('missing_headphone_requests')
      .select('status')

    if (error) {
      console.error('Error fetching stats:', error)
      return {}
    }

    const stats = data.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1
      return acc
    }, {})

    return {
      total: data.length,
      ...stats
    }
  }

  // Update request status
  async updateRequestStatus(id, status, adminNotes = null) {
    const updateData = { 
      status, 
      updated_at: new Date().toISOString() 
    }
    
    if (adminNotes) {
      updateData.admin_notes = adminNotes
    }

    const { error } = await supabase
      .from('missing_headphone_requests')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating request:', error)
      return false
    }

    return true
  }

  // Process a request (create addition script)
  async processRequest(requestId) {
    const { data, error } = await supabase
      .from('missing_headphone_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (error || !data) {
      console.error('Request not found:', error)
      return null
    }

    console.log(`\n🔍 Processing request: ${data.brand} ${data.model}`)
    console.log(`   Requested by: ${data.requested_by_email}`)
    console.log(`   Created: ${new Date(data.created_at).toLocaleDateString()}`)
    
    if (data.additional_info) {
      console.log(`   Additional info: ${data.additional_info}`)
    }

    // Update status to in_progress
    await this.updateRequestStatus(requestId, 'in_progress', 'Processing request - generating addition script')

    // Use automation handler to create script
    const result = await this.handler.handleMissingHeadphone(
      data.brand, 
      data.model, 
      'cans', // Default to headphones, can be adjusted
      false   // No auto-research yet
    )

    if (result.status === 'exists') {
      // Headphone already exists, mark as completed
      await this.updateRequestStatus(
        requestId, 
        'completed', 
        `Headphone already exists in database: ${result.data.brand} ${result.data.name}`
      )
      console.log('✅ Headphone already exists in database')
    } else {
      // Script generated, ready for manual completion
      console.log(`📝 Addition script generated: ${result.scriptPath}`)
      await this.updateRequestStatus(
        requestId,
        'in_progress', 
        `Addition script generated: ${result.scriptPath}`
      )
    }

    return result
  }

  // Mark request as completed when headphone is added
  async markCompleted(requestId, componentId) {
    await this.updateRequestStatus(
      requestId,
      'completed',
      'Headphone successfully added to database'
    )

    // Link to the component
    const { error } = await supabase
      .from('missing_headphone_requests')
      .update({ component_id: componentId })
      .eq('id', requestId)

    if (error) {
      console.error('Error linking component:', error)
    }
  }

  // Display dashboard
  async displayDashboard() {
    console.log('🎧 Missing Headphone Requests Dashboard')
    console.log('=====================================')

    const stats = await this.getRequestStats()
    console.log(`📊 Total requests: ${stats.total}`)
    console.log(`   Pending: ${stats.pending || 0}`)
    console.log(`   In Progress: ${stats.in_progress || 0}`)
    console.log(`   Completed: ${stats.completed || 0}`)
    console.log(`   Rejected: ${stats.rejected || 0}`)

    const pending = await this.listPendingRequests()
    
    if (pending.length === 0) {
      console.log('\n✅ No pending requests')
      return
    }

    console.log(`\n📋 Pending Requests (${pending.length}):`)
    pending.forEach((req, index) => {
      console.log(`\n${index + 1}. ${req.brand} ${req.model}`)
      console.log(`   ID: ${req.id}`)
      console.log(`   Email: ${req.requested_by_email}`)
      console.log(`   Date: ${new Date(req.created_at).toLocaleDateString()}`)
      if (req.additional_info) {
        console.log(`   Info: ${req.additional_info}`)
      }
    })
  }
}

// CLI interface
async function main() {
  const admin = new MissingHeadphoneAdmin()
  const command = process.argv[2]
  const arg = process.argv[3]

  switch (command) {
    case 'dashboard':
    case 'list':
      await admin.displayDashboard()
      break

    case 'process':
      if (!arg) {
        console.log('Usage: node admin-missing-headphones.js process <request-id>')
        process.exit(1)
      }
      await admin.processRequest(arg)
      break

    case 'complete':
      if (!arg) {
        console.log('Usage: node admin-missing-headphones.js complete <request-id> [component-id]')
        process.exit(1)
      }
      const componentId = process.argv[4]
      await admin.markCompleted(arg, componentId)
      console.log('✅ Request marked as completed')
      break

    case 'reject':
      if (!arg) {
        console.log('Usage: node admin-missing-headphones.js reject <request-id> [reason]')
        process.exit(1)
      }
      const reason = process.argv.slice(4).join(' ') || 'Request rejected'
      await admin.updateRequestStatus(arg, 'rejected', reason)
      console.log('❌ Request rejected')
      break

    default:
      console.log('Missing Headphone Request Admin Tool')
      console.log('===================================')
      console.log('Commands:')
      console.log('  dashboard     - Show pending requests dashboard')
      console.log('  process <id>  - Process a pending request')
      console.log('  complete <id> - Mark request as completed')
      console.log('  reject <id>   - Reject a request')
      console.log('')
      console.log('Examples:')
      console.log('  node admin-missing-headphones.js dashboard')
      console.log('  node admin-missing-headphones.js process 123e4567-e89b-12d3-a456-426614174000')
  }
}

if (require.main === module) {
  main()
}

module.exports = { MissingHeadphoneAdmin }