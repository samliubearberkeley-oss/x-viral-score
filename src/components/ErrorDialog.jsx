import React from 'react';
import RetroWindow from './RetroWindow';
import '../styles/components.css';

function ErrorDialog({ message, onClose }) {
  return (
    <div style={{ marginTop: '24px' }}>
      <RetroWindow title="Error" className="w-full" headerColor="blue">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {/* Prohibited Icon - Large circular "no entry" icon */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: '#FFE5D8',
            border: 'var(--stroke-width) solid var(--color-ink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            boxShadow: 'var(--shadow)'
          }}>
            {/* Diagonal bar */}
            <div style={{
              width: '60px',
              height: 'var(--stroke-width)',
              background: 'var(--color-error)',
              transform: 'rotate(45deg)',
              position: 'absolute',
              border: 'none'
            }}></div>
          </div>
          
          {/* Error Message */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--color-ink)', 
              fontWeight: 700, 
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Access prohibited!
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-ink)' }}>{message}</p>
          </div>
          
          {/* Cancel Button */}
          <button
            onClick={onClose}
            className="doodle-button doodle-button--blue"
            style={{ 
              padding: '8px 24px',
              textTransform: 'uppercase',
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.5px'
            }}
          >
            CANCEL
          </button>
        </div>
      </RetroWindow>
    </div>
  );
}

export default ErrorDialog;

