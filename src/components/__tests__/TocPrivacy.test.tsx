import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import TocPrivacy from '../TocPrivacy';
import { AuthContext } from '../../contexts/AuthContext';

// Mock the AuthContext to test public access
const renderTocPrivacy = (user = null, loading = false) => {
  return render(
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <AuthContext.Provider value={{ user, session: null, userProfile: null, loading }}>
        <TocPrivacy />
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

const renderWithRouter = (initialPath = '/toc-privacy') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]} future={{ v7_relativeSplatPath: true }}>
      <AuthContext.Provider value={{ user: null, session: null, userProfile: null, loading: false }}>
        <TocPrivacy />
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('TocPrivacy - Public Access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Public accessibility', () => {
    it('renders without authentication', () => {
      renderTocPrivacy(null, false);

      expect(screen.getByText(/CRUSH QUEST - Terms of Service & Privacy Policy/i)).toBeInTheDocument();
    });

    it('renders when user is null', () => {
      renderTocPrivacy(null, false);

      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });

    it('renders even when loading is true', () => {
      renderTocPrivacy(null, true);

      // Should still render content, not a loading spinner
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
    });

    it('renders with authenticated user (should still be accessible)', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      renderTocPrivacy(mockUser, false);

      // Should still render content even when authenticated
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });
  });

  describe('Content rendering', () => {
    it('displays the main title', () => {
      renderTocPrivacy();

      const title = screen.getByText(/CRUSH QUEST - Terms of Service & Privacy Policy/i);
      expect(title).toBeInTheDocument();
      expect(title).toHaveClass('text-3xl', 'font-bold', 'mb-8', 'text-center');
    });

    it('displays Privacy Policy section', () => {
      renderTocPrivacy();

      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      const lastUpdatedTexts = screen.getAllByText(/Last Updated:/i);
      expect(lastUpdatedTexts.length).toBeGreaterThan(0);
      // Copy was updated; keep matcher resilient to minor whitespace changes.
      expect(
        screen.getByText(
          /Mike is providing this social productivity app free of charge\..*He is\s*committed to protecting your privacy and personal information\./i,
        ),
      ).toBeInTheDocument();
    });

    it('displays Terms of Service section', () => {
      renderTocPrivacy();

      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText(/By accessing and using this application/i)).toBeInTheDocument();
    });

    it('displays all Privacy Policy subsections', () => {
      renderTocPrivacy();

      expect(screen.getByText('Data Collection and Usage')).toBeInTheDocument();
      expect(screen.getByText('Data Sharing and Selling')).toBeInTheDocument();
      expect(screen.getByText('Data Security')).toBeInTheDocument();
      expect(screen.getByText('Your Rights')).toBeInTheDocument();
      expect(screen.getByText('Changes to This Policy')).toBeInTheDocument();
    });

    it('displays all Terms of Service subsections', () => {
      renderTocPrivacy();

      expect(screen.getByText('Free Service')).toBeInTheDocument();
      expect(screen.getByText('As-Is Service')).toBeInTheDocument();
      expect(screen.getByText('Limitation of Liability')).toBeInTheDocument();
      expect(screen.getByText('User Conduct')).toBeInTheDocument();
      expect(screen.getByText('Account Responsibility')).toBeInTheDocument();
      expect(screen.getByText('Service Modifications')).toBeInTheDocument();
      expect(screen.getByText('Changes to Terms')).toBeInTheDocument();
    });

    it('displays key privacy statements', () => {
      renderTocPrivacy();

      expect(screen.getByText(/We do not sell, rent, or share your personal data with third parties/i)).toBeInTheDocument();
    });

    it('displays key terms statements', () => {
      renderTocPrivacy();

      expect(screen.getByText(/This application is provided "as-is" without any warranties/i)).toBeInTheDocument();
      // "free of charge" appears in both sections, so check for the Terms of Service specific version
      expect(screen.getByText(/This application is provided free of charge. There are no fees associated/i)).toBeInTheDocument();
    });
  });

  describe('Layout and styling', () => {
    it('has full-page layout with background', () => {
      const { container } = renderTocPrivacy();

      const mainContainer = container.querySelector('.toc-privacy-container');
      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('min-h-screen', 'bg-gray-50', 'py-10', 'px-5');
    });

    it('has centered content container', () => {
      const { container } = renderTocPrivacy();

      const contentContainer = container.querySelector('.max-w-3xl');
      expect(contentContainer).toBeInTheDocument();
      expect(contentContainer).toHaveClass('mx-auto');
    });

    it('has styled sections with white background', () => {
      const { container } = renderTocPrivacy();

      const sections = container.querySelectorAll('.toc-privacy-section');
      expect(sections.length).toBe(2); // Privacy Policy and Terms of Service

      sections.forEach(section => {
        expect(section).toHaveClass('bg-white', 'rounded-xl', 'p-6', 'shadow-md');
      });
    });

    it('has proper spacing between sections', () => {
      const { container } = renderTocPrivacy();

      const privacySection = container.querySelectorAll('.toc-privacy-section')[0];
      expect(privacySection).toHaveClass('mb-6');
    });
  });

  describe('No sidebar or navigation', () => {
    it('does not render sidebar component', () => {
      const { container } = renderTocPrivacy();

      // Sidebar would have specific classes or elements - verify they're not present
      const sidebar = container.querySelector('[class*="sidebar"]');
      expect(sidebar).not.toBeInTheDocument();
    });

    it('does not render navbar component', () => {
      const { container } = renderTocPrivacy();

      // Navbar would have specific classes or elements - verify they're not present
      const navbar = container.querySelector('[class*="navbar"]');
      expect(navbar).not.toBeInTheDocument();
    });

    it('does not render follow requests banner', () => {
      const { container } = renderTocPrivacy();

      const banner = container.querySelector('[class*="follow-request"]');
      expect(banner).not.toBeInTheDocument();
    });

    it('does not render timer banner', () => {
      const { container } = renderTocPrivacy();

      const timerBanner = container.querySelector('[class*="timer"]');
      expect(timerBanner).not.toBeInTheDocument();
    });
  });

  describe('Route accessibility', () => {
    it('can be accessed via /toc-privacy route', () => {
      renderWithRouter('/toc-privacy');

      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
    });

    it('renders correctly when accessed directly', () => {
      // Simulate direct navigation to the route
      renderWithRouter('/toc-privacy');

      const title = screen.getByText(/CRUSH QUEST - Terms of Service & Privacy Policy/i);
      expect(title).toBeInTheDocument();
    });
  });

  describe('Content accuracy', () => {
    it('displays current date for Last Updated', () => {
      renderTocPrivacy();

      const lastUpdatedTexts = screen.getAllByText(/Last Updated:/i);
      expect(lastUpdatedTexts.length).toBe(2); // One in Privacy Policy, one in Terms of Service

      // Should contain today's date in the parent paragraph
      const today = new Date().toLocaleDateString();
      lastUpdatedTexts.forEach(element => {
        const parentParagraph = element.closest('p');
        expect(parentParagraph?.textContent).toContain(today);
      });
    });

    it('contains all required privacy policy content', () => {
      renderTocPrivacy();

      expect(screen.getByText(/We collect only the information necessary to provide the service/i)).toBeInTheDocument();
      expect(screen.getByText(/We implement reasonable security measures/i)).toBeInTheDocument();
      expect(screen.getByText(/You have the right to access, modify, or delete your personal information/i)).toBeInTheDocument();
    });

    it('contains all required terms of service content', () => {
      renderTocPrivacy();

      expect(screen.getByText(/There are no fees associated with using the basic features/i)).toBeInTheDocument();
      expect(screen.getByText(/We reserve the right to modify, suspend, or discontinue the service/i)).toBeInTheDocument();
      expect(screen.getByText(/You are responsible for maintaining the confidentiality of your account credentials/i)).toBeInTheDocument();
    });
  });
});

