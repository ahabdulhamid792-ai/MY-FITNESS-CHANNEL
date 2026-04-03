import { useState, useRef, useCallback, useEffect } from "react";

// ─── Platform Config ──────────────────────────────────────────────────────────

const PLATFORMS = [
  {
    id: "twitter", name: "X / Twitter", quota: "1,500 posts/month free",
    docs: "https://developer.twitter.com/en/portal/dashboard",
    color: "#000000",
    steps: [
      "Go to developer.twitter.com → sign up for a free developer account",
      "Create a Project and an App inside it",
      "Under 'Keys and tokens' → generate API Key, Secret, and Bearer Token",
      "Set App permissions to 'Read and Write'",
      "Paste your Bearer Token and API credentials below",
    ],
    fields: [{ key: "bearerToken", label: "Bearer Token" }, { key: "apiKey", label: "API Key" }, { key: "apiSecret", label: "API Secret" }, { key: "accessToken", label: "Access Token" }, { key: "accessSecret", label: "Access Token Secret" }],
  },
  {
    id: "instagram", name: "Instagram", quota: "Unlimited free via Graph API",
    docs: "https://developers.facebook.com/docs/instagram-api",
    color: "#E1306C",
    steps: [
      "Go to developers.facebook.com → create a Facebook App",
      "Add 'Instagram Graph API' product to your app",
      "Connect your Instagram Business or Creator account",
      "Generate a long-lived Page Access Token (valid 60 days, auto-refreshable)",
      "Paste your Page ID and Access Token below",
    ],
    fields: [{ key: "pageId", label: "Instagram Account ID" }, { key: "accessToken", label: "Page Access Token" }],
  },
  {
    id: "facebook", name: "Facebook", quota: "Unlimited free via Graph API",
    docs: "https://developers.facebook.com",
    color: "#1877F2",
    steps: [
      "Go to developers.facebook.com → My Apps → Create App",
      "Choose 'Business' type and add 'Pages' product",
      "Link your Facebook Page to the app",
      "Go to Graph API Explorer and generate a Page Access Token",
      "Paste your Page ID and Access Token below",
    ],
    fields: [{ key: "pageId", label: "Page ID" }, { key: "accessToken", label: "Page Access Token" }],
  },
  {
    id: "youtube", name: "YouTube", quota: "10,000 free API units/day",
    docs: "https://console.cloud.google.com",
    color: "#FF0000",
    steps: [
      "Open console.cloud.google.com → create a new project",
      "Go to APIs & Services → enable 'YouTube Data API v3'",
      "Create OAuth 2.0 credentials (web application type)",
      "Use Google's OAuth Playground to get a refresh token for your channel",
      "Paste Client ID, Client Secret, and Refresh Token below",
    ],
    fields: [{ key: "clientId", label: "Client ID" }, { key: "clientSecret", label: "Client Secret" }, { key: "refreshToken", label: "Refresh Token" }],
  },
  {
    id: "tiktok", name: "TikTok", quota: "Unlimited free via TikTok for Devs",
    docs: "https://developers.tiktok.com",
    color: "#010101",
    steps: [
      "Go to developers.tiktok.com → register as a developer",
      "Create an app and request 'Content Posting API' access",
      "Implement OAuth 2.0 flow with scope: video.upload,video.publish",
      "Complete the OAuth flow with your TikTok account to get tokens",
      "Paste your Client Key and Access Token below",
    ],
    fields: [{ key: "clientKey", label: "Client Key" }, { key: "accessToken", label: "Access Token" }],
  },
  {
    id: "linkedin", name: "LinkedIn", quota: "500 posts/day free",
    docs: "https://developer.linkedin.com",
    color: "#0A66C2",
    steps: [
      "Go to developer.linkedin.com → create an app (link to a Company Page)",
      "Request 'Share on LinkedIn' and 'Sign In with LinkedIn' products",
      "Add OAuth 2.0 redirect URI and request w_member_social scope",
      "Complete OAuth 2.0 flow to obtain an access token",
      "Paste your Access Token and Person URN below",
    ],
    fields: [{ key: "accessToken", label: "Access Token" }, { key: "personUrn", label: "Person URN (urn:li:person:xxx)" }],
  },
];

