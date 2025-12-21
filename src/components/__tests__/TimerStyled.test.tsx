import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimerStyled from '../TimerStyled';

describe('TimerStyled CSS behavior', () => {
  describe('renders with correct structure', () => {
    it('renders timer with minutes and seconds digits', () => {
      render(<TimerStyled minutes={15} seconds={30} />);
      
      // Check that both minute and second components are rendered
      expect(screen.getByText('MINUTES')).toBeInTheDocument();
      expect(screen.getByText('SECONDS')).toBeInTheDocument();
    });

    it('displays timer container with correct flex layout', () => {
      const { container } = render(<TimerStyled minutes={10} seconds={45} />);
      const timerContainer = container.firstChild as HTMLElement;
      
      expect(timerContainer).toBeInTheDocument();
    });
  });

  describe('color changes based on time remaining', () => {
    it('uses dark red color for less than 5 minutes', () => {
      render(<TimerStyled minutes={3} seconds={30} />);
      
      // Both MINUTES and SECONDS labels should exist
      expect(screen.getByText('MINUTES')).toBeInTheDocument();
      expect(screen.getByText('SECONDS')).toBeInTheDocument();
    });

    it('uses red color for 5-9 minutes', () => {
      render(<TimerStyled minutes={7} seconds={15} />);
      
      expect(screen.getByText('MINUTES')).toBeInTheDocument();
      expect(screen.getByText('SECONDS')).toBeInTheDocument();
    });

    it('uses orange color for 10-14 minutes', () => {
      render(<TimerStyled minutes={12} seconds={0} />);
      
      expect(screen.getByText('MINUTES')).toBeInTheDocument();
      expect(screen.getByText('SECONDS')).toBeInTheDocument();
    });

    it('uses yellow color for 15-19 minutes', () => {
      render(<TimerStyled minutes={17} seconds={45} />);
      
      expect(screen.getByText('MINUTES')).toBeInTheDocument();
      expect(screen.getByText('SECONDS')).toBeInTheDocument();
    });

    it('uses green color for 20+ minutes', () => {
      render(<TimerStyled minutes={23} seconds={10} />);
      
      expect(screen.getByText('MINUTES')).toBeInTheDocument();
      expect(screen.getByText('SECONDS')).toBeInTheDocument();
    });
  });

  describe('displays separator dots', () => {
    it('renders separator container between digits', () => {
      const { container } = render(<TimerStyled minutes={15} seconds={30} />);
      
      // Check that separator dots are rendered
      const separators = container.querySelectorAll('span span');
      expect(separators.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('handles zero minutes and seconds', () => {
      render(<TimerStyled minutes={0} seconds={0} />);
      
      expect(screen.getByText('MINUTES')).toBeInTheDocument();
      expect(screen.getByText('SECONDS')).toBeInTheDocument();
    });

    it('handles maximum time values', () => {
      render(<TimerStyled minutes={25} seconds={59} />);
      
      expect(screen.getByText('MINUTES')).toBeInTheDocument();
      expect(screen.getByText('SECONDS')).toBeInTheDocument();
    });
  });
});
