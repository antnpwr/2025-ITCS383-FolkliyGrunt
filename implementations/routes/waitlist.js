const express = require('express');
const router = express.Router();
const waitlistController = require('../controllers/waitlistController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', waitlistController.addToWaitlist);
router.get('/my', waitlistController.getMyWaitlist);
router.post('/:id/confirm', waitlistController.confirmWaitlist);
router.delete('/:id', waitlistController.removeFromWaitlist);

module.exports = router;
