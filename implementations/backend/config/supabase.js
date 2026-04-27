const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Public client (for login/signup — uses anon key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Admin client (for admin operations like disabling users — uses service_role key)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = { supabase, supabaseAdmin };
