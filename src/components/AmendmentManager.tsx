import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const AmendmentManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null; password: string }>({
    open: false,
    id: null,
    password: "",
  });
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    id: string | null;
    title: string;
    text: string;
    password: string;
  }>({
    open: false,
    id: null,
    title: "",
    text: "",
    password: "",
  });

  const { data: amendments = [], isLoading } = useQuery({
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

  const handleDelete = async () => {
    if (!deleteDialog.id || !deleteDialog.password) {
      toast({
        title: "Error",
        description: "Please enter the committee password",
        variant: "destructive",
      });
      return;
    }

    if (deleteDialog.password !== "MUSG2025") {
      toast({
        title: "Access Denied",
        description: "Invalid committee chair password",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('amendments')
      .delete()
      .eq('id', deleteDialog.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete amendment",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Amendment deleted successfully",
    });

    queryClient.invalidateQueries({ queryKey: ['amendments'] });
    setDeleteDialog({ open: false, id: null, password: "" });
  };

  const handleEdit = async () => {
    if (!editDialog.id || !editDialog.title || !editDialog.text || !editDialog.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields including the password",
        variant: "destructive",
      });
      return;
    }

    if (editDialog.password !== "MUSG2025") {
      toast({
        title: "Access Denied",
        description: "Invalid committee chair password",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('amendments')
      .update({
        title: editDialog.title,
        amendment_text: editDialog.text,
      })
      .eq('id', editDialog.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update amendment",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Amendment updated successfully",
    });

    queryClient.invalidateQueries({ queryKey: ['amendments'] });
    setEditDialog({ open: false, id: null, title: "", text: "", password: "" });
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">Loading amendments...</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-8">
        <div className="flex flex-col space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Manage Amendments</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Edit or delete approved amendments (requires committee password)
            </p>
          </div>

          {amendments.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-4">
                {amendments.map((amendment, index) => (
                  <div key={amendment.id} className="p-6 border rounded-lg bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-sm">
                          Amendment {index + 1}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          Approved: {new Date(amendment.approved_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditDialog({
                              open: true,
                              id: amendment.id,
                              title: amendment.title,
                              text: amendment.amendment_text,
                              password: "",
                            })
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setDeleteDialog({
                              open: true,
                              id: amendment.id,
                              password: "",
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No amendments have been approved yet.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Amendment</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Enter the committee password to confirm deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">Committee Chair Password</Label>
              <Input
                id="delete-password"
                type="password"
                value={deleteDialog.password}
                onChange={(e) => setDeleteDialog({ ...deleteDialog, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: null, password: "" })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Amendment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Amendment</DialogTitle>
            <DialogDescription>
              Update the amendment details. Enter the committee password to save changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Amendment Title</Label>
              <Input
                id="edit-title"
                value={editDialog.title}
                onChange={(e) => setEditDialog({ ...editDialog, title: e.target.value })}
                placeholder="Amendment title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-text">Amendment Text</Label>
              <Textarea
                id="edit-text"
                value={editDialog.text}
                onChange={(e) => setEditDialog({ ...editDialog, text: e.target.value })}
                placeholder="Amendment text"
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Committee Chair Password</Label>
              <Input
                id="edit-password"
                type="password"
                value={editDialog.password}
                onChange={(e) => setEditDialog({ ...editDialog, password: e.target.value })}
                placeholder="Enter password to confirm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setEditDialog({ open: false, id: null, title: "", text: "", password: "" })
              }
            >
              Cancel
            </Button>
            <Button onClick={handleEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};