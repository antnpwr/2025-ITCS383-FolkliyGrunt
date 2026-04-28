const pool = require("../config/db");
const PartyParticipant = require("./PartyParticipant");

class Party {
  static async create({
    host_id,
    title,
    game_name,
    game_date_time,
    location,
    capacity,
    description = null,
  }) {
    const result = await pool.query(
      `INSERT INTO parties (host_id, title, game_name, game_date_time, location, capacity, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        host_id,
        title,
        game_name,
        game_date_time,
        location,
        capacity,
        description,
      ],
    );
    return result.rows[0];
  }

  static async findById(partyId) {
    const result = await pool.query(
      `SELECT p.*, host.full_name AS host_name,
        COALESCE(participant_counts.count, 0)::int AS participant_count
       FROM parties p
       LEFT JOIN profiles host ON p.host_id = host.auth_id
       LEFT JOIN (
         SELECT party_id, COUNT(*)::int AS count
         FROM party_participants
         GROUP BY party_id
       ) participant_counts ON participant_counts.party_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, host.full_name, participant_counts.count`,
      [partyId],
    );
    return result.rows[0];
  }

  static async listFeed() {
    const result = await pool.query(
      `SELECT p.*, host.full_name AS host_name,
        COALESCE(participant_counts.count, 0)::int AS participant_count
       FROM parties p
       LEFT JOIN profiles host ON p.host_id = host.auth_id
       LEFT JOIN (
         SELECT party_id, COUNT(*)::int AS count
         FROM party_participants
         GROUP BY party_id
       ) participant_counts ON participant_counts.party_id = p.id
       ORDER BY CASE WHEN p.status = 'OPEN' THEN 0 ELSE 1 END,
                p.game_date_time ASC,
                p.created_at DESC`,
    );
    return result.rows;
  }

  static async join(partyId, userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const partyResult = await client.query(
        `SELECT * FROM parties WHERE id = $1 FOR UPDATE`,
        [partyId],
      );
      const party = partyResult.rows[0];

      if (!party) {
        throw new Error("Party not found");
      }

      if (party.status !== "OPEN") {
        throw new Error("Party is not open for joins");
      }

      const existing = await PartyParticipant.exists(partyId, userId, client);
      if (existing) {
        throw new Error("User already joined this party");
      }

      const currentCount = await PartyParticipant.countByParty(partyId, client);
      if (currentCount >= party.capacity) {
        await client.query(`UPDATE parties SET status = 'FULL' WHERE id = $1`, [
          partyId,
        ]);
        throw new Error("Party is full");
      }

      const participant = await PartyParticipant.add(
        { party_id: partyId, user_id: userId },
        client,
      );

      const nextCount = currentCount + 1;
      const updatedParty =
        nextCount >= party.capacity
          ? (
              await client.query(
                `UPDATE parties SET status = 'FULL' WHERE id = $1 RETURNING *`,
                [partyId],
              )
            ).rows[0]
          : party;

      await client.query("COMMIT");
      return {
        party: updatedParty,
        participant,
        participant_count: nextCount,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = Party;
