/**
 * Ballot box with tick – voting icon.
 * Inherits currentColor so it matches surrounding text.
 */
export function VoteIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M6 12l4 8 20-32" strokeWidth="5" stroke="white" />
        </svg>
    );
}
