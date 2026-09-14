'use client';
/* Traqi — mobile floating "+" button. The shell fires FAB_EVENT when the
   current module has its own add action; the module's page listens for it. */

import { useEffect, useRef } from 'react';

export const FAB_EVENT = 'traqi:fab';

export function fireFab() {
  window.dispatchEvent(new Event(FAB_EVENT));
}

export function useFabAction(handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    const listener = () => ref.current();
    window.addEventListener(FAB_EVENT, listener);
    return () => window.removeEventListener(FAB_EVENT, listener);
  }, []);
}
