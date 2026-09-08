/**
 * Unit tests for authentication helpers
 * Location: __tests__/unit/lib/auth-helpers.test.ts
 * Tests authorization checks and role validation
 */

import { requireAuth, requireAdmin, getSession } from '@/lib/auth-helpers';
import { supabase } from '@/lib/supabase/client';

jest.mock('@/lib/supabase/client');

describe('Auth Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return session when user is authenticated', async () => {
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: {},
        },
        session: {
          access_token: 'token',
          refresh_token: 'refresh',
        },
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const result = await requireAuth();
      expect(result).toEqual(mockSession);
    });

    it('should throw error when user is not authenticated', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await expect(requireAuth()).rejects.toThrow('Unauthorized');
    });

    it('should throw error when getSession fails', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: new Error('Database error'),
      });

      await expect(requireAuth()).rejects.toThrow();
    });
  });

  describe('requireAdmin', () => {
    const adminEmail = 'admin@etheon.io';
    const userEmail = 'user@example.com';

    it('should return true for admin user', async () => {
      const mockSession = {
        user: {
          id: 'admin-id',
          email: adminEmail,
          user_metadata: { role: 'admin' },
        },
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const result = await requireAdmin();
      expect(result).toBe(true);
    });

    it('should throw error for non-admin user', async () => {
      const mockSession = {
        user: {
          id: 'user-id',
          email: userEmail,
          user_metadata: { role: 'user' },
        },
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      await expect(requireAdmin()).rejects.toThrow('Admin access required');
    });

    it('should throw error when not authenticated', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      await expect(requireAdmin()).rejects.toThrow();
    });
  });

  describe('getSession', () => {
    it('should return session data', async () => {
      const mockSession = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const result = await getSession();
      expect(result).toEqual(mockSession);
    });

    it('should return null when no session exists', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const result = await getSession();
      expect(result).toBeNull();
    });
  });
});
