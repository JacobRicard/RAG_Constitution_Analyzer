import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pencil, Trash2, Upload, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { amendmentSchema } from "@/lib/validation";
import { SetupVectorStore } from "@/components/SetupVectorStore";
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
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    id: string | null;
    title: string;
    text: string;
  }>({
    open: false,
    id: null,
    title: "",
    text: "",
  });

  useEffect(() => {
    // Check authentication and admin role
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (roleError) {
        console.error('Role check error:', roleError);
        toast({
          title: "Error",
          description: "Failed to verify admin privileges. Please try again.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You do not have admin privileges. Please contact a committee chair.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user) {
          navigate('/auth');
        } else {
          setUser(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  const { data: amendments = [], isLoading: amendmentsLoading } = useQuery({
    queryKey: ['amendments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('amendments')
        .select('*')
        .eq('status', 'approved')
        .order('approved_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleConstitutionUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file",
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
    if (!deleteDialog.id) {
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
    setDeleteDialog({ open: false, id: null });
  };

  const handleEdit = async () => {
    if (!editDialog.id || !editDialog.title || !editDialog.text) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Validate input
    const validation = amendmentSchema.safeParse({
      title: editDialog.title,
      amendmentText: editDialog.text,
      voteFor: 0,
      voteAgainst: 0,
      voteAbstention: 0,
      voteAbsent: 0,
    });

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
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
    setEditDialog({ open: false, id: null, title: "", text: "" });
  };

  if (loading) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">Checking permissions...</p>
      </Card>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Card className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-sm text-muted-foreground">
              Logged in as: {user?.email}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

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

          {/* RAG Vector Store Setup */}
          <SetupVectorStore />

          <Separator />

          {/* Manage Amendments Section */}
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Manage Amendments</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Edit or delete approved amendments
            </p>

            {amendmentsLoading ? (
              <p className="text-center text-muted-foreground">Loading amendments...</p>
            ) : amendments.length > 0 ? (
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
              This action cannot be undone. Are you sure you want to delete this amendment?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, id: null })}>
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
              Update the amendment details.
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
                maxLength={200}
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
                maxLength={10000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setEditDialog({ open: false, id: null, title: "", text: "" })
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