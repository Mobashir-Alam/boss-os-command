import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Users, MapPin, Smartphone, Compass, AlertTriangle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList,
  PieChart, Pie, Legend,
} from "recharts";
import { format, parseISO } from "date-fns";
import {
  useAudienceSnapshot,
  type AudienceDemoRow,
  type AudienceGeoRow,
  type AudienceDeviceRow,
  type AudienceTrafficRow,
} from "@/hooks/useYouTube";
import InfoTooltip from "./InfoTooltip";

interface Props {
  startupId: string;
  channelFilterUuid: string | null;
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function fmtMoney(n: number): string {
  if (n >= 1_000) return `$${(n / 1_000).toFixed(2)}K`;
  return `$${n.toFixed(2)}`;
}

function fmtHours(minutes: number): string {
  const hrs = minutes / 60;
  if (hrs >= 1000) return `${(hrs / 1000).toFixed(1)}K hrs`;
  return `${hrs.toFixed(0)} hrs`;
}

const AGE_ORDER = ["age13-17", "age18-24", "age25-34", "age35-44", "age45-54", "age55-64", "age65-"];
const AGE_LABEL: Record<string, string> = {
  "age13-17": "13–17",
  "age18-24": "18–24",
  "age25-34": "25–34",
  "age35-44": "35–44",
  "age45-54": "45–54",
  "age55-64": "55–64",
  "age65-": "65+",
};

const GENDER_COLOR: Record<string, string> = {
  male: "rgb(59 130 246)",            // blue
  female: "rgb(236 72 153)",          // pink
  user_specified: "rgb(148 163 184)", // gray
};
const GENDER_LABEL: Record<string, string> = {
  male: "Male",
  female: "Female",
  user_specified: "Other / undisclosed",
};

// Friendly names for YouTube's insightTrafficSourceType codes
const TRAFFIC_LABEL: Record<string, string> = {
  YT_SEARCH: "YouTube search",
  SUBSCRIBER: "Subscriber feed",
  YT_CHANNEL: "Channel page",
  RELATED_VIDEO: "Suggested videos",
  EXT_URL: "External websites",
  NO_LINK_OTHER: "Direct / unknown",
  NO_LINK_EMBEDDED: "Embedded player",
  NOTIFICATION: "Notifications",
  YT_OTHER_PAGE: "Other YouTube pages",
  PLAYLIST: "Playlists",
  YT_PLAYLIST_PAGE: "Playlist pages",
  ANNOTATION: "Annotations",
  CAMPAIGN_CARD: "Promo cards",
  ADVERTISING: "Ads",
  END_SCREEN: "End screens",
  HASHTAGS: "Hashtags",
  SHORTS: "Shorts feed",
  PRODUCT_PAGE: "Product page",
  RELATED_LIVESTREAM: "Related livestreams",
  LIVE_REDIRECT: "Live redirect",
  YT_PREMIUM: "YouTube Premium",
};

const DEVICE_LABEL: Record<string, string> = {
  MOBILE: "Mobile",
  DESKTOP: "Desktop",
  TABLET: "Tablet",
  TV: "TV",
  GAME_CONSOLE: "Game console",
  UNKNOWN_PLATFORM: "Other",
};

const DEVICE_COLOR: Record<string, string> = {
  MOBILE: "rgb(59 130 246)",
  DESKTOP: "rgb(16 185 129)",
  TABLET: "rgb(245 158 11)",
  TV: "rgb(139 92 246)",
  GAME_CONSOLE: "rgb(236 72 153)",
  UNKNOWN_PLATFORM: "rgb(148 163 184)",
};

// ISO-3166 alpha-2 → display name + flag emoji
function countryDisplay(code: string): { label: string; flag: string } {
  if (!code || code.length !== 2) return { label: code, flag: "🌐" };
  const upper = code.toUpperCase();
  const flag = String.fromCodePoint(
    ...[...upper].map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65))
  );
  try {
    const dn = new Intl.DisplayNames(["en"], { type: "region" });
    return { label: dn.of(upper) ?? upper, flag };
  } catch {
    return { label: upper, flag };
  }
}

