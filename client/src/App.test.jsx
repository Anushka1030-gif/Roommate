import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App Component', () => {
  it('renders RoomieMatch brand and home elements', () => {
    render(<App />);
    const brandElement = screen.getByText(/RoomieMatch/i, { selector: 'span' });
    expect(brandElement).toBeInTheDocument();

    const homeHeading = screen.getByRole('heading', { name: /find your ideal roommate/i });
    expect(homeHeading).toBeInTheDocument();
  });
});
