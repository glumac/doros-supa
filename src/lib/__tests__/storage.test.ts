import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getImageSignedUrl,
  getFeedImageUrl,
  getDetailImageUrl,
  getFullSizeImageUrl,
} from '../storage';
import { supabase } from '../supabaseClient';

// Mock supabase client
vi.mock('../supabaseClient', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
  },
}));

describe('Storage Utilities - Image Transformations', () => {
  const mockImagePath = 'user-123/1234567890.jpg';
  const mockSignedUrl = 'https://project.supabase.co/storage/v1/object/sign/pomodoro-images/user-123/1234567890.jpg?token=abc123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getImageSignedUrl with transform options', () => {
    it('should pass transform to createSignedUrl third parameter', async () => {
      const mockStorageBucket = {
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      const transform = {
        width: 400,
        height: 600,
        resize: 'cover' as const,
      };

      await getImageSignedUrl(mockImagePath, 3600, transform);

      expect(supabase.storage.from).toHaveBeenCalledWith('pomodoro-images');
      expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(
        mockImagePath,
        3600,
        { transform }
      );
    });

    it('should handle feed size (height: 630px, resize: contain)', async () => {
      const mockStorageBucket = {
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      const transform = {
        height: 630,
        resize: 'contain' as const,
      };

      const result = await getImageSignedUrl(mockImagePath, 3600, transform);

      expect(result).toBe(mockSignedUrl);
      expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(
        mockImagePath,
        3600,
        { transform: { height: 630, resize: 'contain' } }
      );
    });

    it('should handle detail size (height: 1200px, resize: contain)', async () => {
      const mockStorageBucket = {
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      const transform = {
        height: 1200,
        resize: 'contain' as const,
      };

      const result = await getImageSignedUrl(mockImagePath, 3600, transform);

      expect(result).toBe(mockSignedUrl);
      expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(
        mockImagePath,
        3600,
        { transform: { height: 1200, resize: 'contain' } }
      );
    });

    it('should handle full-size (no transform)', async () => {
      const mockStorageBucket = {
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      const result = await getImageSignedUrl(mockImagePath, 3600);

      expect(result).toBe(mockSignedUrl);
      expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(
        mockImagePath,
        3600,
        undefined
      );
    });

    it('should maintain backward compatibility (no transform = original behavior)', async () => {
      const mockStorageBucket = {
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      // Call without transform (should work as before)
      const result = await getImageSignedUrl(mockImagePath);

      expect(result).toBe(mockSignedUrl);
      expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(
        mockImagePath,
        3600, // default expiresIn
        undefined
      );
    });

    it('should handle errors gracefully', async () => {
      const mockStorageBucket = {
        createSignedUrl: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Object not found' },
        }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      const result = await getImageSignedUrl(mockImagePath, 3600, {
        width: 400,
        height: 600,
      });

      expect(result).toBeNull();
    });

    it('should return null for empty path', async () => {
      const result = await getImageSignedUrl('');

      expect(result).toBeNull();
      expect(supabase.storage.from).not.toHaveBeenCalled();
    });

    it('should extract path from Supabase storage URL', async () => {
      const mockStorageBucket = {
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      const fullUrl = 'https://project.supabase.co/storage/v1/object/public/pomodoro-images/user-123/1234567890.jpg';

      await getImageSignedUrl(fullUrl, 3600);

      expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(
        'user-123/1234567890.jpg',
        3600,
        undefined
      );
    });
  });

  describe('convenience functions', () => {
    it('getFeedImageUrl should return height 630px with contain resize', async () => {
      const mockStorageBucket = {
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      const result = await getFeedImageUrl(mockImagePath);

      expect(result).toBe(mockSignedUrl);
      expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(
        mockImagePath,
        3600,
        {
          transform: {
            height: 630,
            resize: 'contain',
            quality: 80,
          },
        }
      );
    });

    it('getDetailImageUrl should return height 1200px with contain resize', async () => {
      const mockStorageBucket = {
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      const result = await getDetailImageUrl(mockImagePath);

      expect(result).toBe(mockSignedUrl);
      expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(
        mockImagePath,
        3600,
        {
          transform: {
            height: 1200,
            resize: 'contain',
            quality: 85,
          },
        }
      );
    });

    it('getFullSizeImageUrl should return no transform', async () => {
      const mockStorageBucket = {
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null,
        }),
      };

      vi.mocked(supabase.storage.from).mockReturnValue(mockStorageBucket as any);

      const result = await getFullSizeImageUrl(mockImagePath);

      expect(result).toBe(mockSignedUrl);
      expect(mockStorageBucket.createSignedUrl).toHaveBeenCalledWith(
        mockImagePath,
        3600,
        undefined
      );
    });
  });
});

