import type { Interface } from '@/lib/schema';

// Read-only adaptation of Enport's InterfacesTable. The four-column table
// does not fit a phone, so below `sm` each interface becomes a stacked row.

interface InterfacesTableProps {
  interfaces: Interface[];
}

function TypeChip({ type }: { type: Interface['type'] }) {
  return (
    <span className="rounded-full bg-zinc-100 text-zinc-600 text-xs px-2 py-0.5">
      {type}
    </span>
  );
}

export default function InterfacesTable({ interfaces }: InterfacesTableProps) {
  return (
    <>
      <ul className="sm:hidden divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
        {interfaces.map((iface, i) => (
          <li key={i} className="p-4 bg-white">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-zinc-900">
                <span className="font-medium">{iface.from}</span>
                <span className="text-zinc-400"> → </span>
                {iface.to}
              </p>
              <TypeChip type={iface.type} />
            </div>
            {iface.notes && <p className="text-sm text-zinc-500 mt-2">{iface.notes}</p>}
          </li>
        ))}
      </ul>

      <div className="hidden sm:block overflow-x-auto rounded-lg border border-zinc-200">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50">
            <tr>
              {['From', 'To', 'Type', 'Description'].map((label) => (
                <th
                  key={label}
                  className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {interfaces.map((iface, i) => (
              <tr key={i} className="bg-white align-top">
                <td className="px-4 py-3 text-zinc-900 font-medium">{iface.from}</td>
                <td className="px-4 py-3 text-zinc-900">{iface.to}</td>
                <td className="px-4 py-3"><TypeChip type={iface.type} /></td>
                <td className="px-4 py-3 text-zinc-500 min-w-[280px]">{iface.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
