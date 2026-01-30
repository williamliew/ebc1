'use client';

import { useEffect } from 'react';
import { getOrCreateVisitorKeyHash } from '@/lib/visitor-key';

/**
 * Ensures a visitor key hash exists in localStorage on first visit.
 * Runs once when the user lands on any page so the key is ready for votes and suggestions.
 */
export function VisitorKeyInit() {
    useEffect(() => {
        getOrCreateVisitorKeyHash();
    }, []);
    return null;
}
