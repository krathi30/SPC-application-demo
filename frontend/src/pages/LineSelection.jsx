import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BRAND_NAME, BRAND_SUBTEXT, PLANT_LABEL } from '../config/branding';


// Ice cream bar icon for line cards
const IceCreamBarIcon = () => (
  <svg viewBox="0 0 40 80" width="36" height="72">
    {/* Stick */}
    <rect x="15" y="48" width="10" height="28" rx="3" fill="#C4975A" />
    <rect x="16.5" y="48" width="3" height="25" rx="1.5" fill="#D4A76A" opacity="0.4" />
    {/* Vanilla center */}
    <rect x="4" y="8" width="32" height="44" rx="5" fill="#FFF8DC" />
    {/* Chocolate coating */}
    <rect x="2" y="4" width="36" height="14" rx="6" fill="#5D3A1A" />
    <rect x="2" y="8" width="5" height="40" rx="2.5" fill="#5D3A1A" />
    <rect x="33" y="8" width="5" height="40" rx="2.5" fill="#5D3A1A" />
    <rect x="2" y="42" width="36" height="8" rx="4" fill="#5D3A1A" />
    {/* Shine */}
    <rect x="8" y="7" width="10" height="4" rx="2" fill="#8B5E3C" opacity="0.4" />
  </svg>
);

function LineSelection({ lines }) {
  const navigate = useNavigate();

  return (
    <div className="selection-page" style={{ position: 'relative' }}>
      <button
        className="back-btn"
        style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', left: 'auto' }}
        onClick={() => navigate('/admin')}
      >
        Admin Dashboard
      </button>

      <div className="logo-fallback" style={{ marginBottom: '1rem' }}>
        <div className="logo-text">{BRAND_NAME}</div>
        <div className="logo-subtext">{BRAND_SUBTEXT}</div>
      </div>


      <h1 className="page-title">SPC Control Chart</h1>
      <p className="page-subtitle">Select your production line to begin</p>

      <div className="selection-grid lines">
        {lines.map((line) => (
          <div
            key={line.id}
            className="selection-card"
            onClick={() => navigate(`/line/${line.id}/sku`)}
          >
            <div className="card-icon" style={{ marginBottom: '0.5rem' }}>
              <IceCreamBarIcon />
            </div>
            <h3>{line.display_name}</h3>
            <p>Production Line</p>
            <span className="freezer-count">
              {line.freezer_count} Freezer{line.freezer_count > 1 ? 's' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LineSelection;
