/**
 * 3D stack of books (green, red, orange) with hardcover details. Based on
 * a clean perspective layout; scaled via width/height.
 */
export function StackOfBooks({
    className,
    width = 105,
    height = 75,
}: {
    className?: string;
    width?: number;
    height?: number;
}) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 420 300"
            width={width}
            height={height}
            className={className}
            role="img"
            aria-hidden
        >
            {/* ===== BOTTOM BOOK (GREEN) ===== */}
            {/* Pages */}
            <polygon
                points="240,185 270,170 270,210 240,225"
                fill="#f8f6f3"
            />
            <polygon
                points="240,185 245,182 245,222 240,225"
                fill="#e8e4dc"
            />
            {/* Page lines (hint of layers) */}
            <polygon
                points="246,180 268,168 268,171 246,183"
                fill="#e0ddd4"
                opacity="0.6"
            />
            {/* Cover */}
            <polygon
                points="80,185 240,185 270,170 110,170"
                fill="#2ecc71"
            />
            <polygon
                points="80,185 240,185 240,225 80,225"
                fill="#27ae60"
            />
            {/* Hardcover: hinge strip (board edge on cover) */}
            <polygon
                points="80,185 98,185 113,176 95,176"
                fill="#239b56"
            />
            {/* Spine: label area */}
            <polygon
                points="88,198 118,198 118,212 88,212"
                fill="#1e8449"
            />
            {/* Spine: band */}
            <line
                x1="83"
                y1="188"
                x2="235"
                y2="188"
                stroke="#1e8449"
                strokeWidth="1.5"
            />

            {/* ===== MIDDLE BOOK (RED) ===== */}
            {/* Pages */}
            <polygon
                points="230,150 260,135 260,175 230,190"
                fill="#f8f6f3"
            />
            <polygon
                points="230,150 235,147 235,187 230,190"
                fill="#e8e4dc"
            />
            <polygon
                points="236,145 258,133 258,136 236,148"
                fill="#e0ddd4"
                opacity="0.6"
            />
            {/* Cover */}
            <polygon
                points="95,150 230,150 260,135 125,135"
                fill="#e74c3c"
            />
            <polygon
                points="95,150 230,150 230,190 95,190"
                fill="#c0392b"
            />
            {/* Hardcover hinge strip */}
            <polygon
                points="95,150 115,150 130,141 110,141"
                fill="#a93226"
            />
            {/* Spine label */}
            <polygon
                points="102,163 130,163 130,176 102,176"
                fill="#922b21"
            />
            <line
                x1="98"
                y1="153"
                x2="225"
                y2="153"
                stroke="#922b21"
                strokeWidth="1.5"
            />

            {/* ===== TOP BOOK (ORANGE) ===== */}
            {/* Pages */}
            <polygon
                points="220,115 245,100 245,140 220,155"
                fill="#f8f6f3"
            />
            <polygon
                points="220,115 224,112 224,152 220,155"
                fill="#e8e4dc"
            />
            <polygon
                points="225,110 243,100 243,103 225,113"
                fill="#e0ddd4"
                opacity="0.6"
            />
            {/* Cover */}
            <polygon
                points="110,115 220,115 245,100 135,100"
                fill="#f39c12"
            />
            <polygon
                points="110,115 220,115 220,155 110,155"
                fill="#e67e22"
            />
            {/* Hardcover hinge strip */}
            <polygon
                points="110,115 128,115 143,106 125,106"
                fill="#d35400"
            />
            {/* Spine label */}
            <polygon
                points="118,128 142,128 142,140 118,140"
                fill="#ca6f1e"
            />
            <line
                x1="113"
                y1="118"
                x2="215"
                y2="118"
                stroke="#ca6f1e"
                strokeWidth="1.5"
            />
        </svg>
    );
}
