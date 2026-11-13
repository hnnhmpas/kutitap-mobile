// Small pixel-style icons (crisp edges, inherit text colour).
import React from 'react';

const make = (paths, w = 9, h = 9) => ({ size = 18, ...rest }) => (
  <svg viewBox={`0 0 ${w} ${h}`} width={size} height={Math.round((size * h) / w)} shapeRendering="crispEdges" fill="currentColor" aria-hidden="true" {...rest}>{paths}</svg>
);

export const IconLeft = make(<path d="M5 0h2v1H6v1H5zM4 2h1v1H4zM3 3h1v1H3zM2 4h1v1H2zM3 5h1v1H3zM4 6h1v1H4zM5 7h1v1H5zM6 8h1v1H6z" transform="translate(0 0)" />, 9, 9);
export const IconRight = make(<path d="M2 0h2v1h1v1h1v1h1v1h1v1H7v1H6v1H5v1H4v1H2V8h1V7h1V6h1V5h1V4H5V3H4V2H3V1H2z" />, 9, 9);
export const IconDown = make(<path d="M0 2h2v1h1v1h3V3h1V2h2v1H8v1H7v1H6v1H5v1H4V6H3V5H2V4H1V3H0z" />, 9, 9);
export const IconPlus = make(<path d="M4 0h1v4h4v1H5v4H4V5H0V4h4z" />, 9, 9);
export const IconX = make(<path d="M1 1h1v1h1v1h1v1h1V3h1V2h1V1h1v1H8v1H7v1H6v1h1v1h1v1h1v1H8V8H7V7H6V6H5v1H4v1H3v1H2V8h1V7h1V6H3V5H2V4H1V3H0V2h1z" />, 10, 10);
export const IconCheck = make(<path d="M8 1h2v1H9v1H8v1H7v1H6v1H5v1H4v1H3v1H2V8H1V7H0V5h1v1h1v1h1V6h1V5h1V4h1V3h1V2h1z" />, 10, 9);
export const IconTrash = make(<path d="M3 0h4v1h3v1H0V1h3zM1 3h8v7H1zM3 4v5h1V4zm3 0v5h1V4z" fillRule="evenodd" />, 10, 10);
export const IconPencil = make(<path d="M7 0h2v1h1v2H9v1H8V3H7V2H6V1h1zM5 2h1v1h1v1h1v1H7v1H6v1H5v1H4v1H3v1H0V9h1V8h1V7h1V6h1V5h1V4h1V3H5z" />, 10, 10);
export const IconLogout = make(<path d="M0 0h5v1H1v8h4v1H0zM6 2h1v1h1v1h2v2H8v1H7v1H6V6H3V4h3z" />, 10, 10);
export const IconSound = make(<path d="M3 2h1v1h1v4H4v1H3V7H0V3h3zM7 1h1v1h1v6H8V7H7zM6 3h1v4H6z" />, 9, 9);
export const IconMute = make(<path d="M3 2h1v1h1v4H4v1H3V7H0V3h3zM6 3h1v1h1v1h1V3h1v1H9v1h1v1H9v1H8V6H7v1H6V6h1V5H6V4z" />, 10, 9);
export const IconCloud = make(<path d="M3 1h3v1h1v1h2v1h1v2H9v1H2V6H1V4h1V2h1z" />, 10, 8);
