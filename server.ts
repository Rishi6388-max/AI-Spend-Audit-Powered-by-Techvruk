import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { collection, addDoc, getDoc, doc } from "firebase/firestore";
import { db } from "./src/lib/firebase";

// Load env variables
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;

// Enable CORS for external domains (e.g. workers.dev)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// In-memory rate limiter to prevent lead/share submission spam
const rateLimits = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);
  if (!limit) {
    rateLimits.set(ip, { count: 1, resetTime: now + 60000 });
    return false;
  }
  if (now > limit.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + 60000 });
    return false;
  }
  if (limit.count >= 15) { // max 15 requests per minute
    return true;
  }
  limit.count++;
  return false;
}

// Fallback summary generator
function getFallbackSummary(auditData: any): string {
  const largestSaving = [...auditData.toolResults].sort((a, b) => b.savings - a.savings)[0];
  const mainLeakText = largestSaving && largestSaving.savings > 0 
    ? `The single largest optimization opportunity lies in your ${largestSaving.name} setup, where you can reclaim $${largestSaving.savings}/month in immediate savings.`
    : "Your stack is already highly optimized, with minimal duplicate tool costs.";

  return `Based on your AI stack audit, your team of ${auditData.teamSize} can optimize current subscriptions to save $${auditData.totalMonthlySavings}/month (amounting to $${auditData.totalAnnualSavings}/year). ${mainLeakText} Consolidating redundant licenses and downgrading oversized plans directly improves your operating margins and extends runway, all with zero impact on actual team productivity or engineering velocity.`;
}

// 1. API: Generate personalized summary using Gemini
app.post("/api/summary", async (req, res) => {
  const auditData = req.body;
  if (!auditData || !auditData.toolResults) {
    return res.status(400).json({ error: "Invalid audit data provided." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      console.warn("GEMINI_API_KEY not configured or is placeholder. Using fallback summary.");
      return res.json({ summary: getFallbackSummary(auditData), provider: "fallback" });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are an elite B2B tech finance advisor. Review this AI tool spend audit for a team of ${auditData.teamSize} (primary use case: "${auditData.primaryUseCase}").

Audit details:
- Current monthly spend: $${auditData.totalCurrentSpend}
- Recommended monthly spend: $${auditData.totalRecommendedSpend}
- Monthly savings: $${auditData.totalMonthlySavings}
- Annual savings: $${auditData.totalAnnualSavings}

Breakdown of tools:
${auditData.toolResults.map((t: any) => `- ${t.name} (${t.plan}): currently spending $${t.currentSpend}/mo. Recommended action: ${t.recommendedAction} (Savings: $${t.savings}/mo) because: ${t.reason}`).join('\n')}

Provide a professional, highly actionable, and tailored executive summary of about 100 words.
Identify the single largest leak in their stack, offer a clear, numbers-based rationale for the change, and encourage them to implement these quick wins. Keep the tone sharp, professional, and business-focused. No greetings or introductory conversational filler.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const summaryText = response.text || getFallbackSummary(auditData);
    return res.json({ summary: summaryText.trim(), provider: "gemini" });
  } catch (error: any) {
    console.error("Gemini API call failed:", error);
    return res.json({ summary: getFallbackSummary(auditData), provider: "fallback" });
  }
});

// 2. API: Save Lead Capture
app.post("/api/lead", async (req, res) => {
  const ip = req.ip || "unknown-ip";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests. Please try again in a minute." });
  }

  const { email, companyName, role, teamSize, auditId, honeypot } = req.body;

  // Simple Honeypot abuse protection
  if (honeypot && honeypot.length > 0) {
    console.log("Honeypot field triggered by spam bot. Silently discarding.");
    return res.json({ success: true, message: "Lead captured successfully (simulated)." });
  }

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  try {
    // Store in Firestore
    const leadCol = collection(db, "leads");
    const docRef = await addDoc(leadCol, {
      email,
      companyName: companyName || "",
      role: role || "",
      teamSize: Number(teamSize) || 1,
      auditId: auditId || "",
      createdAt: new Date().toISOString()
    });

    console.log(`Saved lead with ID: ${docRef.id}`);

    // Sends transactional email (Simulated / Resend integration if configured)
    const resendApiKey = process.env.RESEND_API_KEY;
    let emailSent = false;

    if (resendApiKey) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: "AI Spend Audit <audit@techvruk.com>",
            to: email,
            subject: "Your AI Tool Spend Audit is ready!",
            html: `
              <h2>Thank you for auditing your AI stack!</h2>
              <p>Your team is currently spending on AI tools, and our audit shows potential optimizations.</p>
              <p>One of our Techvruk advisors will reach out shortly for high-savings cases to help you implement these recommendations seamlessly.</p>
              <br/>
              <p>Best regards,</p>
              <p><strong>Techvruk Engineering Team</strong></p>
            `
          })
        });
        if (response.ok) {
          emailSent = true;
          console.log(`Successfully sent email via Resend to ${email}`);
        } else {
          const errText = await response.text();
          console.warn(`Resend email sending failed: ${errText}`);
        }
      } catch (e) {
        console.warn("Could not send email via Resend, falling back to simulated:", e);
      }
    }

    return res.json({
      success: true,
      emailSent,
      leadId: docRef.id,
      message: emailSent 
        ? "Lead recorded and audit report emailed successfully!" 
        : "Lead recorded successfully (email delivery simulated in log)."
    });
  } catch (error: any) {
    console.error("Firestore save lead failed:", error);
    return res.status(500).json({ error: "Database save error. Please try again." });
  }
});

