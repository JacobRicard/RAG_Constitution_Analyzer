import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const AmendmentValidator = () => {
  const [amendmentText, setAmendmentText] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const validateAmendment = async () => {
    if (!amendmentText.trim()) {
      toast({
        title: "Input required",
        description: "Please enter amendment text to validate",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setAnalysis("");

    try {
      const { data, error } = await supabase.functions.invoke('analyze-constitution', {
        body: { 
          question: `Evaluate this proposed amendment for compliance. Check for:
- Definition clarity
- Authority chain
- Thresholds
- Due process
- Contradictions with existing constitution
- Loopholes

Proposed Amendment:
${amendmentText}

Provide a detailed analysis with specific issues found.`
        }
      });

      if (error) throw error;

      if (data?.answer) {
        setAnalysis(data.answer);
      } else {
        throw new Error('No analysis received');
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      toast({
        title: "Validation failed",
        description: error.message || "Failed to validate amendment. Please try again.",
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
            <FileCheck className="w-6 h-6 text-primary" />
            <CardTitle>Amendment Compliance Validator</CardTitle>
          </div>
          <CardDescription>
            Evaluate submitted amendment text for definition clarity, authority chain, thresholds, due process, contradictions, and loopholes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your proposed amendment text here..."
            value={amendmentText}
            onChange={(e) => setAmendmentText(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
          <Button 
            onClick={validateAmendment} 
            disabled={isLoading || !amendmentText.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Amendment...
              </>
            ) : (
              "Validate Amendment"
            )}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <Alert className="border-primary/20 bg-primary/5">
          <AlertDescription className="whitespace-pre-wrap text-sm leading-relaxed">
            {analysis}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
