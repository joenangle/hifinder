-- Create table for tracking missing headphone requests from users
CREATE TABLE IF NOT EXISTS missing_headphone_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(200) NOT NULL,
    requested_by_email VARCHAR(255) NOT NULL,
    additional_info TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
    admin_notes TEXT,
    component_id UUID REFERENCES components(id), -- Set when headphone is added
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_missing_requests_status ON missing_headphone_requests(status);
CREATE INDEX IF NOT EXISTS idx_missing_requests_created ON missing_headphone_requests(created_at DESC);

-- Create unique constraint to prevent duplicate requests
CREATE UNIQUE INDEX IF NOT EXISTS idx_missing_requests_unique 
ON missing_headphone_requests(LOWER(brand), LOWER(model), requested_by_email) 
WHERE status != 'rejected';

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE missing_headphone_requests ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to insert their own requests
CREATE POLICY "Users can insert missing headphone requests" ON missing_headphone_requests
    FOR INSERT WITH CHECK (true);

-- Policy to allow users to view their own requests
CREATE POLICY "Users can view their own requests" ON missing_headphone_requests
    FOR SELECT USING (requested_by_email = auth.email());

-- Admin policy (service role can do everything)
CREATE POLICY "Service role can manage all requests" ON missing_headphone_requests
    FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE missing_headphone_requests IS 'Stores user requests for headphones not currently in the database';
COMMENT ON COLUMN missing_headphone_requests.brand IS 'Headphone brand name as entered by user';  
COMMENT ON COLUMN missing_headphone_requests.model IS 'Headphone model name as entered by user';
COMMENT ON COLUMN missing_headphone_requests.status IS 'Request processing status: pending, in_progress, completed, rejected';
COMMENT ON COLUMN missing_headphone_requests.component_id IS 'Links to components table when headphone is added';