const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Cliente do Supabase (service_role, ignora o RLS)
const supabase = createClient(env.SUPABASE_URL || '', env.SUPABASE_KEY || '', {
  auth: { persistSession: false },
});

module.exports = supabase;
