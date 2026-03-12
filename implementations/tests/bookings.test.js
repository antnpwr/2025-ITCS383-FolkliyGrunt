const Booking = require('../models/Booking');
const EquipmentRental = require('../models/EquipmentRental');

// ── Mock the database pool ──────────────────────────────────
jest.mock('../config/db', () => {
    const mc = {
        query: jest.fn(),
        release: jest.fn()
    };
    return {
        query: jest.fn(),
        connect: jest.fn().mockResolvedValue(mc),
        __mockClient: mc
    };
});

const pool = require('../config/db');
const mockClient = pool.__mockClient;

// ═══════════════════════════════════════════════════════════
// Booking Model Tests
// ═══════════════════════════════════════════════════════════
describe('Booking Model', () => {
    afterEach(() => jest.clearAllMocks());

    // ── checkAvailability ────────────────────────────────
    test('checkAvailability returns true for open slot', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        const available = await Booking.checkAvailability('court-1', '2025-01-01 10:00', '2025-01-01 12:00');
        expect(available).toBe(true);
        expect(pool.query).toHaveBeenCalledTimes(1);
    });

    test('checkAvailability returns false for taken slot', async () => {
        pool.query.mockResolvedValue({ rows: [{ id: 'booking-1' }] });
        const available = await Booking.checkAvailability('court-1', '2025-01-01 10:00', '2025-01-01 12:00');
        expect(available).toBe(false);
    });

    // ── cancel ───────────────────────────────────────────
    test('cancel returns undefined if booking not eligible', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        const result = await Booking.cancel('booking-1', 'user-1');
        expect(result).toBeUndefined();
    });

    test('cancel returns the cancelled booking when eligible', async () => {
        const cancelled = { id: 'booking-1', booking_status: 'CANCELLED' };
        pool.query.mockResolvedValue({ rows: [cancelled] });
        const result = await Booking.cancel('booking-1', 'user-1');
        expect(result).toEqual(cancelled);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('CANCELLED'),
            ['booking-1', 'user-1']
        );
    });

    // ── findByUser ───────────────────────────────────────
    test('findByUser returns bookings for a user', async () => {
        const bookings = [
            { id: 'b1', court_name: 'Court A' },
            { id: 'b2', court_name: 'Court B' }
        ];
        pool.query.mockResolvedValue({ rows: bookings });
        const result = await Booking.findByUser('user-1');
        expect(result).toEqual(bookings);
        expect(result).toHaveLength(2);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('user_id'),
            ['user-1']
        );
    });

    test('findByUser returns empty array when no bookings', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        const result = await Booking.findByUser('user-1');
        expect(result).toEqual([]);
    });

    // ── create (success path) ────────────────────────────
    test('create inserts booking when slot is available', async () => {
        const newBooking = { id: 'new-1', court_id: 'court-1' };
        mockClient.query
            .mockResolvedValueOnce()                       // BEGIN
            .mockResolvedValueOnce({ rows: [] })           // SELECT FOR UPDATE (no conflict)
            .mockResolvedValueOnce({ rows: [newBooking] }) // INSERT RETURNING *
            .mockResolvedValueOnce();                      // COMMIT

        const result = await Booking.create({
            user_id: 'user-1',
            court_id: 'court-1',
            start_time: '2025-06-01 10:00',
            end_time: '2025-06-01 12:00',
            total_amount: 200,
            payment_method: 'CREDIT_CARD'
        });

        expect(result).toEqual(newBooking);
        expect(mockClient.query).toHaveBeenCalledTimes(4);
        expect(mockClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
        expect(mockClient.release).toHaveBeenCalled();
    });

    // ── create (conflict path) ───────────────────────────
    test('create throws error when timeslot is already booked', async () => {
        mockClient.query
            .mockResolvedValueOnce()                                   // BEGIN
            .mockResolvedValueOnce({ rows: [{ id: 'existing' }] })     // conflict
            .mockResolvedValueOnce();                                   // ROLLBACK

        await expect(
            Booking.create({
                user_id: 'user-1',
                court_id: 'court-1',
                start_time: '2025-06-01 10:00',
                end_time: '2025-06-01 12:00',
                total_amount: 200,
                payment_method: 'CASH'
            })
        ).rejects.toThrow('Time slot is already booked');

        expect(mockClient.release).toHaveBeenCalled();
    });

    // ── create (DB error path) ───────────────────────────
    test('create rolls back and throws on unexpected DB error', async () => {
        mockClient.query
            .mockResolvedValueOnce()                       // BEGIN
            .mockRejectedValueOnce(new Error('DB down'))   // SELECT fails
            .mockResolvedValueOnce();                      // ROLLBACK

        await expect(
            Booking.create({
                user_id: 'user-1',
                court_id: 'court-1',
                start_time: '2025-06-01 10:00',
                end_time: '2025-06-01 12:00',
                total_amount: 200,
                payment_method: 'CASH'
            })
        ).rejects.toThrow('DB down');

        expect(mockClient.release).toHaveBeenCalled();
    });

    // ── updateTransactionId ─────────────────────────────
    test('updateTransactionId updates and returns booking', async () => {
        const updated = { id: 'b1', transaction_id: 'TX_STRIPE_123' };
        pool.query.mockResolvedValue({ rows: [updated] });

        const result = await Booking.updateTransactionId('b1', 'TX_STRIPE_123');
        expect(result).toEqual(updated);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('transaction_id'),
            ['TX_STRIPE_123', 'b1']
        );
    });

    test('updateTransactionId returns undefined for non-existent booking', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        const result = await Booking.updateTransactionId('nonexistent', 'TX_123');
        expect(result).toBeUndefined();
    });

    // ── findByCourtAndDate ──────────────────────────────
    test('findByCourtAndDate returns booked start times', async () => {
        const times = [
            { start_time: '2025-06-01T10:00:00Z' },
            { start_time: '2025-06-01T14:00:00Z' }
        ];
        pool.query.mockResolvedValue({ rows: times });

        const result = await Booking.findByCourtAndDate('court-1', '2025-06-01');
        expect(result).toEqual(['2025-06-01T10:00:00Z', '2025-06-01T14:00:00Z']);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('court_id'),
            ['court-1', '2025-06-01']
        );
    });

    test('findByCourtAndDate returns empty array for open day', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        const result = await Booking.findByCourtAndDate('court-1', '2025-12-25');
        expect(result).toEqual([]);
    });
});

