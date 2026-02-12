/**
 * X / close icon for modal and dialog close buttons.
 * Inherits currentColor so it matches surrounding text.
 */
export function CloseIcon({ className }: { className?: string }) {
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
            <path d="M18 6L6 18M6 6l12 12" />
        </svg>
    );
}
