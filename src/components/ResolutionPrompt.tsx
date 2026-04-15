import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ResolutionPromptProps {
  issueLabel: string;
  onResolve: () => void;
}

const ResolutionPrompt = ({ issueLabel, onResolve }: ResolutionPromptProps) => {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 animate-in fade-in-0 duration-200">
      <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
      <p className="text-sm text-emerald-700 dark:text-emerald-400 flex-1">
        All tasks completed for <span className="font-semibold">{issueLabel}</span>
      </p>
      <Button
        size="sm"
        variant="outline"
        className="text-xs h-7 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10"
        onClick={() => {
          onResolve();
          toast.success("Issue resolved", { description: issueLabel });
        }}
      >
        Mark Resolved
      </Button>
    </div>
  );
};

export default ResolutionPrompt;
