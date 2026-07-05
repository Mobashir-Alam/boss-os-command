// Marks a dashboard section as STATIC placeholder data (not wired to live
// sources yet) with a red dashed border + badge, so the founder always knows
// what is real vs fake. Never delete the wrapped section — wrap it.
export function StaticPlaceholder({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute top-2 right-2 z-10">
        <span className="rounded-sm border border-red-500 bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-600">
          STATIC · {label}
        </span>
      </div>
      <div className="rounded-lg border-2 border-dashed border-red-300/60 opacity-60">
        {children}
      </div>
    </div>
  );
}
