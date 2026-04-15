import { useNavigate } from "react-router-dom";
import { criticalAlerts } from "@/data/startups";

const AlertStrip = () => {
  const navigate = useNavigate();

  return (
    <section className="mt-12">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Critical Alerts</h2>
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
        {criticalAlerts.map((alert) => {
          const isCritical = alert.severity === "critical";
          return (
            <button
              key={alert.id}
              onClick={() => navigate(`/startup/${alert.startupId}`)}
              className={`flex-shrink-0 flex items-center gap-2.5 rounded-full border px-5 py-2.5 text-sm font-medium transition-all duration-150 hover:scale-[1.03] hover:shadow-md active:scale-[0.98] ${
                isCritical
                  ? "border-destructive/30 bg-destructive/5 text-foreground"
                  : "border-yellow-500/30 bg-yellow-500/5 text-foreground"
              }`}
              style={isCritical ? { boxShadow: "0 0 12px hsl(0 84% 60% / 0.08)" } : undefined}
            >
              <span className={`text-base ${isCritical ? "animate-pulse" : ""}`}>{alert.icon}</span>
              <span className="whitespace-nowrap">{alert.text}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default AlertStrip;
