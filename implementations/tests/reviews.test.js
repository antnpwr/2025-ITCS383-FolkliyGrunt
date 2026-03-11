const Review = require('../models/Review');

jest.mock('../config/db', () => ({
  query: jest.fn()
}));
const pool = require('../config/db');

describe('Review Model', () => {
  afterEach(() => jest.clearAllMocks());

  test('create should insert a review with valid rating', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // no existing review
      .mockResolvedValueOnce({ rows: [{ id: '1', rating: 4, comment_text: 'Great!' }] });

    const review = await Review.create({
      user_id: 'u1', court_id: 'c1', rating: 4, comment_text: 'Great!'
    });
    expect(review.rating).toBe(4);
  });

  test('create should reject invalid rating', async () => {
    await expect(
      Review.create({ user_id: 'u1', court_id: 'c1', rating: 6, comment_text: 'Too high' })
    ).rejects.toThrow('Rating must be between 1 and 5');
  });

  test('create should reject duplicate review', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });
    await expect(
      Review.create({ user_id: 'u1', court_id: 'c1', rating: 3, comment_text: 'Again' })
    ).rejects.toThrow('already reviewed');
  });

  test('getAverageRating should return formatted average', async () => {
    pool.query.mockResolvedValue({ rows: [{ average_rating: '4.3333', total_reviews: '3' }] });
    const result = await Review.getAverageRating('c1');
    expect(result.average_rating).toBe('4.3');
    expect(result.total_reviews).toBe(3);
  });
});
