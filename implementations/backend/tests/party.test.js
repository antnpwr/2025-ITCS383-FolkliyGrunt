jest.mock("../config/db", () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

const pool = require("../config/db");
const Party = require("../models/Party");

function createClient() {
  return {
    query: jest.fn(),
    release: jest.fn(),
  };
}

describe("Party model", () => {
  afterEach(() => jest.clearAllMocks());

  test("create inserts a party", async () => {
    const row = { id: "party-1", title: "Friday Night" };
    pool.query.mockResolvedValue({ rows: [row] });

    const result = await Party.create({
      host_id: "user-1",
      title: "Friday Night",
      game_name: "Badminton Doubles",
      game_date_time: "2026-04-28T18:00:00.000Z",
      location: "Main Hall",
      capacity: 4,
      description: "Bring racket",
    });

    expect(result).toEqual(row);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO parties"),
      expect.arrayContaining(["user-1", "Friday Night"]),
    );
  });

  test("listFeed returns feed rows", async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: "party-1", participant_count: 2 }],
    });

    const result = await Party.listFeed();

    expect(result).toHaveLength(1);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY CASE"),
    );
  });

  test("findById returns a single party", async () => {
    pool.query.mockResolvedValue({
      rows: [{ id: "party-1", participant_count: 2 }],
    });

    const result = await Party.findById("party-1");

    expect(result.id).toBe("party-1");
    expect(result.participant_count).toBe(2);
  });

  test("join adds participant and marks party full when needed", async () => {
    const client = createClient();
    client.query.mockImplementation(async (sql) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK")
        return { rows: [] };
      if (sql.includes("SELECT * FROM parties"))
        return { rows: [{ id: "party-1", capacity: 2, status: "OPEN" }] };
      if (sql.includes("SELECT id FROM party_participants"))
        return { rows: [] };
      if (sql.includes("COUNT(*)::int AS count"))
        return { rows: [{ count: 1 }] };
      if (sql.includes("INSERT INTO party_participants"))
        return {
          rows: [{ id: "pp-1", party_id: "party-1", user_id: "user-1" }],
        };
      if (sql.includes("UPDATE parties SET status = 'FULL'"))
        return { rows: [{ id: "party-1", capacity: 2, status: "FULL" }] };
      return { rows: [] };
    });
    pool.connect.mockResolvedValue(client);

    const result = await Party.join("party-1", "user-1");

    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(result.party.status).toBe("FULL");
    expect(result.participant_count).toBe(2);
    expect(client.release).toHaveBeenCalled();
  });

  test("join rejects duplicate membership", async () => {
    const client = createClient();
    client.query.mockImplementation(async (sql) => {
      if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK")
        return { rows: [] };
      if (sql.includes("SELECT * FROM parties"))
        return { rows: [{ id: "party-1", capacity: 2, status: "OPEN" }] };
      if (sql.includes("SELECT id FROM party_participants"))
        return { rows: [{ id: "existing" }] };
      return { rows: [] };
    });
    pool.connect.mockResolvedValue(client);

    await expect(Party.join("party-1", "user-1")).rejects.toThrow(
      "User already joined this party",
    );
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
  });
});
