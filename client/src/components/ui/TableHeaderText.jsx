import React from 'react';

export default function TableHeaderText({ children }) {
  if (typeof children !== 'string') return children;

  const [firstWord, ...remainingWords] = children.trim().split(/\s+/);

  return (
    <span className='inline-flex flex-col whitespace-nowrap text-[0.9375rem] leading-tight'>
      <span>{firstWord}</span>
      {remainingWords.length > 0 && <span>{remainingWords.join(' ')}</span>}
    </span>
  );
}
