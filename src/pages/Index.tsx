import { useState } from "react";
import { ConstitutionChat } from "@/components/ConstitutionChat";
import { ConstitutionViewer } from "@/components/ConstitutionViewer";
import { AmendmentValidator } from "@/components/AmendmentValidator";
import { WeaknessAnalyzer } from "@/components/WeaknessAnalyzer";
import { AmendmentManager } from "@/components/AmendmentManager";
import { BillWriter } from "@/components/BillWriter";
import { Button } from "@/components/ui/button";
import {
  BookOpen, MessageSquare, FileCheck, AlertTriangle,
  Settings, FileText, Scale, Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Nav definition ───────────────────────────────────────────────────────────
type Tab = "chat" | "validator" | "analyzer" | "billWriter" | "viewer" | "manager";

const NAV: { id: Tab; label: string; description: string; icon: React.ElementType }[] = [
  { id: "chat",       label: "AI Assistant",          description: "Ask anything about the constitution",  icon: MessageSquare },
  { id: "validator",  label: "Amendment Validator",   description: "Check citations and compliance",        icon: FileCheck },
  { id: "analyzer",   label: "Weakness Analyzer",     description: "Find vague or unenforceable language",  icon: AlertTriangle },
  { id: "billWriter", label: "Bill Writer",            description: "Draft formal legislative bills",        icon: FileText },
  { id: "viewer",     label: "Read Constitution",      description: "Download the full document",            icon: BookOpen },
  { id: "manager",    label: "Admin",                  description: "Manage amendments and users",           icon: Settings },
];

// ─── Component ────────────────────────────────────────────────────────────────
const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const active = NAV.find(n => n.id === activeTab)!;

  const handleNav = (id: Tab) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  // ── Sidebar inner ────────────────────────────────────────────────────────
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center flex-shrink-0">
            <Scale className="h-4 w-4 text-gold" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">MUSG</p>
            <p className="text-[11px] text-white/50 leading-tight">Constitution AI</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white/90"
              )}
            >
              <Icon className={cn("h-4 w-4 flex-shrink-0 transition-colors", isActive ? "text-gold" : "text-white/40 group-hover:text-white/70")} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight truncate">{item.label}</p>
                <p className={cn("text-[11px] leading-tight truncate mt-0.5 transition-colors", isActive ? "text-white/60" : "text-white/30 group-hover:text-white/50")}>
                  {item.description}
                </p>
              </div>
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <p className="text-[10px] text-white/30 text-center leading-relaxed">
          Marquette University Student Government
        </p>
      </div>
    </div>
  );

  return (
    <div className="h-full flex overflow-hidden bg-background">
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-primary flex-col">
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ──────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-primary flex flex-col z-50">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-14 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-card flex-shrink-0">
          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-2 min-w-0">
            <h2 className="font-semibold text-foreground text-sm truncate">{active.label}</h2>
            <span className="hidden sm:block text-muted-foreground text-sm">·</span>
            <p className="hidden sm:block text-sm text-muted-foreground truncate">{active.description}</p>
          </div>

          {/* LM Studio status */}
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/60 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:block">Local AI</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div key={activeTab} className="animate-fade-in h-full">
            {activeTab === "chat"       && <div className="h-full"><ConstitutionChat /></div>}
            {activeTab === "validator"  && <div className="p-6 max-w-4xl mx-auto"><AmendmentValidator /></div>}
            {activeTab === "analyzer"   && <div className="p-6 max-w-4xl mx-auto"><WeaknessAnalyzer /></div>}
            {activeTab === "billWriter" && <div className="p-6 max-w-4xl mx-auto"><BillWriter /></div>}
            {activeTab === "viewer"     && <div className="p-6 max-w-4xl mx-auto"><ConstitutionViewer /></div>}
            {activeTab === "manager"    && <div className="p-6 max-w-4xl mx-auto"><AmendmentManager /></div>}
          </div>
        </main>

        {/* Footer */}
        <footer className="hidden md:block border-t border-border py-2 px-6 bg-card flex-shrink-0">
          <p className="text-[11px] text-muted-foreground text-center">
            Marquette University Student Government · Alumni Memorial Union 133 · Milwaukee, WI 53201
          </p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
