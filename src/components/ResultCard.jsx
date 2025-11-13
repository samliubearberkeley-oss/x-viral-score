import React from 'react';
import '../styles/components.css';

function ResultCard({ 
  overall_score, 
  predicted_reach, 
  factors, 
  short_explanation, 
  detailed_reasons, 
  improvement_suggestions, 
  url 
}) {
  // Helper function to format factor names
  const formatFactorName = (name) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper function to get reach color
  const getReachColor = (reach) => {
    switch (reach) {
      case 'Explosive':
        return { bg: 'var(--color-error)', text: 'white' };
      case 'High':
        return { bg: 'var(--color-orange)', text: 'white' };
      case 'Medium':
        return { bg: 'var(--color-yellow)', text: 'var(--color-ink)' };
      case 'Low':
        return { bg: 'var(--color-ink-soft)', text: 'white' };
      default:
        return { bg: 'var(--color-ink-soft)', text: 'white' };
    }
  };

  // Helper function to get score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--color-error)';
    if (score >= 60) return 'var(--color-orange)';
    if (score >= 40) return 'var(--color-yellow)';
    return 'var(--color-ink-soft)';
  };

  // Helper function to get progress bar color
  const getProgressColor = (value) => {
    if (value >= 80) return 'var(--color-error)';
    if (value >= 60) return 'var(--color-orange)';
    if (value >= 40) return 'var(--color-yellow)';
    return 'var(--color-blue)';
  };

  const reachColors = getReachColor(predicted_reach);

  return (
    <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '20px', borderTop: 'var(--stroke-width) solid var(--color-ink)', paddingTop: '24px' }}>
      {/* Overall Score */}
      <div className="doodle-card" style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: '64px', fontWeight: 700, color: getScoreColor(overall_score), lineHeight: '1' }}>
          {overall_score}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--color-ink)', marginTop: '8px', fontWeight: 600 }}>/ 100</div>
        <div style={{
          display: 'inline-block',
          marginTop: '12px',
          padding: '6px 16px',
          fontSize: '11px',
          fontWeight: 700,
          border: 'var(--stroke-width) solid var(--color-ink)',
          background: reachColors.bg,
          color: reachColors.text,
          boxShadow: 'var(--shadow)',
          borderRadius: 'var(--radius-small)'
        }}>
          {predicted_reach}
        </div>
      </div>

      {/* Short Explanation */}
      {short_explanation && (
        <div className="doodle-card" style={{ 
          fontSize: '13px', 
          color: 'var(--color-ink)', 
          fontStyle: 'italic',
          borderLeft: '4px solid var(--color-blue)',
          paddingLeft: '12px',
          padding: '10px 12px',
          background: 'white'
        }}>
          {short_explanation}
        </div>
      )}

      {/* Factors - Show only most important ones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)', borderBottom: 'var(--stroke-width) solid var(--color-ink)', paddingBottom: '4px' }}>Factors</h3>
        {(() => {
          // Define priority factors to show (most impactful for virality)
          const priorityFactors = [
            'hook_strength',
            'shareability',
            'media_boost',
            'emotional_intensity',
            'format_fit_for_x'
          ];
          
          // Get factors to display: priority factors that exist, sorted by value (highest first)
          const factorsToShow = Object.entries(factors)
            .filter(([key]) => priorityFactors.includes(key))
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5); // Show top 5
          
          return factorsToShow.map(([key, value]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 600 }}>
                <span style={{ color: 'var(--color-ink)' }}>{formatFactorName(key)}</span>
                <span style={{ color: 'var(--color-ink)' }}>{value}</span>
              </div>
              <div style={{ width: '100%', background: '#E8E0D2', border: 'var(--stroke-width) solid var(--color-ink)', height: '16px', position: 'relative', borderRadius: 'var(--radius-small)' }}>
                <div
                  style={{ 
                    height: '100%', 
                    borderRight: 'var(--stroke-width) solid var(--color-ink)',
                    transition: 'width 0.3s ease-out',
                    background: getProgressColor(value),
                    width: `${value}%`,
                    borderRadius: 'var(--radius-small) 0 0 var(--radius-small)'
                  }}
                />
              </div>
            </div>
          ));
        })()}
      </div>

      {/* Detailed Reasons - Show only top 3-4 most important */}
      {detailed_reasons && detailed_reasons.length > 0 && (
        <div className="doodle-card" style={{ padding: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)', borderBottom: '1px solid var(--color-ink)', paddingBottom: '4px', marginBottom: '8px' }}>Why this score</h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', padding: 0, listStyle: 'none' }}>
            {detailed_reasons.slice(0, 4).map((reason, index) => (
              <li key={index} style={{ fontSize: '13px', color: 'var(--color-ink)', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-blue)', marginRight: '8px', fontWeight: 700 }}>•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Improvement Suggestions - Show only top 3 most important */}
      {improvement_suggestions && improvement_suggestions.length > 0 && (
        <div className="doodle-card" style={{ padding: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-ink)', borderBottom: '1px solid var(--color-ink)', paddingBottom: '4px', marginBottom: '8px' }}>How to improve</h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', padding: 0, listStyle: 'none' }}>
            {improvement_suggestions.slice(0, 3).map((suggestion, index) => (
              <li key={index} style={{ fontSize: '13px', color: 'var(--color-ink)', display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-orange)', marginRight: '8px', fontWeight: 700 }}>→</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ResultCard;

