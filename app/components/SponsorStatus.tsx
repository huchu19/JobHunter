import { Radio } from "lucide-react";

export default async function SponsorStatus() {
  try {
    const response = await fetch("http://localhost:3000/api/sponsors", {
      cache: "no-store",
    });

    if (!response.ok) throw new Error("Failed to fetch sponsors");

    const data = await response.json();
    const csvDate = data.csvDate;

    // Format date as DD/MM/YYYY
    const [year, month, day] = csvDate.split("-");
    const formattedDate = `${day}/${month}/${year}`;

    return (
      <div className="mx-3 mb-4 mt-3 rounded-xl border border-border bg-surface-muted p-3">
        <div className="flex items-center gap-2">
          <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-strong">
            <Radio size={13} strokeWidth={2.5} />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-bold tracking-wide text-foreground">
              LIVE · GOV.UK
            </p>
            <p className="text-[11px] text-muted">Updated {formattedDate}</p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="mx-3 mb-4 mt-3 rounded-xl border border-border bg-surface-muted p-3">
        <div className="flex items-center gap-2">
          <span className="relative grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-strong">
            <Radio size={13} strokeWidth={2.5} />
          </span>
          <div className="leading-tight">
            <p className="text-[11px] font-bold tracking-wide text-foreground">
              LIVE · GOV.UK
            </p>
            <p className="text-[11px] text-muted">Updated today</p>
          </div>
        </div>
      </div>
    );
  }
}
