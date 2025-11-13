import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { insforgeClient } from '../lib/insforge';

// Mock Insforge SDK
vi.mock('../lib/insforge', () => ({
  insforgeClient: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
      })),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the app title', () => {
    render(<App />);
    // Title appears in both the window title and h1, so use getAllByText
    const titles = screen.getAllByText('X Viral Score');
    expect(titles.length).toBeGreaterThan(0);
  });

  it('renders input box', () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/Enter your post content here/i)).toBeInTheDocument();
  });

  it('shows error when API call fails', async () => {
    const user = userEvent.setup();
    insforgeClient.functions.invoke.mockRejectedValueOnce(new Error('Network error'));

    render(<App />);
    
    const textarea = screen.getByPlaceholderText(/Enter your post content here/i);
    const button = screen.getByRole('button', { name: /analyze/i });

    await user.type(textarea, 'Test post content');
    await user.click(button);

    await waitFor(() => {
      // ErrorDialog displays the error message, which is "Network error" in this case
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows error when API returns error response', async () => {
    const user = userEvent.setup();
    insforgeClient.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Invalid request', error: 'Invalid request' },
    });

    render(<App />);
    
    const textarea = screen.getByPlaceholderText(/Enter your post content here/i);
    const button = screen.getByRole('button', { name: /analyze/i });

    await user.type(textarea, 'Test post content');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/Invalid request/i)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays result when API call succeeds', async () => {
    const user = userEvent.setup();
    const mockResult = {
      overall_score: 75,
      predicted_reach: 'High',
      factors: {
        hook_strength: 80,
        clarity_and_structure: 70,
        emotional_intensity: 75,
        controversy_polarization: 60,
        novelty_originality: 65,
        shareability: 85,
        format_fit_for_x: 70,
        media_boost: 50,
        author_leverage: 80,
        trend_alignment: 75,
      },
      short_explanation: 'Test explanation',
      detailed_reasons: ['Reason 1', 'Reason 2'],
      improvement_suggestions: ['Suggestion 1'],
    };

    insforgeClient.functions.invoke.mockResolvedValueOnce({
      data: mockResult,
      error: null,
    });

    render(<App />);
    
    const textarea = screen.getByPlaceholderText(/Enter your post content here/i);
    const button = screen.getByRole('button', { name: /analyze/i });

    await user.type(textarea, 'Test post content');
    await user.click(button);

    await waitFor(() => {
      // Use getAllByText since 75 appears multiple times (overall score and factor scores)
      const scoreElements = screen.getAllByText('75');
      expect(scoreElements.length).toBeGreaterThan(0);
      expect(screen.getByText('High')).toBeInTheDocument();
      expect(screen.getByText('Test explanation')).toBeInTheDocument();
    }, { timeout: 5000 });

    expect(insforgeClient.functions.invoke).toHaveBeenCalledWith('score', {
      body: {
        text: 'Test post content',
        imageUrls: [],
      },
    });
  });

  it('shows loading state during API call', async () => {
    const user = userEvent.setup();
    let resolveInvoke;
    const invokePromise = new Promise((resolve) => {
      resolveInvoke = resolve;
    });

    insforgeClient.functions.invoke.mockReturnValueOnce(invokePromise);

    render(<App />);
    
    const textarea = screen.getByPlaceholderText(/Enter your post content here/i);
    const button = screen.getByRole('button', { name: /analyze/i });

    await user.type(textarea, 'Test post content');
    await user.click(button);

    // Check that button is disabled during loading
    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    // Check for progress bar or loading text
    expect(screen.getByText(/Preparing analysis|Sending request|AI analyzing/i)).toBeInTheDocument();

    resolveInvoke({
      data: { overall_score: 50, predicted_reach: 'Medium', factors: {} },
      error: null,
    });
  });
});

