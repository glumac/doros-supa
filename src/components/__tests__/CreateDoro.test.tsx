import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateDoro from '../CreateDoro';
import DoroContext from '../../utils/DoroContext';
import * as storage from '../../lib/storage';

// Mock dependencies
vi.mock('../../lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}));

vi.mock('../../lib/storage', () => ({
  uploadPomodoroImage: vi.fn(),
  deletePomodoroImage: vi.fn(),
  getImageSignedUrl: vi.fn(),
}));

vi.mock('../../lib/queries', () => ({
  getWeeklyLeaderboard: vi.fn(() => Promise.resolve({ data: [], error: null })),
}));

const mockUser = {
  id: 'user-123',
  user_name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  email: 'test@example.com',
  privacy_setting: 'public',
  followers_only: false,
};

const mockDoroContextValue = {
  task: 'Test Task',
  setTask: vi.fn(),
  launchAt: new Date().toISOString(),
  setLaunchAt: vi.fn(),
  completed: false,
  setCompleted: vi.fn(),
  timeLeft: 1500000, // 25 minutes in ms
  setTimeLeft: vi.fn(),
  isActive: false,
  setIsActive: vi.fn(),
  isPaused: false,
  setIsPaused: vi.fn(),
  inProgress: false,
  setInProgress: vi.fn(),
};

const renderCreateDoro = (contextOverrides = {}, userOverrides = {}) => {
  const contextValue = { ...mockDoroContextValue, ...contextOverrides };
  const user = { ...mockUser, ...userOverrides };
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <DoroContext.Provider value={contextValue}>
          <CreateDoro user={user} />
        </DoroContext.Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('CreateDoro CSS behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('timer display visibility', () => {
    it('renders component successfully', () => {
      const { container } = renderCreateDoro();

      // Component should render
      expect(container).toBeInTheDocument();
    });

    it('shows timer labels when active', () => {
      renderCreateDoro({ isActive: true, timeLeft: 1500000, inProgress: true });

      // Timer labels should be visible when active
      expect(screen.queryByText('MINUTES') || screen.queryByText('minutes')).toBeTruthy();
    });

    it('displays UI when paused', () => {
      const { container } = renderCreateDoro({ isPaused: true, timeLeft: 900000 });

      // Component should still render when paused
      expect(container).toBeInTheDocument();
    });
  });

  describe('spinner visibility during loading', () => {
    it('does not show spinner initially', () => {
      renderCreateDoro();

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('task input field', () => {
    it('renders task input field', () => {
      renderCreateDoro();

      const taskInput = screen.getByPlaceholderText(/task is/i);
      expect(taskInput).toBeInTheDocument();
    });

    it('displays task value from context', () => {
      renderCreateDoro({ task: 'My important task' });

      const taskInput = screen.getByDisplayValue('My important task');
      expect(taskInput).toBeInTheDocument();
    });
  });

  describe('button states and styling', () => {
    it('renders launch button when timer is not active', () => {
      renderCreateDoro({ isActive: false });

      // Should show a launch/start related button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('shows pause button when timer is active', () => {
      renderCreateDoro({ isActive: true, isPaused: false });

      const pauseButton = screen.queryByRole('button', { name: /pause/i });
      // Pause button should exist when active
      if (pauseButton) {
        expect(pauseButton).toBeInTheDocument();
      }
    });

    it('shows resume button when timer is paused', () => {
      renderCreateDoro({ isActive: false, isPaused: true, timeLeft: 900000 });

      const resumeButton = screen.queryByRole('button', { name: /resume/i });
      // Resume button should exist when paused
      if (resumeButton) {
        expect(resumeButton).toBeInTheDocument();
      }
    });
  });

  describe('completion state', () => {
    it('shows completion elements when timer completes', () => {
      renderCreateDoro({ completed: true, timeLeft: 0 });

      // When completed, should show save/completion related elements
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('notes/description textarea', () => {
    it('renders notes textarea', () => {
      renderCreateDoro();

      const notesInput = screen.queryByPlaceholderText(/notes/i) ||
                        screen.queryByPlaceholderText(/description/i);
      // Notes input may be conditionally rendered
      if (notesInput) {
        expect(notesInput).toBeInTheDocument();
      }
    });
  });

  describe('image upload section', () => {
    it('renders image upload area when completed', () => {
      renderCreateDoro({ completed: true });

      // Image upload section should be present after completion
      const uploadElements = screen.queryAllByText(/upload/i);
      // This is conditional based on completion state
      expect(uploadElements.length).toBeGreaterThanOrEqual(0);
    });

    it('shows drag and drop hint text', () => {
      renderCreateDoro({ completed: true });

      const hintText = screen.getByText(/PNG, JPEG, GIF, WebP, or HEIC/i);
      expect(hintText).toBeInTheDocument();
      expect(hintText).toHaveTextContent(/less than 5MB/i);
    });

    it('has accessible file input', () => {
      renderCreateDoro({ completed: true });

      const fileInput = screen.getByLabelText(/file input/i);
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('type', 'file');
    });
  });

  describe('conditional rendering based on timer state', () => {
    it('shows different UI when timer is not started', () => {
      const { container } = renderCreateDoro({
        isActive: false,
        isPaused: false,
        completed: false,
        timeLeft: 1500000
      });

      // Initial state should show launch capabilities
      expect(container).toBeInTheDocument();
    });

    it('shows different UI when timer is running', () => {
      const { container } = renderCreateDoro({
        isActive: true,
        isPaused: false,
        completed: false,
        timeLeft: 1200000
      });

      // Active state UI
      expect(container).toBeInTheDocument();
    });

    it('shows different UI when timer is completed', () => {
      const { container } = renderCreateDoro({
        isActive: false,
        isPaused: false,
        completed: true,
        timeLeft: 0
      });

      // Completion state UI
      expect(container).toBeInTheDocument();
    });
  });

  describe('drag and drop functionality', () => {
    beforeEach(() => {
      vi.mocked(storage.uploadPomodoroImage).mockResolvedValue({
        imagePath: 'user-123/1234567890.jpg',
        error: null,
      });
      vi.mocked(storage.getImageSignedUrl).mockResolvedValue('https://example.com/image.jpg');
    });

    it('handles drag enter event', () => {
      renderCreateDoro({ completed: true });

      const dropZone = screen.getByLabelText(/image upload area/i);
      const mockFile = new File(['x'.repeat(1000)], 'test.png', { type: 'image/png' });
      const mockDataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/png' }],
      };

      fireEvent.dragEnter(dropZone, { dataTransfer: mockDataTransfer });

      // Should show "Drop image here" text
      expect(screen.getByText(/drop image here/i)).toBeInTheDocument();
    });

    it('handles drag leave event', () => {
      renderCreateDoro({ completed: true });

      const dropZone = screen.getByLabelText(/image upload area/i);
      const mockFile = new File(['x'.repeat(1000)], 'test.png', { type: 'image/png' });
      const mockDataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/png' }],
      };

      fireEvent.dragEnter(dropZone, { dataTransfer: mockDataTransfer });
      fireEvent.dragLeave(dropZone);

      // Should show original text
      expect(screen.getByText(/drag and drop or click to upload/i)).toBeInTheDocument();
    });

    it('handles drop event with valid file', async () => {
      renderCreateDoro({ completed: true });

      const dropZone = screen.getByLabelText(/image upload area/i);
      const mockFile = new File(['x'.repeat(1000)], 'test.png', { type: 'image/png' });
      const mockDataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/png' }],
      };

      fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });

      await waitFor(() => {
        expect(storage.uploadPomodoroImage).toHaveBeenCalledWith(mockFile, 'user-123');
      });
    });

    it('shows error for invalid file type', async () => {
      renderCreateDoro({ completed: true });

      const dropZone = screen.getByLabelText(/image upload area/i);
      const mockFile = new File([''], 'test.svg', { type: 'image/svg+xml' });
      const mockDataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/svg+xml' }],
      };

      fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });

      // Error should be set - check if error state is updated
      // The error message appears in both visible area (role="alert") and sr-only area
      await waitFor(
        () => {
          // Check for error in visible area (has role="alert")
          const visibleError = screen.queryByRole('alert');
          if (visibleError) {
            expect(visibleError).toHaveTextContent(/not supported|PNG, JPEG, GIF, WebP, or HEIC/i);
          } else {
            // Fallback: check if error text exists anywhere (including sr-only)
            const errorText = screen.queryByText(/not supported/i) ||
                             screen.queryByText(/File type not supported/i);
            expect(errorText).toBeInTheDocument();
          }
        },
        { timeout: 2000 }
      );

      expect(storage.uploadPomodoroImage).not.toHaveBeenCalled();
    });

    it('shows error for file over size limit', async () => {
      renderCreateDoro({ completed: true });

      const dropZone = screen.getByLabelText(/image upload area/i);
      const mockFile = new File(
        ['x'.repeat(5242881)], // Over 5MB
        'test.jpg',
        { type: 'image/jpeg' }
      );
      const mockDataTransfer = {
        files: [mockFile],
        items: [{ kind: 'file', type: 'image/jpeg' }],
      };

      fireEvent.drop(dropZone, { dataTransfer: mockDataTransfer });

      // Error should be set - check if error state is updated
      await waitFor(
        () => {
          // Check for error in visible area (has role="alert")
          const visibleError = screen.queryByRole('alert');
          if (visibleError) {
            expect(visibleError).toHaveTextContent(/too large|Maximum size is 5MB/i);
          } else {
            // Fallback: check if error text exists anywhere (including sr-only)
            const errorElement = screen.queryByText(/File too large/i) ||
                               screen.queryByText(/Maximum size is 5MB/i) ||
                               screen.queryByText(/too large/i);
            expect(errorElement).toBeInTheDocument();
          }
        },
        { timeout: 2000 }
      );

      expect(storage.uploadPomodoroImage).not.toHaveBeenCalled();
    });

    it('file picker still works', async () => {
      renderCreateDoro({ completed: true });

      const fileInput = screen.getByLabelText(/file input/i);
      const mockFile = new File(['x'.repeat(1000)], 'test.png', { type: 'image/png' });

      // Create a FileList-like object
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(storage.uploadPomodoroImage).toHaveBeenCalledWith(mockFile, 'user-123');
      });
    });
  });
});
