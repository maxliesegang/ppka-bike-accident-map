import { StrictMode, type ReactNode } from 'react';
import { KernContextProvider } from '@kern-ux-annex/kern-react-kit';

/**
 * Shared wrapper for every React tree in the app. Provides the Kern UX context
 * (translations, theme) and React StrictMode. Use this at each mount point so
 * the Kern components behave consistently.
 */
export function KernRoot({ children }: { children: ReactNode }) {
  return (
    <StrictMode>
      <KernContextProvider>{children}</KernContextProvider>
    </StrictMode>
  );
}
