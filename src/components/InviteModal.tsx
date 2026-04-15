import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startups } from "@/data/startups";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

const InviteModal = () => {
  const { user, isFounder, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("mfo");
  const [selectedStartups, setSelectedStartups] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isFounder) return null;

  const toggleStartup = (id: string) => {
    setSelectedStartups((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleInvite = async () => {
    if (!email || !user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("team_invites").insert({
        email,
        role: role as any,
        invited_by: user.id,
      });
      if (error) throw error;

      // Send invite email
      const inviteId = crypto.randomUUID();
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "team-invite",
          recipientEmail: email,
          idempotencyKey: `team-invite-${inviteId}`,
          templateData: {
            role,
            invitedBy: profile?.full_name || profile?.email || "A team member",
            signupUrl: `${window.location.origin}/login`,
          },
        },
      });

      toast.success(`Invite sent to ${email}`);
      setOpen(false);
      setEmail("");
      setRole("mfo");
      setSelectedStartups([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <UserPlus className="h-3.5 w-3.5" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              placeholder="team@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mfo">MFO (Manager)</SelectItem>
                <SelectItem value="functional_head">Functional Head</SelectItem>
                <SelectItem value="project_manager">Project Manager</SelectItem>
                <SelectItem value="team_member">Team Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Assign Startups</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {startups.map((s) => (
                <div key={s.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`inv-${s.id}`}
                    checked={selectedStartups.includes(s.id)}
                    onCheckedChange={() => toggleStartup(s.id)}
                  />
                  <label htmlFor={`inv-${s.id}`} className="text-sm cursor-pointer">
                    {s.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={handleInvite} disabled={loading || !email} className="w-full">
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Send Invite
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteModal;
