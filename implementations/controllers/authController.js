const { supabase, supabaseAdmin } = require('../config/supabase');
const pool = require('../config/db');

exports.register = async (req, res) => {
  const { email, password, full_name, address } = req.body;

  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return res.status(400).json({ error: authError.message });
    }

    const { user } = authData;

    if (!user) {
         return res.status(400).json({ error: 'User creation failed. Check if email confirmation is required by Supabase.' });
    }

    // 2. Create user profile in our database
    const query = `
      INSERT INTO profiles (auth_id, full_name, address, role)
      VALUES ($1, $2, $3, 'CUSTOMER')
      RETURNING *;
    `;
    const values = [user.id, full_name, address];
    
    const { rows } = await pool.query(query, values);

    res.status(201).json({
      message: 'User registered successfully',
      user: rows[0],
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // 2. Check if user is disabled in our profiles table
    const query = 'SELECT is_disabled FROM profiles WHERE auth_id = $1';
    const { rows } = await pool.query(query, [data.user.id]);

    if (rows.length > 0 && rows[0].is_disabled) {
      // Optional: Sign out immediately if disabled
      await supabase.auth.signOut();
      return res.status(403).json({ error: 'Account is disabled. Please contact support.' });
    }

    res.status(200).json({
      message: 'Login successful',
      session: data.session,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    // req.user is populated by authMiddleware
    res.status(200).json({ profile: req.user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error fetching profile' });
  }
};

exports.disableUser = async (req, res) => {
  const { id } = req.params; // This will be the profile id or auth_id depending on how it's called
  
  try {
      // Assuming ID is the auth_id for simplicity, adjust query if it's the profile ID
      const query = 'UPDATE profiles SET is_disabled = TRUE WHERE auth_id = $1 RETURNING *';
      const { rows } = await pool.query(query, [id]);

      if (rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
      }

      // Optional: Use Supabase Admin to force logout / disable on Supabase side too
      // await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: '87600h' });

      res.status(200).json({
          message: 'User disabled successfully',
          profile: rows[0]
      });
  } catch(error) {
      console.error('Disable user error', error);
      res.status(500).json({ error: 'Internal server error disabling user' });
  }
};
