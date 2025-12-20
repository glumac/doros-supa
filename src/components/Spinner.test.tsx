import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Spinner from './Spinner';

describe('Spinner Component', () => {
	it('renders correctly', () => {
		render(<Spinner />);
		expect(screen.getByRole('status')).toBeInTheDocument();
	});
});