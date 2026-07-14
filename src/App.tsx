import { useState, useEffect, FormEvent } from "react";
import {
  TrendingDown,
  ShieldCheck,
  Mail,
  Share2,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  Building,
  Briefcase,
  Users,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  HelpCircle,
  Check,
  Code,
  Lock
} from "lucide-react";
import { runAudit } from "./lib/auditEngine";
import { AuditInput, AuditResult, UseCase, ToolInput } from "./types";

// Standard preset options for pre-filling tool costs
interface PresetPlan {
  plan: string;
  costPerSeat: number;
  isCustom?: boolean;
}

const TOOL_PRESETS: Record<string, PresetPlan[]> = {
  "Cursor": [
    { plan: "Hobby", costPerSeat: 0 },
    { plan: "Pro", costPerSeat: 20 },
    { plan: "Business", costPerSeat: 40 },
    { plan: "Enterprise", costPerSeat: 80, isCustom: true }
  ],
  "GitHub Copilot": [
    { plan: "Individual", costPerSeat: 10 },
    { plan: "Business", costPerSeat: 19 },
    { plan: "Enterprise", costPerSeat: 39 }
  ],
  "Claude (Anthropic)": [
    { plan: "Free", costPerSeat: 0 },
    { plan: "Pro", costPerSeat: 20 },
    { plan: "Team (Min 5 seats)", costPerSeat: 25 },
    { plan: "Enterprise", costPerSeat: 75, isCustom: true },
    { plan: "API Direct", costPerSeat: 100, isCustom: true }
  ],
  "ChatGPT (OpenAI)": [
    { plan: "Plus", costPerSeat: 20 },
    { plan: "Team", costPerSeat: 30 },
    { plan: "Enterprise", costPerSeat: 60, isCustom: true },
    { plan: "API Direct", costPerSeat: 100, isCustom: true }
  ],
  "Anthropic API Direct": [
    { plan: "API Direct", costPerSeat: 150, isCustom: true }
  ],
  "OpenAI API Direct": [
    { plan: "API Direct", costPerSeat: 150, isCustom: true }
  ],
  "Gemini": [
    { plan: "Pro / Advanced", costPerSeat: 20 },
    { plan: "API Direct", costPerSeat: 50, isCustom: true }
  ],
  "Windsurf": [
    { plan: "Free", costPerSeat: 0 },
    { plan: "Pro", costPerSeat: 15 },
    { plan: "Team", costPerSeat: 30 }
  ]
};

