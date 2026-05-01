import { useState } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const STORAGE_KEY = "musg-access-granted";
const DEMO_USERNAME = "resumeDemo";
const DEMO_PASSWORD = "ViewMyWork!";

export function usePasswordGate() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

const PasswordGate = ({ onUnlock }: { onUnlock: () => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (username.trim() === DEMO_USERNAME && password === DEMO_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, "1");
      onUnlock();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Scale className="h-7 w-7 text-gold" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-foreground">MUSG Constitution AI</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access the platform</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="gate-username">Username</Label>
            <Input
              id="gate-username"
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className={error ? "border-destructive focus-visible:ring-destructive" : ""}
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="gate-password">Password</Label>
            <Input
              id="gate-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(false); }}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              className={error ? "border-destructive focus-visible:ring-destructive" : ""}
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-xs text-destructive text-center">Invalid email or password. Try again.</p>
          )}
          <Button onClick={submit} className="w-full" disabled={!username || !password}>
            Sign In
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          Marquette University Student Government
        </p>
      </div>
    </div>
  );
};

export default PasswordGate;
