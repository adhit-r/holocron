import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: "sm" | "md" | "lg";
  showSubhead?: boolean;
  forceGreen?: boolean;
};

const SIZE_MAP = {
  sm: { wm: "text-sm", glyph: 16, gap: "gap-2", letter: "tracking-[0.10em]" },
  md: { wm: "text-base", glyph: 20, gap: "gap-2.5", letter: "tracking-[0.10em]" },
  lg: { wm: "text-2xl", glyph: 30, gap: "gap-3", letter: "tracking-[0.08em]" }
} as const;

export function Wordmark({
  className,
  size = "md",
  showSubhead = false,
  forceGreen = false
}: Props) {
  const s = SIZE_MAP[size];
  return (
    <div className={cn("inline-flex flex-col", className)}>
      <span className={cn("inline-flex items-center", s.gap)} aria-label="Holocron">
        <HolocronGlyph size={s.glyph} forceGreen={forceGreen} />
        <span
          className={cn(
            "font-sans font-medium uppercase text-fg-strong",
            s.wm,
            s.letter
          )}
          aria-hidden
        >
          Holocron
        </span>
      </span>
      {showSubhead && (
        <span
          className="mt-1 font-mono text-2xs uppercase tracking-[0.22em] text-fg-dim"
          style={{ marginLeft: `calc(${s.glyph}px + 10px)` }}
        >
          Galactic archive
        </span>
      )}
    </div>
  );
}

export function HolocronGlyph({
  size = 20,
  className,
  forceGreen = false
}: {
  size?: number;
  className?: string;
  forceGreen?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden
      className={cn(forceGreen ? "text-success" : "text-accent", className)}
    >
      <g
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d="M16 3 L27 9 L27 23 L16 29 L5 23 L5 9 Z" />
        <path d="M5 9 L16 14 L27 9" />
        <path d="M16 14 L16 29" />
      </g>
      <circle cx="16" cy="14" r="1.6" fill="currentColor" />
    </svg>
  );
}
