'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { validateEnv, logEnvConfig } from '@/lib/env';
import { useEffect } from 'react';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Application Providers Wrapper
 * Wraps the app with all necessary providers and error boundaries
 */
export function Providers({ children }: ProvidersProps) {
  // Validate environment on mount
  useEffect(() => {
    validateEnv();
    logEnvConfig();
  }, []);

  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}
