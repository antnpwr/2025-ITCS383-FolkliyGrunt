const pool = require('../config/db');

class Profile {
  static async create({ auth_id, full_name, address, role = 'CUSTOMER' }) {
    const query = `
      INSERT INTO profiles (auth_id, full_name, address, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [auth_id, full_name, address, role]);
    return rows[0];
  }

  static async findByAuthId(authId) {
    const query = 'SELECT * FROM profiles WHERE auth_id = $1';
    const { rows } = await pool.query(query, [authId]);
    return rows[0];
  }

  static async updateDisabledStatus(authId, isDisabled) {
    const query = 'UPDATE profiles SET is_disabled = $2 WHERE auth_id = $1 RETURNING *';
    const { rows } = await pool.query(query, [authId, isDisabled]);
    return rows[0];
  }
}

module.exports = Profile;
