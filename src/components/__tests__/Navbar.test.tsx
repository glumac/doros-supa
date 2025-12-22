import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Navbar from '../Navbar';

const mockUser = {
  _id: 'user-123',
  image: 'https://example.com/avatar.jpg',
  userName: 'Test User',
};

const renderNavbar = (props = {}, route = '/') => {
  const defaultProps = {
    user: mockUser,
    searchTerm: '',
    setSearchTerm: () => {},
    ...props,
  };

  return render(
    <MemoryRouter initialEntries={[route]} future={{ v7_relativeSplatPath: true }}>
      <Navbar {...defaultProps} />
    </MemoryRouter>
  );
};

describe('Navbar CSS behavior', () => {
  describe('visibility based on user state', () => {
    it('renders navbar when user is logged in', () => {
      const { container } = renderNavbar();

      expect(container.querySelector('.cq-navbar-container')).toBeInTheDocument();
    });

    it('returns null when user is not logged in', () => {
      const { container } = renderNavbar({ user: null });

      expect(container.firstChild).toBeNull();
    });
  });

  describe('launch pomodoro button visibility', () => {
    it('shows launch pomodoro button on non-create-doro pages', () => {
      renderNavbar({}, '/');

      const launchButton = screen.getByRole('link', { name: /launch pomodoro/i });
      expect(launchButton).toBeInTheDocument();
      expect(launchButton).toHaveClass('bg-red-600', 'hover:bg-red-700');
    });

    it('hides launch pomodoro button on create-doro page', () => {
      renderNavbar({}, '/create-doro');

      expect(screen.queryByRole('link', { name: /launch pomodoro/i })).not.toBeInTheDocument();
    });
  });

  describe('button styling and layout', () => {
    it('applies correct flex layout classes', () => {
      const { container } = renderNavbar();

      const mainContainer = container.querySelector('.cq-navbar-container');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('flex', 'gap-2', 'justify-end', 'md:gap-5', 'w-full', 'mt-5', 'pb-7');
    });

    it('applies red background with hover effect to launch button', () => {
      renderNavbar({}, '/');

      const launchButton = screen.getByRole('link', { name: /launch pomodoro/i });
      expect(launchButton).toHaveClass(
        'bg-red-600',
        'hover:bg-red-700',
        'font-semibold',
        'transition'
      );
    });

    it('displays tomato icon with text', () => {
      renderNavbar({}, '/');

      const launchButton = screen.getByRole('link', { name: /launch pomodoro/i });
      expect(launchButton).toHaveClass('flex', 'gap-2', 'items-center');
      expect(screen.getByText('Launch pomodoro')).toBeInTheDocument();
    });
  });

  describe('user profile image', () => {
    it('displays user profile image as link', () => {
      renderNavbar();

      const profileLink = screen.getByRole('link', { name: /user-pic/i });
      expect(profileLink).toBeInTheDocument();
      expect(profileLink).toHaveAttribute('href', '/user/user-123');
    });

    it('applies responsive visibility to profile image', () => {
      renderNavbar();

      const profileLink = screen.getByRole('link', { name: /user-pic/i });
      expect(profileLink).toHaveClass('hidden', 'md:block', 'hover:shadow-md');
    });

    it('displays profile image with correct size and styling', () => {
      renderNavbar();

      const profileImage = screen.getByAltText('user-pic');
      expect(profileImage).toHaveClass('w-14', 'h-12', 'rounded-lg');
      expect(profileImage).toHaveAttribute('src', mockUser.image);
    });
  });

  describe('responsive layout', () => {
    it('applies responsive gap classes', () => {
      const { container } = renderNavbar();

      const mainContainer = container.querySelector('.cq-navbar-container');
      expect(mainContainer).toHaveClass('flex', 'gap-2', 'md:gap-5');
    });

    it('hides profile image on mobile with md:block', () => {
      renderNavbar();

      const profileLink = screen.getByRole('link', { name: /user-pic/i });
      expect(profileLink).toHaveClass('hidden', 'md:block');
    });

    it('applies responsive height to launch button', () => {
      renderNavbar({}, '/');

      const launchButton = screen.getByRole('link', { name: /launch pomodoro/i });
      expect(launchButton).toHaveClass('h-12', 'md:h-12');
    });
  });

  describe('button dimensions and spacing', () => {
    it('applies correct padding to launch button', () => {
      renderNavbar({}, '/');

      const launchButton = screen.getByRole('link', { name: /launch pomodoro/i });
      expect(launchButton).toHaveClass('px-4', 'rounded-lg');
    });

    it('applies correct text size to launch button', () => {
      renderNavbar({}, '/');

      const launchButton = screen.getByRole('link', { name: /launch pomodoro/i });
      expect(launchButton).toHaveClass('text-2xl');
    });
  });
});
