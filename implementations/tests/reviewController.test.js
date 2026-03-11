// Mock the Review model BEFORE requiring the controller
jest.mock('../models/Review');

const Review = require('../models/Review');
const reviewController = require('../controllers/reviewController');

// Helper to create mock req/res
function mockReqRes(overrides = {}) {
    const req = {
        user: { id: 'user-1' },
        params: {},
        body: {},
        ...overrides
    };
    const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
    };
    return { req, res };
}

describe('reviewController', () => {
    afterEach(() => jest.clearAllMocks());

    // ── create ───────────────────────────────────────────
    describe('create', () => {
        test('creates review and returns 201', async () => {
            const review = { id: 'r1', rating: 4, comment_text: 'Great!' };
            Review.create.mockResolvedValue(review);

            const { req, res } = mockReqRes({
                body: { court_id: 'c1', rating: 4, comment_text: 'Great!' }
            });
            await reviewController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(review);
        });

        test('returns 409 when user already reviewed this court', async () => {
            Review.create.mockRejectedValue(new Error('You have already reviewed this court'));

            const { req, res } = mockReqRes({
                body: { court_id: 'c1', rating: 3, comment_text: 'Again' }
            });
            await reviewController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ error: 'You have already reviewed this court' });
        });

        test('returns 400 for invalid rating', async () => {
            Review.create.mockRejectedValue(new Error('Rating must be between 1 and 5'));

            const { req, res } = mockReqRes({
                body: { court_id: 'c1', rating: 6, comment_text: 'Too high' }
            });
            await reviewController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Rating must be between 1 and 5' });
        });

        test('returns 500 on unexpected error', async () => {
            Review.create.mockRejectedValue(new Error('DB error'));

            const { req, res } = mockReqRes({
                body: { court_id: 'c1', rating: 4, comment_text: 'Test' }
            });
            await reviewController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── getByCourtId ─────────────────────────────────────
    describe('getByCourtId', () => {
        test('returns reviews for a court', async () => {
            const reviews = [{ id: 'r1', rating: 5 }];
            Review.findByCourtId.mockResolvedValue(reviews);

            const { req, res } = mockReqRes({ params: { courtId: 'c1' } });
            await reviewController.getByCourtId(req, res);

            expect(res.json).toHaveBeenCalledWith(reviews);
        });

        test('returns 500 on error', async () => {
            Review.findByCourtId.mockRejectedValue(new Error('fail'));

            const { req, res } = mockReqRes({ params: { courtId: 'c1' } });
            await reviewController.getByCourtId(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── getAverageRating ─────────────────────────────────
    describe('getAverageRating', () => {
        test('returns average rating', async () => {
            const rating = { average_rating: '4.3', total_reviews: 3 };
            Review.getAverageRating.mockResolvedValue(rating);

            const { req, res } = mockReqRes({ params: { courtId: 'c1' } });
            await reviewController.getAverageRating(req, res);

            expect(res.json).toHaveBeenCalledWith(rating);
        });

        test('returns 500 on error', async () => {
            Review.getAverageRating.mockRejectedValue(new Error('fail'));

            const { req, res } = mockReqRes({ params: { courtId: 'c1' } });
            await reviewController.getAverageRating(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── getMyReviews ─────────────────────────────────────
    describe('getMyReviews', () => {
        test('returns reviews by the logged-in user', async () => {
            const reviews = [{ id: 'r1', court_name: 'Court A' }];
            Review.findByUser.mockResolvedValue(reviews);

            const { req, res } = mockReqRes();
            await reviewController.getMyReviews(req, res);

            expect(res.json).toHaveBeenCalledWith(reviews);
        });

        test('returns 500 on error', async () => {
            Review.findByUser.mockRejectedValue(new Error('fail'));

            const { req, res } = mockReqRes();
            await reviewController.getMyReviews(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
