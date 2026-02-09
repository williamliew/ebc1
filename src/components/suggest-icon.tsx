/**
 * Sheet of paper with pen – writing / suggest icon.
 * Pen shape matches the admin panel (Manage club) icon.
 * Inherits currentColor so it matches surrounding text.
 */
export function SuggestIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            {/* Paper */}
            <rect x="1" y="4" width="16" height="18" rx="1" />
            {/* Pen (same shape as admin panel icon), scaled and positioned over the paper */}
            <g transform="translate(1, -2) scale(1)">
                <path
                    d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
                    fill="white"
                />
            </g>
        </svg>
    );
}
