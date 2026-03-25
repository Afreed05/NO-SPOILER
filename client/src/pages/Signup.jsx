// ============================================================
// Signup.jsx — Updated
// Provider ke liye vehicleType + isAvailable save hota hai
// Labour role add kiya
// ============================================================

import { useState } from 'react'
import { auth, db } from '../firebase/config'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

function Signup() {
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [role, setRole]           = useState('farmer')
  const [vehicleType, setVehicleType] = useState('open')  // for providers
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const navigate = useNavigate()

  const handleSignup = async () => {
    if (!name || !email || !password) return setError('All fields required')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    setLoading(true)
    setError('')
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password)

      // Firestore mein user document banao
      // Provider ke liye vehicleType aur isAvailable bhi save karo
      const userData = {
        name,
        email,
        role,
        createdAt: new Date(),
        ...(role === 'provider' && {
          vehicleType,      // 'open' | 'closed' | 'refrigerated'
          isAvailable: true // default available
        }),
        ...(role === 'labour' && {
          isAvailable: true,
          ratePerDay: 500   // default rate — provider dashboard se change kar sakte hain
        })
      }

      await setDoc(doc(db, 'users', result.user.uid), userData)
      navigate(role === 'farmer' ? '/farmer' : '/provider')
    } catch (err) {
      setError(
        err.message.includes('email-already-in-use') ? 'Email already registered. Try logging in.'
        : err.message.includes('invalid-email') ? 'Invalid email address.'
        : 'Something went wrong. Try again.'
      )
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleSignup() }

  return (
    <div style={styles.root}>
      <div style={{ ...styles.blob, top: '-80px', right: '-60px', background: 'radial-gradient(circle, rgba(74,222,128,0.12) 0%, transparent 70%)', width: 500, height: 500 }} />
      <div style={{ ...styles.blob, bottom: '-60px', left: '-80px', background: 'radial-gradient(circle, rgba(250,204,21,0.08) 0%, transparent 70%)', width: 420, height: 420 }} />
      <div style={styles.grain} />

      <nav style={styles.nav}>
        <span style={styles.logo} onClick={() => navigate('/')}>
          <span>🌿</span>
          <span style={styles.logoText}>No Spoilers</span>
        </span>
        <span style={styles.navHint}>
          Already have an account?{' '}
          <span style={styles.navLink} onClick={() => navigate('/login')}>Login →</span>
        </span>
      </nav>

      <div style={styles.center}>
        <div style={styles.card}>
          <div style={styles.badge}><span style={styles.badgeDot} />Join the Movement</div>
          <h1 style={styles.title}>Create your account</h1>
          <p style={styles.subtitle}>Start saving crops. Start earning more.</p>

          {error && <div style={styles.errorBox}><span>⚠</span> {error}</div>}

          {/* Role Selector */}
          <div style={styles.roleSection}>
            <label style={styles.label}>I am a</label>
            <div style={styles.roleGrid}>
              {[
                { key: 'farmer',   emoji: '🌾', title: 'Farmer',   desc: 'Post pickups, get ML dispatch advice' },
                { key: 'provider', emoji: '🚛', title: 'Provider',  desc: 'Find jobs on map, earn per delivery' },
                { key: 'labour',   emoji: '💪', title: 'Labour',    desc: 'Get hired for loading & unloading' },
              ].map(r => (
                <div
                  key={r.key}
                  style={role === r.key ? { ...styles.roleCard, ...styles.roleCardActive } : styles.roleCard}
                  onClick={() => setRole(r.key)}
                >
                  <span style={styles.roleEmoji}>{r.emoji}</span>
                  <span style={styles.roleCardTitle}>{r.title}</span>
                  <span style={styles.roleCardDesc}>{r.desc}</span>
                  {role === r.key && <div style={styles.roleCheck}>✓</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle Type — only for providers */}
          {role === 'provider' && (
            <div style={{ marginBottom: 20 }}>
              <label style={styles.label}>Vehicle Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 }}>
                {[
                  { key: 'open',         emoji: '🚛', label: 'Open Truck' },
                  { key: 'closed',       emoji: '📦', label: 'Closed Truck' },
                  { key: 'refrigerated', emoji: '❄️', label: 'Refrigerated' },
                ].map(v => (
                  <div
                    key={v.key}
                    onClick={() => setVehicleType(v.key)}
                    style={{
                      background: vehicleType === v.key ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${vehicleType === v.key ? 'rgba(96,165,250,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12, padding: '12px 8px', cursor: 'pointer',
                      textAlign: 'center', transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{v.emoji}</div>
                    <div style={{ fontSize: 11, color: vehicleType === v.key ? '#93c5fd' : '#71717a', fontWeight: 600 }}>
                      {v.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fields */}
          {[
            { label: 'Full Name',  type: 'text',     val: name,     set: setName,     ph: role === 'farmer' ? 'Raju Kumar' : 'Suresh Patel' },
            { label: 'Email',      type: 'email',    val: email,    set: setEmail,    ph: 'you@example.com' },
            { label: 'Password',   type: 'password', val: password, set: setPassword, ph: 'Min. 6 characters' },
          ].map(f => (
            <div key={f.label} style={styles.fieldGroup}>
              <label style={styles.label}>{f.label}</label>
              <input
                type={f.type}
                placeholder={f.ph}
                value={f.val}
                onChange={e => f.set(e.target.value)}
                onKeyDown={handleKeyDown}
                style={styles.input}
                onFocus={e => Object.assign(e.target.style, focusStyle(role))}
                onBlur={e => Object.assign(e.target.style, styles.input)}
              />
            </div>
          ))}

          <button
            onClick={handleSignup}
            disabled={loading}
            style={loading ? { ...btnStyle(role), opacity: 0.6, cursor: 'not-allowed' } : btnStyle(role)}
          >
            {loading
              ? <span style={spinnerStyle(role)} />
              : `Create ${role === 'farmer' ? 'Farmer' : role === 'provider' ? 'Provider' : 'Labour'} Account →`}
          </button>

          <p style={styles.footer}>
            Already have an account?{' '}
            <span style={styles.link} onClick={() => navigate('/login')}>Login →</span>
          </p>
          <p style={styles.terms}>By signing up, you agree to our terms. No spam. No middlemen.</p>
        </div>

        <p style={styles.statLine}>
          Helping farmers recover{' '}
          <span style={{ color: '#facc15', fontWeight: 700 }}>₹92,000 crore</span>{' '}
          in annual losses
        </p>
      </div>
    </div>
  )
}

export default Signup

/* ─── Dynamic helpers ─── */
const focusStyle = (role) => ({
  width: '100%', padding: '12px 14px',
  background: role === 'farmer' ? 'rgba(74,222,128,0.05)' : 'rgba(96,165,250,0.05)',
  border: `1px solid ${role === 'farmer' ? 'rgba(74,222,128,0.35)' : 'rgba(96,165,250,0.35)'}`,
  borderRadius: 10, fontSize: 14, color: '#f4f4f5', outline: 'none',
  boxSizing: 'border-box', fontFamily: 'inherit',
})

const btnStyle = (role) => ({
  width: '100%', padding: '13px',
  background: role === 'farmer' ? '#4ade80' : '#60a5fa',
  color: role === 'farmer' ? '#052e16' : '#0c1a2e',
  border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700,
  cursor: 'pointer', marginTop: 8, letterSpacing: '-0.01em',
  boxShadow: role === 'farmer' ? '0 0 28px rgba(74,222,128,0.2)' : '0 0 28px rgba(96,165,250,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minHeight: 46, transition: 'all 0.25s ease',
})

const spinnerStyle = (role) => ({
  width: 18, height: 18,
  border: `2px solid ${role === 'farmer' ? 'rgba(5,46,22,0.3)' : 'rgba(12,26,46,0.3)'}`,
  borderTopColor: role === 'farmer' ? '#052e16' : '#0c1a2e',
  borderRadius: '50%', display: 'inline-block',
  animation: 'spin 0.7s linear infinite',
})

const styles = {
  root: { minHeight: '100vh', background: '#09090b', color: '#e4e4e7', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", position: 'relative', overflow: 'hidden' },
  blob: { position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 },
  grain: { position: 'fixed', inset: 0, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", backgroundRepeat: 'repeat', backgroundSize: '256px', pointerEvents: 'none', zIndex: 0, opacity: 0.6 },
  nav: { position: 'relative', zIndex: 10, padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logo: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 20 },
  logoText: { fontWeight: 700, fontSize: 17, color: '#f4f4f5', letterSpacing: '-0.02em' },
  navHint: { fontSize: 13, color: '#52525b' },
  navLink: { color: '#4ade80', cursor: 'pointer', fontWeight: 600 },
  center: { position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 80px' },
  card: { width: '100%', maxWidth: 480, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 24, padding: '40px 36px', backdropFilter: 'blur(12px)', boxShadow: '0 0 80px rgba(74,222,128,0.05), 0 32px 64px rgba(0,0,0,0.4)' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.18)', borderRadius: 99, padding: '5px 14px', fontSize: 11, color: '#86efac', fontWeight: 600, letterSpacing: '0.04em', marginBottom: 24, textTransform: 'uppercase' },
  badgeDot: { width: 6, height: 6, borderRadius: '50%', background: '#4ade80', display: 'inline-block' },
  title: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', color: '#fafafa', margin: '0 0 6px' },
  subtitle: { fontSize: 14, color: '#52525b', margin: '0 0 28px', fontStyle: 'italic' },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 20 },
  roleSection: { marginBottom: 20 },
  roleGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 8 },
  roleCard: { position: 'relative', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px 10px', cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex', flexDirection: 'column', gap: 3 },
  roleCardActive: { background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.35)', boxShadow: '0 0 20px rgba(74,222,128,0.08)' },
  roleEmoji: { fontSize: 20, marginBottom: 2 },
  roleCardTitle: { fontSize: 13, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.01em' },
  roleCardDesc: { fontSize: 10, color: '#71717a', lineHeight: 1.4 },
  roleCheck: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: '50%', background: '#4ade80', color: '#052e16', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fieldGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 11, fontWeight: 600, color: '#71717a', marginBottom: 7, letterSpacing: '0.04em', textTransform: 'uppercase' },
  input: { width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 14, color: '#f4f4f5', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', transition: 'border-color 0.2s' },
  footer: { textAlign: 'center', fontSize: 14, color: '#71717a', margin: '20px 0 12px' },
  link: { color: '#4ade80', cursor: 'pointer', fontWeight: 600 },
  terms: { textAlign: 'center', fontSize: 11, color: '#3f3f46', lineHeight: 1.5 },
  statLine: { marginTop: 24, fontSize: 13, color: '#3f3f46', textAlign: 'center' },
}