export default function App() {
  // Shared audit states
  const [sharedAuditId, setSharedAuditId] = useState<string | null>(null);
  const [isSharedView, setIsSharedView] = useState(false);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);

  // Form states
  const [teamSize, setTeamSize] = useState<number>(5);
  const [primaryUseCase, setPrimaryUseCase] = useState<UseCase>("coding");
  const [toolsList, setToolsList] = useState<ToolInput[]>([]);

  // Tool entry sub-states
  const [selectedToolName, setSelectedToolName] = useState<string>("Cursor");
  const [selectedPlan, setSelectedPlan] = useState<string>("Pro");
  const [toolSeats, setToolSeats] = useState<number>(5);
  const [monthlySpend, setMonthlySpend] = useState<number>(100);

  // Audit evaluation states
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);

  // Lead capture states
  const [leadEmail, setLeadEmail] = useState("");
  const [leadCompany, setLeadCompany] = useState("");
  const [leadRole, setLeadRole] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Bot blocker
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadMessage, setLeadMessage] = useState("");
  const [leadError, setLeadError] = useState("");

  // Share link states
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Parse path for shared audits on load
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith("/share/")) {
      const id = path.split("/share/")[1];
      if (id && id.trim().length > 0) {
        loadSharedAudit(id);
      }
    } else {
      // Local storage persistence for normal entry
      const savedTools = localStorage.getItem("ais_audit_tools");
      const savedTeamSize = localStorage.getItem("ais_audit_team_size");
      const savedUseCase = localStorage.getItem("ais_audit_use_case");

      if (savedTools) {
        try {
          setToolsList(JSON.parse(savedTools));
        } catch (_) {}
      }
      if (savedTeamSize) {
        setTeamSize(Number(savedTeamSize));
      }
      if (savedUseCase) {
        setPrimaryUseCase(savedUseCase as UseCase);
      }
    }
  }, []);

  // Save to localStorage when form updates
  useEffect(() => {
    if (!isSharedView) {
      localStorage.setItem("ais_audit_tools", JSON.stringify(toolsList));
      localStorage.setItem("ais_audit_team_size", String(teamSize));
      localStorage.setItem("ais_audit_use_case", primaryUseCase);
    }
  }, [toolsList, teamSize, primaryUseCase, isSharedView]);

  // Adjust prefilled values when tool/plan changes
  useEffect(() => {
    const planPresets = TOOL_PRESETS[selectedToolName];
    if (planPresets) {
      const preset = planPresets.find(p => p.plan === selectedPlan) || planPresets[0];
      if (preset) {
        if (preset.isCustom) {
          // If custom/API direct, we default to standard guess or user input
          setMonthlySpend(preset.costPerSeat);
        } else {
          setMonthlySpend(preset.costPerSeat * toolSeats);
        }
      }
    }
  }, [selectedToolName, selectedPlan, toolSeats]);

  // Set initial plan option when tool name shifts
  const handleToolNameChange = (name: string) => {
    setSelectedToolName(name);
    const plans = TOOL_PRESETS[name];
    if (plans && plans.length > 0) {
      setSelectedPlan(plans[0].plan);
    }
  };

  const loadSharedAudit = async (id: string) => {
    setSharedLoading(true);
    setSharedAuditId(id);
    setIsSharedView(true);
    setSharedError(null);

    try {
      const res = await fetch(`/api/share/${id}`);
      if (!res.ok) {
        throw new Error("This audit report does not exist or was deleted.");
      }
      const data = await res.json();
      setAuditResult(data.auditResult);

      // Fetch AI summary if present or request new one
      fetchAiSummary(data.auditResult);
    } catch (err: any) {
      setSharedError(err.message || "Failed to load shared audit.");
    } finally {
      setSharedLoading(false);
    }
  };

  const addToolItem = () => {
    // Prevent duplicated adds for identical tool and plan
    const isDuplicate = toolsList.some(
      t => t.name.toLowerCase() === selectedToolName.toLowerCase() &&
           t.plan.toLowerCase() === selectedPlan.toLowerCase()
    );

    if (isDuplicate) {
      alert(`You have already added ${selectedToolName} with the ${selectedPlan} plan. Please adjust seats or edit existing.`);
      return;
    }

    const newItem: ToolInput = {
      name: selectedToolName,
      plan: selectedPlan,
      monthlySpend: monthlySpend,
      seats: toolSeats
    };

    setToolsList([...toolsList, newItem]);
  };

  const removeToolItem = (index: number) => {
    const updated = toolsList.filter((_, i) => i !== index);
    setToolsList(updated);
  };

  const fetchAiSummary = async (result: AuditResult) => {
    setAiLoading(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result)
      });
      const data = await res.json();
      setAiSummary(data.summary);
    } catch (err) {
      console.error("Failed to generate AI executive review:", err);
      setAiSummary("Unable to compile AI analysis. Please implement recommendations manually.");
    } finally {
      setAiLoading(false);
    }
  };

  const runAuditAnalysis = async () => {
    if (toolsList.length === 0) {
      alert("Please add at least one paid AI tool to run the audit.");
      return;
    }

    const payload: AuditInput = {
      teamSize,
      primaryUseCase,
      tools: toolsList
    };

    const result = runAudit(payload);
    setAuditResult(result);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Fetch AI Executive Summary
    fetchAiSummary(result);
  };

  const submitLead = async (e: FormEvent) => {
    e.preventDefault();
    if (honeypot.length > 0) {
      // Caught spambot
      setLeadSubmitted(true);
      return;
    }

    setLeadSubmitting(true);
    setLeadError("");
    setLeadMessage("");

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: leadEmail,
          companyName: leadCompany,
          role: leadRole,
          teamSize,
          auditId: sharedAuditId || "",
          honeypot
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit lead.");
      }

      setLeadSubmitted(true);
      setLeadMessage(data.message);
    } catch (err: any) {
      setLeadError(err.message || "An error occurred. Please try again.");
    } finally {
      setLeadSubmitting(false);
    }
  };

  const generateShareLink = async () => {
    if (!auditResult) return;
    setShareLoading(true);
    setShareCopied(false);

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditInput: { teamSize, primaryUseCase, tools: toolsList },
          auditResult
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const fullUrl = `${window.location.origin}/share/${data.id}`;
      setShareUrl(fullUrl);
      setSharedAuditId(data.id);

      // Automatically copy to clipboard
      await navigator.clipboard.writeText(fullUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    } catch (err) {
      console.error("Failed to generate sharing URL:", err);
      alert("Failed to compile share link. Please try again.");
    } finally {
      setShareLoading(false);
    }
  };

  const copyExistingLink = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 3000);
    }
  };

  const resetForm = () => {
    setAuditResult(null);
    setShareUrl(null);
    setAiSummary("");
    setLeadSubmitted(false);
    setLeadEmail("");
    setLeadCompany("");
    setLeadRole("");
    if (isSharedView) {
      window.location.pathname = "/";
    }
  };

  // Loading shared audit views
  if (sharedLoading) {
    return (
      <div className="min-h-screen bg-elegant-dark text-elegant-text flex flex-col items-center justify-center p-6 font-sans" id="shared-loading-screen">
        <div className="text-center space-y-4">
          <RefreshCw className="h-10 w-10 text-elegant-cyan animate-spin mx-auto" />
          <h2 className="text-xl font-medium tracking-tight font-display text-white">Fetching Audit Report...</h2>
          <p className="text-elegant-text/60 text-sm">Accessing secure, anonymized stack analysis</p>
        </div>
      </div>
    );
  }

  // Error shared view
  if (sharedError) {
    return (
      <div className="min-h-screen bg-elegant-dark text-elegant-text flex flex-col items-center justify-center p-6 font-sans" id="shared-error-screen">
        <div className="max-w-md bg-elegant-panel border border-elegant-border rounded-2xl p-8 text-center space-y-6 shadow-xl">
          <AlertTriangle className="h-14 w-14 text-rose-500 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-display">Audit Report Unavailable</h2>
            <p className="text-elegant-text/60 text-sm leading-relaxed">{sharedError}</p>
          </div>
          <button
            onClick={() => { window.location.pathname = "/"; }}
            className="w-full py-3 bg-elegant-teal hover:bg-elegant-teal/80 text-elegant-dark font-semibold rounded-xl transition duration-150 active:scale-95"
            id="go-home-btn"
          >
            Create New Audit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-elegant-dark text-elegant-text font-sans antialiased selection:bg-elegant-cyan selection:text-elegant-dark" id="app-container">
      {/* Dynamic Navigation Header */}
      <header className="border-b border-elegant-border bg-elegant-panel/85 backdrop-blur sticky top-0 z-50 px-4 py-3 md:px-8" id="header-nav">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={resetForm} id="logo-block">
            <div className="h-9 w-9 bg-elegant-teal rounded-xl flex items-center justify-center text-elegant-dark font-bold shadow-lg shadow-elegant-teal/10">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight font-display block">AI Spend Audit</span>
              <span className="text-[10px] block font-mono text-elegant-text/55 leading-none">Powered by Techvruk</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {isSharedView && (
              <span className="text-xs bg-elegant-panel border border-elegant-border text-elegant-text px-3 py-1.5 rounded-full flex items-center gap-1.5" id="shared-view-tag">
                <Lock className="h-3.5 w-3.5 text-elegant-cyan" /> Read-Only Shared View
              </span>
            )}
            {auditResult && (
              <button
                onClick={resetForm}
                className="text-xs hover:text-white text-elegant-text/70 px-3 py-1.5 bg-elegant-panel border border-elegant-border rounded-lg hover:border-elegant-teal/55 transition"
                id="header-new-audit-btn"
              >
                {isSharedView ? "Build My Audit" : "Reset Form"}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12 md:px-8 space-y-12" id="main-content">
        {!auditResult ? (
          /* SECTION A: FORM AND HERO LANDING */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="intro-form-section">
            {/* Left side: Editorial / Hero Copy */}
            <div className="lg:col-span-5 space-y-6 py-4 lg:sticky lg:top-24" id="intro-copy-column">
              <div className="inline-flex items-center space-x-2 bg-elegant-cyan/10 border border-elegant-cyan/25 px-3.5 py-1.5 rounded-full text-elegant-cyan text-xs font-mono font-medium" id="hero-tag">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                <span>Deterministic SaaS Finance Audit</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-[1.1] tracking-tight font-display" id="hero-headline">
                Reclaim <span className="text-elegant-cyan underline decoration-elegant-cyan/30 decoration-4 underline-offset-4">30% of Your</span> Startup's AI Tool Spend
              </h1>
              <p className="text-elegant-text/75 text-base leading-relaxed md:text-lg" id="hero-subheadline">
                Most startups overspend on redundant models and bloated seat plans without realizing it. Run an instant audit to detect overlapping editor licenses, enforce size-appropriate pricing, and optimize raw API direct workloads.
              </p>

              {/* Trust block */}
              <div className="pt-6 border-t border-elegant-border space-y-4" id="trust-block">
                <div className="flex items-center space-x-3 text-elegant-text/70 text-xs font-mono">
                  <ShieldCheck className="h-5 w-5 text-elegant-cyan shrink-0" />
                  <span>100% Client-Side. No login walls. Safe & Anonymous.</span>
                </div>
                <div className="bg-elegant-panel border border-elegant-border p-4 rounded-xl space-y-3" id="testimonial-card">
                  <p className="text-xs text-elegant-text/80 italic leading-relaxed">
                    "We ran this audit on our 25-person team and found $8,400 in duplicate Copilot and Cursor seats within 2 minutes. Epic utility."
                  </p>
                  <p className="text-[11px] text-elegant-text/45 font-mono">
                    — Jason K., VP of Eng, LogiType (Mocked)
                  </p>
                </div>
              </div>
            </div>

            {/* Right side: The Core Multi-Step Form */}
            <div className="lg:col-span-7 bg-elegant-panel border border-elegant-border rounded-2xl p-6 md:p-8 space-y-8 shadow-2xl" id="calculator-form">
              <h2 className="text-lg font-semibold text-white tracking-tight pb-4 border-b border-elegant-border flex items-center justify-between font-display">
                <span>Configure Your Stack</span>
                <span className="text-xs font-mono text-elegant-text/45 font-normal">Step 1 of 2</span>
              </h2>

              {/* 1. Global Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="global-params-block">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-elegant-text/60 uppercase tracking-wider block">Active Team Size</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={teamSize}
                      onChange={e => setTeamSize(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-elegant-dark border border-elegant-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-elegant-cyan font-mono"
                      id="team-size-input"
                    />
                    <span className="text-xs text-elegant-text/45 font-mono uppercase">Users</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-mono text-elegant-text/60 uppercase tracking-wider block">Primary Use Case</label>
                  <select
                    value={primaryUseCase}
                    onChange={e => setPrimaryUseCase(e.target.value as UseCase)}
                    className="w-full bg-elegant-dark border border-elegant-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-elegant-cyan appearance-none cursor-pointer text-elegant-text"
                    id="use-case-select"
                  >
                    <option value="coding" className="bg-elegant-dark">Coding / Engineering</option>
                    <option value="writing" className="bg-elegant-dark">Content Writing / Copy</option>
                    <option value="data" className="bg-elegant-dark">Data Analysis & BI</option>
                    <option value="research" className="bg-elegant-dark">Research & Discovery</option>
                    <option value="mixed" className="bg-elegant-dark">Mixed Stack</option>
                  </select>
                </div>
              </div>

              {/* 2. Tool Addition Section */}
              <div className="bg-elegant-dark border border-elegant-border rounded-2xl p-5 space-y-5" id="add-tool-module">
                <h3 className="text-xs font-mono text-elegant-cyan uppercase tracking-widest flex items-center justify-between">
                  <span>Add Active AI Subscription</span>
                  <HelpCircle className="h-4 w-4 text-elegant-text/40 hover:text-elegant-cyan cursor-help" title="Input your actual tools and billing to analyze leaks" />
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Tool name selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-elegant-text/60 uppercase block">AI Product</label>
                    <select
                      value={selectedToolName}
                      onChange={e => handleToolNameChange(e.target.value)}
                      className="w-full bg-elegant-panel border border-elegant-border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-elegant-cyan cursor-pointer text-elegant-text"
                      id="add-tool-name"
                    >
                      {Object.keys(TOOL_PRESETS).map(name => (
                        <option key={name} value={name} className="bg-elegant-dark">{name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Plan selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-elegant-text/60 uppercase block">Active Plan</label>
                    <select
                      value={selectedPlan}
                      onChange={e => setSelectedPlan(e.target.value)}
                      className="w-full bg-elegant-panel border border-elegant-border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-elegant-cyan cursor-pointer text-elegant-text"
                      id="add-tool-plan"
                    >
                      {TOOL_PRESETS[selectedToolName]?.map(preset => (
                        <option key={preset.plan} value={preset.plan} className="bg-elegant-dark">{preset.plan}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Seat count */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-elegant-text/60 uppercase block">Assigned Seats</label>
                    <input
                      type="number"
                      min="1"
                      value={toolSeats}
                      onChange={e => setToolSeats(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-elegant-panel border border-elegant-border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-elegant-cyan font-mono"
                      id="add-tool-seats"
                    />
                  </div>

                  {/* Total monthly cost */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-elegant-text/60 uppercase block">Actual Monthly Cost ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={monthlySpend}
                      onChange={e => setMonthlySpend(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-elegant-panel border border-elegant-border rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-elegant-cyan font-mono"
                      id="add-tool-cost"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addToolItem}
                  className="w-full py-2.5 bg-elegant-border/30 hover:bg-elegant-border/60 text-elegant-cyan border border-elegant-border/80 font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition"
                  id="add-tool-to-list-btn"
                >
                  <Plus className="h-4 w-4 text-elegant-cyan" /> Add Tool to Workspace List
                </button>
              </div>

              {/* 3. The Interactive List of Added Tools */}
              <div className="space-y-3" id="active-tools-list-container">
                <label className="text-xs font-mono text-elegant-text/60 uppercase tracking-wider block">Your Stack Inventory ({toolsList.length})</label>
                
                {toolsList.length === 0 ? (
                  <div className="border border-dashed border-elegant-border rounded-2xl p-8 text-center text-elegant-text/50 space-y-1" id="empty-inventory-state">
                    <Code className="h-8 w-8 mx-auto text-elegant-text/30 mb-2" />
                    <p className="text-sm font-medium text-elegant-text/60">Inventory is empty</p>
                    <p className="text-xs text-elegant-text/40">Select an AI tool above and click "Add Tool" to begin compilation.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1" id="tool-items-wrapper">
                    {toolsList.map((tool, index) => (
                      <div key={index} className="flex items-center justify-between p-3.5 bg-elegant-dark border border-elegant-border rounded-xl hover:border-elegant-teal/30 transition" id={`added-tool-${index}`}>
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-white">{tool.name}</h4>
                          <div className="flex items-center space-x-2.5 text-[10px] text-elegant-text/50 font-mono">
                            <span>Plan: <strong className="text-elegant-text/80">{tool.plan}</strong></span>
                            <span>•</span>
                            <span>Seats: <strong className="text-elegant-text/80">{tool.seats}</strong></span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-xs font-mono font-medium text-elegant-cyan">${tool.monthlySpend}/mo</span>
                          <button
                            type="button"
                            onClick={() => removeToolItem(index)}
                            className="text-elegant-text/40 hover:text-rose-400 p-1.5 hover:bg-elegant-panel rounded-lg transition"
                            title="Delete tool"
                            id={`delete-tool-btn-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Run calculation CTA */}
              <button
                type="button"
                onClick={runAuditAnalysis}
                disabled={toolsList.length === 0}
                className="w-full py-4 bg-elegant-teal hover:bg-elegant-teal/90 disabled:bg-elegant-panel disabled:text-elegant-text/40 text-elegant-dark font-bold rounded-xl flex items-center justify-center gap-2.5 transition active:scale-95 cursor-pointer shadow-lg shadow-elegant-teal/15"
                id="run-analysis-btn"
              >
                <span>Run Instant Spend Audit</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* SECTION B: DETAILED AUDIT RESULTS PAGE */
          <div className="space-y-8" id="audit-results-dashboard">
            
            {/* Header / Actions of Results dashboard */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-elegant-border pb-6" id="dashboard-actions-header">
              <div className="space-y-1.5">
                <button
                  onClick={resetForm}
                  className="text-xs text-elegant-text/60 hover:text-elegant-cyan font-mono flex items-center gap-1.5 transition"
                  id="back-to-input-btn"
                >
                  ← Modify Parameters
                </button>
                <h2 className="text-2xl font-bold text-white tracking-tight font-display">Your Custom Spend Diagnostics</h2>
              </div>

              {/* Share report actions */}
              <div className="flex items-center gap-2" id="sharing-actions-wrapper">
                {shareUrl ? (
                  <div className="flex items-center bg-elegant-dark border border-elegant-border rounded-lg p-1" id="share-copied-container">
                    <span className="text-[11px] font-mono text-elegant-text/60 px-3 truncate max-w-xs">{shareUrl}</span>
                    <button
                      onClick={copyExistingLink}
                      className="px-3 py-1.5 bg-elegant-teal hover:bg-elegant-teal/90 text-elegant-dark text-xs font-semibold rounded-md transition flex items-center gap-1.5"
                      id="share-link-copied-btn"
                    >
                      {shareCopied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                      <span>{shareCopied ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={generateShareLink}
                    disabled={shareLoading}
                    className="px-4 py-2 bg-elegant-panel border border-elegant-border text-white hover:bg-elegant-border hover:border-elegant-cyan/40 text-sm font-semibold rounded-xl transition flex items-center gap-2"
                    id="share-results-btn"
                  >
                    {shareLoading ? <RefreshCw className="h-4 w-4 animate-spin text-elegant-cyan" /> : <Share2 className="h-4 w-4 text-elegant-cyan" />}
                    <span>Generate Anonymous Share Link</span>
                  </button>
                )}
              </div>
            </div>

            {/* 1. HERO METRIC SLABS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4" id="hero-metrics-grid">
              
              <div className="bg-elegant-panel border border-elegant-border rounded-2xl p-5 space-y-1 shadow-xl" id="metric-current-spend">
                <span className="text-[11px] font-mono text-elegant-text/50 uppercase tracking-wider block">Current Spend</span>
                <span className="text-3xl font-extrabold text-white block font-mono">${auditResult.totalCurrentSpend}<span className="text-xs text-elegant-text/50 font-normal">/mo</span></span>
                <span className="text-[10px] text-elegant-text/50 block leading-tight">Total baseline billing across all items</span>
              </div>

              <div className="bg-elegant-panel border border-elegant-border rounded-2xl p-5 space-y-1 shadow-xl" id="metric-optimized-spend">
                <span className="text-[11px] font-mono text-elegant-text/50 uppercase tracking-wider block">Optimized Target</span>
                <span className="text-3xl font-extrabold text-elegant-cyan block font-mono">${auditResult.totalRecommendedSpend}<span className="text-xs text-elegant-cyan/60 font-normal">/mo</span></span>
                <span className="text-[10px] text-elegant-text/50 block leading-tight">Projected spend after corrections</span>
              </div>

              <div className="bg-elegant-panel border border-elegant-border rounded-2xl p-5 space-y-1 bg-gradient-to-br from-elegant-teal/10 to-transparent shadow-xl" id="metric-monthly-savings">
                <span className="text-[11px] font-mono text-elegant-cyan uppercase tracking-wider block">Monthly Savings</span>
                <span className="text-3xl font-extrabold text-white block font-mono">${auditResult.totalMonthlySavings}<span className="text-xs text-elegant-text/50 font-normal">/mo</span></span>
                <span className="text-[10px] text-elegant-cyan/80 block leading-tight">Instant cash back in operating margins</span>
              </div>

              <div className="bg-elegant-panel border border-elegant-border rounded-2xl p-5 space-y-1 bg-gradient-to-br from-elegant-cyan/10 to-transparent shadow-xl" id="metric-annual-savings">
                <span className="text-[11px] font-mono text-elegant-cyan uppercase tracking-wider block">Annual Runway Reclaimed</span>
                <span className="text-3xl font-extrabold text-elegant-cyan block font-mono">${auditResult.totalAnnualSavings.toLocaleString()}<span className="text-xs text-elegant-cyan/60 font-normal">/yr</span></span>
                <span className="text-[10px] text-elegant-cyan/80 block leading-tight">Boosts runway with zero product impact</span>
              </div>

            </div>

            {/* 2. AI EXECUTIVE SUMMARY PANEL */}
            <div className="bg-elegant-panel border border-elegant-border rounded-2xl p-6 md:p-8 space-y-4 shadow-xl" id="ai-summary-card">
              <div className="flex items-center space-x-2.5 text-elegant-cyan text-xs font-mono font-medium" id="ai-summary-tag">
                <Sparkles className="h-4 w-4 animate-pulse" />
                <span>Bespoke AI Executive Review (Gemini 2.5 Flash)</span>
              </div>
              
              {aiLoading ? (
                <div className="py-6 flex items-center space-x-3 text-elegant-text/60 text-sm font-mono" id="ai-loading-container">
                  <RefreshCw className="h-5 w-5 text-elegant-cyan animate-spin" />
                  <span>Analyzing audit anomalies and generating finance-ready reasoning...</span>
                </div>
              ) : (
                <div className="text-elegant-text/90 text-sm md:text-base leading-relaxed font-sans border-l-2 border-elegant-cyan/60 pl-4 py-1" id="ai-summary-content">
                  {aiSummary}
                </div>
              )}
            </div>

            {/* 3. VISUAL CHART COMPONENT */}
            <div className="bg-elegant-panel border border-elegant-border rounded-2xl p-6 md:p-8 space-y-6 shadow-xl" id="chart-visualization-container">
              <h3 className="text-sm font-semibold text-white tracking-tight uppercase font-mono text-elegant-text/60 font-display">Spend Distribution Comparison</h3>
              
              <div className="space-y-6" id="chart-bars-list">
                {auditResult.toolResults.map((tool, index) => {
                  const maxSpend = Math.max(...auditResult.toolResults.map(t => t.currentSpend), 1);
                  const currentPercent = (tool.currentSpend / maxSpend) * 100;
                  const recPercent = (tool.recommendedSpend / maxSpend) * 100;

                  return (
                    <div key={index} className="space-y-2.5" id={`chart-row-${index}`}>
                      <div className="flex justify-between text-xs" id={`chart-row-meta-${index}`}>
                        <span className="font-semibold text-white">{tool.name} <span className="text-elegant-text/50 font-normal">({tool.plan})</span></span>
                        <div className="font-mono text-elegant-text/60 space-x-2">
                          <span>Current: <strong className="text-white">${tool.currentSpend}/mo</strong></span>
                          <span>•</span>
                          <span>Target: <strong className="text-elegant-cyan">${tool.recommendedSpend}/mo</strong></span>
                        </div>
                      </div>

                      <div className="space-y-1.5" id={`chart-row-bars-${index}`}>
                        {/* Current spend bar */}
                        <div className="h-3 w-full bg-elegant-dark rounded-full overflow-hidden" id={`current-bar-outer-${index}`}>
                          <div
                            className="bg-elegant-border h-full rounded-full transition-all duration-1000"
                            style={{ width: `${currentPercent}%` }}
                            id={`current-bar-inner-${index}`}
                          />
                        </div>
                        {/* Target spend bar */}
                        <div className="h-3 w-full bg-elegant-dark rounded-full overflow-hidden" id={`target-bar-outer-${index}`}>
                          <div
                            className="bg-elegant-cyan h-full rounded-full transition-all duration-1000"
                            style={{ width: `${recPercent}%` }}
                            id={`target-bar-inner-${index}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chart Legend */}
              <div className="flex items-center space-x-6 pt-2 border-t border-elegant-border text-xs font-mono text-elegant-text/55" id="chart-legend">
                <div className="flex items-center space-x-2">
                  <div className="h-2.5 w-5 bg-elegant-border rounded" />
                  <span>Current monthly spend</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-2.5 w-5 bg-elegant-cyan rounded" />
                  <span>Recommended optimized spend</span>
                </div>
              </div>
            </div>

            {/* 4. INDIVIDUAL RECOMMENDATION LISTING */}
            <div className="space-y-4" id="recommendations-list">
              <h3 className="text-sm font-semibold tracking-tight uppercase font-mono text-elegant-text/60 font-display">Detailed Corrective Audits</h3>
              
              <div className="space-y-4" id="recommendations-wrapper">
                {auditResult.toolResults.map((tool, index) => (
                  <div
                    key={index}
                    className={`border rounded-2xl p-5 md:p-6 space-y-4 transition ${
                      tool.savings > 0 
                        ? "border-elegant-teal/30 bg-elegant-panel" 
                        : "border-elegant-border bg-elegant-panel/50"
                    }`}
                    id={`recommendation-card-${index}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-elegant-border pb-3" id={`recommendation-meta-${index}`}>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono uppercase text-elegant-text/50">Subscription Audit</span>
                        <h4 className="text-base font-bold text-white font-display">{tool.name}</h4>
                      </div>

                      <div className="flex items-center space-x-3 text-xs" id={`recommendation-badge-${index}`}>
                        {tool.savings > 0 ? (
                          <span className="bg-elegant-cyan/10 border border-elegant-cyan/20 text-elegant-cyan px-3 py-1 rounded-full font-mono font-medium">
                            Action: {tool.recommendedAction}
                          </span>
                        ) : (
                          <span className="bg-elegant-dark border border-elegant-border text-elegant-text/50 px-3 py-1 rounded-full font-mono font-medium">
                            Configuration Optimal
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start" id={`recommendation-details-${index}`}>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-elegant-text/50 uppercase">Billing Impact</span>
                        <div className="text-sm font-mono text-elegant-text/80" id={`recommendation-pricing-${index}`}>
                          <span className="line-through text-elegant-text/40">${tool.currentSpend}</span> 
                          <span className="text-elegant-cyan font-bold ml-2">${tool.recommendedSpend}</span>
                          <span className="text-elegant-text/50">/month</span>
                        </div>
                        {tool.savings > 0 && (
                          <span className="text-[11px] font-semibold text-elegant-cyan block font-mono">
                            Saves ${tool.savings * 12}/year
                          </span>
                        )}
                      </div>

                      <div className="md:col-span-2 space-y-1.5" id={`recommendation-reasoning-${index}`}>
                        <span className="text-[10px] font-mono text-elegant-text/50 uppercase">Defensible Rationale</span>
                        <p className="text-xs text-elegant-text/85 leading-relaxed font-sans">
                          {tool.reason}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. DYNAMIC LEAD CAPTURE POPUP / MODULE */}
            <div className="border border-elegant-border bg-elegant-panel rounded-2xl p-6 md:p-8 max-w-2xl mx-auto shadow-2xl" id="lead-capture-card">
              {leadSubmitted ? (
                <div className="text-center space-y-4 py-6" id="lead-success-state">
                  <CheckCircle className="h-12 w-12 text-elegant-cyan mx-auto" />
                  <div className="space-y-1.5">
                    <h4 className="text-lg font-bold text-white font-display">Audit Report Delivered!</h4>
                    <p className="text-elegant-text/60 text-xs leading-relaxed max-w-md mx-auto">
                      {leadMessage || "Your stack optimization is saved securely. Check your mailbox (delivery simulated)."}
                    </p>
                  </div>
                  {auditResult.totalMonthlySavings >= 500 && (
                    <div className="bg-elegant-cyan/5 border border-elegant-cyan/15 p-4 rounded-xl text-center space-y-2 mt-4" id="consultation-booked-tag">
                      <span className="text-[10px] uppercase font-mono text-elegant-cyan font-semibold tracking-wider block">Techvruk Premium Advisor Alert</span>
                      <p className="text-xs text-elegant-text/80 max-w-sm mx-auto leading-relaxed">
                        An executive Techvruk finance developer will review your stack and contact you within 24 hours to help you implement these savings manually.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={submitLead} className="space-y-6" id="lead-capture-form">
                  {/* Form context depending on savings */}
                  <div className="text-center space-y-2" id="lead-form-header">
                    {auditResult.totalMonthlySavings >= 500 ? (
                      <>
                        <div className="inline-flex items-center space-x-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-[10px] font-mono font-medium">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span>High Leakage Detected (Over $500/mo waste)</span>
                        </div>
                        <h4 className="text-xl font-bold text-white font-display">Secure Your Free Expert Audit Consolidation</h4>
                        <p className="text-elegant-text/60 text-xs leading-relaxed max-w-md mx-auto">
                          Your startup is double-paying on licenses. We will generate and email your full PDF report, and coordinate a free Techvruk advisor call to cut your bill.
                        </p>
                      </>
                    ) : auditResult.totalMonthlySavings <= 100 ? (
                      <>
                        <div className="inline-flex items-center space-x-1.5 bg-elegant-cyan/10 border border-elegant-cyan/20 text-elegant-cyan px-3 py-1 rounded-full text-[10px] font-mono font-medium">
                          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                          <span>Excellent Stack Health Verified</span>
                        </div>
                        <h4 className="text-xl font-bold text-white font-display">Your Stack is Optimized</h4>
                        <p className="text-elegant-text/60 text-xs leading-relaxed max-w-md mx-auto">
                          You are managing your AI spend beautifully! Enter your email to save this verification report or to get notified when new optimizations launch.
                        </p>
                      </>
                    ) : (
                      <>
                        <h4 className="text-xl font-bold text-white font-display">Save Your Custom AI Spend Report</h4>
                        <p className="text-elegant-text/60 text-xs leading-relaxed max-w-md mx-auto">
                          Enter your email to receive a clean, compiled summary of these cost audits directly to your inbox and download resources to enforce these changes.
                        </p>
                      </>
                    )}
                  </div>

                  {/* Honeypot hidden input */}
                  <div className="hidden" id="honeypot-input-container">
                    <input
                      type="text"
                      value={honeypot}
                      onChange={e => setHoneypot(e.target.value)}
                      placeholder="Leave empty"
                    />
                  </div>

                  {/* Input Fields */}
                  <div className="space-y-4" id="lead-form-fields">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-elegant-text/50 uppercase">Work Email Address (Required)</label>
                      <input
                        type="email"
                        required
                        value={leadEmail}
                        onChange={e => setLeadEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full bg-elegant-dark border border-elegant-border rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-elegant-cyan"
                        id="lead-email-input"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-elegant-text/50 uppercase">Company Name (Optional)</label>
                        <input
                          type="text"
                          value={leadCompany}
                          onChange={e => setLeadCompany(e.target.value)}
                          placeholder="Acme Corp"
                          className="w-full bg-elegant-dark border border-elegant-border rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-elegant-cyan"
                          id="lead-company-input"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-elegant-text/50 uppercase">Your Role (Optional)</label>
                        <input
                          type="text"
                          value={leadRole}
                          onChange={e => setLeadRole(e.target.value)}
                          placeholder="CTO / VP of Eng"
                          className="w-full bg-elegant-dark border border-elegant-border rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-elegant-cyan"
                          id="lead-role-input"
                        />
                      </div>
                    </div>
                  </div>

                  {leadError && (
                    <p className="text-xs text-rose-400 text-center font-mono" id="lead-error-message">{leadError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={leadSubmitting}
                    className="w-full py-3.5 bg-elegant-teal hover:bg-elegant-teal/90 disabled:bg-elegant-panel text-elegant-dark font-bold rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
                    id="submit-lead-btn"
                  >
                    {leadSubmitting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    <span>
                      {leadSubmitting 
                        ? "Recording details..." 
                        : auditResult.totalMonthlySavings >= 500 
                          ? "Submit & Book Techvruk Consultation" 
                          : "Email Report & Notify Me"}
                    </span>
                  </button>
                </form>
              )}
            </div>

          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-elegant-border bg-elegant-dark py-12 px-4 md:px-8 text-center text-elegant-text/50 text-xs font-mono" id="app-footer">
        <div className="max-w-6xl mx-auto space-y-3">
          <p>
            
          </p>
          <p className="text-elegant-text/40">
            © 2026 Techvruk Inc. All rights reserved. Calculations verified deterministically against official pricing sheets.
          </p>
        </div>
      </footer>
    </div>
  );
}
