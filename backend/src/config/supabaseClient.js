const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

/**
 * Cliente Supabase compartilhado pela aplicação.
 * Usa a service_role key: o backend é o único que fala com o banco,
 * então ele ignora o RLS habilitado nas tabelas de propósito.
 */
const supabase = createClient(env.SUPABASE_URL || '', env.SUPABASE_KEY || '', {
  auth: { persistSession: false },
});

module.exports = supabase;
