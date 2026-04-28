const express = require("express");
const router = express.Router();
const communityController = require("../controllers/communityController");
const { authMiddleware } = require("../middleware/authMiddleware");

router.get("/", communityController.listFeed);
router.get("/mine", authMiddleware, communityController.getMyParties);
router.get("/:id", communityController.getById);
router.post("/", authMiddleware, communityController.createParty);
router.post("/:id/join", authMiddleware, communityController.joinParty);

module.exports = router;
