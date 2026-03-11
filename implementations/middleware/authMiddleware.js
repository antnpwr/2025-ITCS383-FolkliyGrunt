const { supabase } = require('../config/supabase');
const pool = require('../config/db');

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: 'Invalid token' });

    // Get user profile from our profiles table
    const profile = await pool.query('SELECT * FROM profiles WHERE auth_id = $1', [user.id]);
    
    req.user = {
      id: user.id,
      email: user.email,
      role: profile.rows[0]?.role || 'CUSTOMER',
      profile: profile.rows[0] || null
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authMiddleware, adminOnly };
