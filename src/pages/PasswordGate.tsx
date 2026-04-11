import { useState } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "musg-access-granted";
const CORRECT = "jacobpresident2027";

export function usePasswordGate() {
  return localStorage.getItem(STORAGE_KEY) === "1";
}

const PasswordGate = ({ onUnlock }: { onUnlock: () => void }) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (value === CORRECT) {
      localStorage.setItem(STORAGE_KEY, "1");
      onUnlock();
    } else {
      setError(true);
      setValue("");
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
            <p className="text-sm text-muted-foreground mt-1">Enter the access password to continue</p>
          </div>
        </div>

        <div className="space-y-3">
          <Input
            type="password"
            placeholder="Password"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className={error ? "border-destructive focus-visible:ring-destructive" : ""}
            autoFocus
          />
          {error && (
            <p className="text-xs text-destructive text-center">Incorrect password. Try again.</p>
          )}
          <Button onClick={submit} className="w-full" disabled={!value}>
            Access
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
