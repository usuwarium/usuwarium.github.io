interface SortIconProps {
  state: "none" | "asc" | "desc";
  size?: number;
}

export function SortIcon({ state, size = 24 }: SortIconProps) {
  const upOpacity = state === "desc" ? 0.35 : 1;
  const downOpacity = state === "asc" ? 0.35 : 1;
  const defaultOpacity = state === "none" ? 0.35 : 1;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block ml-1"
    >
      {/* ↑アイコン */}
      <g opacity={state === "none" ? defaultOpacity : upOpacity}>
        <path d="M10 17 V5" />
        <path d="M10 5 L7.5 7.5" />
        <path d="M10 5 L12.5 7.5" />
      </g>

      {/* ↓アイコン */}
      <g opacity={state === "none" ? defaultOpacity : downOpacity}>
        <path d="M18 5 V17" />
        <path d="M18 17 L15.5 14.5" />
        <path d="M18 17 L20.5 14.5" />
      </g>
    </svg>
  );
}
