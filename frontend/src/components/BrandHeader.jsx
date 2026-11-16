import React from 'react';
import { COMPANY_NAME, COMPANY_TAGLINE, BRAND_NAME, BRAND_SUBTEXT, PLANT_LABEL } from '../config/branding';

// Company ribbon + department name, shown at the top of the operator screens.
export default function BrandHeader({ subtitle = 'SPC Control Chart System' }) {
  return (
    <div style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '0.5rem 1.5rem',
        borderRadius: '10px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
        width: 'fit-content',
        maxWidth: '100%',
        margin: '0 auto 0.35rem',
        color: '#C9A96E',
        fontFamily: 'Georgia, serif',
        fontSize: '0.85rem',
        fontWeight: 700,
        letterSpacing: '2px',
      }}>
        {COMPANY_NAME}
      </div>
      <div style={{ fontSize: '0.7rem', color: '#8e8e8e', fontStyle: 'italic', letterSpacing: '1px', marginBottom: '0.75rem' }}>
        {COMPANY_TAGLINE}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--text)' }}>
        {BRAND_NAME}
      </div>
      <div style={{ fontSize: '0.7rem', letterSpacing: '2px', color: 'var(--text-light)', textTransform: 'uppercase' }}>
        {BRAND_SUBTEXT} &middot; {PLANT_LABEL} &middot; {subtitle}
      </div>
    </div>
  );
}
