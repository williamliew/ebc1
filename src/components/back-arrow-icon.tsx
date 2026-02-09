/**
 * Left-pointing arrow/chevron for Back links and buttons.
 * Inherits currentColor so it matches surrounding text.
 */
export function BackArrowIcon({ className }: { className?: string }) {
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
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
    );
}
