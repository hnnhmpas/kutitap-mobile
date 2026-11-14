// Icons: Lucide glyphs (https://lucide.dev, ISC licence), inlined so no extra package is needed.
// Same export names as before, so every screen keeps working. Thick, square-capped strokes match the pixel theme.
import React from 'react';

const lucide = (children) => ({ size = 18, strokeWidth = 2.75, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={strokeWidth}
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...rest}>{children}</svg>
);

const speaker = 'M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z';

export const IconLeft = lucide(<path d="m15 18-6-6 6-6" />);
export const IconRight = lucide(<path d="m9 18 6-6-6-6" />);
export const IconDown = lucide(<path d="m6 9 6 6 6-6" />);
export const IconPlus = lucide(<><path d="M5 12h14" /><path d="M12 5v14" /></>);
export const IconX = lucide(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const IconCheck = lucide(<path d="M20 6 9 17l-5-5" />);
export const IconTrash = lucide(<><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></>);
export const IconPencil = lucide(<><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></>);
export const IconLogout = lucide(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>);
export const IconSound = lucide(<><path d={speaker} /><path d="M16 9a5 5 0 0 1 0 6" /><path d="M19.364 18.364a9 9 0 0 0 0-12.728" /></>);
export const IconMute = lucide(<><path d={speaker} /><line x1="22" x2="16" y1="9" y2="15" /><line x1="16" x2="22" y1="9" y2="15" /></>);
export const IconCloud = lucide(<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />);
export const IconCloudOff = lucide(<><path d="m2 2 20 20" /><path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193" /><path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07" /></>);
