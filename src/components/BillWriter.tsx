import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileText, AlertTriangle, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { constitutionText } from "@/data/constitution";

interface BillWriterProps {
  initialWeaknesses?: string;
}

export const BillWriter = ({ initialWeaknesses }: BillWriterProps) => {
  const [conversationId, setConversationId] = useState<string>(() => {
    return localStorage.getItem("musg-bill-conv-id") ?? crypto.randomUUID();
  });

  useEffect(() => {
    localStorage.setItem("musg-bill-conv-id", conversationId);
  }, [conversationId]);
  const [mode, setMode] = useState<"A" | "B">(initialWeaknesses ? "B" : "A");
  const [policyGoal, setPolicyGoal] = useState("");
  const [weaknesses, setWeaknesses] = useState(initialWeaknesses || "");
  const [clarification, setClarification] = useState("");
  const [billTitle, setBillTitle] = useState("");
  const [billText, setBillText] = useState("");
  const [explanation, setExplanation] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const startNewSession = () => {
    setConversationId(crypto.randomUUID());
    setBillText("");
    setBillTitle("");
    setExplanation("");
    setPolicyGoal("");
    setWeaknesses(initialWeaknesses || "");
    setClarification("");
    toast({ title: "New Session", description: "Started a fresh bill drafting session." });
  };

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
          clarification: mode === "B" ? clarification : undefined,
          constitutionText,
          conversationId,
        }
      });

      if (error) throw error;

      if (data.billText && data.explanation) {
        setBillText(data.billText);
        setExplanation(data.explanation);
        setBillTitle(data.title || "Untitled Bill");
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

  const downloadBill = async () => {
    if (!billText || !billTitle) return;

    setIsDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-bill-docx', {
        body: { 
          billText,
          billTitle,
        }
      });

      if (error) throw error;

      // Convert base64 to blob
      const byteCharacters = atob(data.docx);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${billTitle.replace(/[^a-z0-9]/gi, '_')}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download Complete",
        description: "Your bill has been downloaded as a Word document",
      });
    } catch (error: any) {
      console.error('Error downloading bill:', error);
      toast({
        title: "Download Failed",
        description: error.message || "Failed to download bill. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-elegant">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <FileText className="h-6 w-6 text-primary" />
              Bill Writer
            </CardTitle>
            <CardDescription className="mt-1">
              AI-powered legislative drafting assistant that creates formal bills using the MUSG template and constitution
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={startNewSession}
            disabled={isLoading}
            title="Start a new drafting session (clears conversation history)"
            className="shrink-0"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            New Session
          </Button>
        </div>
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

            <div className="space-y-2">
              <Label htmlFor="clarification">Desired Clarification (Optional)</Label>
              <Textarea
                id="clarification"
                placeholder="Optionally specify what clarification or interpretation you'd like the bill to include..."
                value={clarification}
                onChange={(e) => setClarification(e.target.value)}
                className="min-h-[100px]"
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
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {billTitle}
              </h3>
              <Button
                onClick={downloadBill}
                disabled={isDownloading}
                variant="outline"
                size="sm"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Download .docx
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2">
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
