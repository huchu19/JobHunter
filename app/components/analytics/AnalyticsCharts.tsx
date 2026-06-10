// Presentational analytics charts — lightweight inline SVG/CSS, no charting
// dependency. Each takes already-aggregated data (from app/lib/applicationAnalytics)
// and renders with the app's design tokens so it themes with light/dark for free.

import type {
  FunnelStage,
  WeekPoint,
  StageGap,
  Conversions,
  StatusSlice,
} from "@/app/lib/applicationAnalytics";

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-6">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Funnel — horizontal bars, each width ∝ % of the top stage.
// ---------------------------------------------------------------------------
export function FunnelChart({ funnel }: { funnel: FunnelStage[] }) {
  return (
    <Panel
      title="Application funnel"
      subtitle="How far your applications progress, stage by stage"
    >
      <div className="space-y-4">
        {funnel.map((stage, i) => (
          <div key={stage.status}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: stage.accent }}
                />
                {stage.label}
              </span>
              <span className="text-sm text-muted">
                <span className="font-semibold text-foreground">
                  {stage.count}
                </span>{" "}
                · {stage.pctOfTop}%
                {i > 0 && (
                  <span className="ml-2 text-xs text-muted-2">
                    ({stage.pctOfPrev}% from prev)
                  </span>
                )}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.max(stage.pctOfTop, stage.count > 0 ? 2 : 0)}%`,
                  backgroundColor: stage.accent,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Weekly timeline — simple column chart in SVG.
// ---------------------------------------------------------------------------
export function WeeklyTimeline({ weekly }: { weekly: WeekPoint[] }) {
  const max = Math.max(1, ...weekly.map((w) => w.count));
  const W = 640;
  const H = 180;
  const padX = 8;
  const padTop = 16;
  const padBottom = 28;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const slot = innerW / weekly.length;
  const barW = Math.min(38, slot * 0.6);

  return (
    <Panel
      title="Applications per week"
      subtitle="Submitted applications over the last 8 weeks"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Applications submitted per week"
      >
        {/* baseline */}
        <line
          x1={padX}
          y1={padTop + innerH}
          x2={W - padX}
          y2={padTop + innerH}
          stroke="var(--border)"
          strokeWidth={1}
        />
        {weekly.map((w, i) => {
          const h = (w.count / max) * innerH;
          const x = padX + i * slot + (slot - barW) / 2;
          const y = padTop + innerH - h;
          return (
            <g key={w.weekStart}>
              {w.count > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 5}
                  textAnchor="middle"
                  className="fill-foreground"
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  {w.count}
                </text>
              )}
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, w.count > 0 ? 3 : 0)}
                rx={4}
                fill="var(--brand)"
              />
              <text
                x={x + barW / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-muted"
                style={{ fontSize: 10 }}
              >
                {w.label}
              </text>
            </g>
          );
        })}
      </svg>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Conversion rates — three headline percentages.
// ---------------------------------------------------------------------------
export function ConversionCards({ conv }: { conv: Conversions }) {
  const items = [
    {
      label: "Applied → Interview",
      value: conv.appliedToInterview,
      hint: `${conv.applied} applied`,
    },
    {
      label: "Interview → Offer",
      value: conv.interviewToOffer,
      hint: "of interviewed",
    },
    {
      label: "Applied → Offer",
      value: conv.appliedToOffer,
      hint: "overall conversion",
    },
  ];
  return (
    <Panel title="Conversion rates" subtitle="Where you convert and where you drop off">
      <div className="grid grid-cols-3 gap-4">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl bg-surface-muted p-4 text-center">
            <p className="display text-3xl text-foreground">{it.value}%</p>
            <p className="mt-1 text-xs font-medium text-foreground">{it.label}</p>
            <p className="text-[11px] text-muted-2">{it.hint}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Average days between stages.
// ---------------------------------------------------------------------------
export function StageGaps({ gaps }: { gaps: StageGap[] }) {
  return (
    <Panel title="Average time between stages" subtitle="How long each step takes on average">
      <div className="space-y-3">
        {gaps.map((g) => (
          <div
            key={g.label}
            className="flex items-center justify-between rounded-xl bg-surface-muted px-4 py-3"
          >
            <span className="text-sm font-medium text-foreground">{g.label}</span>
            <span className="text-right">
              {g.avgDays === null ? (
                <span className="text-sm text-muted-2">No data yet</span>
              ) : (
                <>
                  <span className="display text-xl text-foreground">
                    {g.avgDays}
                  </span>
                  <span className="ml-1 text-sm text-muted">
                    day{g.avgDays === 1 ? "" : "s"}
                  </span>
                  <span className="ml-2 text-[11px] text-muted-2">
                    n={g.sampleSize}
                  </span>
                </>
              )}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ---------------------------------------------------------------------------
// Current status distribution — stacked proportion bar + legend.
// ---------------------------------------------------------------------------
export function StatusDistribution({ dist }: { dist: StatusSlice[] }) {
  const total = dist.reduce((s, d) => s + d.count, 0);
  return (
    <Panel title="Pipeline snapshot" subtitle="Where every tracked application sits right now">
      {total === 0 ? (
        <p className="text-sm text-muted-2">No applications tracked yet.</p>
      ) : (
        <>
          <div className="mb-4 flex h-4 w-full overflow-hidden rounded-full bg-surface-muted">
            {dist.map(
              (d) =>
                d.count > 0 && (
                  <div
                    key={d.status}
                    style={{ width: `${d.pct}%`, backgroundColor: d.accent }}
                    title={`${d.label}: ${d.count}`}
                  />
                )
            )}
          </div>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            {dist.map((d) => (
              <li key={d.status} className="flex items-center gap-2 text-sm">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: d.accent }}
                />
                <span className="text-muted">{d.label}</span>
                <span className="ml-auto font-semibold text-foreground">
                  {d.count}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
