import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import TimerBanner from '../TimerBanner';
import DoroContext from '../../utils/DoroContext';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockDoroContextValue = {
  task: 'Test Task',
  setTask: vi.fn(),
  launchAt: new Date().toISOString(),
  setLaunchAt: vi.fn(),
  completed: false,
  setCompleted: vi.fn(),
  timeLeft: 1500000, // 25 minutes in ms
  setTimeLeft: vi.fn(),
  isActive: true,
  setIsActive: vi.fn(),
  isPaused: false,
  setIsPaused: vi.fn(),
  inProgress: true,
  setInProgress: vi.fn(),
};

const renderTimerBanner = (contextOverrides = {}, route = '/') => {
  const contextValue = { ...mockDoroContextValue, ...contextOverrides };

  return render(
    <MemoryRouter initialEntries={[route]} future={{ v7_relativeSplatPath: true }}>
      <DoroContext.Provider value={contextValue}>
        <TimerBanner />
      </DoroContext.Provider>
    </MemoryRouter>
  );
};

describe('TimerBanner CSS behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('conditional visibility', () => {
    it('is visible when timer is active', () => {
      renderTimerBanner({ isActive: true });

      expect(screen.getByText('Pomodoro in Progress')).toBeInTheDocument();
    });

    it('is not visible when timer is inactive', () => {
      renderTimerBanner({ isActive: false });

      expect(screen.queryByText('Pomodoro in Progress')).not.toBeInTheDocument();
    });

    it('is not visible on create-doro page even when active', () => {
      renderTimerBanner({ isActive: true }, '/create-doro');

      expect(screen.queryByText('Pomodoro in Progress')).not.toBeInTheDocument();
    });

    it('is visible on other pages when active', () => {
      renderTimerBanner({ isActive: true }, '/feed');

      expect(screen.getByText('Pomodoro in Progress')).toBeInTheDocument();
    });
  });

  describe('banner styling and appearance', () => {
    it('applies correct background and hover classes', () => {
      const { container } = renderTimerBanner({ isActive: true });

      const banner = container.querySelector('.bg-red-600');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveClass(
        'hover:bg-red-700',
        'text-white',
        'rounded-lg',
        'shadow-lg',
        'cursor-pointer'
      );
    });

    it('applies transition and transform classes for animation', () => {
      const { container } = renderTimerBanner({ isActive: true });

      const banner = container.querySelector('.bg-red-600');
      expect(banner).toHaveClass(
        'transition-all',
        'duration-300',
        'transform',
        'hover:scale-[1.01]'
      );
    });

    it('applies correct padding and margin', () => {
      const { container } = renderTimerBanner({ isActive: true });

      const banner = container.querySelector('.bg-red-600');
      expect(banner).toHaveClass('py-3', 'px-4', 'mt-2', 'mb-4');
    });
  });

  describe('pause state display', () => {
    it('shows "Pomodoro in Progress" when not paused', () => {
      renderTimerBanner({ isActive: true, isPaused: false });

      expect(screen.getByText('Pomodoro in Progress')).toBeInTheDocument();
    });

    it('shows "Pomodoro Paused" when paused', () => {
      renderTimerBanner({ isActive: true, isPaused: true });

      expect(screen.getByText('Pomodoro Paused')).toBeInTheDocument();
    });
  });

  describe('task display', () => {
    it('displays task name when provided', () => {
      renderTimerBanner({ isActive: true, task: 'Write unit tests' });

      expect(screen.getByText('Write unit tests')).toBeInTheDocument();
    });

    it('applies correct styling to task text', () => {
      renderTimerBanner({ isActive: true, task: 'My task' });

      const taskElement = screen.getByText('My task');
      expect(taskElement).toHaveClass('text-sm', 'text-red-100');
    });

    it('renders without task when not provided', () => {
      renderTimerBanner({ isActive: true, task: '' });

      // Should still show the banner but without task text
      expect(screen.getByText('Pomodoro in Progress')).toBeInTheDocument();
      expect(screen.queryByText('My task')).not.toBeInTheDocument();
    });
  });

  describe('timer display', () => {
    it('displays time in MM:SS format', () => {
      renderTimerBanner({ isActive: true, timeLeft: 1500000 }); // 25:00

      expect(screen.getByText('25:00')).toBeInTheDocument();
    });

    it('pads single digit minutes and seconds', () => {
      renderTimerBanner({ isActive: true, timeLeft: 65000 }); // 1:05

      expect(screen.getByText('01:05')).toBeInTheDocument();
    });

    it('applies font styling to timer display', () => {
      renderTimerBanner({ isActive: true, timeLeft: 1500000 });

      const timerElement = screen.getByText('25:00');
      expect(timerElement).toHaveClass('text-3xl', 'font-bold', 'font-mono', 'tracking-wider');
    });

    it('shows 00:00 when timeLeft is 0', () => {
      renderTimerBanner({ isActive: true, timeLeft: 0 });

      expect(screen.getByText('00:00')).toBeInTheDocument();
    });
  });

  describe('tomato icon animation', () => {
    it('displays tomato icon with pulse animation', () => {
      const { container } = renderTimerBanner({ isActive: true });

      const tomatoIcon = container.querySelector('.animate-pulse');
      expect(tomatoIcon).toBeInTheDocument();
      expect(tomatoIcon).toHaveClass('text-3xl');
    });
  });

  describe('responsive design', () => {
    it('hides "Click to view" text on mobile', () => {
      renderTimerBanner({ isActive: true });

      const clickText = screen.getByText('Click to view →');
      expect(clickText).toHaveClass('hidden', 'md:block');
    });

    it('applies max-width to inner container', () => {
      const { container } = renderTimerBanner({ isActive: true });

      const innerContainer = container.querySelector('.max-w-7xl');
      expect(innerContainer).toBeInTheDocument();
      expect(innerContainer).toHaveClass('mx-auto');
    });
  });

  describe('click interaction', () => {
    it('is clickable and navigates to create-doro', async () => {
      const { container } = renderTimerBanner({ isActive: true }, '/feed');
      const user = userEvent.setup();

      const banner = container.querySelector('.cursor-pointer');
      expect(banner).toBeInTheDocument();

      if (banner) {
        await user.click(banner);
        expect(mockNavigate).toHaveBeenCalledWith('/create-doro');
      }
    });
  });

  describe('layout structure', () => {
    it('uses flexbox for horizontal layout', () => {
      const { container } = renderTimerBanner({ isActive: true });

      const innerContainer = container.querySelector('.flex.items-center.justify-between');
      expect(innerContainer).toBeInTheDocument();
    });

    it('groups icon and text with gap', () => {
      const { container } = renderTimerBanner({ isActive: true });

      const leftGroup = container.querySelector('.flex.items-center.gap-3');
      expect(leftGroup).toBeInTheDocument();
    });

    it('groups timer and click hint with gap', () => {
      const { container } = renderTimerBanner({ isActive: true });

      const rightGroup = container.querySelector('.flex.items-center.gap-4');
      expect(rightGroup).toBeInTheDocument();
    });
  });
});
