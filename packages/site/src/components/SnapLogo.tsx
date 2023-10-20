import React from 'react';
import HashDitLogo from '../assets/HashDit-Icon.svg';

export const SnapLogo = ({ color, size }: { color: string; size: number }) => (
  <img src={HashDitLogo} alt="HashDit Logo" width={size} height={size} />
);
