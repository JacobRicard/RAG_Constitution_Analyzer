import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

export const ConstitutionViewer = () => {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center justify-center space-y-6 min-h-[400px]">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
          <FileText className="w-10 h-10 text-primary" />
        </div>
        
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">MUSG Constitution 2025-2026</h2>
          <p className="text-muted-foreground max-w-md">
            Download the complete MUSG Constitution including all governing documents and amendments.
          </p>
        </div>

        <Button asChild size="lg" className="gap-2">
          <a href="/musg-constitution.pdf" download="MUSG-Constitution-2025-2026.pdf">
            <Download className="h-5 w-5" />
            Download Constitution (PDF)
          </a>
        </Button>

        <p className="text-sm text-muted-foreground">
          Full 50-page document with all articles, sections, and governing documents
        </p>
      </div>
    </Card>
  );
};
