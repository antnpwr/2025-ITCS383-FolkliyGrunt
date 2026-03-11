const request = require('supertest');
const app = require('../server');
const { supabase } = require('../config/supabase');
const Profile = require('../models/Profile');

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

jest.mock('../models/Profile', () => ({
  create: jest.fn(),
  findByAuthId: jest.fn(),
  updateDisabledStatus: jest.fn(),
}));

describe('Auth API Endpoints', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: { user: { id: 'test-uuid-123', email: 'test@example.com' } },
        error: null
      });

      Profile.create.mockResolvedValue({
        id: 'profile-uuid-123',
        auth_id: 'test-uuid-123',
        full_name: 'Test User',
        address: '123 Test St',
        role: 'CUSTOMER',
        is_disabled: false
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
    });

    it('should return 400 if Supabase signup fails', async () => {
      supabase.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: { message: 'Password is too weak' }
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'weak' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Password is too weak');
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

      Profile.findByAuthId.mockResolvedValue({ is_disabled: false });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
    });

    it('should return 403 if user is disabled', async () => {
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'disabled-uuid-123', email: 'banned@example.com' },
          session: { access_token: 'token' }
        },
        error: null
      });

      Profile.findByAuthId.mockResolvedValue({ is_disabled: true });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'banned@example.com', password: 'Password!' });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('disabled');
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get profile if valid token is provided', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'auth-uuid', email: 'test@example.com' } },
        error: null
      });
      
      Profile.findByAuthId.mockResolvedValue({
        full_name: 'Test User',
        role: 'CUSTOMER'
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer token');

      expect(response.status).toBe(200);
      expect(response.body.profile.full_name).toBe('Test User');
    });
  });

  describe('PUT /api/auth/users/:id/disable (Admin Only)', () => {
    it('should disable user if requester is admin', async () => {
        // Mock middleware auth
        supabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'admin-uuid', email: 'admin@test.com' } },
            error: null
        });
        Profile.findByAuthId.mockResolvedValue({ role: 'ADMIN' });

        // Mock update
        Profile.updateDisabledStatus.mockResolvedValue({ auth_id: 'user-id', is_disabled: true });

        const response = await request(app)
            .put('/api/auth/users/user-id/disable')
            .set('Authorization', 'Bearer admin-token');

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User disabled successfully');
    });

    it('should return 403 if requester is not admin', async () => {
        supabase.auth.getUser.mockResolvedValue({
            data: { user: { id: 'user-uuid', email: 'user@test.com' } },
            error: null
        });
        Profile.findByAuthId.mockResolvedValue({ role: 'CUSTOMER' });

        const response = await request(app)
            .put('/api/auth/users/other-id/disable')
            .set('Authorization', 'Bearer user-token');

        expect(response.status).toBe(403);
    });
  });
});
