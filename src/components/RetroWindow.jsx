import React from 'react';
import '../styles/components.css';

function RetroWindow({ title, children, showControls = true, className = '', headerColor = 'blue' }) {
  const headerClass = headerColor === 'yellow' 
    ? 'doodle-panel--header-yellow' 
    : headerColor === 'orange'
    ? 'doodle-panel--header-orange'
    : '';

  return (
    <div className={`doodle-panel ${className}`} style={{ background: 'var(--color-bg-paper)' }}>
      {/* Title Bar */}
      <div className={`doodle-panel--header ${headerClass}`}>
        <div style={{ color: 'var(--color-ink)', fontWeight: 600, fontSize: '14px' }}>
          {title}
        </div>
        {showControls && (
          <div className="flex items-center gap-1">
            {/* Three dots (window controls) */}
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-ink)' }}></div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-ink)' }}></div>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-ink)' }}></div>
          </div>
        )}
      </div>
      
      {/* Content Area */}
      <div style={{ padding: '24px', background: 'var(--color-bg-paper)' }}>
        {children}
      </div>
    </div>
  );
}

export default RetroWindow;

