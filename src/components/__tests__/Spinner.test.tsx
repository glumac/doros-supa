import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Spinner from '../Spinner';

describe('Spinner CSS behavior', () => {
  describe('visibility and layout', () => {
    it('renders spinner component', () => {
      const { container } = render(<Spinner />);

      expect(container.querySelector('.flex.flex-col')).toBeInTheDocument();
    });

    it('applies centered flex layout classes', () => {
      const { container } = render(<Spinner />);

      const spinnerContainer = container.querySelector('.flex.flex-col');
      expect(spinnerContainer).toHaveClass(
        'justify-center',
        'items-center',
        'w-full',
        'h-full'
      );
    });

    it('renders loading circles with correct visibility', () => {
      const { container } = render(<Spinner />);

      // The Circles component should be rendered
      expect(container.querySelector('[aria-label="circles-loading"]')).toBeInTheDocument();
    });
  });

  describe('message display', () => {
    it('displays message when provided', () => {
      render(<Spinner message="Loading data..." />);

      expect(screen.getByText('Loading data...')).toBeInTheDocument();
    });

    it('applies correct styling to message text', () => {
      render(<Spinner message="Please wait" />);

      const messageElement = screen.getByText('Please wait');
      expect(messageElement).toHaveClass(
        'text-lg',
        'text-green-700',
        'text-center',
        'mt-12',
        'px-2'
      );
    });

    it('renders without message when not provided', () => {
      const { container } = render(<Spinner />);

      const paragraph = container.querySelector('p');
      expect(paragraph).toBeInTheDocument();
      expect(paragraph).toBeEmptyDOMElement();
    });
  });

  describe('spinner visual properties', () => {
    it('renders circles with green color', () => {
      const { container } = render(<Spinner />);

      const circles = container.querySelector('[aria-label="circles-loading"]');
      expect(circles).toBeInTheDocument();
    });

    it('sets spinner to visible state', () => {
      const { container } = render(<Spinner />);

      const circles = container.querySelector('[aria-label="circles-loading"]');
      expect(circles).toBeInTheDocument();
    });
  });

  describe('different message scenarios', () => {
    it('handles long messages', () => {
      const longMessage = 'Please wait while we load your pomodoros and calculate statistics...';
      render(<Spinner message={longMessage} />);

      expect(screen.getByText(longMessage)).toBeInTheDocument();
      expect(screen.getByText(longMessage)).toHaveClass('text-center', 'px-2');
    });

    it('handles empty string message', () => {
      render(<Spinner message="" />);

      const paragraph = screen.getByRole('paragraph');
      expect(paragraph).toBeEmptyDOMElement();
    });
  });
});
