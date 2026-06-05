import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, CornerDownRight } from "lucide-react";
import InfoTooltip from "@/components/social/InfoTooltip";

interface TopMessage {
  channel: string;
  text: string;
  reactions: number;
  replies: number;
  date: string | null;
}

interface TopEmoji {
  name: string;
  count: number;
}

interface Props {
  data:
    | {
        top_messages: TopMessage[];
        top_emojis: TopEmoji[];
        thread_rate: number;
      }
    | undefined;
  isLoading: boolean;
}

function EmojiDisplay({ name }: { name: string }) {
  // Map common Slack emoji names to native emojis
  const EMOJI_MAP: Record<string, string> = {
    thumbsup: "👍", thumbsdown: "👎", heart: "❤️", fire: "🔥",
    "white_check_mark": "✅", tada: "🎉", eyes: "👀", clap: "👏",
    raising_hand: "🙋", pray: "🙏", muscle: "💪", star: "⭐",
    sparkles: "✨", rocket: "🚀", bulb: "💡", question: "❓",
    exclamation: "❗", x: "❌", warning: "⚠️", ok_hand: "👌",
    "+1": "👍", "-1": "👎", laughing: "😂", joy: "😂",
    slightly_smiling_face: "🙂", raised_hands: "🙌", wave: "👋",
    100: "💯",
  };
  return <span title={`:${name}:`}>{EMOJI_MAP[name] ?? `:${name}:`}</span>;
}

export default function SlackEngagementTab({ data, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  if (!data?.top_messages.length && !data?.top_emojis.length) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        No engagement data yet — sync Slack first.
      </div>
    );
  }

  const maxEmoji = data?.top_emojis[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* Thread rate */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm">
            <CornerDownRight className="w-4 h-4 text-muted-foreground" />
            Thread engagement rate
            <InfoTooltip size="xs">
              % of top messages that received at least one thread reply. Higher = more back-and-forth conversation.
            </InfoTooltip>
          </div>
          <span className="text-2xl font-bold">{data?.thread_rate ?? 0}%</span>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top messages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              Most reacted messages (14d)
              <InfoTooltip size="xs">
                Messages with the highest total reaction counts. Shows what content resonated most with the team.
              </InfoTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data?.top_messages.slice(0, 8).map((msg, i) => (
              <div key={i} className="border rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-indigo-600">#{msg.channel}</span>
                  <span className="text-xs text-muted-foreground">{msg.date}</span>
                </div>
                <p className="text-sm leading-snug line-clamp-2 text-muted-foreground">
                  {msg.text || <em>No text preview</em>}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-0.5 text-pink-600 font-medium">
                    <Heart className="w-3 h-3" />
                    {msg.reactions}
                  </span>
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <CornerDownRight className="w-3 h-3" />
                    {msg.replies} replies
                  </span>
                </div>
              </div>
            ))}
            {!data?.top_messages.length && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No reacted messages synced yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top emojis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-1">
              Top emojis
              <InfoTooltip size="xs">
                Most used reaction emojis across all synced messages in the last 14 days.
              </InfoTooltip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data?.top_emojis.map((e, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-xl w-8 text-center">
                  <EmojiDisplay name={e.name} />
                </span>
                <span className="text-muted-foreground flex-1 text-xs">:{e.name}:</span>
                <div className="flex-1 bg-muted h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-pink-400 rounded-full"
                    style={{ width: `${(e.count / maxEmoji) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{e.count}</span>
              </div>
            ))}
            {!data?.top_emojis.length && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No emoji data yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
