import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStartupPeople } from "@/hooks/useStartupHub";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus, X, Loader2 } from "lucide-react";

export default function PeopleTab({ startupId }: { startupId: string }) {
  const { people, loading, assign, unassign } = useStartupPeople(startupId);
  const [adding, setAdding] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");

  const { data: allProfiles } = useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email, role");
      return data ?? [];
    },
  });

  const assignedIds = people.map((p) => p.user_id);
  const available = (allProfiles ?? []).filter((p) => !assignedIds.includes(p.id));

  const handleAssign = () => {
    if (!selectedUser) return;
    assign.mutate(selectedUser);
    setSelectedUser("");
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">People</h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="h-3 w-3" /> Assign
        </Button>
      </div>

      {adding && (
        <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="text-xs flex-1"><SelectValue placeholder="Select team member" /></SelectTrigger>
            <SelectContent>
              {available.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || p.id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={handleAssign} disabled={!selectedUser || assign.isPending}>
            {assign.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Add
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : people.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          <Users className="h-5 w-5 mx-auto mb-2 opacity-40" />
          No team members assigned
        </div>
      ) : (
        <div className="space-y-2">
          {people.map((p) => (
            <div key={p.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{p.profile?.full_name || p.profile?.email || "Unknown"}</p>
                <p className="text-xs text-muted-foreground capitalize">{p.profile?.role?.replace("_", " ")}</p>
              </div>
              <button onClick={() => unassign.mutate(p.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
