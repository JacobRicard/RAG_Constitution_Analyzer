import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { constitutionText } from "@/data/constitution";

interface BillWriterProps {
  initialWeaknesses?: string;
}

export const BillWriter = ({ initialWeaknesses }: BillWriterProps) => {
  const [mode, setMode] = useState<"A" | "B">(initialWeaknesses ? "B" : "A");
  const [policyGoal, setPolicyGoal] = useState("");
  const [weaknesses, setWeaknesses] = useState(initialWeaknesses || "");
  const [billText, setBillText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateBill = async () => {
    const input = mode === "A" ? policyGoal : weaknesses;
    
    if (!input.trim()) {
      toast({
        title: "Input Required",
        description: mode === "A" 
          ? "Please describe what you want the bill to accomplish" 
          : "Please provide the weaknesses to fix",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setBillText("");
    setExplanation("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-bill', {
        body: { 
          mode,
          input,
          constitutionText,
        }
      });

      if (error) throw error;

      if (data.billText && data.explanation) {
        setBillText(data.billText);
        setExplanation(data.explanation);
        toast({
          title: "Bill Generated",
          description: "Your legislative draft has been created successfully",
        });
      }
    } catch (error: any) {
      console.error('Error generating bill:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate bill. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-elegant">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl">
          <FileText className="h-6 w-6 text-primary" />
          Bill Writer
        </CardTitle>
        <CardDescription>
          AI-powered legislative drafting assistant that creates formal bills using the MUSG template and constitution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "A" | "B")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="A">Mode A: New Bill</TabsTrigger>
            <TabsTrigger value="B">Mode B: Fix Weaknesses</TabsTrigger>
          </TabsList>

          <TabsContent value="A" className="space-y-4">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Describe what you want the bill to accomplish in plain language. The AI will draft a complete, formally styled bill using the MUSG template and constitutional authority.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="policy-goal">Policy Goal</Label>
              <Textarea
                id="policy-goal"
                placeholder="Example: Create a new committee to review and improve campus sustainability initiatives, with authority to recommend budget allocations and policy changes to MUSG Senate..."
                value={policyGoal}
                onChange={(e) => setPolicyGoal(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
          </TabsContent>

          <TabsContent value="B" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Paste the weaknesses identified by the Weakness Analyzer. The AI will draft bill language to fix these constitutional issues while preserving lawful policy goals.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="weaknesses">Selected Weaknesses</Label>
              <Textarea
                id="weaknesses"
                placeholder="Paste the constitutional weaknesses you want to fix here..."
                value={weaknesses}
                onChange={(e) => setWeaknesses(e.target.value)}
                className="min-h-[200px]"
              />
            </div>
          </TabsContent>
        </Tabs>

        <Button 
          onClick={generateBill} 
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Drafting Bill...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Bill
            </>
          )}
        </Button>

        {billText && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Bill Text
              </h3>
              <div className="bg-muted p-4 rounded-lg border border-border">
                <pre className="whitespace-pre-wrap font-mono text-sm">{billText}</pre>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Constitutional Analysis</h3>
              <Alert>
                <AlertDescription className="whitespace-pre-wrap">
                  {explanation}
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
