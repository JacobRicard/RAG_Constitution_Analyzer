import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileCheck, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const AmendmentValidator = () => {
  const [amendmentText, setAmendmentText] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF or DOCX file.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-amendment`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Failed to parse document');
      }

      const data = await response.json();
      setAmendmentText(data.fullText || '');

      toast({
        title: "Document Processed",
        description: "Amendment text extracted. Click 'Validate Amendment' to analyze.",
      });
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Processing Failed",
        description: "Could not extract text from document. Please paste the text manually.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

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
          type: 'validate',
          question: `Validate this proposed amendment:

${amendmentText}

Check all citations, verify placement correctness, ensure constitutional compliance, validate formatting, and check all cross-references.`
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
            Verify citations, check proper placement, validate constitutional compliance, and ensure correct formatting
          </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Upload a PDF or DOCX amendment document to automatically extract the text, or paste it manually below.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Upload Amendment Document (Optional)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.docx,.doc"
              onChange={handleFileUpload}
              disabled={isProcessing || isLoading}
              className="cursor-pointer"
            />
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          {selectedFile && (
            <p className="text-sm text-muted-foreground">
              Selected: {selectedFile.name}
            </p>
          )}
        </div>

        <Textarea
            placeholder="Paste your proposed amendment text here..."
            value={amendmentText}
            onChange={(e) => setAmendmentText(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
        <Button 
          onClick={validateAmendment} 
          disabled={isLoading || isProcessing || !amendmentText.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Amendment...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Validate Amendment
            </>
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
