import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const SetupVectorStore = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const setupVectorStore = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("setup-vector-store");

      if (error) {
        console.error("Error calling function:", error);
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResult(data);
      toast({
        title: "Success",
        description: "Vector store setup completed successfully!",
      });
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to setup vector store. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup RAG Vector Store</CardTitle>
        <CardDescription>
          Initialize OpenAI vector store with constitution documents for improved AI analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          This will upload all constitution documents to OpenAI and create a vector store for RAG (Retrieval-Augmented Generation).
          This only needs to be done once, or when documents are updated.
        </p>
        
        <Button 
          onClick={setupVectorStore} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up vector store...
            </>
          ) : (
            "Setup Vector Store"
          )}
        </Button>

        {result && (
          <Alert className={result.error ? "border-destructive" : "border-primary"}>
            {result.error ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertDescription className="space-y-2">
              {result.error ? (
                <p className="font-semibold text-destructive">{result.error}</p>
              ) : (
                <>
                  <p className="font-semibold">{result.message}</p>
                  <p className="text-sm">{result.summary}</p>
                  
                  {result.vectorStoreId && (
                    <div className="mt-4 p-3 bg-muted rounded-md">
                      <p className="text-sm font-mono break-all">
                        {result.instructions}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Copy the above line and add it to your Supabase secrets in Settings → Cloud → Secrets
                      </p>
                    </div>
                  )}

                  {result.results && result.results.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-semibold">Upload Details:</p>
                      <div className="space-y-1">
                        {result.results.map((item: any, index: number) => (
                          <div key={index} className="text-xs flex items-center gap-2">
                            {item.status === "success" ? (
                              <CheckCircle2 className="h-3 w-3 text-primary" />
                            ) : (
                              <AlertCircle className="h-3 w-3 text-destructive" />
                            )}
                            <span>{item.file}: {item.status}</span>
                            {item.error && <span className="text-muted-foreground">({item.error})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