// ─── Claude API ───────────────────────────────────────────────────────────────

async function callClaude(prompt, system) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: system || "You are an expert social media strategist. Respond with valid JSON only — no markdown fences, no explanation, just the raw JSON object or array.",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const raw = data.content?.[0]?.text || "{}";
  return JSON.parse(raw.replace(/```json|```/g, "").trim());
}

// ─── Persistence ──────────────────────────────────────────────────────────────

const STORE = "autopost_ll9_v1";
const loadState = () => { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; } };
const saveState = (s) => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch {} };

// ─── Canvas Video Creator ─────────────────────────────────────────────────────

function drawVideoCard(canvas, post, niche) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, "#0f0c29");
  grad.addColorStop(0.5, "#302b63");
  grad.addColorStop(1, "#24243e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(255,255,255,0.05)";
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, 60 + i * 40, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.font = `bold 11px sans-serif`;
  ctx.letterSpacing = "3px";
  ctx.fillText((niche?.name || "CONTENT").toUpperCase(), 40, 50);
  ctx.letterSpacing = "0px";

  const words = (post?.hook || post?.content || "").split(" ");
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 28px sans-serif`;
  let line = "", y = 110, lineH = 40;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > w - 80 && line) {
      ctx.fillText(line.trim(), 40, y);
      line = word + " ";
      y += lineH;
    } else { line = test; }
    if (y > h - 160) break;
  }
  if (line) ctx.fillText(line.trim(), 40, y);

  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "13px sans-serif";
  const hashtags = (post?.hashtags || []).slice(0, 4).join("  ");
  ctx.fillText(hashtags, 40, h - 80);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText(post?.cta || "Follow for more →", 40, h - 48);

  const accent = "#a78bfa";
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(40, h - 30);
  ctx.lineTo(w - 40, h - 30);
  ctx.stroke();
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [app, setApp] = useState(loadState);

  const update = useCallback((patch) => {
    setApp(prev => {
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      saveState(next);
      return next;
    });
  }, []);

  const connectedCount = PLATFORMS.filter(p => app.connected?.[p.id]).length;
  const queueCount = (app.queue || []).length;
  const niche = app.niche;

  const navItems = [
    { id: "dashboard", label: "Dashboard" },
    { id: "research", label: "AI Research" },
    { id: "studio", label: "Content Studio" },
    { id: "schedule", label: "Schedule" },
    { id: "connect", label: "Connect APIs" },
  ];

  return (
    <div style={{ fontFamily: "var(--font-sans)", color: "var(--color-text-primary)", paddingBottom: "4rem" }}>
      {/* ── Header ── */}
      <div style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", gap: 0, padding: "0 1.5rem", marginBottom: "2rem" }}>
        <div style={{ fontWeight: 500, fontSize: 15, paddingRight: "2rem", paddingTop: "1rem", paddingBottom: "1rem", borderRight: "0.5px solid var(--color-border-tertiary)", marginRight: "1.5rem", color: "var(--color-text-primary)" }}>
          AutoPost AI
        </div>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              padding: "1rem 0.75rem",
              background: "none",
              border: "none",
              borderBottom: tab === item.id ? "2px solid var(--color-text-primary)" : "2px solid transparent",
              cursor: "pointer",
              fontSize: 13,
              color: tab === item.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              fontWeight: tab === item.id ? 500 : 400,
            }}
          >
            {item.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: "1rem", alignItems: "center" }}>
          {niche && (
            <span style={{ fontSize: 12, background: "var(--color-background-secondary)", padding: "4px 10px", borderRadius: 20, color: "var(--color-text-secondary)" }}>
              {niche.name}
            </span>
          )}
          <span style={{ fontSize: 12, color: connectedCount > 0 ? "var(--color-text-success)" : "var(--color-text-secondary)" }}>
            {connectedCount}/{PLATFORMS.length} live
          </span>
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
            {queueCount} queued
          </span>
        </div>
      </div>

      {/* ── Pages ── */}
      <div style={{ maxWidth: 900, padding: "0 1.5rem" }}>
        {tab === "dashboard" && <Dashboard app={app} update={update} setTab={setTab} />}
        {tab === "research" && <Research app={app} update={update} setTab={setTab} />}
        {tab === "studio" && <Studio app={app} update={update} />}
        {tab === "schedule" && <Schedule app={app} update={update} />}
        {tab === "connect" && <Connect app={app} update={update} />}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ app, update, setTab }) {
  const queue = app.queue || [];
  const todayStr = new Date().toISOString().split("T")[0];
  const todayPosts = queue.filter(p => p.date === todayStr);
  const connectedPlatforms = PLATFORMS.filter(p => app.connected?.[p.id]);
  const totalPublished = (app.published || []).length;

  const metrics = [
    { label: "Posts published", value: totalPublished },
    { label: "In queue", value: queue.length },
    { label: "Platforms live", value: connectedPlatforms.length },
    { label: "Posting today", value: todayPosts.length },
  ];

  const steps = [
    { done: !!app.niche, label: "Research & select a niche", tab: "research" },
    { done: connectedPlatforms.length > 0, label: "Connect social platforms", tab: "connect" },
    { done: queue.length > 0, label: "Generate & queue content", tab: "studio" },
  ];
  const allDone = steps.every(s => s.done);

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 0.25rem" }}>Dashboard</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 2rem" }}>
        {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      </p>

      {/* Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "2rem" }}>
        {metrics.map(m => (
          <div key={m.label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "1rem" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>{m.label}</div>
            <div style={{ fontSize: 28, fontWeight: 500 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Setup checklist */}
      {!allDone && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ fontWeight: 500, marginBottom: "1rem" }}>Setup checklist</div>
          {steps.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, background: step.done ? "var(--color-background-success)" : "var(--color-background-secondary)", color: step.done ? "var(--color-text-success)" : "var(--color-text-secondary)", flexShrink: 0 }}>
                {step.done ? "✓" : i + 1}
              </div>
              <div style={{ flex: 1, fontSize: 13, color: step.done ? "var(--color-text-secondary)" : "var(--color-text-primary)", textDecoration: step.done ? "line-through" : "none" }}>{step.label}</div>
              {!step.done && (
                <button onClick={() => setTab(step.tab)} style={{ fontSize: 12 }}>Go ↗</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Active niche */}
      {app.niche && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "2rem" }}>
          <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 4 }}>Active niche</div>
          <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 6 }}>{app.niche.name}</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 12 }}>{app.niche.summary}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(app.niche.hashtags || []).slice(0, 8).map((h, i) => (
              <span key={i} style={{ fontSize: 11, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", padding: "2px 8px", borderRadius: 20 }}>{h}</span>
            ))}
          </div>
        </div>
      )}

      {/* Today's queue */}
      <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 500 }}>Today's posts</div>
        {todayPosts.length > 0 && (
          <span style={{ fontSize: 12, background: "var(--color-background-success)", color: "var(--color-text-success)", padding: "2px 10px", borderRadius: 20 }}>Auto-scheduled</span>
        )}
      </div>

      {todayPosts.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", padding: "1.5rem", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", textAlign: "center" }}>
          No posts for today — generate content in the Studio tab.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {todayPosts.map((p, i) => (
            <div key={p.id || i} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "0.875rem 1rem", display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--color-text-secondary)", minWidth: 45 }}>{p.time || "09:00"}</span>
              <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.content}</span>
              <span style={{ fontSize: 11, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>{p.platform}</span>
              <span style={{ fontSize: 11, background: "var(--color-background-info)", color: "var(--color-text-info)", padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>{p.type || "post"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Research ────────────────────────────────────────────────────────────────

function Research({ app, update, setTab }) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const doResearch = async () => {
    setLoading(true);
    setError("");
    try {
      const prompt = query
        ? `Deeply research the social media niche "${query}". Return a single JSON object with: name (string), summary (string, 2 sentences), trendScore (number 0-100), audience (string), bestTimes (array of 3 strings like "Weekdays 7-9am"), hashtags (array of 12 strings with #), contentPillars (array of 5 objects: {pillar: string, description: string, postIdeas: array of 3 strings}), videoTopics (array of 7 viral video title ideas), monetization (array of 3 strings), competitionLevel ("Low"|"Medium"|"High"), growthPotential ("Low"|"Medium"|"High"|"Explosive").`
        : `Find the top 3 most profitable and trending social media niches in 2025. Return a JSON array of 3 objects, each with: name, summary (2 sentences), trendScore (0-100), audience, bestTimes (array of 3), hashtags (array of 12 with #), contentPillars (array of 5: {pillar, description, postIdeas: array of 3}), videoTopics (array of 7), monetization (array of 3), competitionLevel, growthPotential.`;

      const data = await callClaude(prompt);
      setResults(Array.isArray(data) ? data : [data]);
    } catch (e) {
      setError("Research failed. Check your connection and try again.");
    }
    setLoading(false);
  };

  const selectNiche = (niche) => {
    update({ niche });
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 0.25rem" }}>AI niche research</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 1.5rem" }}>Discover trending niches or analyze a specific one</p>

      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && doResearch()}
          placeholder="Enter a niche idea (e.g. 'AI tools for entrepreneurs')  — or leave blank to discover trending niches"
          style={{ flex: 1, fontSize: 13 }}
        />
        <button onClick={doResearch} disabled={loading}>{loading ? "Researching..." : "Research ↗"}</button>
      </div>

      {error && <div style={{ fontSize: 13, color: "var(--color-text-danger)", marginBottom: "1rem" }}>{error}</div>}

      {app.niche && !results && (
        <div style={{ background: "var(--color-background-success)", border: "0.5px solid var(--color-border-success)", borderRadius: "var(--border-radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: 13, color: "var(--color-text-success)" }}>
          Active niche: <strong>{app.niche.name}</strong> — trend score {app.niche.trendScore}
        </div>
      )}

      {(results || []).map((niche, idx) => {
        const isActive = app.niche?.name === niche.name;
        return (
          <div key={idx} style={{ background: "var(--color-background-primary)", border: isActive ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: "1.25rem" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
              <div style={{ flex: 1 }}>
                {isActive && <span style={{ fontSize: 11, background: "var(--color-background-info)", color: "var(--color-text-info)", padding: "2px 8px", borderRadius: 20, marginBottom: 6, display: "inline-block" }}>Active</span>}
                <div style={{ fontWeight: 500, fontSize: 18, marginBottom: 4 }}>{niche.name}</div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{niche.summary}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "1.5rem" }}>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 2 }}>Trend score</div>
                <div style={{ fontSize: 36, fontWeight: 500, color: niche.trendScore >= 80 ? "var(--color-text-success)" : niche.trendScore >= 60 ? "var(--color-text-warning)" : "var(--color-text-secondary)" }}>{niche.trendScore}</div>
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "1rem" }}>
              {[
                { label: "Audience", value: niche.audience },
                { label: "Best times", value: (niche.bestTimes || []).join(" · ") },
                { label: "Competition", value: niche.competitionLevel },
                { label: "Growth", value: niche.growthPotential },
              ].map(item => (
                <div key={item.label} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "0.75rem" }}>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Hashtags */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Top hashtags</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(niche.hashtags || []).map((h, i) => (
                  <span key={i} style={{ fontSize: 11, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", padding: "3px 8px", borderRadius: 20 }}>{h}</span>
                ))}
              </div>
            </div>

            {/* Content pillars */}
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Content pillars</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {(niche.contentPillars || []).map((p, i) => (
                  <div key={i} style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "0.625rem 0.75rem" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 3 }}>{p.pillar}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", lineHeight: 1.4 }}>{p.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video topics */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Viral video ideas</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {(niche.videoTopics || []).map((t, i) => (
                  <div key={i} style={{ fontSize: 12, color: "var(--color-text-primary)", padding: "4px 0", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    {i + 1}. {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Monetization */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 6 }}>Monetization paths</div>
              <div style={{ display: "flex", gap: 8 }}>
                {(niche.monetization || []).map((m, i) => (
                  <span key={i} style={{ fontSize: 12, background: "var(--color-background-success)", color: "var(--color-text-success)", padding: "4px 10px", borderRadius: 20 }}>{m}</span>
                ))}
              </div>
            </div>

            <button onClick={() => selectNiche(niche)} style={{ fontSize: 13 }}>
              {isActive ? "✓ Selected" : "Select this niche ↗"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ─── Studio ──────────────────────────────────────────────────────────────────

function Studio({ app, update }) {
  const [loading, setLoading] = useState(false);
  const [platform, setPlatform] = useState("instagram");
  const [type, setType] = useState("mixed");
  const [days, setDays] = useState(7);
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [previewPost, setPreviewPost] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (previewPost && canvasRef.current) {
      drawVideoCard(canvasRef.current, previewPost, app.niche);
    }
  }, [previewPost]);

  const generate = async () => {
    if (!app.niche) { setError("Select a niche first in the AI Research tab."); return; }
    setLoading(true);
    setError("");
    try {
      const prompt = `Create ${days} high-performing social media posts for ${platform} in the "${app.niche.name}" niche.
Posting times: ${(app.niche.bestTimes || ["9am","12pm","6pm"]).join(", ")}.
Mix of content types: educational, entertaining, inspirational, promotional.

Return a JSON array of ${days} objects. Each object: {
  content: string (the full post text, platform-optimized, max ${platform === "twitter" ? 280 : 2200} chars),
  hook: string (the attention-grabbing opening line),
  type: string ("educational"|"entertaining"|"inspirational"|"promotional"),
  hashtags: array of 8 strings with #,
  cta: string (call to action),
  time: string (best time like "09:00"),
  videoScript: { hook: string, body: string, cta: string, duration: string } (for video content),
  visualDescription: string (what the visual/thumbnail should look like)
}`;

      const data = await callClaude(prompt);
      const arr = Array.isArray(data) ? data : [data];
      setPosts(arr.map((p, i) => ({ ...p, id: Date.now() + i, platform, queued: false })));
    } catch (e) {
      setError("Generation failed. Try again.");
    }
    setLoading(false);
  };

  const queuePost = (post, idx) => {
    const d = new Date();
    d.setDate(d.getDate() + (app.queue || []).length);
    const scheduled = {
      ...post,
      date: d.toISOString().split("T")[0],
      id: Date.now() + idx,
      status: "queued",
    };
    update(prev => ({ queue: [...(prev.queue || []), scheduled] }));
    setPosts(prev => prev.map((p, i) => i === idx ? { ...p, queued: true } : p));
  };

  const queueAll = () => {
    const toAdd = posts.filter(p => !p.queued).map((p, i) => {
      const d = new Date();
      d.setDate(d.getDate() + (app.queue || []).length + i);
      return { ...p, date: d.toISOString().split("T")[0], id: Date.now() + i, status: "queued" };
    });
    update(prev => ({ queue: [...(prev.queue || []), ...toAdd] }));
    setPosts(prev => prev.map(p => ({ ...p, queued: true })));
  };

  const typeColors = { educational: "info", entertaining: "warning", inspirational: "success", promotional: "danger" };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 0.25rem" }}>Content studio</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 1.5rem" }}>AI-generated posts and video scripts, ready to queue</p>

      {!app.niche && (
        <div style={{ background: "var(--color-background-warning)", border: "0.5px solid var(--color-border-warning)", borderRadius: "var(--border-radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: 13, color: "var(--color-text-warning)" }}>
          No niche selected — go to AI Research first.
        </div>
      )}

      {/* Controls */}
      <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Platform</label>
            <select value={platform} onChange={e => setPlatform(e.target.value)} style={{ fontSize: 13 }}>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Content mix</label>
            <select value={type} onChange={e => setType(e.target.value)} style={{ fontSize: 13 }}>
              <option value="mixed">Mixed (recommended)</option>
              <option value="video">Video scripts only</option>
              <option value="text">Text posts only</option>
              <option value="educational">Educational</option>
              <option value="entertaining">Entertaining / viral</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Days to generate</label>
            <select value={days} onChange={e => setDays(Number(e.target.value))} style={{ fontSize: 13 }}>
              {[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
          <button onClick={generate} disabled={loading || !app.niche} style={{ flexShrink: 0 }}>
            {loading ? "Generating..." : `Generate ${days} posts ↗`}
          </button>
        </div>
      </div>

      {error && <div style={{ fontSize: 13, color: "var(--color-text-danger)", marginBottom: "1rem" }}>{error}</div>}

      {/* Results */}
      {posts.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div style={{ fontWeight: 500 }}>{posts.length} posts generated</div>
            <button onClick={queueAll} style={{ fontSize: 13 }}>Queue all {posts.filter(p => !p.queued).length} remaining ↗</button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {posts.map((post, idx) => (
              <div key={post.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ fontSize: 11, background: `var(--color-background-${typeColors[post.type] || "secondary"})`, color: `var(--color-text-${typeColors[post.type] || "secondary"})`, padding: "2px 8px", borderRadius: 20 }}>{post.type}</span>
                    <span style={{ fontSize: 11, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", padding: "2px 8px", borderRadius: 20 }}>{post.platform}</span>
                    <span style={{ fontSize: 11, color: "var(--color-text-secondary)", padding: "2px 4px" }}>{post.time}</span>
                  </div>
                  {post.queued && <span style={{ fontSize: 11, background: "var(--color-background-success)", color: "var(--color-text-success)", padding: "2px 8px", borderRadius: 20 }}>Queued</span>}
                </div>

                <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10 }}>{post.content}</div>

                {post.videoScript && (
                  <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "0.875rem", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6 }}>Video script ({post.videoScript.duration})</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                      <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>Hook: </span>{post.videoScript.hook}<br />
                      <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>Body: </span>{post.videoScript.body}<br />
                      <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>CTA: </span>{post.videoScript.cta}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                  {(post.hashtags || []).map((h, i) => (
                    <span key={i} style={{ fontSize: 11, background: "var(--color-background-info)", color: "var(--color-text-info)", padding: "2px 6px", borderRadius: 4 }}>{h}</span>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {!post.queued && <button onClick={() => queuePost(post, idx)} style={{ fontSize: 12 }}>Add to queue ↗</button>}
                  <button onClick={() => setPreviewPost(previewPost?.id === post.id ? null : post)} style={{ fontSize: 12 }}>
                    {previewPost?.id === post.id ? "Hide preview" : "Preview card"}
                  </button>
                </div>

                {previewPost?.id === post.id && (
                  <div style={{ marginTop: "1rem" }}>
                    <canvas ref={canvasRef} width={480} height={270} style={{ width: "100%", borderRadius: "var(--border-radius-md)", display: "block" }} />
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 6 }}>
                      Visual: {post.visualDescription}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

function Schedule({ app, update }) {
  const queue = app.queue || [];

  const remove = (id) => update(prev => ({ queue: (prev.queue || []).filter(p => p.id !== id) }));
  const updateTime = (id, time) => update(prev => ({ queue: (prev.queue || []).map(p => p.id === id ? { ...p, time } : p) }));
  const updateDate = (id, date) => update(prev => ({ queue: (prev.queue || []).map(p => p.id === id ? { ...p, date } : p) }));

  const grouped = queue.reduce((acc, p) => {
    const k = p.date || "unscheduled";
    if (!acc[k]) acc[k] = [];
    acc[k].push(p);
    return acc;
  }, {});

  const sorted = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  const todayStr = new Date().toISOString().split("T")[0];

  const formatDate = (d) => {
    if (d === todayStr) return "Today";
    try {
      return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    } catch { return d; }
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 0.25rem" }}>Post schedule</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 1.5rem" }}>{queue.length} posts queued across {Object.keys(grouped).length} days</p>

      {queue.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--color-text-secondary)", textAlign: "center", padding: "3rem", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)" }}>
          No posts queued yet — generate content in the Studio tab.
        </div>
      ) : (
        sorted.map(([date, posts]) => (
          <div key={date} style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{formatDate(date)}</span>
              {date === todayStr && <span style={{ fontSize: 11, background: "var(--color-background-info)", color: "var(--color-text-info)", padding: "2px 8px", borderRadius: 20 }}>Today</span>}
              <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{posts.length} posts</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {posts.map((p) => (
                <div key={p.id} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "0.875rem 1rem" }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                    <input type="time" value={p.time || "09:00"} onChange={e => updateTime(p.id, e.target.value)} style={{ fontSize: 12, width: 85 }} />
                    <input type="date" value={p.date || ""} onChange={e => updateDate(p.id, e.target.value)} style={{ fontSize: 12 }} />
                    <span style={{ flex: 1 }} />
                    <span style={{ fontSize: 11, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", padding: "2px 8px", borderRadius: 4 }}>{p.platform}</span>
                    <button onClick={() => remove(p.id)} style={{ fontSize: 11, color: "var(--color-text-danger)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Remove</button>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.content}</div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {queue.length > 0 && (
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginTop: "1rem" }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>Deploy for 24/7 auto-posting</div>
          <div style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: "1rem" }}>
            This app runs in your browser. To post automatically without keeping it open, deploy the backend scheduler below (free hosting options):
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {[
              { name: "Render.com", note: "Free tier · always-on cron", url: "https://render.com" },
              { name: "Railway.app", note: "Free $5 credit · cron support", url: "https://railway.app" },
              { name: "GitHub Actions", note: "Free 2,000 min/month · scheduled", url: "https://github.com/features/actions" },
            ].map(s => (
              <a key={s.name} href={s.url} target="_blank" rel="noreferrer" style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-md)", border: "0.5px solid var(--color-border-tertiary)", padding: "0.875rem", display: "block", textDecoration: "none" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 3 }}>{s.name} ↗</div>
                <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{s.note}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Connect ─────────────────────────────────────────────────────────────────

function Connect({ app, update }) {
  const [selected, setSelected] = useState(null);
  const [fields, setFields] = useState({});

  const selectedPlatform = PLATFORMS.find(p => p.id === selected);

  const saveConnection = () => {
    update(prev => ({
      connected: { ...(prev.connected || {}), [selected]: true },
      apiCredentials: { ...(prev.apiCredentials || {}), [selected]: fields },
    }));
    setFields({});
    setSelected(null);
  };

  const disconnect = (id) => {
    update(prev => ({
      connected: { ...(prev.connected || {}), [id]: false },
      apiCredentials: { ...(prev.apiCredentials || {}), [id]: {} },
    }));
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 0.25rem" }}>Connect platforms</h1>
      <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "0 0 0.5rem" }}>All APIs below have free tiers — no paid plan needed to start</p>

      <div style={{ background: "var(--color-background-info)", border: "0.5px solid var(--color-border-info)", borderRadius: "var(--border-radius-md)", padding: "0.75rem 1rem", marginBottom: "1.5rem", fontSize: 13, color: "var(--color-text-info)" }}>
        Your API keys are stored locally in your browser only — never sent anywhere except directly to the respective platform.
      </div>

      {/* Platform grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: "2rem" }}>
        {PLATFORMS.map(p => {
          const isConnected = app.connected?.[p.id];
          const isSelected = selected === p.id;
          return (
            <div
              key={p.id}
              onClick={() => !isConnected && setSelected(isSelected ? null : p.id)}
              style={{ background: "var(--color-background-primary)", border: isSelected ? "2px solid var(--color-border-info)" : "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem", cursor: isConnected ? "default" : "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: isConnected ? "#22c55e" : "var(--color-background-secondary)", border: "2px solid", borderColor: isConnected ? "#16a34a" : "var(--color-border-secondary)", flexShrink: 0, marginTop: 3 }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 8 }}>{p.quota}</div>
              <div style={{ fontSize: 12, color: isConnected ? "var(--color-text-success)" : "var(--color-text-secondary)", fontWeight: isConnected ? 500 : 400 }}>
                {isConnected ? "✓ Connected" : "Click to connect"}
              </div>
              {isConnected && (
                <button onClick={e => { e.stopPropagation(); disconnect(p.id); }} style={{ fontSize: 11, marginTop: 8, color: "var(--color-text-danger)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Disconnect</button>
              )}
            </div>
          );
        })}
      </div>

      {/* Connection panel */}
      {selected && selectedPlatform && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ fontWeight: 500, fontSize: 16, marginBottom: "1.25rem" }}>Connect {selectedPlatform.name}</div>

          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>Step-by-step setup</div>
            {selectedPlatform.steps.map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 10, marginBottom: 8, alignItems: "flex-start" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--color-background-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, flexShrink: 0, color: "var(--color-text-secondary)" }}>{i + 1}</span>
                <span style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{step}</span>
              </div>
            ))}
            <a href={selectedPlatform.docs} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "var(--color-text-info)", display: "inline-block", marginTop: 4 }}>Open developer docs ↗</a>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: "1.25rem" }}>
            {selectedPlatform.fields.map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{f.label}</label>
                <input
                  type="password"
                  placeholder={`Enter your ${f.label}`}
                  value={fields[f.key] || ""}
                  onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                  style={{ width: "100%", fontSize: 13 }}
                />
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={saveConnection} disabled={!selectedPlatform.fields.every(f => fields[f.key])} style={{ fontSize: 13 }}>Save & connect ↗</button>
            <button onClick={() => setSelected(null)} style={{ fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Automation stack */}
      <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1.5rem" }}>
        <div style={{ fontWeight: 500, marginBottom: "0.75rem" }}>Full automation stack — all free</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          {[
            { name: "Claude API", role: "AI content + research", free: "Free tier available", url: "https://console.anthropic.com" },
            { name: "GitHub Actions", role: "Daily cron scheduler", free: "2,000 min/month free", url: "https://github.com/features/actions" },
            { name: "Render.com", role: "Backend hosting", free: "Always-on free tier", url: "https://render.com" },
            { name: "Supabase", role: "Post queue database", free: "500MB free tier", url: "https://supabase.com" },
          ].map(s => (
            <a key={s.name} href={s.url} target="_blank" rel="noreferrer" style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "0.875rem", display: "block", textDecoration: "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{s.name} ↗</span>
                <span style={{ fontSize: 11, background: "var(--color-background-success)", color: "var(--color-text-success)", padding: "1px 6px", borderRadius: 20 }}>{s.free}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{s.role}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
