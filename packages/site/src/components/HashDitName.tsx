import React from 'react';
import HashDitName from '../assets/HashDit-Name.svg';

export const HashDitNameLogo = ({ color, size }: { color: string; size: number }) => (
  <img src={HashDitName} alt="HashDit Name" width={size} height={size/4} />
);