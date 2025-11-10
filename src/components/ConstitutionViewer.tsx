import { Card } from "@/components/ui/card";
import { constitutionText } from "@/data/constitution";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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

  return (
    <Card className="p-8">
      <ScrollArea className="h-[calc(100vh-28rem)]">
        <div className="prose prose-slate max-w-none">
          <div className="whitespace-pre-wrap leading-relaxed text-foreground">
            {constitutionText}
          </div>

          {amendments.length > 0 && (
            <>
              <Separator className="my-8" />
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-6 text-primary">AMENDMENTS</h2>
                {amendments.map((amendment, index) => (
                  <div key={amendment.id} className="mb-6 p-6 border rounded-lg bg-card">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="secondary" className="text-sm">Amendment {index + 1}</Badge>
                      <span className="text-sm text-muted-foreground">
                        Approved: {new Date(amendment.approved_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-3 text-foreground">{amendment.title}</h3>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                      {amendment.amendment_text}
                    </div>
                    {amendment.vote_for > 0 && (
                      <div className="mt-4 pt-3 border-t text-xs text-muted-foreground">
                        <strong>Vote:</strong> {amendment.vote_for} for, {amendment.vote_against} against, {amendment.vote_abstention} abstention, {amendment.vote_absent} absent
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};
