import type { KaiStartupSignalData } from "@/data/kai";
import { signalConfig } from "@/data/kai";

interface KaiSignalBadgeProps {
  signal: KaiStartupSignalData;
}

const KaiSignalBadge = ({ signal }: KaiSignalBadgeProps) => {
  const cfg = signalConfig[signal.signal];

  return (
    <div className="rounded-xl border border-border/40 px-4 py-3" style={{ backgroundColor: cfg.bg }}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm">{cfg.icon}</span>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      <p className="text-sm font-medium leading-snug">{signal.reason}</p>
    </div>
  );
};

export default KaiSignalBadge;
