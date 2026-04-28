const Party = require("../models/Party");
const PartyParticipant = require("../models/PartyParticipant");

const communityController = {
  listFeed: async (req, res) => {
    try {
      const parties = await Party.listFeed();
      res.json(parties);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const party = await Party.findById(req.params.id);
      if (!party) {
        return res.status(404).json({ error: "Party not found" });
      }
      res.json(party);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  createParty: async (req, res) => {
    try {
      const {
        title,
        game_name,
        game_date_time,
        location,
        capacity,
        description,
      } = req.body;

      const parsedCapacity = Number.parseInt(capacity, 10);
      if (
        !title ||
        !game_name ||
        !game_date_time ||
        !location ||
        !Number.isFinite(parsedCapacity) ||
        parsedCapacity < 1
      ) {
        return res.status(400).json({
          error:
            "Missing required fields: title, game_name, game_date_time, location, capacity",
        });
      }

      const scheduledTime = new Date(game_date_time);
      if (Number.isNaN(scheduledTime.getTime())) {
        return res
          .status(400)
          .json({ error: "game_date_time must be a valid date/time" });
      }

      const party = await Party.create({
        host_id: req.user.id,
        title,
        game_name,
        game_date_time: scheduledTime,
        location,
        capacity: parsedCapacity,
        description: description || null,
      });

      res.status(201).json({ message: "Party published successfully", party });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  joinParty: async (req, res) => {
    try {
      const result = await Party.join(req.params.id, req.user.id);
      res.status(201).json({
        message:
          result.party.status === "FULL"
            ? "Joined successfully. Party is now full."
            : "Joined successfully",
        ...result,
      });
    } catch (error) {
      if (error.message === "Party not found") {
        return res.status(404).json({ error: error.message });
      }
      if (
        error.message === "Party is full" ||
        error.message === "User already joined this party"
      ) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message === "Party is not open for joins") {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message });
    }
  },

  getMyParties: async (req, res) => {
    try {
      const parties = await PartyParticipant.findByUser(req.user.id);
      res.json(parties);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = communityController;
