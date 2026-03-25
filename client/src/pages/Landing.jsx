import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const stats = [
  { value: "₹92K Cr", label: "Annual post-harvest loss in India" },
  { value: "40%", label: "Produce lost before reaching market" },
  { value: "2.93%", label: "ML model prediction error (MAE)" },
  { value: "48hrs", label: "Dispatch window optimization" },
];

const features = [
  {
    icon: "🚛",
    title: "Logistics Marketplace",
    desc: "Farmer posts. Provider sees on map. Deal done. No middlemen, no calls.",
    accent: "#4ade80",
  },
  {
    icon: "🧠",
    title: "ML Spoilage Intelligence",
    desc: "XGBoost predicts spoilage using real weather + road time. Save ₹ per kg.",
    accent: "#facc15",
  },
  {
    icon: "📊",
    title: "Live Mandi Prices",
    desc: "Karnataka mandi comparison. Best price. Best time. Best route.",
    accent: "#60a5fa",
  },
];

function CountUp({ target, duration = 1800 }) {
  const [display, setDisplay] = useState("0");
  const started = useRef(false);
  const ref = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const isRupee = target.startsWith("₹");
          const isPercent = target.includes("%");
          const raw = target.replace(/[₹,%KCr\s]/g, "");
          const num = parseFloat(raw);
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            const cur = Math.round(ease * num);
            let out = "";
            if (isRupee) out = "₹" + cur + "K Cr";
            else if (isPercent) out = cur + "%";
            else out = cur + "hrs";
            setDisplay(out);
            if (p < 1) requestAnimationFrame(tick);
            else setDisplay(target);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{display}</span>;
}

