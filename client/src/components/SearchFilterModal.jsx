import { useState, useEffect, useRef } from 'react';
import { X, SlidersHorizontal } from 'lucide-react';

const MIN_AGE = 13;
const MAX_AGE = 80;

export default function SearchFilterModal({ initial, onApply, onClose }) {
  const [genderM,  setGenderM]  = useState(initial.genderM  ?? false);
  const [genderF,  setGenderF]  = useState(initial.genderF  ?? false);
  const [genderNB, setGenderNB] = useState(initial.genderNB ?? false);
  const [ageMin,   setAgeMin]   = useState(initial.ageMin   ?? MIN_AGE);
  const [ageMax,   setAgeMax]   = useState(initial.ageMax   ?? MAX_AGE);
  const [location, setLocation] = useState(initial.location ?? '');
  const [onlineOnly, setOnlineOnly] = useState(initial.onlineOnly ?? true);

  const overlayRef = useRef(null);

  // Close on overlay click
  const handleOverlay = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  // Clamp sliders so min never exceeds max
  const handleMinAge = (e) => {
    const v = Math.min(+e.target.value, ageMax - 1);
    setAgeMin(v);
  };
  const handleMaxAge = (e) => {
    const v = Math.max(+e.target.value, ageMin + 1);
    setAgeMax(v);
  };

  // % positions for the fill track
  const pct = (v) => ((v - MIN_AGE) / (MAX_AGE - MIN_AGE)) * 100;
  const fillLeft  = pct(ageMin);
  const fillWidth = pct(ageMax) - pct(ageMin);

  const apply = () => {
    onApply({ genderM, genderF, genderNB, ageMin, ageMax, location: location.trim(), onlineOnly });
    onClose();
  };

  const reset = () => {
    setGenderM(false); setGenderF(false); setGenderNB(false);
    setAgeMin(MIN_AGE); setAgeMax(MAX_AGE);
    setLocation(''); setOnlineOnly(true);
  };

  return (
    <div className="filter-modal-overlay" ref={overlayRef} onClick={handleOverlay}>
      <div className="filter-modal">

        {/* Header */}
        <div className="filter-modal-header">
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <SlidersHorizontal size={17} style={{ color:'var(--accent)' }} />
            <span className="filter-modal-title">Search Members</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Body */}
        <div className="filter-modal-body">

          {/* Gender */}
          <div className="filter-field">
            <div className="filter-field-label">Gender</div>
            <div className="filter-check-row">
              {[
                { label:'Male',       val:genderM,  set:setGenderM  },
                { label:'Female',     val:genderF,  set:setGenderF  },
                { label:'Non-binary', val:genderNB, set:setGenderNB },
              ].map(({ label, val, set }) => (
                <label key={label} className="filter-check-item">
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={e => set(e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Age range */}
          <div className="filter-field">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div className="filter-field-label">Age</div>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--accent)' }}>
                {ageMin} – {ageMax === MAX_AGE ? `${MAX_AGE}+` : ageMax}
              </div>
            </div>

            <div className="age-range-wrap">
              {/* Track */}
              <div className="age-range-track" />
              {/* Filled region */}
              <div
                className="age-range-fill"
                style={{ left:`${fillLeft}%`, width:`${fillWidth}%` }}
              />
              {/* Min thumb */}
              <input
                type="range" className="age-range-input"
                min={MIN_AGE} max={MAX_AGE}
                value={ageMin}
                onChange={handleMinAge}
                style={{ zIndex: ageMin > MAX_AGE - 5 ? 5 : 3 }}
              />
              {/* Max thumb */}
              <input
                type="range" className="age-range-input"
                min={MIN_AGE} max={MAX_AGE}
                value={ageMax}
                onChange={handleMaxAge}
                style={{ zIndex: 4 }}
              />
            </div>

            <div className="age-range-values">
              <span>{MIN_AGE}</span>
              <span>{MAX_AGE}+</span>
            </div>
          </div>

          {/* Location */}
          <div className="filter-field">
            <div className="filter-field-label">Location contains</div>
            <input
              className="filter-location-input"
              placeholder="e.g. United Kingdom, London…"
              value={location}
              onChange={e => setLocation(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && apply()}
            />
          </div>

          {/* Online only */}
          <label className="filter-check-item">
            <input
              type="checkbox"
              checked={onlineOnly}
              onChange={e => setOnlineOnly(e.target.checked)}
            />
            Show online users only
          </label>

        </div>

        {/* Footer */}
        <div className="filter-modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={reset}>Reset</button>
          <button className="btn btn-primary" onClick={apply} style={{ padding:'8px 24px' }}>
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
