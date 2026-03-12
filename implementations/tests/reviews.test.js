const Review = require('../models/Review');

jest.mock('../config/db', () => ({
  query: jest.fn()
}));
const pool = require('../config/db');

describe('Review Model', () => {
  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────
  test('create should insert a review with valid rating', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] }) // no existing review
      .mockResolvedValueOnce({ rows: [{ id: 'b1' }] }) // passed booking check
      .mockResolvedValueOnce({ rows: [{ id: '1', rating: 4, comment_text: 'Great!' }] }) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // UPDATE courts avg

    const review = await Review.create({
      user_id: 'u1', court_id: 'c1', rating: 4, comment_text: 'Great!'
    });
    expect(review.rating).toBe(4);
  });

  test('create should reject invalid rating above 5', async () => {
    await expect(
      Review.create({ user_id: 'u1', court_id: 'c1', rating: 6, comment_text: 'Too high' })
    ).rejects.toThrow('Rating must be between 1 and 5');
  });

  test('create should reject rating below 1', async () => {
    await expect(
      Review.create({ user_id: 'u1', court_id: 'c1', rating: 0, comment_text: 'Bad' })
    ).rejects.toThrow('Rating must be between 1 and 5');
  });

  test('create should reject duplicate review', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 'existing' }] });
    await expect(
      Review.create({ user_id: 'u1', court_id: 'c1', rating: 3, comment_text: 'Again' })
    ).rejects.toThrow('already reviewed');
  });

  test('create should reject if user has not booked the court', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [] })  // no existing review
      .mockResolvedValueOnce({ rows: [] }); // no past bookings

    await expect(
      Review.create({ user_id: 'u1', court_id: 'c1', rating: 4, comment_text: 'Never booked' })
    ).rejects.toThrow('You can only review a court you have booked');
  });

  // ── getAverageRating ──────────────────────────────────
  test('getAverageRating should return formatted average', async () => {
    pool.query.mockResolvedValue({ rows: [{ average_rating: '4.3333', total_reviews: '3' }] });
    const result = await Review.getAverageRating('c1');
    expect(result.average_rating).toBe('4.3');
    expect(result.total_reviews).toBe(3);
  });

  test('getAverageRating returns 0.0 when no reviews', async () => {
    pool.query.mockResolvedValue({ rows: [{ average_rating: '0', total_reviews: '0' }] });
    const result = await Review.getAverageRating('empty-court');
    expect(result.average_rating).toBe('0.0');
    expect(result.total_reviews).toBe(0);
  });

  // ── findByCourtId ─────────────────────────────────────
  test('findByCourtId returns reviews wrapped in object', async () => {
    const reviews = [
      { id: 'r1', rating: 5, full_name: 'John' },
      { id: 'r2', rating: 3, full_name: 'Jane' }
    ];
    pool.query.mockResolvedValue({ rows: reviews });
    const result = await Review.findByCourtId('c1');
    // Model returns { reviews: [...] }
    expect(result).toEqual({ reviews });
    expect(result.reviews).toHaveLength(2);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('court_id'),
      ['c1']
    );
  });

  test('findByCourtId returns empty reviews array when no reviews', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const result = await Review.findByCourtId('c1');
    expect(result).toEqual({ reviews: [] });
    expect(result.reviews).toHaveLength(0);
  });

  // ── findByUser ────────────────────────────────────────
  test('findByUser returns reviews by a user', async () => {
    const reviews = [{ id: 'r1', court_name: 'Court A', rating: 4 }];
    pool.query.mockResolvedValue({ rows: reviews });
    const result = await Review.findByUser('u1');
    expect(result).toEqual(reviews);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('user_id'),
      ['u1']
    );
  });

  test('findByUser returns empty array when no reviews', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const result = await Review.findByUser('u1');
    expect(result).toEqual([]);
  });
});
