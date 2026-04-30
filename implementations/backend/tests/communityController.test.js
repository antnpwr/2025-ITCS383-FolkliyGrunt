jest.mock("../models/Party");
jest.mock("../models/PartyParticipant");

const Party = require("../models/Party");
const PartyParticipant = require("../models/PartyParticipant");
const communityController = require("../controllers/communityController");

function mockReqRes(overrides = {}) {
  const req = {
    user: { id: "user-1", email: "user@example.com" },
    params: {},
    body: {},
    query: {},
    ...overrides,
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return { req, res };
}

describe("communityController", () => {
  afterEach(() => jest.clearAllMocks());

  test("listFeed returns party feed", async () => {
    const parties = [{ id: "party-1" }];
    Party.listFeed.mockResolvedValue(parties);

    const { req, res } = mockReqRes();
    await communityController.listFeed(req, res);

    expect(res.json).toHaveBeenCalledWith(parties);
  });

  test("createParty validates required fields", async () => {
    const { req, res } = mockReqRes({
      body: { title: "Friday Night", game_name: "Badminton" },
    });

    await communityController.createParty(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error:
        "Missing required fields: title, game_name, game_date_time, location, capacity",
    });
  });

  test("createParty publishes a party", async () => {
    const party = { id: "party-1", status: "OPEN" };
    Party.create.mockResolvedValue(party);

    const { req, res } = mockReqRes({
      body: {
        title: "Friday Night",
        game_name: "Badminton Doubles",
        game_date_time: "2026-04-28T18:00",
        location: "Main Hall",
        capacity: "4",
        description: "Bring your own racket",
      },
    });

    await communityController.createParty(req, res);

    expect(Party.create).toHaveBeenCalledWith(
      expect.objectContaining({
        host_id: "user-1",
        title: "Friday Night",
        game_name: "Badminton Doubles",
        location: "Main Hall",
        capacity: 4,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: "Party published successfully",
      party,
    });
  });

  test("createParty rejects invalid game_date_time", async () => {
    const { req, res } = mockReqRes({
      body: {
        title: "Friday Night",
        game_name: "Badminton Doubles",
        game_date_time: "invalid-date",
        location: "Main Hall",
        capacity: "4",
      },
    });

    await communityController.createParty(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "game_date_time must be a valid date/time",
    });
  });

  test("getById returns 404 when party is not found", async () => {
    Party.findById.mockResolvedValue(null);

    const { req, res } = mockReqRes({ params: { id: "missing" } });
    await communityController.getById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Party not found" });
  });

  test("getById returns party details when found", async () => {
    const party = { id: "party-1", title: "Friday Night" };
    Party.findById.mockResolvedValue(party);

    const { req, res } = mockReqRes({ params: { id: "party-1" } });
    await communityController.getById(req, res);

    expect(res.json).toHaveBeenCalledWith(party);
  });

  test("joinParty returns 400 when party is closed", async () => {
    Party.join.mockRejectedValue(new Error("Party is not open for joins"));

    const { req, res } = mockReqRes({ params: { id: "party-1" } });
    await communityController.joinParty(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Party is not open for joins" });
  });

  test("joinParty returns 409 when already joined", async () => {
    Party.join.mockRejectedValue(new Error("User already joined this party"));

    const { req, res } = mockReqRes({ params: { id: "party-1" } });
    await communityController.joinParty(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "User already joined this party",
    });
  });

  test("joinParty returns 404 when party is missing", async () => {
    Party.join.mockRejectedValue(new Error("Party not found"));

    const { req, res } = mockReqRes({ params: { id: "missing" } });
    await communityController.joinParty(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  test("joinParty returns full party state", async () => {
    Party.join.mockResolvedValue({
      party: { id: "party-1", status: "FULL" },
      participant: { id: "pp-1" },
      participant_count: 4,
    });

    const { req, res } = mockReqRes({ params: { id: "party-1" } });
    await communityController.joinParty(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Joined successfully. Party is now full.",
      }),
    );
  });

  test("getMyParties returns joined parties", async () => {
    const parties = [{ id: "pp-1" }];
    PartyParticipant.findByUser.mockResolvedValue(parties);

    const { req, res } = mockReqRes();
    await communityController.getMyParties(req, res);

    expect(res.json).toHaveBeenCalledWith(parties);
  });
});
