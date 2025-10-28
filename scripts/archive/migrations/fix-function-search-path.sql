-- Fix Function Search Path Mutable warnings
-- Copy and paste this into Supabase Dashboard > SQL Editor

-- ============================================
-- Fix: Function Search Path Mutable Warnings
-- ============================================

-- Fix calculate_power_requirements function
ALTER FUNCTION public.calculate_power_requirements 
SET search_path = public, pg_temp;

-- Fix update_user_gear_updated_at function  
ALTER FUNCTION public.update_user_gear_updated_at 
SET search_path = public, pg_temp;

-- Fix update_component_power_on_spec_change function
ALTER FUNCTION public.update_component_power_on_spec_change 
SET search_path = public, pg_temp;

-- Fix update_updated_at_column function
ALTER FUNCTION public.update_updated_at_column 
SET search_path = public, pg_temp;

-- ============================================
-- Verification Query (optional)
-- ============================================

-- Check if search_path is properly set for these functions
SELECT 
  proname as function_name,
  prosrc as function_body,
  proconfig as function_config
FROM pg_proc 
WHERE proname IN (
  'calculate_power_requirements',
  'update_user_gear_updated_at', 
  'update_component_power_on_spec_change',
  'update_updated_at_column'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');