'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { VisitorKeyInit } from '@/components/visitor-key-init';
import { AccessibilityThemeSwitcher } from '@/components/accessibility-theme-switcher';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: { staleTime: 60 * 1000 },
                },
            }),
    );
    return (
        <QueryClientProvider client={queryClient}>
            <VisitorKeyInit />
            <AccessibilityThemeSwitcher />
            {children}
        </QueryClientProvider>
    );
}
