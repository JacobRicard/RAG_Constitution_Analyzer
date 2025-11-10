import { useState } from "react";
import { ConstitutionChat } from "@/components/ConstitutionChat";
import { ConstitutionViewer } from "@/components/ConstitutionViewer";
import { AmendmentValidator } from "@/components/AmendmentValidator";
import { WeaknessAnalyzer } from "@/components/WeaknessAnalyzer";
import { AmendmentSubmission } from "@/components/AmendmentSubmission";
import { Button } from "@/components/ui/button";
import { BookOpen, MessageSquare, FileCheck, AlertTriangle, FilePlus } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"chat" | "viewer" | "validator" | "analyzer" | "submission">("chat");

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="bg-gradient-hero text-white py-16 px-6 shadow-elegant">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="h-12 w-12 mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold">MUSG Constitution</h1>
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
              variant={activeTab === "viewer" ? "default" : "ghost"}
              onClick={() => setActiveTab("viewer")}
              className="flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Read Constitution
            </Button>
            <Button
              variant={activeTab === "submission" ? "default" : "ghost"}
              onClick={() => setActiveTab("submission")}
              className="flex items-center gap-2"
            >
              <FilePlus className="h-4 w-4" />
              Add Amendment
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto max-w-6xl px-6 py-8">
        {activeTab === "chat" && <ConstitutionChat />}
        {activeTab === "validator" && <AmendmentValidator />}
        {activeTab === "analyzer" && <WeaknessAnalyzer />}
        {activeTab === "viewer" && <ConstitutionViewer />}
        {activeTab === "submission" && <AmendmentSubmission />}
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
