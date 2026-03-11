// Mock the models BEFORE requiring the controller
jest.mock('../models/Booking');
jest.mock('../models/EquipmentRental');
jest.mock('../models/Court');

const Booking = require('../models/Booking');
const EquipmentRental = require('../models/EquipmentRental');
const Court = require('../models/Court');
const paymentService = require('../services/paymentService');
const notificationService = require('../services/notificationService');
const bookingController = require('../controllers/bookingController');

jest.mock('../services/paymentService', () => ({
    processPayment: jest.fn().mockResolvedValue({ success: true }),
    processRefund: jest.fn().mockResolvedValue({ success: true })
}));

jest.mock('../services/notificationService', () => ({
    notifyWaitlist: jest.fn().mockResolvedValue({ notified: true }),
    sendNotification: jest.fn().mockResolvedValue({ sent: true })
}));

// Helper to create mock req/res
function mockReqRes(overrides = {}) {
    const req = {
        user: { id: 'user-1', email: 'test@example.com' },
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

describe('bookingController', () => {
    afterEach(() => jest.clearAllMocks());

    // ── create ───────────────────────────────────────────
    describe('create', () => {
        test('creates booking without equipment and returns 201', async () => {
            const booking = { id: 'b1', court_id: 'c1' };
            Booking.create.mockResolvedValue(booking);
            Court.findById.mockResolvedValue({ id: 'c1', price_per_hour: '100' });

            const { req, res } = mockReqRes({
                body: {
                    court_id: 'c1',
                    start_time: '2025-06-01T10:00:00',
                    duration_hours: 2,
                    payment_method: 'CASH',
                    total_amount: 200
                }
            });

            await bookingController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(booking);
            expect(EquipmentRental.addToBooking).not.toHaveBeenCalled();
        });

        test('creates booking with equipment and returns 201', async () => {
            const booking = { id: 'b2', court_id: 'c1' };
            Booking.create.mockResolvedValue(booking);
            Court.findById.mockResolvedValue({ id: 'c1', price_per_hour: '200' });
            EquipmentRental.addToBooking.mockResolvedValue([]);

            const equipment = [{ equipment_type: 'RACKET', quantity: 1, unit_price: 50 }];
            const { req, res } = mockReqRes({
                body: {
                    court_id: 'c1',
                    start_time: '2025-06-01T10:00:00',
                    duration_hours: 1,
                    payment_method: 'PROMPTPAY',
                    total_amount: 250,
                    equipment
                }
            });

            await bookingController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(EquipmentRental.addToBooking).toHaveBeenCalledWith('b2', equipment);
        });

        test('returns 409 when timeslot is already booked', async () => {
            Booking.create.mockRejectedValue(new Error('Time slot is already booked'));
            Court.findById.mockResolvedValue({ id: 'c1', price_per_hour: '100' });

            const { req, res } = mockReqRes({
                body: {
                    court_id: 'c1',
                    start_time: '2025-06-01T10:00:00',
                    duration_hours: 1,
                    payment_method: 'CASH',
                    total_amount: 100
                }
            });

            await bookingController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(409);
            expect(res.json).toHaveBeenCalledWith({ error: 'Time slot is already booked' });
        });

        test('returns 500 on unexpected error', async () => {
            Booking.create.mockRejectedValue(new Error('Unexpected'));
            Court.findById.mockResolvedValue({ id: 'c1', price_per_hour: '100' });

            const { req, res } = mockReqRes({
                body: {
                    court_id: 'c1',
                    start_time: '2025-06-01T10:00:00',
                    duration_hours: 1,
                    payment_method: 'CASH'
                }
            });

            await bookingController.create(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({ error: 'Unexpected' });
        });
    });

    // ── cancel ───────────────────────────────────────────
    describe('cancel', () => {
        test('cancels booking and returns success message', async () => {
            const booking = { id: 'b1', booking_status: 'CANCELLED' };
            Booking.cancel.mockResolvedValue(booking);

            const { req, res } = mockReqRes({ params: { id: 'b1' } });
            await bookingController.cancel(req, res);

            expect(res.json).toHaveBeenCalledWith({
                message: 'Booking cancelled, refund processed',
                booking
            });
        });

        test('returns 400 when booking cannot be cancelled', async () => {
            Booking.cancel.mockResolvedValue(null);

            const { req, res } = mockReqRes({ params: { id: 'b1' } });
            await bookingController.cancel(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Cannot cancel - booking not found or play time already started'
            });
        });

        test('returns 500 on cancel error', async () => {
            Booking.cancel.mockRejectedValue(new Error('DB error'));

            const { req, res } = mockReqRes({ params: { id: 'b1' } });
            await bookingController.cancel(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── getMyBookings ────────────────────────────────────
    describe('getMyBookings', () => {
        test('returns user bookings', async () => {
            const bookings = [{ id: 'b1' }, { id: 'b2' }];
            Booking.findByUser.mockResolvedValue(bookings);

            const { req, res } = mockReqRes();
            await bookingController.getMyBookings(req, res);

            expect(res.json).toHaveBeenCalledWith(bookings);
        });

        test('returns 500 on error', async () => {
            Booking.findByUser.mockRejectedValue(new Error('fail'));

            const { req, res } = mockReqRes();
            await bookingController.getMyBookings(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    // ── getEquipment ─────────────────────────────────────
    describe('getEquipment', () => {
        test('returns equipment for a booking', async () => {
            const equipment = [{ id: 'e1', equipment_type: 'RACKET' }];
            EquipmentRental.findByBooking.mockResolvedValue(equipment);

            const { req, res } = mockReqRes({ params: { id: 'b1' } });
            await bookingController.getEquipment(req, res);

            expect(res.json).toHaveBeenCalledWith(equipment);
        });

        test('returns 500 on error', async () => {
            EquipmentRental.findByBooking.mockRejectedValue(new Error('fail'));

            const { req, res } = mockReqRes({ params: { id: 'b1' } });
            await bookingController.getEquipment(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
