const pool = require("../config/db");

class PartyParticipant {
  static async add({ party_id, user_id }, dbClient = pool) {
    const result = await dbClient.query(
      `INSERT INTO party_participants (party_id, user_id)
       VALUES ($1, $2)
       RETURNING *`,
      [party_id, user_id],
    );
    return result.rows[0];
  }

  static async exists(partyId, userId, dbClient = pool) {
    const result = await dbClient.query(
      `SELECT id FROM party_participants WHERE party_id = $1 AND user_id = $2`,
      [partyId, userId],
    );
    return result.rows[0];
  }

  static async countByParty(partyId, dbClient = pool) {
    const result = await dbClient.query(
      `SELECT COUNT(*)::int AS count FROM party_participants WHERE party_id = $1`,
      [partyId],
    );
    return result.rows[0]?.count || 0;
  }

  static async findByUser(userId) {
    const result = await pool.query(
      `SELECT pp.*, p.title, p.game_name, p.game_date_time, p.location, p.capacity, p.status
       FROM party_participants pp
       JOIN parties p ON pp.party_id = p.id
       WHERE pp.user_id = $1
       ORDER BY p.game_date_time DESC`,
      [userId],
    );
    return result.rows;
  }
}

module.exports = PartyParticipant;
