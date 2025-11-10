import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export const ConstitutionViewer = () => {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">MUSG Constitution 2025-2026</h2>
        <Button asChild variant="outline">
          <a href="/musg-constitution.pdf" download="MUSG-Constitution.pdf">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </a>
        </Button>
      </div>
      <div className="w-full h-[calc(100vh-20rem)] border rounded-lg overflow-hidden bg-muted">
        <iframe
          src="/musg-constitution.pdf"
          className="w-full h-full"
          title="MUSG Constitution"
        />
      </div>
    </Card>
  );
};