export default function Landing() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={styles.root}>
      {/* Noise grain overlay */}
      <div style={styles.grain} />

      {/* Ambient glow blobs */}
      <div style={{ ...styles.blob, top: "-120px", left: "-80px", background: "radial-gradient(circle, rgba(74,222,128,0.13) 0%, transparent 70%)", width: 600, height: 600 }} />
      <div style={{ ...styles.blob, top: "30%", right: "-100px", background: "radial-gradient(circle, rgba(250,204,21,0.10) 0%, transparent 70%)", width: 500, height: 500 }} />
      <div style={{ ...styles.blob, bottom: "10%", left: "20%", background: "radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%)", width: 600, height: 600 }} />

      {/* NAV */}
      <nav style={{ ...styles.nav, ...(scrolled ? styles.navScrolled : {}) }}>
        <div style={styles.navInner}>
          <div style={styles.logo}>
            <span style={styles.logoLeaf}>🌿</span>
            <span style={styles.logoText}>No Spoilers</span>
          </div>
          <div style={styles.navActions}>
            <button style={styles.btnGhost} onClick={() => navigate("/login")}>
              Login
            </button>
            <button style={styles.btnPrimary} onClick={() => navigate("/signup")}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={styles.hero}>
        <div style={styles.pill}>
          <span style={styles.pillDot} />
          Hackathon Project · Khet Set Match
        </div>

        <h1 style={styles.h1}>
          Dispatch Smart.
          <br />
          <span style={styles.h1Accent}>Lose Nothing.</span>
        </h1>

        <p style={styles.heroSub}>
          India loses <strong style={{ color: "#facc15" }}>₹92,000 crore</strong> in post-harvest waste every year.
          <br />
          We fix that — with ML, real weather data, and a marketplace that cuts middlemen.
        </p>

        <div style={styles.heroCta}>
          <button style={styles.btnLarge} onClick={() => navigate("/signup?role=farmer")}>
            I'm a Farmer
          </button>
          <button style={styles.btnLargeOutline} onClick={() => navigate("/signup?role=provider")}>
            I'm a Transport Provider
          </button>
        </div>

        {/* Demo ribbon */}
        <div style={styles.demoRibbon}>
          <span style={styles.demoText}>Raju • Tomato farmer • Kolar • 500kg ready</span>
          <span style={styles.demoArrow}>→</span>
          <span style={{ color: "#4ade80" }}>ML says: dispatch 6am tomorrow → save ₹787</span>
        </div>
      </section>

      {/* STATS */}
      <section style={styles.statsSection}>
        <div style={styles.statsGrid}>
          {stats.map((s) => (
            <div key={s.label} style={styles.statCard}>
              <div style={styles.statValue}>
                <CountUp target={s.value} />
              </div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={styles.section}>
        <div style={styles.sectionLabel}>HOW IT WORKS</div>
        <h2 style={styles.h2}>Three layers. One platform.</h2>

        <div style={styles.featuresGrid}>
          {features.map((f) => (
            <div key={f.title} style={styles.featureCard}>
              <div style={{ ...styles.featureIcon, background: f.accent + "18" }}>
                <span style={{ fontSize: 28 }}>{f.icon}</span>
              </div>
              <div style={{ ...styles.featureAccentBar, background: f.accent }} />
              <h3 style={{ ...styles.featureTitle, color: f.accent }}>{f.title}</h3>
              <p style={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO STORY */}
      <section style={styles.storySection}>
        <div style={styles.storyCard}>
          <div style={styles.sectionLabel}>LIVE DEMO STORY</div>
          <h2 style={{ ...styles.h2, marginTop: 12 }}>Meet Raju.</h2>
          <p style={styles.storyText}>
            Raju is a tomato farmer in Kolar with 500kg ready to dispatch. He opens No Spoilers
            and posts a pickup request. Our XGBoost model checks 48 hours of weather data —
          </p>
          <div style={styles.storyComparisons}>
            <div style={styles.storyBad}>
              <div style={styles.storyBadLabel}>❌ Leave today 2pm</div>
              <div style={styles.storyBadStat}>21% spoilage</div>
              <div style={styles.storyBadLoss}>₹1,840 loss</div>
            </div>
            <div style={styles.storyVs}>VS</div>
            <div style={styles.storyGood}>
              <div style={styles.storyGoodLabel}>✅ Leave tomorrow 6am</div>
              <div style={styles.storyGoodStat}>6% spoilage</div>
              <div style={styles.storyGoodSave}>Save ₹787</div>
            </div>
          </div>
          <p style={styles.storyText}>
            Suresh, the tempo driver, sees Raju's request on the map, accepts, gets an optimized
            route. <strong style={{ color: "#4ade80" }}>No calls. No middlemen. No spoilage.</strong>
          </p>
        </div>
      </section>

      {/* TECH STACK BADGES */}
      <section style={styles.section}>
        <div style={styles.sectionLabel}>TECH STACK</div>
        <div style={styles.techBadges}>
          {["XGBoost ML", "React + Vite", "Firebase", "OpenWeatherMap", "OpenRouteService", "Leaflet Maps", "Flask API", "Node.js"].map(
            (t) => (
              <span key={t} style={styles.techBadge}>
                {t}
              </span>
            )
          )}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={styles.finalCta}>
        <h2 style={styles.h2}>Ready to stop the losses?</h2>
        <p style={styles.heroSub}>Join as a farmer or transport provider. It's free.</p>
        <div style={styles.heroCta}>
          <button style={styles.btnLarge} onClick={() => navigate("/signup")}>
            Create Account →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <span style={styles.logoText}>No Spoilers</span>
        <span style={styles.footerSep}>·</span>
        <span style={styles.footerTag}>Khet Set Match · Hackathon 2026</span>
      </footer>
    </div>
  );
}

/* ─── STYLES ──────────────────────────────────────────────────────────────── */
const styles = {
  root: {
    minHeight: "100vh",
    background: "#09090b",
    color: "#e4e4e7",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  grain: {
    position: "fixed",
    inset: 0,
    backgroundImage:
      "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
    backgroundRepeat: "repeat",
    backgroundSize: "256px",
    pointerEvents: "none",
    zIndex: 0,
    opacity: 0.6,
  },
  blob: {
    position: "fixed",
    borderRadius: "50%",
    pointerEvents: "none",
    zIndex: 0,
  },
  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    padding: "0 24px",
    transition: "background 0.3s, border-bottom 0.3s",
  },
  navScrolled: {
    background: "rgba(9,9,11,0.85)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  navInner: {
    maxWidth: 1100,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoLeaf: { fontSize: 22 },
  logoText: {
    fontWeight: 700,
    fontSize: 18,
    color: "#f4f4f5",
    letterSpacing: "-0.02em",
  },
  navActions: { display: "flex", alignItems: "center", gap: 10 },
  btnGhost: {
    background: "transparent",
    border: "none",
    color: "#a1a1aa",
    cursor: "pointer",
    fontSize: 14,
    padding: "8px 16px",
    borderRadius: 8,
    fontWeight: 500,
    transition: "color 0.2s",
  },
  btnPrimary: {
    background: "#4ade80",
    border: "none",
    color: "#052e16",
    cursor: "pointer",
    fontSize: 14,
    padding: "8px 18px",
    borderRadius: 8,
    fontWeight: 700,
    transition: "opacity 0.2s",
  },

  // HERO
  hero: {
    position: "relative",
    zIndex: 1,
    maxWidth: 860,
    margin: "0 auto",
    padding: "160px 24px 80px",
    textAlign: "center",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    background: "rgba(74,222,128,0.08)",
    border: "1px solid rgba(74,222,128,0.2)",
    borderRadius: 99,
    padding: "6px 16px",
    fontSize: 12,
    color: "#86efac",
    fontWeight: 500,
    letterSpacing: "0.03em",
    marginBottom: 32,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#4ade80",
    display: "inline-block",
    animation: "pulse 2s infinite",
  },
  h1: {
    fontSize: "clamp(40px, 7vw, 80px)",
    fontWeight: 800,
    lineHeight: 1.1,
    letterSpacing: "-0.04em",
    color: "#fafafa",
    margin: "0 0 24px",
  },
  h1Accent: {
    background: "linear-gradient(135deg, #4ade80 0%, #86efac 50%, #facc15 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSub: {
    fontSize: 18,
    color: "#a1a1aa",
    lineHeight: 1.7,
    maxWidth: 600,
    margin: "0 auto 40px",
  },
  heroCta: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
    marginBottom: 40,
  },
  btnLarge: {
    background: "#4ade80",
    color: "#052e16",
    border: "none",
    borderRadius: 12,
    padding: "14px 32px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    transition: "transform 0.15s, box-shadow 0.15s",
    boxShadow: "0 0 32px rgba(74,222,128,0.25)",
  },
  btnLargeOutline: {
    background: "transparent",
    color: "#e4e4e7",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: "14px 32px",
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "border-color 0.2s",
  },
  demoRibbon: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: "12px 24px",
    fontSize: 13,
    color: "#a1a1aa",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  demoText: { color: "#71717a" },
  demoArrow: { color: "#52525b" },

  // STATS
  statsSection: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 24px 80px",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 16,
  },
  statCard: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
    padding: "28px 24px",
    textAlign: "center",
    backdropFilter: "blur(4px)",
  },
  statValue: {
    fontSize: 36,
    fontWeight: 800,
    color: "#f4f4f5",
    letterSpacing: "-0.03em",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    color: "#71717a",
    lineHeight: 1.4,
  },

  // FEATURES
  section: {
    position: "relative",
    zIndex: 1,
    maxWidth: 1100,
    margin: "0 auto",
    padding: "40px 24px 80px",
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.12em",
    color: "#52525b",
    marginBottom: 16,
    textTransform: "uppercase",
  },
  h2: {
    fontSize: "clamp(28px, 4vw, 44px)",
    fontWeight: 800,
    letterSpacing: "-0.03em",
    color: "#fafafa",
    marginBottom: 48,
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 20,
    textAlign: "left",
  },
  featureCard: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20,
    padding: "28px 24px",
    position: "relative",
    overflow: "hidden",
    transition: "border-color 0.2s",
  },
  featureIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  featureAccentBar: {
    width: 32,
    height: 2,
    borderRadius: 2,
    marginBottom: 14,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 10,
    letterSpacing: "-0.02em",
  },
  featureDesc: {
    fontSize: 14,
    color: "#71717a",
    lineHeight: 1.6,
    margin: 0,
  },

  // STORY
  storySection: {
    position: "relative",
    zIndex: 1,
    maxWidth: 860,
    margin: "0 auto",
    padding: "0 24px 80px",
  },
  storyCard: {
    background: "linear-gradient(135deg, rgba(74,222,128,0.06) 0%, rgba(250,204,21,0.04) 100%)",
    border: "1px solid rgba(74,222,128,0.15)",
    borderRadius: 24,
    padding: "48px",
    textAlign: "center",
  },
  storyText: {
    fontSize: 16,
    color: "#a1a1aa",
    lineHeight: 1.7,
    maxWidth: 600,
    margin: "0 auto 24px",
  },
  storyComparisons: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    margin: "32px 0",
    flexWrap: "wrap",
  },
  storyBad: {
    background: "rgba(239,68,68,0.08)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 16,
    padding: "20px 28px",
    textAlign: "center",
  },
  storyBadLabel: { fontSize: 13, color: "#ef4444", marginBottom: 8, fontWeight: 600 },
  storyBadStat: { fontSize: 28, fontWeight: 800, color: "#fca5a5", letterSpacing: "-0.03em" },
  storyBadLoss: { fontSize: 13, color: "#ef4444", marginTop: 4 },
  storyVs: {
    fontSize: 14,
    fontWeight: 700,
    color: "#52525b",
    letterSpacing: "0.05em",
  },
  storyGood: {
    background: "rgba(74,222,128,0.08)",
    border: "1px solid rgba(74,222,128,0.2)",
    borderRadius: 16,
    padding: "20px 28px",
    textAlign: "center",
  },
  storyGoodLabel: { fontSize: 13, color: "#4ade80", marginBottom: 8, fontWeight: 600 },
  storyGoodStat: { fontSize: 28, fontWeight: 800, color: "#86efac", letterSpacing: "-0.03em" },
  storyGoodSave: { fontSize: 13, color: "#4ade80", marginTop: 4, fontWeight: 700 },

  // TECH
  techBadges: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
  },
  techBadge: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    color: "#a1a1aa",
    fontWeight: 500,
    fontFamily: "monospace",
  },

  // FINAL CTA
  finalCta: {
    position: "relative",
    zIndex: 1,
    maxWidth: 600,
    margin: "0 auto",
    padding: "40px 24px 100px",
    textAlign: "center",
  },

  // FOOTER
  footer: {
    position: "relative",
    zIndex: 1,
    textAlign: "center",
    padding: "24px",
    borderTop: "1px solid rgba(255,255,255,0.06)",
    color: "#52525b",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  footerSep: { color: "#3f3f46" },
  footerTag: { color: "#3f3f46" },
};