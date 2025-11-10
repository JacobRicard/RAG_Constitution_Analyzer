import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const ConstitutionViewer = () => {
  const { data: amendments = [] } = useQuery({
    queryKey: ['amendments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('amendments')
        .select('*')
        .eq('status', 'approved')
        .order('approved_at', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  });

  const handleDownloadWithAmendments = () => {
    window.open(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-constitution-pdf`, '_blank');
  };

  return (
    <Card className="p-8">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">MUSG Constitution 2025-2026</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Full 50-page document with all articles, sections, and governing documents
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="lg" className="gap-2">
              <a href="/musg-constitution.pdf" download="MUSG-Constitution-2025-2026.pdf">
                <Download className="h-5 w-5" />
                Original PDF
              </a>
            </Button>
            {amendments.length > 0 && (
              <Button
                variant="default"
                size="lg"
                className="gap-2"
                onClick={handleDownloadWithAmendments}
              >
                <FileDown className="h-5 w-5" />
                With Amendments
              </Button>
            )}
          </div>
        </div>

        {amendments.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-xl font-bold mb-4 text-primary">APPROVED AMENDMENTS</h3>
              <div className="space-y-4">
                {amendments.map((amendment, index) => (
                  <div key={amendment.id} className="p-6 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="secondary" className="text-sm">
                        Amendment {index + 1}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Approved: {new Date(amendment.approved_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-bold text-lg mb-3 text-foreground">
                      {amendment.title}
                    </h4>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {amendment.amendment_text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {amendments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No amendments have been approved yet.</p>
          </div>
        )}
      </div>
    </Card>
  );
};