export default function AudienceTab({ startupId, channelFilterUuid }: Props) {
  const { data: aud, isLoading } = useAudienceSnapshot(startupId, channelFilterUuid);

  // Pivot demographics for the stacked bar
  const demoPivot = useMemo(() => {
    if (!aud) return [];
    const byAge = new Map<string, Record<string, number | string>>();
    for (const r of aud.demographics) {
      const row = byAge.get(r.age_group) ?? { age: AGE_LABEL[r.age_group] ?? r.age_group };
      row[r.gender] = ((row[r.gender] as number | undefined) ?? 0) + r.viewer_percentage;
      byAge.set(r.age_group, row);
    }
    // Ensure all age buckets are present in canonical order
    return AGE_ORDER
      .filter((ag) => byAge.has(ag))
      .map((ag) => byAge.get(ag)!);
  }, [aud]);

  const totalViews = useMemo(() => {
    if (!aud) return 0;
    return aud.geography.reduce((acc, r) => acc + r.views, 0);
  }, [aud]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64 w-full" />)}
      </div>
    );
  }

  if (!aud || !aud.latest_period_end) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">No audience data for this scope yet.</p>
            <p className="text-muted-foreground mt-0.5">
              Click <b>Sync analytics</b> on the header to populate audience, geography,
              devices, and traffic-source breakdowns from YouTube.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  let periodLabel = aud.latest_period_end;
  try { periodLabel = format(parseISO(aud.latest_period_end), "MMM d, yyyy"); } catch { /* keep raw */ }

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-1">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Audience snapshot · trailing 30-day window
            </p>
            <InfoTooltip title="Why a 30-day window">
              Demographics, geography, traffic, and device data isn't reported
              by-day like the Pulse metrics — YouTube only returns it
              aggregated over a date range. We use a rolling <b>30-day window
              ending on the latest reported day</b>. Each Sync analytics click
              writes a new snapshot, so historical comparisons accumulate over
              time.
            </InfoTooltip>
          </div>
          <p className="text-sm font-semibold">
            Period ending {periodLabel}
          </p>
        </div>
        {totalViews > 0 && (
          <Badge variant="outline" className="text-xs gap-1.5">
            <Users className="h-3 w-3" />
            {fmtNum(totalViews)} total views in window
          </Badge>
        )}
      </div>

      {/* Demographics + Devices side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Demographics — 2/3 width */}
        <Card className="border-border/40 lg:col-span-2">
          <CardContent className="p-5">
            <SectionHeader
              icon={Users}
              title="Demographics"
              subtitle="Viewer share by age & gender"
              help={{
                title: "How demographics are reported",
                body: (
                  <>
                    YouTube reports demographics as the <b>% of total viewer-minutes</b>
                    for each age × gender bucket. Stacked bars per age group should sum
                    to roughly 100%. <b>Caveats:</b> YouTube hides buckets with under
                    ~100 viewers for privacy, so small audiences may show fewer bars.
                    COPPA-flagged "Made for Kids" channels are blocked from demographic
                    reporting entirely. When showing multiple channels, we average each
                    channel's % — close enough for orientation; views-weighted later if
                    one channel dwarfs the others.
                  </>
                ),
              }}
            />
            {demoPivot.length === 0 ? (
              <EmptyHint text="YouTube hides demographics when an audience bucket is too small." />
            ) : (
              <div className="h-72 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demoPivot} barGap={4}>
                    <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(v) => `${v.toFixed(0)}%`}
                      tick={{ fontSize: 11 }}
                      width={50}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(148,163,184,0.1)" }}
                      formatter={(v: any, name) => [`${Number(v).toFixed(1)}%`, GENDER_LABEL[name as string] ?? name]}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend
                      formatter={(value) => GENDER_LABEL[value as string] ?? value}
                      wrapperStyle={{ fontSize: 11 }}
                    />
                    {Object.keys(GENDER_COLOR).map((gender) => (
                      <Bar
                        key={gender}
                        dataKey={gender}
                        fill={GENDER_COLOR[gender]}
                        radius={[3, 3, 0, 0]}
                        isAnimationActive={false}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Devices — 1/3 width */}
        <Card className="border-border/40">
          <CardContent className="p-5">
            <SectionHeader
              icon={Smartphone}
              title="Devices"
              subtitle="Watch share by device type"
              help={{
                title: "Device split",
                body: (
                  <>
                    Each slice is the share of <b>views</b> (not watch time) coming from
                    each device class. "TV" includes smart TVs and casted sessions —
                    typically the longest watch sessions. "Other" is YouTube's
                    catch-all for browsers/devices it couldn't classify.
                  </>
                ),
              }}
            />
            <DeviceChart devices={aud.devices} />
          </CardContent>
        </Card>
      </div>

      {/* Geography */}
      <Card className="border-border/40">
        <CardContent className="p-5">
          <SectionHeader
            icon={MapPin}
            title="Geography"
            subtitle="Top countries by views in window"
            help={{
              title: "Country rankings",
              body: (
                <>
                  Top 12 countries by <b>view count</b> over the 30-day window.
                  Bar length is relative to the #1 country. The right-hand
                  number shows <b>revenue from that country</b> when the
                  channel is monetized, otherwise its <b>share of total
                  views</b>. Useful for spotting unexpected geographies —
                  e.g., heavy Diaspora viewership outside the home market.
                </>
              ),
            }}
          />
          <GeographyList rows={aud.geography} totalViews={totalViews} />
        </CardContent>
      </Card>

      {/* Traffic sources */}
      <Card className="border-border/40">
        <CardContent className="p-5">
          <SectionHeader
            icon={Compass}
            title="Traffic sources"
            subtitle="Where viewers came from"
            help={{
              title: "Traffic-source labels",
              body: (
                <>
                  How viewers landed on each video. The big four to watch:
                  <ul className="mt-1.5 space-y-0.5 list-disc pl-4">
                    <li><b>Suggested videos</b> — YouTube's recommendation rail. Growth gold.</li>
                    <li><b>YouTube search</b> — discovery via keyword. SEO signal.</li>
                    <li><b>Subscriber feed</b> — your loyal base. Stability signal.</li>
                    <li><b>Channel page</b> — viewers browsing your back catalog.</li>
                  </ul>
                  Low % from Suggested/Search and high % from Subscriber feed
                  often means YouTube isn't pushing you to new audiences — a
                  retention problem upstream.
                </>
              ),
            }}
          />
          <TrafficSourceList rows={aud.traffic_sources} />
        </CardContent>
      </Card>
    </div>
  );
}

/* ──────── small subcomponents ──────── */

function SectionHeader({
  icon: Icon, title, subtitle, help,
}: {
  icon: any; title: string; subtitle: string;
  help?: { title: string; body: React.ReactNode };
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-semibold leading-none">{title}</h3>
          {help && <InfoTooltip title={help.title}>{help.body}</InfoTooltip>}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/40 bg-muted/10 p-6 text-center">
      <p className="text-xs text-muted-foreground">{text}</p>
    </div>
  );
}

function DeviceChart({ devices }: { devices: AudienceDeviceRow[] }) {
  if (devices.length === 0) return <EmptyHint text="No device data yet." />;
  const total = devices.reduce((acc, d) => acc + d.views, 0);
  const data = devices.map((d) => ({
    name: DEVICE_LABEL[d.device_type] ?? d.device_type,
    raw: d.device_type,
    value: d.views,
    pct: total === 0 ? 0 : (d.views / total) * 100,
  }));
  return (
    <>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={45}
              outerRadius={75}
              isAnimationActive={false}
              stroke="hsl(var(--card))"
              strokeWidth={2}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={DEVICE_COLOR[d.raw] ?? "rgb(148 163 184)"} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: any, _n, ctx: any) => [
                `${fmtNum(Number(v))} views · ${ctx?.payload?.pct?.toFixed(1) ?? 0}%`,
                ctx?.payload?.name,
              ]}
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5 mt-2">
        {data.map((d) => (
          <div key={d.raw} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ background: DEVICE_COLOR[d.raw] ?? "rgb(148 163 184)" }}
            />
            <span className="truncate flex-1">{d.name}</span>
            <span className="tabular-nums text-muted-foreground">{d.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </>
  );
}

function GeographyList({ rows, totalViews }: { rows: AudienceGeoRow[]; totalViews: number }) {
  if (rows.length === 0) return <EmptyHint text="No geography data yet." />;
  const top = rows.slice(0, 12);
  const maxViews = Math.max(...top.map((r) => r.views));
  return (
    <div className="space-y-2">
      {top.map((r) => {
        const { label, flag } = countryDisplay(r.country_code);
        const widthPct = maxViews > 0 ? (r.views / maxViews) * 100 : 0;
        const sharePct = totalViews > 0 ? (r.views / totalViews) * 100 : 0;
        return (
          <div key={r.country_code} className="grid grid-cols-12 items-center gap-3 text-xs">
            <div className="col-span-3 sm:col-span-3 flex items-center gap-2 min-w-0">
              <span className="text-base leading-none">{flag}</span>
              <span className="truncate font-medium">{label}</span>
            </div>
            <div className="col-span-5 sm:col-span-6 relative">
              <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full bg-blue-500/70 rounded-full"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 text-right tabular-nums">
              {fmtNum(r.views)}
            </div>
            <div className="col-span-2 sm:col-span-2 text-right text-muted-foreground tabular-nums">
              {r.estimated_revenue_usd && r.estimated_revenue_usd > 0
                ? fmtMoney(r.estimated_revenue_usd)
                : `${sharePct.toFixed(1)}%`}
            </div>
          </div>
        );
      })}
      {rows.length > 12 && (
        <p className="text-[10px] text-muted-foreground text-center pt-2">
          + {rows.length - 12} more countries
        </p>
      )}
    </div>
  );
}

function TrafficSourceList({ rows }: { rows: AudienceTrafficRow[] }) {
  if (rows.length === 0) return <EmptyHint text="No traffic-source data yet." />;
  const total = rows.reduce((acc, r) => acc + r.views, 0);
  const max = Math.max(...rows.map((r) => r.views));
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const label = TRAFFIC_LABEL[r.source_type] ?? r.source_type;
        const widthPct = max > 0 ? (r.views / max) * 100 : 0;
        const sharePct = total > 0 ? (r.views / total) * 100 : 0;
        return (
          <div key={r.source_type} className="grid grid-cols-12 items-center gap-3 text-xs">
            <div className="col-span-4 min-w-0">
              <p className="truncate font-medium">{label}</p>
            </div>
            <div className="col-span-5 relative">
              <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
                <div className="h-full bg-emerald-500/70 rounded-full" style={{ width: `${widthPct}%` }} />
              </div>
            </div>
            <div className="col-span-1 text-right tabular-nums">
              {fmtNum(r.views)}
            </div>
            <div className="col-span-2 text-right text-muted-foreground tabular-nums">
              {sharePct.toFixed(1)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
