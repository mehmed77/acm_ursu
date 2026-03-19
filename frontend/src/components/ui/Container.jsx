import React from 'react';

/**
 * Container — Barcha sahifalarda ishlatiladi
 * Ekran o'lchamiga qarab to'liq kengayadi
 * Chap/o'ng qismda 5% bo'sh joy
 */
const Container = ({ children, className = '', size = 'default', noPadding = false }) => {
  const sizes = {
    sm:      'max-w-5xl',
    default: 'max-w-full',
    lg:      'max-w-[1920px]',
    full:    'max-w-full',
  };

  return (
    <div 
      className={`w-full mx-auto ${sizes[size]} ${className}`}
      style={noPadding ? {} : { paddingLeft: '5%', paddingRight: '5%' }}
    >
      {children}
    </div>
  );
};

export default Container;
