import { useState, useEffect } from "react";
import { ConstitutionChat } from "@/components/ConstitutionChat";
import { ConstitutionViewer } from "@/components/ConstitutionViewer";
import { AmendmentValidator } from "@/components/AmendmentValidator";
import { WeaknessAnalyzer } from "@/components/WeaknessAnalyzer";
import { AmendmentManager } from "@/components/AmendmentManager";
import { BillWriter } from "@/components/BillWriter";
import { Button } from "@/components/ui/button";
import { BookOpen, MessageSquare, FileCheck, AlertTriangle, Settings, LogOut, LogIn, FileText, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"chat" | "viewer" | "validator" | "analyzer" | "manager" | "billWriter">("chat");
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUserStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      setUser(session.user);

      // Check if user is approved
      const { data: profile } = await supabase
        .from('profiles')
        .select('approved')
        .eq('id', session.user.id)
        .single();

      if (!profile?.approved) {
        navigate('/pending-approval');
        return;
      }

      setIsApproved(true);

      // Check if user is admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      setIsAdmin(roleData?.role === 'admin');
      setCheckingApproval(false);
    };

    checkUserStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkUserStatus();
      } else {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    toast({
      title: "Signed out",
      description: "You have been signed out successfully",
    });
  };

  const handleSignIn = () => {
    navigate('/auth');
  };

  const handleUserApproval = () => {
    navigate('/user-approval');
  };

  if (checkingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-musg-navy" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="bg-gradient-hero text-white py-16 px-6 shadow-elegant">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <BookOpen className="h-12 w-12 mr-4" />
              <h1 className="text-4xl md:text-5xl font-bold">MUSG Constitution</h1>
            </div>
            <div className="flex gap-2">
              {isAdmin && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleUserApproval}
                  className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <UserCheck className="h-4 w-4" />
                  User Approval
                </Button>
              )}
              {user ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignOut}
                  className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSignIn}
                  className="gap-2 bg-white/10 hover:bg-white/20 text-white border-white/20"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
          <p className="text-xl text-center text-white/90 max-w-3xl mx-auto">
            AI-Powered Analysis of the Marquette University Student Government Constitution
          </p>
          <p className="text-center text-white/80 mt-2">
            Last Amended: March 15, 2025
          </p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto max-w-6xl px-6">
          <div className="flex gap-2 py-4 flex-wrap">
            <Button
              variant={activeTab === "chat" ? "default" : "ghost"}
              onClick={() => setActiveTab("chat")}
              className="flex items-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              AI Assistant
            </Button>
            <Button
              variant={activeTab === "validator" ? "default" : "ghost"}
              onClick={() => setActiveTab("validator")}
              className="flex items-center gap-2"
            >
              <FileCheck className="h-4 w-4" />
              Amendment Validator
            </Button>
            <Button
              variant={activeTab === "analyzer" ? "default" : "ghost"}
              onClick={() => setActiveTab("analyzer")}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Weakness Analyzer
            </Button>
            <Button
              variant={activeTab === "billWriter" ? "default" : "ghost"}
              onClick={() => setActiveTab("billWriter")}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Bill Writer
            </Button>
            <Button
              variant={activeTab === "viewer" ? "default" : "ghost"}
              onClick={() => setActiveTab("viewer")}
              className="flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Read Constitution
            </Button>
            <Button
              variant={activeTab === "manager" ? "default" : "ghost"}
              onClick={() => setActiveTab("manager")}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Manage
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-6 py-8">
        {activeTab === "chat" && <ConstitutionChat />}
        {activeTab === "validator" && <AmendmentValidator />}
        {activeTab === "analyzer" && <WeaknessAnalyzer />}
        {activeTab === "billWriter" && <BillWriter />}
        {activeTab === "viewer" && <ConstitutionViewer />}
        {activeTab === "manager" && <AmendmentManager />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 bg-muted/30">
        <div className="container mx-auto max-w-6xl px-6 text-center text-muted-foreground">
          <p className="mb-2">Marquette University Student Government</p>
          <p className="text-sm">Alumni Memorial Union, Room 133 • PO Box 1881 • Milwaukee, WI 53201-1881</p>
          <p className="text-sm mt-1">414-288-7416 • musg.mu.edu</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
