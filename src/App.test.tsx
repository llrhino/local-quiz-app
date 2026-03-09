import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import App from './App';

describe('App', () => {
  it('renders the application shell and home page', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Local Quiz App' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Quiz Packs' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Settings' }),
    ).toHaveAttribute('href', '/settings');
    expect(
      screen.getByRole('button', { name: 'Import Quiz Pack' }),
    ).toBeDisabled();
  });
});