// ═══════════════════════════════════════════════════════════
// EquipmentRental Model Tests
// ═══════════════════════════════════════════════════════════
describe('EquipmentRental Model', () => {
    afterEach(() => jest.clearAllMocks());

    test('addToBooking inserts each item and returns results', async () => {
        const item1 = { id: 'e1', equipment_type: 'RACKET', quantity: 2, unit_price: 50 };
        const item2 = { id: 'e2', equipment_type: 'SHUTTLECOCK', quantity: 1, unit_price: 30 };

        pool.query
            .mockResolvedValueOnce({ rows: [item1] })
            .mockResolvedValueOnce({ rows: [item2] });

        const items = [
            { equipment_type: 'RACKET', quantity: 2, unit_price: 50 },
            { equipment_type: 'SHUTTLECOCK', quantity: 1, unit_price: 30 }
        ];

        const result = await EquipmentRental.addToBooking('booking-1', items);
        expect(result).toEqual([item1, item2]);
        expect(pool.query).toHaveBeenCalledTimes(2);
    });

    test('addToBooking returns empty array for empty items', async () => {
        const result = await EquipmentRental.addToBooking('booking-1', []);
        expect(result).toEqual([]);
        expect(pool.query).not.toHaveBeenCalled();
    });

    test('findByBooking returns equipment for a booking', async () => {
        const equipment = [
            { id: 'e1', equipment_type: 'RACKET', quantity: 1, unit_price: 50 }
        ];
        pool.query.mockResolvedValue({ rows: equipment });

        const result = await EquipmentRental.findByBooking('booking-1');
        expect(result).toEqual(equipment);
        expect(pool.query).toHaveBeenCalledWith(
            expect.stringContaining('booking_id'),
            ['booking-1']
        );
    });

    test('findByBooking returns empty array when no equipment', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        const result = await EquipmentRental.findByBooking('booking-1');
        expect(result).toEqual([]);
    });
});
