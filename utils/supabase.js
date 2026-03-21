const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials missing in .env. API features will be limited.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

module.exports = supabase;
