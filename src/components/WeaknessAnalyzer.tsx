import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, Send, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { constitutionText } from "@/data/constitution";

const STORAGE_KEY = "musg-weakness-conv-id";

interface FollowUp {
  question: string;
  answer: string;
}

export const WeaknessAnalyzer = () => {
  const [conversationId, setConversationId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? crypto.randomUUID();
  });
  const [analysis, setAnalysis] = useState("");
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, conversationId);
  }, [conversationId]);

  const startNewSession = () => {
    const newId = crypto.randomUUID();
    setConversationId(newId);
    setAnalysis("");
    setFollowUps([]);
    toast({ title: "New Session", description: "Started a fresh analysis session." });
  };

  const analyzeWeaknesses = async () => {
    setIsLoading(true);
    setAnalysis("");
    setFollowUps([]);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-constitution', {
        body: {
          constitutionText,
          conversationId,
          question: `Analyze the MUSG Constitution for weaknesses and problematic language. Identify instances of:
- Vague language
- Ambiguous terms
- Permissive language that could be exploited
- Unenforceable provisions
- Circular definitions
- Undefined terms
- Passive constructions that obscure responsibility
- Discretionary language without clear guidelines
- Constitutionally dangerous provisions

Provide specific examples with article and section references, and explain why each instance is problematic.`
        }
      });

      if (error) throw error;
      if (!data?.answer) throw new Error('No analysis received');

      setAnalysis(data.answer);
    } catch (error: any) {
      if (import.meta.env.DEV) console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze constitution. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitFollowUp = async () => {
    const q = followUpInput.trim();
    if (!q || isFollowUpLoading) return;

    setFollowUpInput("");
    setIsFollowUpLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-constitution', {
        body: {
          constitutionText,
          conversationId,
          question: q,
        }
      });

      if (error) throw error;
      if (!data?.answer) throw new Error('No response received');

      setFollowUps((prev) => [...prev, { question: q, answer: data.answer }]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get a response.",
        variant: "destructive",
      });
    } finally {
      setIsFollowUpLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Constitution Weakness Analyzer</CardTitle>
                <CardDescription className="mt-1">
                  Identify vague, ambiguous, permissive, unenforceable, circular, undefined, passive, discretionary or constitutionally dangerous language
                </CardDescription>
              </div>
            </div>
            {analysis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={startNewSession}
                disabled={isLoading}
                title="Start a new analysis session"
                className="shrink-0"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                New Session
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={analyzeWeaknesses}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Constitution...
              </>
            ) : (
              "Analyze Constitution Weaknesses"
            )}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <>
          <Alert className="border-destructive/20 bg-destructive/5">
            <AlertDescription className="whitespace-pre-wrap text-sm leading-relaxed">
              {analysis}
            </AlertDescription>
          </Alert>

          {followUps.map((fu, i) => (
            <div key={i} className="space-y-2">
              <Alert className="border-border bg-muted/50">
                <AlertDescription className="text-sm font-medium">{fu.question}</AlertDescription>
              </Alert>
              <Alert className="border-destructive/20 bg-destructive/5">
                <AlertDescription className="whitespace-pre-wrap text-sm leading-relaxed">
                  {fu.answer}
                </AlertDescription>
              </Alert>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              placeholder="Ask a follow-up about a specific weakness..."
              value={followUpInput}
              onChange={(e) => setFollowUpInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitFollowUp(); } }}
              disabled={isFollowUpLoading}
              className="flex-1"
            />
            <Button onClick={submitFollowUp} disabled={isFollowUpLoading || !followUpInput.trim()}>
              {isFollowUpLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
