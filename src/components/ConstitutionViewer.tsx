import { Card } from "@/components/ui/card";
import { constitutionText } from "@/data/constitution";
import { ScrollArea } from "@/components/ui/scroll-area";

export const ConstitutionViewer = () => {
  return (
    <Card className="p-8">
      <ScrollArea className="h-[calc(100vh-28rem)]">
        <div className="prose prose-slate max-w-none">
          <div className="whitespace-pre-wrap leading-relaxed text-foreground">
            {constitutionText}
          </div>
        </div>
      </ScrollArea>
    </Card>
  );
};
