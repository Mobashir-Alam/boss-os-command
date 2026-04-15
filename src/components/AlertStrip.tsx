import { useNavigate } from "react-router-dom";
import { criticalAlerts } from "@/data/startups";

const AlertStrip = () => {
  const navigate = useNavigate();

  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Critical Alerts</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {criticalAlerts.map((alert) => (
          <button
            key={alert.id}
            onClick={() => navigate(`/startup/${alert.startupId}`)}
            className="flex-shrink-0 flex items-center gap-2 rounded-full border border-border/60 bg-card px-4 py-2 text-sm transition-all hover:shadow-sm hover:border-border hover:bg-muted/50"
          >
            <span>{alert.icon}</span>
            <span className="whitespace-nowrap">{alert.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default AlertStrip;
