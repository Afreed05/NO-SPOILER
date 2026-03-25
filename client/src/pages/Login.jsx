import { useState } from 'react'
import { auth, db } from '../firebase/config'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) return setError('All fields required')
    setLoading(true)
    setError('')
    try {
      const result = await signInWithEmailAndPassword(auth, email, password)
      const docRef = doc(db, 'users', result.user.uid)
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const role = docSnap.data().role
        navigate(role === 'farmer' ? '/farmer' : '/provider')
      }
    } catch (err) {
      setError('Invalid email or password')
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div style={styles.root}>
      {/* Ambient glow blobs — same as Landing */}
      <div style={{ ...styles.blob, top: '-100px', left: '-80px', background: 'radial-gradient(circle, rgba(74,222,128,0.12) 0%, transparent 70%)', width: 500, height: 500 }} />
      <div style={{ ...styles.blob, bottom: '-80px', right: '-60px', background: 'radial-gradient(circle, rgba(250,204,21,0.08) 0%, transparent 70%)', width: 400, height: 400 }} />

      {/* Noise grain */}
      <div style={styles.grain} />

      {/* Nav bar */}
      <nav style={styles.nav}>
        <span style={styles.logo} onClick={() => navigate('/')}>
          <span>🌿</span>
          <span style={styles.logoText}>No Spoilers</span>
        </span>
      </nav>

      {/* Card */}
      <div style={styles.center}>
        <div style={styles.card}>

          {/* Top badge */}
          <div style={styles.badge}>
            <span style={styles.badgeDot} />
            Farmer &amp; Provider Login
          </div>

          <h1 style={styles.title}>Welcome back</h1>
          <p style={styles.subtitle}>Dispatch smart. Lose nothing.</p>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <span style={styles.errorIcon}>⚠</span>
              {error}
            </div>
          )}

          {/* Fields */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              placeholder="raju@farm.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              style={styles.input}
              onFocus={e => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={e => Object.assign(e.target.style, styles.input)}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              style={styles.input}
              onFocus={e => Object.assign(e.target.style, styles.inputFocus)}
              onBlur={e => Object.assign(e.target.style, styles.input)}
            />
          </div>

          {/* Login button */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={loading ? { ...styles.btn, ...styles.btnDisabled } : styles.btn}
          >
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              'Login →'
            )}
          </button>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Signup link */}
          <p style={styles.footer}>
            No account?{' '}
            <span style={styles.link} onClick={() => navigate('/signup')}>
              Create one free →
            </span>
          </p>

          {/* Role hint */}
          <div style={styles.roleHint}>
            <span style={styles.roleChip}>🌾 Farmer</span>
            <span style={styles.roleSep}>or</span>
            <span style={styles.roleChip}>🚛 Transport Provider</span>
          </div>

        </div>

        {/* Below card stat */}
        <p style={styles.statLine}>
          Saving Indian farmers from{' '}
          <span style={styles.statHighlight}>₹92,000 crore</span>{' '}
          in annual post-harvest loss
        </p>
      </div>
    </div>
  )
}

export default Login

/* ─── STYLES ─────────────────────────────────────────────────── */
const styles = {
  root: {
    minHeight: '100vh',
    background: '#09090b',
    color: '#e4e4e7',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    position: 'relative',
    overflow: 'hidden',
  },
  blob: {
    position: 'fixed',
    borderRadius: '50%',
    pointerEvents: 'none',
    zIndex: 0,
  },
  grain: {
    position: 'fixed',
    inset: 0,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'repeat',
    backgroundSize: '256px',
    pointerEvents: 'none',
    zIndex: 0,
    opacity: 0.6,
  },
  nav: {
    position: 'relative',
    zIndex: 10,
    padding: '20px 32px',
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    fontSize: 20,
    textDecoration: 'none',
  },
  logoText: {
    fontWeight: 700,
    fontSize: 17,
    color: '#f4f4f5',
    letterSpacing: '-0.02em',
  },
  center: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 16px 80px',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.09)',
    borderRadius: 24,
    padding: '40px 36px',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 0 80px rgba(74,222,128,0.05), 0 32px 64px rgba(0,0,0,0.4)',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    background: 'rgba(74,222,128,0.08)',
    border: '1px solid rgba(74,222,128,0.18)',
    borderRadius: 99,
    padding: '5px 14px',
    fontSize: 11,
    color: '#86efac',
    fontWeight: 600,
    letterSpacing: '0.04em',
    marginBottom: 24,
    textTransform: 'uppercase',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: '#4ade80',
    display: 'inline-block',
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: '#fafafa',
    margin: '0 0 6px',
  },
  subtitle: {
    fontSize: 14,
    color: '#52525b',
    margin: '0 0 28px',
    fontStyle: 'italic',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#fca5a5',
    marginBottom: 20,
  },
  errorIcon: {
    fontSize: 14,
    color: '#ef4444',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#71717a',
    marginBottom: 7,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    fontSize: 14,
    color: '#f4f4f5',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s',
    fontFamily: 'inherit',
  },
  inputFocus: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(74,222,128,0.05)',
    border: '1px solid rgba(74,222,128,0.35)',
    borderRadius: 10,
    fontSize: 14,
    color: '#f4f4f5',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, background 0.2s',
    fontFamily: 'inherit',
  },
  btn: {
    width: '100%',
    padding: '13px',
    background: '#4ade80',
    color: '#052e16',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
    letterSpacing: '-0.01em',
    boxShadow: '0 0 28px rgba(74,222,128,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    transition: 'opacity 0.2s',
  },
  btnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  spinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(5,46,22,0.3)',
    borderTopColor: '#052e16',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '24px 0 20px',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'rgba(255,255,255,0.07)',
  },
  dividerText: {
    fontSize: 12,
    color: '#52525b',
    fontWeight: 500,
  },
  footer: {
    textAlign: 'center',
    fontSize: 14,
    color: '#71717a',
    margin: '0 0 20px',
  },
  link: {
    color: '#4ade80',
    cursor: 'pointer',
    fontWeight: 600,
    textDecoration: 'none',
  },
  roleHint: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
  },
  roleChip: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: '5px 12px',
    fontSize: 12,
    color: '#71717a',
  },
  roleSep: {
    fontSize: 11,
    color: '#3f3f46',
  },
  statLine: {
    marginTop: 24,
    fontSize: 13,
    color: '#3f3f46',
    textAlign: 'center',
  },
  statHighlight: {
    color: '#facc15',
    fontWeight: 700,
  },
}