import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText } from "lucide-react";

export const ConstitutionViewer = () => {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">MUSG Constitution 2025-2026</h2>
      </div>
      
      <Alert className="mb-4">
        <FileText className="h-4 w-4" />
        <AlertDescription>
          If the PDF doesn't display below, you can{" "}
          <a 
            href="/musg-constitution.pdf" 
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-medium"
          >
            open it in a new tab
          </a>
        </AlertDescription>
      </Alert>

      <div className="w-full h-[calc(100vh-24rem)] border rounded-lg overflow-hidden bg-muted">
        <iframe
          src="/musg-constitution.pdf"
          className="w-full h-full"
          title="MUSG Constitution"
        />
      </div>
    </Card>
  );
};