// 3. API: Share/Save Audit
app.post("/api/share", async (req, res) => {
  const ip = req.ip || "unknown-ip";
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests. Please try again." });
  }

  const { auditInput, auditResult } = req.body;
  if (!auditResult) {
    return res.status(400).json({ error: "Missing audit results." });
  }

  try {
    // Strip any sensitive identifying info if present
    const cleanInput = auditInput ? {
      teamSize: auditInput.teamSize,
      primaryUseCase: auditInput.primaryUseCase,
      tools: auditInput.tools.map((t: any) => ({
        name: t.name,
        plan: t.plan,
        monthlySpend: t.monthlySpend,
        seats: t.seats
      }))
    } : null;

    const cleanResult = {
      totalCurrentSpend: auditResult.totalCurrentSpend,
      totalRecommendedSpend: auditResult.totalRecommendedSpend,
      totalMonthlySavings: auditResult.totalMonthlySavings,
      totalAnnualSavings: auditResult.totalAnnualSavings,
      teamSize: auditResult.teamSize,
      primaryUseCase: auditResult.primaryUseCase,
      toolResults: auditResult.toolResults.map((tr: any) => ({
        name: tr.name,
        plan: tr.plan,
        currentSpend: tr.currentSpend,
        recommendedAction: tr.recommendedAction,
        recommendedSpend: tr.recommendedSpend,
        savings: tr.savings,
        reason: tr.reason
      }))
    };

    const shareCol = collection(db, "audits");
    const docRef = await addDoc(shareCol, {
      auditInput: cleanInput,
      auditResult: cleanResult,
      createdAt: new Date().toISOString()
    });

    return res.json({ id: docRef.id, url: `/share/${docRef.id}` });
  } catch (error: any) {
    console.error("Firestore save audit failed:", error);
    return res.status(500).json({ error: "Failed to generate shareable audit link." });
  }
});

// 4. API: Get Shared Audit (Public version - strictly anonymous)
app.get("/api/share/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const docRef = doc(db, "audits", id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return res.status(404).json({ error: "Audit not found." });
    }
    const data = snap.data();
    return res.json({
      id: snap.id,
      auditResult: data.auditResult,
      createdAt: data.createdAt
    });
  } catch (error: any) {
    console.error("Firestore get audit failed:", error);
    return res.status(500).json({ error: "Failed to fetch audit." });
  }
});

// Dynamic SEO Open Graph Page Serving
app.get("/share/:id", async (req, res) => {
  const { id } = req.params;
  let title = "AI Spend Audit Report";
  let description = "Analyze your startup's AI tool spend, discover overspending, find cheaper alternatives or plan downgrades, and get an AI-powered personalized audit summary.";

  try {
    const docRef = doc(db, "audits", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      const savings = data.auditResult?.totalAnnualSavings || 0;
      if (savings > 0) {
        title = `AI Spend Audit: Reclaimed $${savings.toLocaleString()}/year!`;
        description = `This startup analyzed their AI tool stack and discovered $${data.auditResult?.totalMonthlySavings}/mo ($${savings.toLocaleString()}/yr) in wasteful overspending. Get your own free instant audit!`;
      } else {
        title = "AI Spend Audit: Optimal Configuration Verified!";
        description = "This startup's AI stack is clean and optimal. Run your own free audit to verify your pricing and see if you are overspending!";
      }
    }
  } catch (err) {
    console.error("Error reading for OG tags:", err);
  }

  // Load index.html, inject OG tags
  const isProd = process.env.NODE_ENV === "production";
  const htmlPath = isProd 
    ? path.join(process.cwd(), "dist", "index.html")
    : path.join(process.cwd(), "index.html");

  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, "utf8");
    
    const ogTags = `
      <title>${title}</title>
      <meta name="description" content="${description}" />
      <meta property="og:title" content="${title}" />
      <meta property="og:description" content="${description}" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="AI Spend Audit" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${title}" />
      <meta name="twitter:description" content="${description}" />
    `;

    // Inject before </head> or replace standard title
    html = html.replace("<title>My Google AI Studio App</title>", "");
    html = html.replace("</head>", `${ogTags}</head>`);
    
    return res.send(html);
  }

  return res.status(404).send("App not fully built. Please wait.");
});

// Setup Vite Dev server or Serve Dist files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
