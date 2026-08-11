/**
 * PremiumRoleSelector — Premium Segmented Control for Role Selection
 *
 * Features:
 * - Floating glass container with blur, subtle border, soft shadow
 * - Role-colored active states with gradient, neon glow, inner highlight
 * - Solid tinted inactive buttons with depth (shadow, inner highlight, light reflection)
 * - Hover: lift 4px, scale 1.02, glow increase, icon moves upward (220ms)
 * - Active switch: 300ms animated transition with glow, gradient, icon pop
 * - Animated light sweep across active button every 6-8 seconds
 * - 24px icons with shadow/glow when active
 * - 12px gap between buttons, flex:1 equal width
 * - Press effect: compress → shadow shrinks → spring back
 * - Selection indicator: glowing dot under active button
 * - WCAG focus ring: 2px glowing ring matching role color
 * - 16px border radius on buttons, 18px on outer container
 */

import React from 'react';

// ─── Role Color Themes ───────────────────────────────────
export const ROLE_THEMES = {
  public: {
    key: 'public',
    icon: 'fa-user',
    label: 'Public',
    gradientFrom: '#2F80FF',
    gradientTo: '#5B8CFF',
    hex: '#2563EB',
    glow: 'rgba(47,128,255,0.30)',
    glowSoft: 'rgba(47,128,255,0.15)',
    shadow: 'rgba(47,128,255,0.20)',
    bg: 'rgba(47,128,255,0.06)',
    bgHover: 'rgba(47,128,255,0.10)',
  },
  hospital: {
    key: 'hospital',
    icon: 'fa-hospital',
    label: 'Hospital',
    gradientFrom: '#10B981',
    gradientTo: '#34D399',
    hex: '#059669',
    glow: 'rgba(16,185,129,0.30)',
    glowSoft: 'rgba(16,185,129,0.15)',
    shadow: 'rgba(16,185,129,0.20)',
    bg: 'rgba(16,185,129,0.06)',
    bgHover: 'rgba(16,185,129,0.10)',
  },
  ambulance: {
    key: 'ambulance',
    icon: 'fa-ambulance',
    label: 'Ambulance',
    gradientFrom: '#FF4D4F',
    gradientTo: '#FF2D55',
    hex: '#DC2626',
    glow: 'rgba(255,77,79,0.30)',
    glowSoft: 'rgba(255,77,79,0.15)',
    shadow: 'rgba(255,77,79,0.20)',
    bg: 'rgba(255,77,79,0.06)',
    bgHover: 'rgba(255,77,79,0.10)',
  },
  government: {
    key: 'government',
    icon: 'fa-landmark',
    label: 'Government',
    gradientFrom: '#7C3AED',
    gradientTo: '#A855F7',
    hex: '#7C3AED',
    glow: 'rgba(124,58,237,0.30)',
    glowSoft: 'rgba(124,58,237,0.15)',
    shadow: 'rgba(124,58,237,0.20)',
    bg: 'rgba(124,58,237,0.06)',
    bgHover: 'rgba(124,58,237,0.10)',
  },
};

export const ROLE_ORDER = ['public', 'hospital', 'ambulance', 'government'];

/**
 * PremiumRoleSelector
 *
 * @param {string} selectedRole - Currently selected role key
 * @param {function} onSelect - Callback with role key
 * @param {React.RefObject} transitioningRef - Ref for debouncing during transitions
 * @param {string} ariaLabel - Optional aria-label for the role group
 */
const PremiumRoleSelector = ({ selectedRole, onSelect, transitioningRef, ariaLabel = 'Select your role' }) => {

  const handleClick = (key) => {
    if (key === selectedRole) return;
    if (transitioningRef?.current) return;
    onSelect(key);
  };

  return (
    <div
      className="role-selector-container"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      <div className="role-selector-inner">
        {ROLE_ORDER.map((key) => {
          const role = ROLE_THEMES[key];
          if (!role) return null;
          const isActive = selectedRole === key;
          const activeGradient = `linear-gradient(135deg, ${role.gradientFrom}, ${role.gradientTo})`;

          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handleClick(key)}
              className={`role-selector-btn ${isActive ? 'role-selector-btn--active' : ''}`}
              style={{
                // Active styles
                ...(isActive ? {
                  background: activeGradient,
                  borderColor: role.gradientTo,
                  color: '#FFFFFF',
                  boxShadow: `0 4px 16px ${role.shadow}, 0 0 20px ${role.glowSoft}, inset 0 1px 0 rgba(255,255,255,0.25)`,
                } : {
                  background: role.bg,
                  borderColor: 'rgba(0,0,0,0.06)',
                  color: '#5F6475',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)',
                }),
              }}
              aria-label={`${isActive ? 'Currently selected: ' : 'Select '}${role.label}`}
            >
              {/* ── Inner highlight overlay (active only) ── */}
              {isActive && (
                <span
                  className="role-selector-btn-highlight"
                  aria-hidden="true"
                />
              )}

              {/* ── Animated light sweep (active only) ── */}
              {isActive && (
                <span
                  className="role-selector-btn-sweep"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)`,
                  }}
                  aria-hidden="true"
                />
              )}

              {/* ── Icon ── */}
              <i
                className={`fas ${role.icon} role-selector-icon ${isActive ? 'role-selector-icon--active' : ''}`}
                aria-hidden="true"
              />

              {/* ── Label ── */}
              <span className="role-selector-label">{role.label}</span>

              {/* ── Selection indicator dot (active only) ── */}
              {isActive && (
                <span
                  className="role-selector-dot"
                  style={{ backgroundColor: 'rgba(255,255,255,0.85)' }}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PremiumRoleSelector;
