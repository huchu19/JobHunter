/**
 * The app's brand mark — the "JOB" browser-window + magnifier logo.
 *
 * Inlined as SVG (rather than an <img>) so it scales crisply at any size, never
 * flashes, and can sit inline with the wordmark. The art is self-contained and
 * theme-independent (it carries its own colors), so it reads on both light and
 * dark surfaces. Size is controlled via `className` (default 32px square).
 */
export default function Logo({
  className = "h-8 w-8",
  title = "JobHunter",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      {/* Browser window frame */}
      <rect x="20" y="20" width="472" height="404" rx="40" fill="#FFB44C" />
      <path d="M340 20h112a40 40 0 0 1 40 40v160H340z" fill="#FFA726" fillOpacity="0.4" />

      {/* Top chrome bar */}
      <rect x="20" y="20" width="472" height="64" rx="40" fill="#FFCB7D" />
      <rect x="20" y="44" width="472" height="40" fill="#FFCB7D" />
      <rect x="40" y="36" width="116" height="32" rx="10" fill="#FFFFFF" />
      <circle cx="64" cy="52" r="6" fill="#5A5A66" />
      <circle cx="88" cy="52" r="6" fill="#5A5A66" />
      <circle cx="112" cy="52" r="6" fill="#5A5A66" />
      <rect x="168" y="36" width="304" height="32" rx="10" fill="#CFE7E4" />

      {/* JOB wordmark */}
      <g
        fill="none"
        stroke="#3D3D45"
        strokeWidth="22"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M104 124v60a26 26 0 0 1-26 26h-6" />
        <rect x="130" y="124" width="58" height="86" rx="29" />
        <path d="M214 124v86h26a22 22 0 0 0 0-44h-26m26 0a21 21 0 0 0 0-42h-26" />
      </g>

      {/* Header search hint (top-right) */}
      <circle cx="436" cy="142" r="18" fill="none" stroke="#3D3D45" strokeWidth="13" />
      <line x1="449" y1="155" x2="462" y2="168" stroke="#3D3D45" strokeWidth="13" strokeLinecap="round" />
      <line x1="292" y1="180" x2="396" y2="180" stroke="#3D3D45" strokeWidth="18" strokeLinecap="round" />
      <circle cx="460" cy="214" r="7" fill="#3D3D45" />

      {/* Body text lines */}
      <line x1="56" y1="290" x2="172" y2="290" stroke="#3D3D45" strokeWidth="20" strokeLinecap="round" />
      <line x1="56" y1="330" x2="200" y2="330" stroke="#3D3D45" strokeWidth="20" strokeLinecap="round" />
      <line x1="56" y1="370" x2="172" y2="370" stroke="#3D3D45" strokeWidth="20" strokeLinecap="round" />

      {/* Magnifying glass lens */}
      <circle cx="332" cy="330" r="92" fill="#3D3D45" />
      <circle cx="332" cy="330" r="76" fill="#B7D6D2" />
      <circle cx="332" cy="330" r="60" fill="#FFCB7D" />
      <path d="M332 270a60 60 0 0 1 0 120z" fill="#FFE0A8" />
      <line x1="294" y1="320" x2="350" y2="320" stroke="#3D3D45" strokeWidth="14" strokeLinecap="round" />
      <line x1="294" y1="346" x2="334" y2="346" stroke="#3D3D45" strokeWidth="14" strokeLinecap="round" />

      {/* Handle + plug */}
      <line x1="396" y1="396" x2="430" y2="430" stroke="#3D3D45" strokeWidth="30" strokeLinecap="round" />
      <g transform="rotate(45 446 446)">
        <rect x="430" y="424" width="32" height="44" rx="8" fill="#2BD680" />
        <rect x="436" y="412" width="8" height="16" rx="4" fill="#3D3D45" />
        <rect x="448" y="412" width="8" height="16" rx="4" fill="#3D3D45" />
        <rect x="438" y="466" width="16" height="20" rx="6" fill="#3D3D45" />
      </g>
    </svg>
  );
}
