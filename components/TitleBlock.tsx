// A drawing title block as the page's sign-off. Server-rendered. The cell
// rules are the 1px gaps of the grid showing the ink background through, so
// they stay correct however the cells wrap.

interface TitleBlockProps {
  title: string;
  drawn: string;
  rev: string;
  /** ISO date (YYYY-MM-DD), generated at build. */
  date: string;
  sheet: string;
}

export default function TitleBlock({ title, drawn, rev, date, sheet }: TitleBlockProps) {
  const cells: { label: string; value: string; className?: string; figures?: boolean }[] = [
    { label: "Title", value: title, className: "col-span-2 sm:col-span-1" },
    { label: "Drawn", value: drawn },
    { label: "Rev", value: rev },
    { label: "Date", value: date, figures: true },
    { label: "Sheet", value: sheet, figures: true },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px border-2 border-ink bg-ink sm:grid-cols-[2.2fr_1fr_0.6fr_1.1fr_0.8fr]">
      {cells.map((c) => (
        <div key={c.label} className={`bg-panel px-3 py-2 ${c.className ?? ""}`}>
          <dt className="font-label text-[12px] font-bold uppercase tracking-wider text-ink-2">{c.label}</dt>
          <dd className={`mt-0.5 font-label text-[16px] font-bold text-ink ${c.figures ? "tabular-nums" : ""}`}>{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}
