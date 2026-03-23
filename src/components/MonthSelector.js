'use client';
import { useState } from 'react';
import { getMonthKey, getMonthLabel } from '../lib/storage';

export default function MonthSelector({ value, onChange }) {
  const currentMonth = getMonthKey();
  const selected = value || currentMonth;

  const handleChange = (direction) => {
    const [year, month] = selected.split('-').map(Number);
    let newMonth = month + direction;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    const newKey = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    onChange(newKey);
  };

  return (
    <div className="month-selector">
      <button className="month-btn" onClick={() => handleChange(-1)}>◀</button>
      <span className="month-label">{getMonthLabel(selected)}</span>
      <button className="month-btn" onClick={() => handleChange(1)}>▶</button>
    </div>
  );
}
