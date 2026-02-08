'use client';

import { useState } from 'react';

const MIN_LENGTH_FOR_TOGGLE = 200;

export function ExpandableBlurb({
    html,
    className = '',
    lineClampClass = 'line-clamp-4',
}: {
    html: string;
    className?: string;
    lineClampClass?: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const showToggle = html.length > MIN_LENGTH_FOR_TOGGLE;

    return (
        <div className={className}>
            <div
                className={expanded ? '' : lineClampClass}
                style={expanded ? undefined : { overflow: 'hidden' }}
            >
                <div
                    className="text-sm text-muted [&_p]:my-1 [&_a]:underline [&_a]:text-foreground"
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </div>
            {showToggle && (
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="mt-2 text-sm font-medium text-[var(--primary)] hover:underline"
                >
                    {expanded ? 'Show less' : 'Show more'}
                </button>
            )}
        </div>
    );
}
