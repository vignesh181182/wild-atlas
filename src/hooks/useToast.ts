'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** The single line of feedback that slides up at the bottom of the main column. */
export function useToast(duration = 2600) {
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(
    (text: string) => {
      setMessage(text);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setMessage(''), duration);
    },
    [duration],
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return { message, flash };
}
