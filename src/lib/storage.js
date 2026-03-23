'use client';

const PREFIX = 'vetfarias_';

export function saveData(module, key, data) {
  if (typeof window === 'undefined') return;
  const fullKey = `${PREFIX}${module}_${key}`;
  localStorage.setItem(fullKey, JSON.stringify(data));
}

export function loadData(module, key, defaultValue = null) {
  if (typeof window === 'undefined') return defaultValue;
  const fullKey = `${PREFIX}${module}_${key}`;
  const stored = localStorage.getItem(fullKey);
  if (stored === null) return defaultValue;
  try {
    return JSON.parse(stored);
  } catch {
    return defaultValue;
  }
}

export function getMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return `${months[parseInt(month) - 1]} ${year}`;
}

export function getAllMonthKeys(module, prefix) {
  if (typeof window === 'undefined') return [];
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${PREFIX}${module}_${prefix}`)) {
      const monthKey = key.replace(`${PREFIX}${module}_${prefix}`, '');
      if (/^\d{4}-\d{2}$/.test(monthKey)) {
        keys.push(monthKey);
      }
    }
  }
  return [...new Set(keys)].sort();
}
