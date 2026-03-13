import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://mkgosgskgmkpflgzeoxl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rZ29zZ3NrZ21rcGZsZ3plb3hsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY1NTMwMiwiZXhwIjoyMDg2MjMxMzAyfQ.esEQr16BweCjVSLoeXQjcP5odZS8aFQsoXlqE5wTO3k'
)

// Try inserting a dummy record with deleted_at to see if column exists
const { error } = await supabase
  .from('medical_records')
  .select('deleted_at')
  .limit(1)

if (error && error.message.includes('deleted_at')) {
  console.log('Column does not exist yet - need to add via Supabase Dashboard')
  console.log('Run this SQL in Supabase SQL Editor:')
  console.log('ALTER TABLE medical_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;')
} else {
  console.log('Column exists or query succeeded:', error?.message ?? 'OK')
}
