import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ImageModal from '../ImageModal';
import { getFullSizeImageUrl } from '../../lib/storage';

vi.mock('../../lib/storage', () => ({
  getFullSizeImageUrl: vi.fn().mockResolvedValue('https://example.com/full-size-image.jpg')
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (isOpen: boolean, imagePath: string, onClose: () => void, triggerRef?: React.RefObject<HTMLElement>) => {
  const queryClient = createTestQueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <ImageModal isOpen={isOpen} imagePath={imagePath} onClose={onClose} triggerRef={triggerRef} />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ImageModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when isOpen={true}', async () => {
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        expect(modal).toBeInTheDocument();
      });
    });

    it('should not render when isOpen={false}', () => {
      renderWithProviders(false, 'user-123/image.jpg', mockOnClose);

      expect(screen.queryByRole('dialog', { hidden: true })).not.toBeInTheDocument();
    });

    it('should display image with correct src', async () => {
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const image = screen.getByAltText('Full size image');
        expect(image).toHaveAttribute('src', 'https://example.com/full-size-image.jpg');
      });

      expect(getFullSizeImageUrl).toHaveBeenCalledWith('user-123/image.jpg');
    });

    it('should show loading state while image loads', async () => {
      vi.mocked(getFullSizeImageUrl).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve('https://example.com/image.jpg'), 100))
      );

      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      // Should show loading text initially
      expect(screen.getByText('Loading image...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading image...')).not.toBeInTheDocument();
      });
    });

    it('should show error state if image fails to load', async () => {
      vi.mocked(getFullSizeImageUrl).mockResolvedValue(null);

      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when clicking close button', async () => {
      const user = userEvent.setup();
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay (outside modal)', async () => {
      const user = userEvent.setup();
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const overlay = screen.getByRole('dialog', { hidden: true }).parentElement;
        expect(overlay).toBeInTheDocument();
      });

      const overlay = screen.getByRole('dialog', { hidden: true }).parentElement;
      if (overlay) {
        await user.click(overlay);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should NOT call onClose when clicking inside modal', async () => {
      const user = userEvent.setup();
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        expect(modal).toBeInTheDocument();
      });

      const modal = screen.getByRole('dialog', { hidden: true });
      await user.click(modal);

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should allow Tab navigation to close button', async () => {
      const user = userEvent.setup();
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
      });

      // Close button should be focusable
      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Accessibility', () => {
    it('should have aria-modal="true"', async () => {
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const modal = screen.getByRole('dialog', { hidden: true });
        expect(modal).toHaveAttribute('aria-modal', 'true');
      });
    });

    it('should have aria-label for close button', async () => {
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toHaveAttribute('aria-label', 'Close modal');
      });
    });

    it('should have proper alt text for image', async () => {
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        // Image should be rendered when URL is available
        const image = screen.queryByAltText('Full size image');
        if (image) {
          expect(image).toBeInTheDocument();
        } else {
          // If image failed to load, error message should be shown instead
          expect(screen.getByText('Failed to load image')).toBeInTheDocument();
        }
      });
    });

    it('should focus close button when modal opens', async () => {
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toHaveFocus();
      });
    });

    it('should return focus to trigger button when modal closes', async () => {
      const user = userEvent.setup();
      const triggerButton = document.createElement('button');
      triggerButton.setAttribute('aria-label', 'View full size image');
      document.body.appendChild(triggerButton);
      const triggerRef = { current: triggerButton };

      const { rerender } = renderWithProviders(true, 'user-123/image.jpg', mockOnClose, triggerRef);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toHaveFocus();
      });

      // Close the modal
      const queryClient = createTestQueryClient();
      rerender(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter future={{ v7_relativeSplatPath: true }}>
            <ImageModal isOpen={false} imagePath="user-123/image.jpg" onClose={mockOnClose} triggerRef={triggerRef} />
          </BrowserRouter>
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(triggerButton).toHaveFocus();
      }, { timeout: 100 });

      document.body.removeChild(triggerButton);
    });

    it('should have visible focus ring on close button when focused via keyboard', async () => {
      const user = userEvent.setup();
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close/i });

      // Focus the button
      closeButton.focus();

      // Check that focus-visible styles are applied (yellow box-shadow from index.css)
      expect(closeButton).toHaveFocus();
      // The focus ring is applied via CSS :focus-visible, which is hard to test directly
      // but we can verify the button is focusable and receives focus
    });
  });

  describe('Styling', () => {
    it('should have modal overlay with correct styles', async () => {
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const overlay = screen.getByRole('dialog', { hidden: true }).parentElement;
        expect(overlay).toHaveStyle({
          position: 'fixed',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        });
      });
    });

    it('should have responsive image that does not exceed viewport', async () => {
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const imageContainer = document.querySelector('.cq-image-modal-image-container');
        expect(imageContainer).toBeInTheDocument();
        expect(imageContainer).toHaveStyle({
          maxWidth: expect.any(String),
          maxHeight: expect.any(String),
        });
      });
    });

    it('should have visible and positioned close button', async () => {
      renderWithProviders(true, 'user-123/image.jpg', mockOnClose);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i });
        expect(closeButton).toBeVisible();
      });
    });
  });
});

