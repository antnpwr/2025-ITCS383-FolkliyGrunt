const request = require('supertest');
const app = require('../server');
const { supabase } = require('../config/supabase');
const pool = require('../config/db');

// Mock dependencies
jest.mock('../config/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      getUser: jest.fn(),
      signOut: jest.fn(),
    }
  },
  supabaseAdmin: {
    auth: {
      admin: {
        updateUserById: jest.fn()
      }
    }
  }
}));

jest.mock('../config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
  on: jest.fn(),
}));

describe('Auth API Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      // Setup mocks
      supabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'test-uuid-123', email: 'test@example.com' } },
        error: null
      });

      pool.query.mockResolvedValue({
        rows: [{
          id: 'profile-uuid-123',
          auth_id: 'test-uuid-123',
          full_name: 'Test User',
          address: '123 Test St',
          role: 'CUSTOMER',
          is_disabled: false
        }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          full_name: 'Test User',
          address: '123 Test St'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user.full_name).toBe('Test User');
      expect(supabase.auth.signUp).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should return 400 if Supabase signup fails', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password is too weak' }
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          full_name: 'Test User',
          address: '123 Test St'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password is too weak');
      expect(pool.query).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login a valid user', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'test-uuid-123', email: 'test@example.com' },
          session: { access_token: 'valid-jwt-token' }
        },
        error: null
      });

      pool.query.mockResolvedValue({
        rows: [] // not disabled
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.session.access_token).toBe('valid-jwt-token');
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('should return 403 if user is disabled', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'disabled-uuid-123', email: 'banned@example.com' },
          session: { access_token: 'valid-jwt-token' }
        },
        error: null
      });

      pool.query.mockResolvedValue({
        rows: [{ is_disabled: true }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'banned@example.com',
          password: 'Password123!'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Account is disabled. Please contact support.');
      expect(supabase.auth.signOut).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('GET /api/auth/profile (Protected)', () => {
    it('should get profile if valid token is provided', async () => {
      // Mock Supabase getUser
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-uuid', email: 'test@example.com' } },
        error: null
      });
      
      // Mock DB query for profile
      pool.query.mockResolvedValue({
        rows: [{
          id: 'profile-uuid',
          auth_id: 'auth-uuid',
          full_name: 'Test User',
          role: 'CUSTOMER'
        }]
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer valid-jwt-token');

      expect(response.status).toBe(200);
      expect(response.body.profile.email).toBe('test@example.com');
      expect(response.body.profile.role).toBe('CUSTOMER');
    });

    it('should return 401 if token is missing', async () => {
      const response = await request(app).get('/api/auth/profile');
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });
  });
});
