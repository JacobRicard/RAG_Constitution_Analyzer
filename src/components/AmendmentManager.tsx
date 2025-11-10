import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2, Upload } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";

export const AmendmentManager = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadPassword, setUploadPassword] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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

  const handleConstitutionUpload = async () => {
    if (!selectedFile || !uploadPassword) {
      toast({
        title: "Error",
        description: "Please select a file and enter the committee password",
        variant: "destructive",
      });
      return;
    }

    if (uploadPassword !== "MUSG2025") {
      toast({
        title: "Access Denied",
        description: "Invalid committee chair password",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      // This would upload the file to replace the constitution
      // For now, we'll show a message that manual replacement is needed
      toast({
        title: "Upload Ready",
        description: "Please manually replace the musg-constitution.pdf file in the public folder with your new file.",
      });
      
      setSelectedFile(null);
      setUploadPassword("");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

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
        <p className="text-center text-muted-foreground">Loading...</p>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-8">
        <div className="flex flex-col space-y-8">
          {/* Upload Constitution Section */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Upload Updated Constitution</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Replace the constitution PDF with an updated version
            </p>
            
            <Alert className="mb-4">
              <AlertDescription>
                Upload a new constitution PDF file. This will replace the current constitution document.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="constitution-file">Constitution PDF File</Label>
                <Input
                  id="constitution-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="upload-password">Committee Chair Password</Label>
                <Input
                  id="upload-password"
                  type="password"
                  placeholder="Enter password"
                  value={uploadPassword}
                  onChange={(e) => setUploadPassword(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleConstitutionUpload}
                disabled={isUploading || !selectedFile}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload Constitution"}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Manage Amendments Section */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Manage Amendments</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Edit or delete approved amendments
            </p>

            {amendments.length > 0 ? (
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No amendments have been approved yet.</p>
              </div>
            )}
          </div>
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