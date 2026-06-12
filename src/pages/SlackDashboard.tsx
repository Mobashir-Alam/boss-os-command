import { useState, useMemo } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, Loader2, CheckCircle2, AlertTriangle, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useStartups } from "@/hooks/useStartups";
import {
  useSlackWorkspace,
  useSlackPulse,
  useSlackChannelBreakdown,
  useSlackPeople,
  useSlackTiming,
  useSlackEngagement,
  useTriggerSlackSync,
  useSlackConfig,
  useTodayBoard,
  useMonthlySheet,
  useSlackPresence,
} from "@/hooks/useSlack";
import { useQueryClient } from "@tanstack/react-query";
import SlackPulseTab from "@/components/slack/SlackPulseTab";
import SlackChannelsTab from "@/components/slack/SlackChannelsTab";
import SlackPeopleTab from "@/components/slack/SlackPeopleTab";
import SlackTimingTab from "@/components/slack/SlackTimingTab";
import SlackEngagementTab from "@/components/slack/SlackEngagementTab";
import SlackKaiTab from "@/components/slack/SlackKaiTab";
import SlackTodayTab from "@/components/slack/SlackTodayTab";
import SlackMonthlyTab from "@/components/slack/SlackMonthlyTab";
import SlackSetupDialog from "@/components/slack/SlackSetupDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export default function SlackDashboard() {
  const { dbStartups } = useStartups();
  const nasheedio = dbStartups.find((s) => s.slug === "nasheedio");
  const startupId = nasheedio?.id;
  const qc = useQueryClient();

  const [baselineDays, setBaselineDays] = useState<7 | 28>(7);
  const [setupOpen, setSetupOpen] = useState(false);
  const [presenceMap, setPresenceMap] = useState<Record<string, string> | null>(null);
  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [sheetMonth, setSheetMonth] = useState(currentMonth);

  // Data hooks
  const { data: workspace, isLoading: wsLoading } = useSlackWorkspace(startupId);
  const { data: config } = useSlackConfig(startupId);
  const { data: pulse, isLoading: pulseLoading } = useSlackPulse(startupId, baselineDays);
  const { data: channelRows, isLoading: channelsLoading } = useSlackChannelBreakdown(startupId);
  const { data: peopleData, isLoading: peopleLoading } = useSlackPeople(startupId);
  const { data: timingData, isLoading: timingLoading } = useSlackTiming(startupId);
  const { data: engagementData, isLoading: engagementLoading } = useSlackEngagement(startupId);
  const { data: todayBoard, isLoading: todayLoading } = useTodayBoard(startupId);
  const { data: monthlySheet, isLoading: monthlyLoading } = useMonthlySheet(startupId, sheetMonth);

  const { mutateAsync: triggerSync, isPending: syncing } = useTriggerSlackSync();
  const { mutateAsync: checkPresence, isPending: presenceLoading } = useSlackPresence();

  // Raw channels for metadata + setup pickers
  const { data: rawChannels } = useQuery({
    queryKey: ["slack-raw-channels", startupId],
    enabled: !!startupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connector_data_slack_channels")
        .select("channel_id,channel_name,is_private,is_archived,member_count,topic,purpose")
        .eq("startup_id", startupId!);
      if (error) throw error;
      return data;
    },
  });

  const configured = !!config?.attendance_channel_id;
  const tz = config?.timezone ?? "Asia/Kolkata";

  async function handleSync() {
    if (!startupId) return;
    try {
      toast.info("Syncing Slack data…");
      const result = await triggerSync(startupId);
      if (result.ok) {
        toast.success(
          `Sync complete — ${result.channels_synced} channels · ${result.user_stat_rows} user-day rows · ${result.top_msg_rows} top messages` +
            (result.attendance_enabled ? ` · ${result.attendance_rows} attendance rows` : "")
        );
        if (!result.attendance_enabled) {
          toast.info("Attendance not computed — set up monitoring (Today tab → Setup) then sync again.");
        }
        if (result.skipped?.length) {
          toast.warning(
            `${result.skipped.length} channel(s) skipped: ${result.skipped.slice(0, 3).join("; ")}${result.skipped.length > 3 ? "…" : ""}`
          );
        }
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["slack-workspace"] }),
          qc.invalidateQueries({ queryKey: ["slack-pulse"] }),
          qc.invalidateQueries({ queryKey: ["slack-channel-breakdown"] }),
          qc.invalidateQueries({ queryKey: ["slack-people"] }),
          qc.invalidateQueries({ queryKey: ["slack-timing"] }),
          qc.invalidateQueries({ queryKey: ["slack-engagement"] }),
          qc.invalidateQueries({ queryKey: ["slack-raw-channels"] }),
          qc.invalidateQueries({ queryKey: ["slack-today-board"] }),
          qc.invalidateQueries({ queryKey: ["slack-monthly-sheet"] }),
        ]);
      } else {
        toast.error("Sync failed — check edge function logs");
      }
    } catch (err) {
      toast.error(`Sync error: ${(err as Error).message}`);
    }
  }

  async function handleCheckPresence() {
    if (!startupId) return;
    try {
      const res = await checkPresence(startupId);
      setPresenceMap(res.presence);
      toast.success(`${res.active_count} online right now`);
    } catch (err) {
      toast.error(`Presence check failed: ${(err as Error).message}`);
    }
  }

  const isConnected = !!workspace;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4A154B] flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Slack — Team Ops</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {wsLoading ? (
                  <Skeleton className="h-4 w-32" />
                ) : isConnected ? (
                  <>
                    <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {workspace.workspace_name ?? "Connected"}
                    </Badge>
                    {workspace.member_count_total && (
                      <span className="text-xs text-muted-foreground">
                        {workspace.member_count_total} members
                      </span>
                    )}
                    {workspace.synced_at && (
                      <span className="text-xs text-muted-foreground">
                        · Last synced {new Date(workspace.synced_at).toLocaleDateString()}
                      </span>
                    )}
                  </>
                ) : (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Not yet synced
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button
            onClick={handleSync}
            disabled={syncing || !startupId}
            className="gap-2 shrink-0"
            variant={isConnected ? "outline" : "default"}
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? "Syncing…" : isConnected ? "Sync Slack" : "Load Slack data"}
          </Button>
        </div>

        {/* Not synced yet — setup hint */}
        {!wsLoading && !isConnected && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex items-start gap-3 py-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800 space-y-1">
                <p className="font-medium">No Slack data loaded yet</p>
                <p>
                  Make sure your <code className="bg-amber-100 px-1 rounded">SLACK_BOT_TOKEN</code> is
                  saved in Supabase Edge Function secrets, then click "Load Slack data" above. The bot
                  must be invited to channels you want to analyze.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="today">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Sheet</TabsTrigger>
            <span className="w-px bg-border mx-1 self-stretch" />
            <TabsTrigger value="pulse">Pulse</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="timing">Timing</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="kai">✦ Ask KAI</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="today">
              <SlackTodayTab
                board={todayBoard}
                isLoading={todayLoading}
                configured={configured}
                tz={tz}
                presence={presenceMap}
                onCheckPresence={handleCheckPresence}
                presenceLoading={presenceLoading}
                onOpenSetup={() => setSetupOpen(true)}
              />
            </TabsContent>

            <TabsContent value="monthly">
              <SlackMonthlyTab
                sheet={monthlySheet}
                isLoading={monthlyLoading}
                month={sheetMonth}
                onMonthChange={setSheetMonth}
                configured={configured}
              />
            </TabsContent>

            <TabsContent value="pulse">
              <SlackPulseTab
                snapshot={pulse}
                isLoading={pulseLoading}
                baselineDays={baselineDays}
                onBaselineChange={setBaselineDays}
              />
            </TabsContent>

            <TabsContent value="channels">
              <SlackChannelsTab
                rows={channelRows}
                channels={rawChannels ?? undefined}
                isLoading={channelsLoading}
              />
            </TabsContent>

            <TabsContent value="people">
              <SlackPeopleTab data={peopleData} isLoading={peopleLoading} />
            </TabsContent>

            <TabsContent value="timing">
              <SlackTimingTab data={timingData} isLoading={timingLoading} />
            </TabsContent>

            <TabsContent value="engagement">
              <SlackEngagementTab data={engagementData} isLoading={engagementLoading} />
            </TabsContent>

            <TabsContent value="kai">
              {startupId ? (
                <SlackKaiTab startupId={startupId} />
              ) : (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  Startup not found.
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Setup dialog */}
      {startupId && (
        <SlackSetupDialog
          open={setupOpen}
          onOpenChange={setSetupOpen}
          startupId={startupId}
          channels={rawChannels ?? undefined}
        />
      )}
    </div>
  );
}
