import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Rocket, Users, Briefcase, ArrowRight, Plus, Sparkles,
  LayoutDashboard, Target, Wrench, CheckCircle2, Send, Brain
} from "lucide-react";
import { cn } from "@/lib/utils";

type Role = "founder" | "mfo" | "functional_head";

const STEPS = [
  "role",
  "startup",
  "walkthrough",
  "first-action",
  "invite",
  "kai-intro",
] as const;

type Step = (typeof STEPS)[number];

const roleOptions: { value: Role; label: string; desc: string; icon: React.ReactNode }[] = [
  { value: "founder", label: "Founder / CEO", desc: "Full access to all startups and data", icon: <Rocket className="h-5 w-5" /> },
  { value: "mfo", label: "Manager at Founder's Office", desc: "Execute tasks and manage updates", icon: <Briefcase className="h-5 w-5" /> },
  { value: "functional_head", label: "Team Member", desc: "Access relevant startups and data", icon: <Users className="h-5 w-5" /> },
];

const walkthroughTips = [
  { icon: <LayoutDashboard className="h-5 w-5" />, title: "Dashboard", desc: "See what needs attention across your startups" },
  { icon: <Target className="h-5 w-5" />, title: "Focus", desc: "Act on the highest-priority issues" },
  { icon: <Wrench className="h-5 w-5" />, title: "Fix Button", desc: "Assign tasks instantly from any issue" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<Step>("role");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [startupName, setStartupName] = useState("");
  const [startupStage, setStartupStage] = useState("");
  const [runway, setRunway] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const currentIndex = STEPS.indexOf(step);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;

  const handleRoleSelect = async () => {
    if (!selectedRole || !user) return;
    setSaving(true);
    try {
      // Update profile role
      await supabase.from("profiles").update({ role: selectedRole }).eq("id", user.id);
      // Update user_roles
      await supabase.from("user_roles").upsert({ user_id: user.id, role: selectedRole }, { onConflict: "user_id,role" });
      await refreshProfile();
      setStep("startup");
    } catch {
      toast.error("Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const handleAddStartup = () => {
    if (!startupName.trim()) {
      toast.error("Enter a startup name");
      return;
    }
    // Store in localStorage for now (startup data is local)
    const onboardingStartup = {
      name: startupName,
      stage: startupStage || "Seed",
      runway: runway || "Unknown",
    };
    localStorage.setItem("onboarding_startup", JSON.stringify(onboardingStartup));
    toast.success(`${startupName} added!`);
    setStep("walkthrough");
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !user) {
      setStep("kai-intro");
      return;
    }
    try {
      await supabase.from("team_invites").insert({
        email: inviteEmail,
        invited_by: user.id,
        role: "mfo" as const,
      });
      toast.success(`Invite sent to ${inviteEmail}`);
    } catch {
      toast.error("Failed to send invite");
    }
    setStep("kai-intro");
  };

  const handleFinish = () => {
    localStorage.setItem("onboarding_complete", "true");
    navigate("/focus");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-foreground transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg space-y-8">

          {/* STEP 1: Role Selection */}
          {step === "role" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">What are you managing?</h1>
                <p className="text-sm text-muted-foreground">This helps us personalize your experience</p>
              </div>
              <div className="space-y-3">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedRole(opt.value)}
                    className={cn(
                      "w-full flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                      selectedRole === opt.value
                        ? "border-foreground bg-accent shadow-sm"
                        : "border-border hover:border-foreground/30 hover:bg-accent/50"
                    )}
                  >
                    <div className={cn(
                      "rounded-lg p-2",
                      selectedRole === opt.value ? "bg-foreground text-background" : "bg-muted text-muted-foreground"
                    )}>
                      {opt.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </div>
                    {selectedRole === opt.value && (
                      <CheckCircle2 className="ml-auto h-5 w-5 text-foreground" />
                    )}
                  </button>
                ))}
              </div>
              <Button
                className="w-full h-11"
                disabled={!selectedRole || saving}
                onClick={handleRoleSelect}
              >
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 2: Add First Startup */}
          {step === "startup" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-lg bg-foreground flex items-center justify-center">
                  <Plus className="h-5 w-5 text-background" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Add your first startup</h1>
                <p className="text-sm text-muted-foreground">We'll auto-create a KPI, issue, and task to get you started</p>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Startup Name</Label>
                  <Input
                    placeholder="e.g. Acme Inc"
                    value={startupName}
                    onChange={(e) => setStartupName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={startupStage} onValueChange={setStartupStage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idea">Idea</SelectItem>
                      <SelectItem value="mvp">MVP</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series-a">Series A</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Runway <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    placeholder="e.g. 12 months"
                    value={runway}
                    onChange={(e) => setRunway(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => {
                  setStep("walkthrough");
                }}>
                  Skip
                </Button>
                <Button className="flex-1 h-11" onClick={handleAddStartup}>
                  Add Startup <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                You'll also see 1–2 sample startups to explore the system
              </p>
            </div>
          )}

          {/* STEP 3: Walkthrough */}
          {step === "walkthrough" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">Your command center</h1>
                <p className="text-sm text-muted-foreground">Three things to know</p>
              </div>
              <div className="space-y-3">
                {walkthroughTips.map((tip, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-xl border border-border p-4 animate-in fade-in slide-in-from-bottom-2"
                    style={{ animationDelay: `${i * 150}ms` }}
                  >
                    <div className="rounded-lg bg-muted p-2.5 text-foreground">
                      {tip.icon}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{tip.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tip.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full h-11" onClick={() => setStep("first-action")}>
                Got it <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 4: First Action */}
          {step === "first-action" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-lg bg-foreground flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-background" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Assign your first task</h1>
                <p className="text-sm text-muted-foreground">
                  Click the <span className="font-medium text-foreground">Fix</span> button on any issue to assign an owner and set a deadline
                </p>
              </div>
              <div className="rounded-xl border border-border p-5 space-y-3 bg-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">⚠️ Retention ↓12% this week</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Nasheedio • Detected 3 hours ago</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs" disabled>
                    Fix
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground italic">
                  → You'll assign an owner, add instructions, and set a deadline
                </p>
              </div>
              <Button className="w-full h-11" onClick={() => setStep("invite")}>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* STEP 5: Invite Team */}
          {step === "invite" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="text-center space-y-2">
                <div className="mx-auto w-10 h-10 rounded-lg bg-foreground flex items-center justify-center">
                  <Send className="h-5 w-5 text-background" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Bring your team in</h1>
                <p className="text-sm text-muted-foreground">Invite your MFO or CTO to start collaborating</p>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep("kai-intro")}>
                  Skip
                </Button>
                <Button className="flex-1 h-11" onClick={handleInvite}>
                  Send Invite <Send className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: KAI Intro */}
          {step === "kai-intro" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-xl bg-foreground flex items-center justify-center">
                  <Brain className="h-6 w-6 text-background" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Meet KAI</h1>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Your AI co-founder. KAI will surface insights, predict risks, and recommend actions — automatically.
                </p>
              </div>
              <div className="rounded-xl border border-border p-4 bg-card space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <p className="text-sm font-medium">KAI Insight</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  "Retention may drop another 8–10% in 2 weeks if creator uploads stay flat"
                </p>
              </div>
              <Button className="w-full h-11" onClick={handleFinish}>
                Launch Founder OS <Rocket className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Onboarding;
