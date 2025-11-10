import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const AmendmentSubmission = () => {
  const [title, setTitle] = useState("");
  const [amendmentText, setAmendmentText] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
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
      setTitle(data.title || '');
      setAmendmentText(data.amendmentText || data.fullText || '');

      toast({
        title: "Document Processed",
        description: "Amendment text extracted. Please review and edit as needed.",
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

  const handleSubmit = async () => {
    if (!title.trim() || !amendmentText.trim() || !password.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide title, amendment text, and committee password.",
        variant: "destructive",
      });
      return;
    }

    // Validate password (default: "MUSG2025")
    if (password !== "MUSG2025") {
      toast({
        title: "Access Denied",
        description: "Invalid BNA Committee Chair password.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("amendments").insert({
        title: title.trim(),
        amendment_text: amendmentText.trim(),
        status: "approved",
        approved_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "Amendment Added",
        description: "The amendment has been successfully added to the constitution.",
      });

      // Reset form
      setTitle("");
      setAmendmentText("");
      setPassword("");
      setSelectedFile(null);
    } catch (error) {
      console.error("Error submitting amendment:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit the amendment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add Constitutional Amendment</CardTitle>
        <CardDescription>
          Submit an approved amendment to append to the MUSG Constitution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Upload a PDF or DOCX file to automatically extract the amendment text, or enter it manually below.
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
              disabled={isProcessing}
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

        <div className="space-y-2">
          <Label htmlFor="title">Amendment Title</Label>
          <Input
            id="title"
            placeholder="Brief title describing the amendment"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="amendment">Amendment Text</Label>
          <Textarea
            id="amendment"
            placeholder="Enter the full text of the approved amendment..."
            value={amendmentText}
            onChange={(e) => setAmendmentText(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">BNA Committee Chair Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter committee chair password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Only the BNA Committee Chair can add amendments
          </p>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting || isProcessing}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Add Amendment to Constitution
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
