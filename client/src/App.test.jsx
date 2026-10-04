import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.jsx';

describe('App Component', () => {
  it('renders RoomieMatch heading', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { name: /RoomieMatch/i });
    expect(heading).toBeInTheDocument();
  });
});
