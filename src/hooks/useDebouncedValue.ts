'use client';

import { useEffect, useState } from 'react';

/**
 * Holds a value still for a moment before letting it through — so typing
 * "elephant" fires one search rather than eight.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return settled;
}
