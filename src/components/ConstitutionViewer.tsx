import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const ConstitutionViewer = () => {
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center justify-center space-y-6 min-h-[400px]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">MUSG Constitution 2025-2026</h2>
          <p className="text-muted-foreground max-w-md">
            Download the complete MUSG Constitution including all governing documents.
          </p>
        </div>

        <Button asChild size="lg" className="gap-2">
          <a href="/musg-constitution.pdf" download="MUSG-Constitution-2025-2026.pdf">
            <Download className="h-5 w-5" />
            Download Constitution PDF
          </a>
        </Button>

        <p className="text-sm text-muted-foreground">
          Full 50-page document with all articles and sections
        </p>
      </div>
    </Card>
  );
};
