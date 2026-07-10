import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function BackLink({ label = 'Back', fallbackPath = '/' }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <button
      type='button'
      onClick={handleClick}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: '#2563eb',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      ← {label}
    </button>
  );
}
