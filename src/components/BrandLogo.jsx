import React, { useState, useEffect } from 'react';
import { subscribeToProgramSettings } from '../firebase';

export const APP_LOGO_SRC = '/assets/Krishna-arjuna-logo.png';
export const KRISHNA_ICON_SRC = '/assets/krishna-logo 1.png';

/**
 * Reusable Logo image component.
 * Centralizes the logo asset path and styling across all pages.
 */
export function Logo({
  src = APP_LOGO_SRC,
  alt = 'Gita for Youth',
  className = 'w-full h-full object-contain',
  ...props
}) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      {...props}
    />
  );
}

/**
 * Reusable Brand header component with icon and text.
 * Used in Navbar, Registration Header, Admin Dashboard, Student Dashboard, etc.
 * Automatically synchronizes course name & subtitle with Admin Panel settings in real-time.
 */
export default function BrandLogo({
  title,
  subtitle,
  fontSize,
  badge,
  logoSrc = APP_LOGO_SRC,
  iconContainerClassName = 'w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center bg-transparent flex-shrink-0',
  logoClassName = 'w-full h-full object-contain',
  className = 'flex items-center gap-2.5 sm:gap-3 text-left p-0.5 min-w-0',
  titleClassName = 'font-bold text-temple-900 leading-tight block truncate',
  subtitleClassName = 'text-[10px] sm:text-xs text-temple-500 block truncate',
  onClick,
}) {
  const [liveSettings, setLiveSettings] = useState(() => {
    try {
      const cached = localStorage.getItem('gita_amrita_cached_settings');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return { courseName: 'Gita for Youth', courseSubtitle: '', courseNameFontSize: 18 };
  });

  useEffect(() => {
    const unsub = subscribeToProgramSettings((latest) => {
      if (latest) setLiveSettings(latest);
    });
    return () => unsub();
  }, []);

  const displayTitle = title !== undefined ? title : (liveSettings.courseName || 'Gita for Youth');
  const displaySubtitle = subtitle !== undefined ? subtitle : (liveSettings.courseSubtitle || '');
  const activeFontSize = fontSize !== undefined ? fontSize : (liveSettings.courseNameFontSize || 18);

  return (
    <div className={className} onClick={onClick}>
      <div className={iconContainerClassName}>
        <Logo src={logoSrc} alt={displayTitle} className={logoClassName} />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span 
            className={titleClassName}
            style={activeFontSize ? { fontSize: `${activeFontSize}px` } : undefined}
          >
            {displayTitle}
          </span>
          {badge}
        </div>
        {displaySubtitle && <span className={subtitleClassName}>{displaySubtitle}</span>}
      </div>
    </div>
  );
}
