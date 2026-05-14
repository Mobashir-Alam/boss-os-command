import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStartups } from "@/hooks/useStartups";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface DigestRow {
  id: string;
  title: string | null;
  body: string;
  generated_at: string;
  expires_at: string | null;
}

function useLatestDigest(startupId: string | undefined) {
  return useQuery({
    queryKey: ["tech-weekly-digest", startupId],
    enabled: !!startupId,
    queryFn: async (): Promise<DigestRow | null> => {
      const { data, error } = await supabase
        .from("kai_insights")
        .select("id, title, body, generated_at, expires_at")
        .eq("startup_id", startupId!)
        .eq("department_key", "tech")
        .eq("insight_type", "summary")
        .eq("is_dismissed", false)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as DigestRow) ?? null;
    },
  });
}

export default function WeeklyDigest() {
  const { profile } = useAuth();
  const { dbStartups } = useStartups();
  const nasheedio = dbStartups.find((s) => s.slug === "nasheedio");
  const startupId = nasheedio?.id;

  const qc = useQueryClient();
  const { data: digest, isLoading } = useLatestDigest(startupId);

  // Only the founder + tech lead can trigger a regenerate (it costs an AI call).
  const canTrigger =
    profile?.role === "founder" ||
    (profile?.role === "functional_head" && profile?.department === "tech");

  const generate = useMutation({
    mutationFn: async () => {
      if (!startupId) throw new Error("No startup");
      const { data, error } = await supabase.functions.invoke("weekly-tech-digest", {
        body: { startup_id: startupId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tech-weekly-digest", startupId] });
      toast.success("Weekly digest generated");
    },
    onError: (e: any) => toast.error(e.message ?? "Couldn't generate digest"),
  });

  // Stale = no digest, OR latest digest is more than 7 days old
  const isStale =
    !digest ||
    Date.now() - new Date(digest.generated_at).getTime() > 7 * 864e5;

  return (
    <Card className="border border-white/10 bg-gradient-to-br from-primary/5 to-transparent backdrop-blur-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {digest?.title ?? "This Week in Tech"}
            </p>
            {digest && (
              <p className="text-[10px] text-muted-foreground">
                Generated {formatDistanceToNow(new Date(digest.generated_at), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
        {canTrigger && (
          <Button
            size="sm"
            variant={isStale ? "default" : "outline"}
            disabled={generate.isPending}
            onClick={() => generate.mutate()}
            className="gap-1.5"
            title={isStale ? "Generate this week's digest" : "Regenerate the digest"}
          >
            {generate.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {isStale ? "Generate" : "Regenerate"}
          </Button>
        )}
      </div>

      <div className={cn("mt-3 text-sm leading-relaxed", isLoading && "opacity-50")}>
        {isLoading && !digest && (
          <p className="italic text-muted-foreground">Loading…</p>
        )}
        {!isLoading && !digest && (
          <p className="italic text-muted-foreground">
            No digest yet.{" "}
            {canTrigger
              ? "Click Generate to summarise this week's shipped work."
              : "The Tech Lead or CEO can generate one when ready."}
          </p>
        )}
        {digest && <p className="whitespace-pre-wrap">{digest.body}</p>}
      </div>
    </Card>
  );
}
