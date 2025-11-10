import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const AmendmentSubmission = () => {
  const [title, setTitle] = useState("");
  const [amendmentText, setAmendmentText] = useState("");
  const [voteFor, setVoteFor] = useState("");
  const [voteAgainst, setVoteAgainst] = useState("");
  const [voteAbstention, setVoteAbstention] = useState("");
  const [voteAbsent, setVoteAbsent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!title.trim() || !amendmentText.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide both a title and amendment text.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("amendments").insert({
        title: title.trim(),
        amendment_text: amendmentText.trim(),
        status: "approved", // Auto-approve for now
        approved_at: new Date().toISOString(),
        vote_for: parseInt(voteFor) || 0,
        vote_against: parseInt(voteAgainst) || 0,
        vote_abstention: parseInt(voteAbstention) || 0,
        vote_absent: parseInt(voteAbsent) || 0,
      });

      if (error) throw error;

      toast({
        title: "Amendment Added",
        description: "The amendment has been successfully added to the constitution.",
      });

      // Reset form
      setTitle("");
      setAmendmentText("");
      setVoteFor("");
      setVoteAgainst("");
      setVoteAbstention("");
      setVoteAbsent("");
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

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="voteFor">Votes For</Label>
            <Input
              id="voteFor"
              type="number"
              placeholder="0"
              value={voteFor}
              onChange={(e) => setVoteFor(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voteAgainst">Votes Against</Label>
            <Input
              id="voteAgainst"
              type="number"
              placeholder="0"
              value={voteAgainst}
              onChange={(e) => setVoteAgainst(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voteAbstention">Abstentions</Label>
            <Input
              id="voteAbstention"
              type="number"
              placeholder="0"
              value={voteAbstention}
              onChange={(e) => setVoteAbstention(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="voteAbsent">Absent</Label>
            <Input
              id="voteAbsent"
              type="number"
              placeholder="0"
              value={voteAbsent}
              onChange={(e) => setVoteAbsent(e.target.value)}
            />
          </div>
        </div>

        <Button 
          onClick={handleSubmit} 
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Add Amendment to Constitution"
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
