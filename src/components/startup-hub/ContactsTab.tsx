import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStartupContacts } from "@/hooks/useStartupHub";
import { Contact, Plus, X, Loader2 } from "lucide-react";

export default function ContactsTab({ startupId }: { startupId: string }) {
  const { contacts, loading, add, remove } = useStartupContacts(startupId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleAdd = () => {
    if (!name.trim()) return;
    add.mutate({ name: name.trim(), role: role.trim(), email: email || undefined, phone: phone || undefined });
    setName("");
    setRole("");
    setEmail("");
    setPhone("");
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contacts</h3>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {adding && (
        <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Role (e.g. Investor)" value={role} onChange={(e) => setRole(e.target.value)} />
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={add.isPending || !name.trim()}>
            {add.isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Save
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-sm text-muted-foreground">
          <Contact className="h-5 w-5 mx-auto mb-2 opacity-40" />
          No contacts yet
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <div key={c.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{c.name}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                  {c.role && <span>{c.role}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                </div>
              </div>
              <button onClick={() => remove.mutate(c.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
