import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const WeaknessAnalyzer = () => {
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const analyzeWeaknesses = async () => {
    setIsLoading(true);
    setAnalysis("");

    try {
      const { data, error } = await supabase.functions.invoke('analyze-constitution', {
        body: { 
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

      if (data?.answer) {
        setAnalysis(data.answer);
      } else {
        throw new Error('No analysis received');
      }
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze constitution. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-primary" />
            <CardTitle>Constitution Weakness Analyzer</CardTitle>
          </div>
          <CardDescription>
            Identify vague, ambiguous, permissive, unenforceable, circular, undefined, passive, discretionary or constitutionally dangerous language
          </CardDescription>
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
        <Alert className="border-destructive/20 bg-destructive/5">
          <AlertDescription className="whitespace-pre-wrap text-sm leading-relaxed">
            {analysis}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
