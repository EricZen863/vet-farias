'use client';
import { useState, useRef, useEffect } from 'react';

export default function Autocomplete({ options = [], value, onChange, placeholder = 'Digite para buscar...', minChars = 3 }) {
  const [inputValue, setInputValue] = useState(value || '');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);

    if (val.length >= minChars) {
      const matches = options.filter(opt =>
        opt.toLowerCase().includes(val.toLowerCase())
      );
      setFiltered(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelect = (option) => {
    setInputValue(option);
    onChange(option);
    setShowSuggestions(false);
  };

  return (
    <div className="autocomplete-wrapper" ref={wrapperRef}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInput}
        placeholder={placeholder}
        className="form-input"
        onFocus={(e) => {
          if (e.target.value.length >= minChars) {
            const matches = options.filter(opt =>
              opt.toLowerCase().includes(e.target.value.toLowerCase())
            );
            setFiltered(matches);
            setShowSuggestions(matches.length > 0);
          }
        }}
      />
      {showSuggestions && (
        <ul className="autocomplete-list">
          {filtered.map((opt, i) => (
            <li key={i} className="autocomplete-item" onClick={() => handleSelect(opt)}>
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
