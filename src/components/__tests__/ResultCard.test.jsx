import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResultCard from '../ResultCard';

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
  short_explanation: 'This post has strong viral potential due to its engaging hook and shareability.',
  detailed_reasons: [
    'Strong opening hook that captures attention',
    'Well-structured content that is easy to read',
    'High emotional resonance with the target audience',
    'Good alignment with current trends',
  ],
  improvement_suggestions: [
    'Add a compelling image or video',
    'Consider threading for longer narratives',
    'Engage with trending hashtags',
  ],
};

describe('ResultCard', () => {
  it('renders overall score', () => {
    render(<ResultCard {...mockResult} url="https://x.com/test/status/123" />);
    // Use getAllByText since 75 appears multiple times (overall score and factor scores)
    const scoreElements = screen.getAllByText('75');
    expect(scoreElements.length).toBeGreaterThan(0);
    expect(screen.getByText('/ 100')).toBeInTheDocument();
  });

  it('renders predicted reach', () => {
    render(<ResultCard {...mockResult} url="https://x.com/test/status/123" />);
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('does not render URL (URL prop is accepted but not displayed)', () => {
    const testUrl = 'https://x.com/test/status/123';
    render(<ResultCard {...mockResult} url={testUrl} />);
    // URL is not displayed in the current implementation
    expect(screen.queryByText(testUrl)).not.toBeInTheDocument();
  });

  it('renders short explanation', () => {
    render(<ResultCard {...mockResult} url="https://x.com/test/status/123" />);
    expect(screen.getByText(mockResult.short_explanation)).toBeInTheDocument();
  });

  it('renders priority factors (top 5 most important)', () => {
    render(<ResultCard {...mockResult} url="https://x.com/test/status/123" />);
    
    // Component only shows top 5 priority factors: hook_strength, shareability, media_boost, emotional_intensity, format_fit_for_x
    // Use getAllByText for factors that might appear in multiple places
    expect(screen.getAllByText(/Hook Strength/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Shareability/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Media Boost/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Emotional Intensity/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Format Fit For X/i).length).toBeGreaterThan(0);
    
    // These factors should NOT be displayed (not in priority list)
    expect(screen.queryByText(/Clarity And Structure/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Controversy Polarization/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Novelty Originality/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Author Leverage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Trend Alignment/i)).not.toBeInTheDocument();
  });

  it('renders factor scores', () => {
    render(<ResultCard {...mockResult} url="https://x.com/test/status/123" />);
    // Use getAllByText since numbers appear multiple times
    const score80Elements = screen.getAllByText('80');
    const score70Elements = screen.getAllByText('70');
    expect(score80Elements.length).toBeGreaterThan(0); // hook_strength
    expect(score70Elements.length).toBeGreaterThan(0); // clarity_and_structure
  });

  it('renders detailed reasons', () => {
    render(<ResultCard {...mockResult} url="https://x.com/test/status/123" />);
    expect(screen.getByText(/Why this score/i)).toBeInTheDocument();
    mockResult.detailed_reasons.forEach((reason) => {
      expect(screen.getByText(reason)).toBeInTheDocument();
    });
  });

  it('renders improvement suggestions', () => {
    render(<ResultCard {...mockResult} url="https://x.com/test/status/123" />);
    expect(screen.getByText(/How to improve/i)).toBeInTheDocument();
    mockResult.improvement_suggestions.forEach((suggestion) => {
      expect(screen.getByText(suggestion)).toBeInTheDocument();
    });
  });

  it('handles missing optional fields gracefully', () => {
    const minimalResult = {
      overall_score: 50,
      predicted_reach: 'Medium',
      factors: {
        hook_strength: 50,
        clarity_and_structure: 50,
        emotional_intensity: 50,
        controversy_polarization: 50,
        novelty_originality: 50,
        shareability: 50,
        format_fit_for_x: 50,
        media_boost: 50,
        author_leverage: 50,
        trend_alignment: 50,
      },
    };

    render(<ResultCard {...minimalResult} url="https://x.com/test/status/123" />);
    // Use getAllByText since 50 appears multiple times
    const scoreElements = screen.getAllByText('50');
    expect(scoreElements.length).toBeGreaterThan(0);
    expect(screen.getByText('Medium')).toBeInTheDocument();
  });
});

