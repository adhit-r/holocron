import Link from "next/link";
import { ArrowRight, Database, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Wordmark } from "@/components/Wordmark";
import { IntroCanvas } from "@/components/IntroCanvas";
import { OpeningCrawl } from "@/components/OpeningCrawl";
import { Aurebesh } from "@/components/Aurebesh";
import { loadManifest } from "@/lib/data/loadManifest";
import { loadLanes } from "@/lib/data/loadLanes";

const SOURCES = [
  { label: "SWAPI", href: "https://swapi.info" },
  { label: "Wookieepedia (CC BY-SA)", href: "https://starwars.fandom.com" },
  { label: "Open community datasets", href: "https://github.com/parzivail/SWGalacticMap" }
];

function humanDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", day: "numeric" }).format(new Date(iso));
}

export default async function Page() {
  const manifest = await loadManifest();
  const lanes = await loadLanes();

  const STATS = [
    {
      label: "Entities",
      value: manifest ? String(manifest.counts.total) : "—",
      note: manifest ? "indexed entities" : "after first build"
    },
    {
      label: "Hyperspace lanes",
      value: lanes ? String(lanes.length) : "—",
      note: "Hydian, Corellian Run, Perlemian, …"
    },
    { label: "Timeline span", value: "25,025 BBY → 35 ABY", note: "canon and Legends" }
  ];

  return (
    <main id="main-content" className="relative min-h-[100dvh] w-full overflow-hidden">
      <OpeningCrawl />
      <BackgroundCanvas />

      <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-[1400px] grid-cols-1 gap-0 px-6 py-8 md:grid-cols-12 md:gap-8 md:px-10 md:py-10">
        <header className="col-span-full flex items-center justify-between md:col-span-12">
          <Wordmark size="md" />
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <BuildBadge builtAt={manifest?.builtAt ?? null} />
            <Link
              href="/explore"
              className="hairline-bright rounded-full bg-bg-panel/60 px-4 py-1.5 text-fg-primary transition-colors hover:border-border-bright hover:bg-bg-overlay/70"
            >
              Open archive
            </Link>
          </nav>
        </header>

        <section className="col-span-full flex flex-col justify-center gap-8 pt-12 md:col-span-5 md:pt-24">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-2xs uppercase tracking-[0.22em] text-fg-dim">
              Galactic archive · v0.6
            </span>
            <h1 className="text-4xl font-medium tracking-[-0.025em] text-fg-strong md:text-5xl">
              The galaxy, indexed.
              <br />
              <span className="text-fg-muted">Across space, time, and lineage.</span>
            </h1>
          </div>

          <p className="max-w-[55ch] text-lg text-fg-primary/85">
            Holocron is a unified explorer for the Star Wars universe. One selection drives four
            coupled views: a 3D galaxy, a temporal scrubber across 25,000 years of history, a
            lineage graph of Force users, and an entity datapad. Pick anything, see it everywhere.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <PrimaryCTA href="/explore">Enter the archive</PrimaryCTA>
            <SecondaryCTA href="#sources">
              <Database size={16} weight="regular" />
              <span>Sources and method</span>
            </SecondaryCTA>
          </div>

          <ul className="grid grid-cols-1 gap-x-8 gap-y-3 pt-6 sm:grid-cols-3">
            {STATS.map((s) => (
              <li key={s.label} className="flex flex-col gap-0.5">
                <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
                  {s.label}
                </span>
                <span className="font-mono text-base text-fg-primary">{s.value}</span>
                <span className="text-xs text-fg-muted">{s.note}</span>
              </li>
            ))}
          </ul>
        </section>

        <aside className="col-span-full flex items-center justify-center md:col-span-7" aria-hidden>
          <CornerLabels />
        </aside>

        <footer
          id="sources"
          className="col-span-full flex flex-col gap-3 border-t border-border-faint pt-6 md:col-span-12 md:flex-row md:items-center md:justify-between"
        >
          <p className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
            Sources
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-fg-muted">
            {SOURCES.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-fg-primary"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="font-mono text-2xs text-fg-dim">
            Star Wars and related marks are property of Lucasfilm Ltd.
            This is an independent, non-commercial archive.
          </p>
          <Link
            href="/?intro=force"
            prefetch={false}
            className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim transition-colors hover:text-fg-primary"
          >
            Replay intro
          </Link>
          <div className="mt-4 flex items-center justify-center border-t border-border-faint pt-4 md:mt-0 md:border-t-0 md:pt-0">
            <Aurebesh className="font-mono text-[10px] tracking-[0.2em] text-fg-dim/50 transition-opacity hover:text-fg-dim">
              HOLOCRON
            </Aurebesh>
          </div>
        </footer>
      </div>
    </main>
  );
}

function BackgroundCanvas() {
  return (
    <div className="absolute inset-0 z-0">
      <IntroCanvas className="absolute inset-0 h-full w-full" />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_50%,transparent_0%,oklch(0.13_0.005_240/0.0)_30%,oklch(0.13_0.005_240/0.85)_75%)]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,oklch(0.13_0.005_240/0.95)_0%,transparent_18%,transparent_70%,oklch(0.09_0.005_240/0.6)_100%)]"
      />
    </div>
  );
}

function PrimaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-full border border-accent-faint bg-accent-bg/70 px-5 py-2.5 text-sm font-medium text-fg-strong transition-all hover:border-accent hover:bg-accent-bg active:translate-y-[1px]"
    >
      <span>{children}</span>
      <ArrowRight
        size={14}
        weight="regular"
        className="transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function SecondaryCTA({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-border-faint px-4 py-2.5 text-sm text-fg-muted transition-all hover:border-border-line hover:text-fg-primary active:translate-y-[1px]"
    >
      {children}
    </a>
  );
}

function BuildBadge({ builtAt }: { builtAt: string | null }) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
      <span>{builtAt ? `Built ${humanDate(builtAt)}` : "Build needed — run npm run build:kb"}</span>
    </span>
  );
}

function CornerLabels() {
  return (
    <div className="pointer-events-none relative h-[60vh] w-full max-w-[680px]">
      <span className="absolute left-0 top-0 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        Sector grid · 1500 pc
      </span>
      <span className="absolute right-0 top-0 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        Era · 0 ABY
      </span>
      <span className="absolute bottom-0 left-0 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        Galactic core
      </span>
      <span className="absolute bottom-0 right-0 inline-flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        <MagnifyingGlass size={11} weight="regular" />
        <span>Press / to search</span>
      </span>
      <Crosshair className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
    </div>
  );
}

function Crosshair({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      width="80"
      height="80"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      style={{ color: "oklch(0.30 0.05 235)" }}
    >
      <circle cx="40" cy="40" r="22" />
      <line x1="40" y1="2" x2="40" y2="14" />
      <line x1="40" y1="66" x2="40" y2="78" />
      <line x1="2" y1="40" x2="14" y2="40" />
      <line x1="66" y1="40" x2="78" y2="40" />
      <circle cx="40" cy="40" r="1.5" fill="oklch(0.78 0.13 235)" />
    </svg>
  );
}
