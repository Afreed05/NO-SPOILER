// ============================================================
// LabourDashboard.jsx
// Real-time job receiving, accept/reject, earnings tracking
// Online status persists even after logout
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { auth, db } from '../firebase/config'
import {
  collection, query, where, getDocs,
  doc, updateDoc, getDoc, onSnapshot
} from 'firebase/firestore'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'

function LabourDashboard() {
  const [user,         setUser]         = useState(auth.currentUser)
  const [profile,      setProfile]      = useState(null)
  const [activeTab,    setActiveTab]    = useState('jobs')   // jobs | myjobs | earnings
  const [isOnline,     setIsOnline]     = useState(false)
  const [myLocation,   setMyLocation]   = useState(null)
  const [locating,     setLocating]     = useState(false)
  const [locationError,setLocationError]= useState('')
  const [pendingJobs,  setPendingJobs]  = useState([])
  const [myJobs,       setMyJobs]       = useState([])
  const [earnings,     setEarnings]     = useState({ today: 0, total: 0, completed: 0 })
  const [actionLoading,setActionLoading]= useState('')  // jobId being processed
  const [successMsg,   setSuccessMsg]   = useState('')
  const [newJobAlert,  setNewJobAlert]  = useState(false)

  const locationIntervalRef = useRef(null)
  const unsubPendingRef     = useRef(null)  // realtime listener cleanup
  const navigate            = useNavigate()

  // ── Auth listener ─────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u))
    return () => unsub()
  }, [])

  // ── On load ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    fetchProfile()
    fetchMyJobs()
    startPendingJobsListener()   // real-time listener
    return () => {
      if (unsubPendingRef.current) unsubPendingRef.current()
    }
  }, [user])

  // ── Calculate earnings when myJobs changes ────────────────
  useEffect(() => {
    calculateEarnings()
  }, [myJobs])

  // ── Fetch my profile from Firestore ──────────────────────
  const fetchProfile = async () => {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid))
      if (snap.exists()) {
        const data = snap.data()
        setProfile(data)
        // Restore online status if was online before
        if (data.isOnline) {
          setIsOnline(true)
          if (data.location) setMyLocation(data.location)
          startLocationTracking()
        }
      }
    } catch (err) { console.error(err) }
  }

  // ── REAL-TIME listener for pending labour jobs ────────────
  // onSnapshot — fires immediately + every time data changes
  const startPendingJobsListener = () => {
    const q = query(
      collection(db, 'requests'),
      where('jobType', '==', 'labour'),
      where('status',  '==', 'pending')
    )

    unsubPendingRef.current = onSnapshot(q, (snap) => {
      const jobs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      const prev = pendingJobs.length

      // Alert farmer se naya job aaya
      if (jobs.length > prev && prev > 0) {
        setNewJobAlert(true)
        setTimeout(() => setNewJobAlert(false), 5000)
      }
      setPendingJobs(jobs)
    })
  }

  // ── Fetch my accepted/completed jobs ──────────────────────
  const fetchMyJobs = async () => {
    try {
      const q = query(
        collection(db, 'requests'),
        where('providerId', '==', user.uid),
        where('jobType',    '==', 'labour')
      )
      const snap = await getDocs(q)
      setMyJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { console.error(err) }
  }

  // ── Earnings calculation ──────────────────────────────────
  const calculateEarnings = () => {
    const completed = myJobs.filter(j => j.status === 'completed')
    const total     = completed.reduce((sum, j) => sum + (j.labourPrice || j.price || 0), 0)

    // Today's earnings
    const today     = new Date()
    const todayStr  = today.toDateString()
    const todayEarn = completed
      .filter(j => j.completedAt && new Date(j.completedAt?.toDate?.() || j.completedAt).toDateString() === todayStr)
      .reduce((sum, j) => sum + (j.labourPrice || j.price || 0), 0)

    setEarnings({ today: todayEarn, total, completed: completed.length })
  }

  // ── GPS location ──────────────────────────────────────────
  const getGPS = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('GPS not supported')); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  })

  const saveLocation = async (location) => {
    if (!auth.currentUser) return
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        location, isOnline: true, isAvailable: true, lastSeen: new Date()
      })
    } catch (err) { console.error('Location save failed:', err) }
  }

  const startLocationTracking = () => {
    if (locationIntervalRef.current) return  // already running
    locationIntervalRef.current = setInterval(async () => {
      try {
        const loc = await getGPS()
        setMyLocation(loc)
        await saveLocation(loc)
      } catch (err) { console.error('Location update failed:', err) }
    }, 30000)
  }

  // ── GO ONLINE ────────────────────────────────────────────
  const handleGoOnline = async () => {
    setLocating(true)
    setLocationError('')
    try {
      const loc = await getGPS()
      setMyLocation(loc)
      setIsOnline(true)
      await saveLocation(loc)
      startLocationTracking()
      showSuccess('You are ONLINE — Farmers can see you!')
    } catch (err) {
      setLocationError('GPS access denied. Allow location in browser.')
    }
    setLocating(false)
  }

  // ── GO OFFLINE ───────────────────────────────────────────
  // IMPORTANT: Only this button sets offline — NOT logout
  const handleGoOffline = async () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current)
      locationIntervalRef.current = null
    }
    setIsOnline(false)
    setMyLocation(null)
    try {
      // isOnline = false but location stays for record
      await updateDoc(doc(db, 'users', user.uid), {
        isOnline: false, isAvailable: false
      })
    } catch (err) { console.error(err) }
    showSuccess('You are OFFLINE')
  }

  // ── LOGOUT — does NOT change online status ────────────────
  const handleLogout = async () => {
    // Stop local interval but DO NOT update Firestore isOnline
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current)
      locationIntervalRef.current = null
    }
    await signOut(auth)
    navigate('/')
  }

  // ── ACCEPT JOB ───────────────────────────────────────────
  const handleAccept = async (job) => {
    setActionLoading(job.id)
    try {
      await updateDoc(doc(db, 'requests', job.id), {
        status:          'accepted',
        providerId:      user.uid,
        providerName:    profile?.name || user.email,
        providerPhone:   profile?.phone || '',
        acceptedAt:      new Date(),
      })
      showSuccess('Job accepted!')
      fetchMyJobs()
    } catch (err) { console.error(err) }
    setActionLoading('')
  }

  // ── REJECT JOB ───────────────────────────────────────────
  const handleReject = async (job) => {
    setActionLoading(job.id)
    try {
      // Add current labour to rejectedBy array — won't show again
      const rejectedBy = job.rejectedBy || []
      await updateDoc(doc(db, 'requests', job.id), {
        rejectedBy: [...rejectedBy, user.uid]
      })
    } catch (err) { console.error(err) }
    setActionLoading('')
  }

  // ── START WORK ───────────────────────────────────────────
  const handleStartWork = async (job) => {
    setActionLoading(job.id)
    try {
      await updateDoc(doc(db, 'requests', job.id), {
        status:      'in_progress',
        startedAt:   new Date(),
      })
      showSuccess('Work started!')
      fetchMyJobs()
    } catch (err) { console.error(err) }
    setActionLoading('')
  }

  // ── COMPLETE WORK ────────────────────────────────────────
  const handleComplete = async (job) => {
    setActionLoading(job.id)
    try {
      await updateDoc(doc(db, 'requests', job.id), {
        status:      'completed',
        completedAt: new Date(),
      })
      showSuccess(`Job completed! ₹${job.labourPrice || job.price || 0} earned`)
      fetchMyJobs()
    } catch (err) { console.error(err) }
    setActionLoading('')
  }

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  // Filter: pending jobs not rejected by this labour
  const visiblePendingJobs = pendingJobs.filter(
    j => !(j.rejectedBy || []).includes(user?.uid)
  )

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div style={s.root}>
      <div style={{ ...s.blob, top: '-80px', left: '-60px', background: 'radial-gradient(circle,rgba(250,204,21,0.10) 0%,transparent 70%)', width: 480, height: 480 }} />
      <div style={{ ...s.blob, bottom: '0', right: '-60px', background: 'radial-gradient(circle,rgba(74,222,128,0.07) 0%,transparent 70%)', width: 380, height: 380 }} />
      <div style={s.grain} />

      {/* ── NAV ── */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <span style={s.navLogo}>🌿 No Spoilers</span>
          <span style={s.navBadgeYellow}>💪 Labour</span>
        </div>
        <div style={s.navRight}>
          {/* Online indicator */}
          {isOnline && (
            <div style={s.onlinePill}>
              <span style={s.pulseDot} />
              <span style={{ fontSize: 12, color: '#86efac', fontWeight: 600 }}>ONLINE</span>
            </div>
          )}
          {/* Go Online / Offline button */}
          <button
            onClick={isOnline ? handleGoOffline : handleGoOnline}
            disabled={locating}
            style={{
              background: isOnline ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)',
              border: `1px solid ${isOnline ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.3)'}`,
              color: isOnline ? '#fca5a5' : '#86efac',
              borderRadius: 8, padding: '6px 14px', fontSize: 12,
              fontWeight: 700, cursor: locating ? 'not-allowed' : 'pointer',
              opacity: locating ? 0.6 : 1,
            }}
          >
            {locating ? '📡 Getting GPS...' : isOnline ? '🔴 Go Offline' : '🟢 Go Online'}
          </button>
          <span style={s.navUser}>{user?.email}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div style={s.body}>

        {/* ── NEW JOB ALERT BANNER ── */}
        {newJobAlert && (
          <div style={s.alertBanner}>
            🔔 New job request received! Check Available Jobs tab.
          </div>
        )}

        {/* ── SUCCESS ── */}
        {successMsg && (
          <div style={s.successBanner}><span>✓</span> {successMsg}</div>
        )}

        {/* ── LOCATION ERROR ── */}
        {locationError && (
          <div style={s.errorBanner}>⚠ {locationError}</div>
        )}

        {/* ── PAGE HEADER ── */}
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>Labour Dashboard</h1>
            <p style={s.pageSubtitle}>
              {profile?.name || 'Worker'} · ₹{profile?.ratePerDay || 500}/day ·
              {isOnline
                ? <span style={{ color: '#4ade80' }}> 🟢 Accepting jobs</span>
                : <span style={{ color: '#52525b' }}> ⚫ Offline</span>}
            </p>
          </div>
          <div style={s.tabs}>
            {[
              { id: 'jobs',     label: '💼 Available', count: visiblePendingJobs.length },
              { id: 'myjobs',   label: 'My Jobs',      count: myJobs.filter(j => j.status !== 'completed').length },
              { id: 'earnings', label: '💰 Earnings' },
            ].map(tab => (
              <button key={tab.id}
                style={activeTab === tab.id ? { ...s.tab, ...s.tabActive } : s.tab}
                onClick={() => setActiveTab(tab.id)}>
                {tab.label}
                {tab.count > 0 && <span style={s.tabBadge}>{tab.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* TAB: AVAILABLE JOBS                          */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === 'jobs' && (
          <div>
            {!isOnline && (
              <div style={s.offlineNotice}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📵</div>
                <div style={{ fontWeight: 700, color: '#f4f4f5', fontSize: 16, marginBottom: 4 }}>You are Offline</div>
                <div style={{ color: '#52525b', fontSize: 13, marginBottom: 16 }}>Go online to receive job requests from farmers</div>
                <button
                  onClick={handleGoOnline}
                  disabled={locating}
                  style={{ ...s.btnGreen, opacity: locating ? 0.6 : 1 }}
                >
                  {locating ? '📡 Getting GPS...' : '🟢 Go Online Now'}
                </button>
              </div>
            )}

            {isOnline && visiblePendingJobs.length === 0 && (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>⏳</div>
                <div style={s.emptyTitle}>Waiting for jobs...</div>
                <div style={s.emptySubtitle}>You are online — job requests will appear here automatically</div>
                <div style={{ color: '#3f3f46', fontSize: 12, marginTop: 8 }}>
                  🔄 Live updates enabled — no refresh needed
                </div>
              </div>
            )}

            {isOnline && visiblePendingJobs.length > 0 && (
              <div style={s.list}>
                {visiblePendingJobs.map(job => (
                  <div key={job.id} style={{ ...s.jobCard, animation: 'fadeSlideIn 0.3s ease' }}>
                    {/* Card top */}
                    <div style={s.jobTop}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={s.cropBadge}>{job.crop || 'General'}</span>
                        <span style={s.qtyBadge}>{job.quantity || '—'} kg</span>
                      </div>
                      <div style={{ color: '#facc15', fontWeight: 800, fontSize: 16 }}>
                        ₹{job.labourPrice || job.price || profile?.ratePerDay || 500}
                      </div>
                    </div>

                    {/* Details */}
                    <div style={s.jobDetails}>
                      <div style={s.detailRow}>
                        <span style={s.detailIcon}>📍</span>
                        <span style={s.detailText}>{job.pickup || 'Location not specified'}</span>
                      </div>
                      {job.farmerName && (
                        <div style={s.detailRow}>
                          <span style={s.detailIcon}>🌾</span>
                          <span style={s.detailText}>Farmer: {job.farmerName}</span>
                        </div>
                      )}
                      {job.farmerPhone && (
                        <div style={s.detailRow}>
                          <span style={s.detailIcon}>📞</span>
                          <span style={s.detailText}>{job.farmerPhone}</span>
                        </div>
                      )}
                      <div style={s.detailRow}>
                        <span style={s.detailIcon}>🕐</span>
                        <span style={s.detailText}>
                          {job.createdAt
                            ? new Date(job.createdAt?.toDate?.() || job.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            : 'Just now'}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={s.actionRow}>
                      <button
                        onClick={() => handleReject(job)}
                        disabled={actionLoading === job.id}
                        style={s.btnReject}
                      >
                        ✗ Skip
                      </button>
                      <button
                        onClick={() => handleAccept(job)}
                        disabled={actionLoading === job.id}
                        style={{ ...s.btnAccept, opacity: actionLoading === job.id ? 0.6 : 1 }}
                      >
                        {actionLoading === job.id
                          ? <span style={s.spinnerGreen} />
                          : '✓ Accept Job'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* TAB: MY JOBS                                 */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === 'myjobs' && (
          <div>
            {myJobs.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>📋</div>
                <div style={s.emptyTitle}>No jobs yet</div>
                <div style={s.emptySubtitle}>Accept a job from Available Jobs tab</div>
              </div>
            ) : (
              <div style={s.list}>
                {myJobs.map(job => {
                  const st = getStatusStyle(job.status)
                  return (
                    <div key={job.id} style={{ ...s.jobCard, border: `1px solid ${st.border}` }}>
                      <div style={s.jobTop}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={s.cropBadge}>{job.crop || 'General'}</span>
                          <span style={s.qtyBadge}>{job.quantity || '—'} kg</span>
                        </div>
                        <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                          {job.status === 'in_progress' ? '🔧 In Progress' : job.status === 'completed' ? '✅ Completed' : '⏳ Accepted'}
                        </span>
                      </div>

                      <div style={s.jobDetails}>
                        <div style={s.detailRow}>
                          <span style={s.detailIcon}>📍</span>
                          <span style={s.detailText}>{job.pickup}</span>
                        </div>
                        <div style={s.detailRow}>
                          <span style={s.detailIcon}>💰</span>
                          <span style={{ ...s.detailText, color: '#facc15', fontWeight: 700 }}>
                            ₹{job.labourPrice || job.price || 0}
                          </span>
                        </div>
                        {job.acceptedAt && (
                          <div style={s.detailRow}>
                            <span style={s.detailIcon}>✓</span>
                            <span style={s.detailText}>
                              Accepted at {new Date(job.acceptedAt?.toDate?.() || job.acceptedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status actions */}
                      <div style={s.actionRow}>
                        {job.status === 'accepted' && (
                          <button
                            onClick={() => handleStartWork(job)}
                            disabled={actionLoading === job.id}
                            style={{ ...s.btnBlue, opacity: actionLoading === job.id ? 0.6 : 1 }}
                          >
                            {actionLoading === job.id ? <span style={s.spinnerBlue} /> : '🔧 Start Work'}
                          </button>
                        )}
                        {job.status === 'in_progress' && (
                          <button
                            onClick={() => handleComplete(job)}
                            disabled={actionLoading === job.id}
                            style={{ ...s.btnGreen, opacity: actionLoading === job.id ? 0.6 : 1 }}
                          >
                            {actionLoading === job.id ? <span style={s.spinnerGreen} /> : '✅ Complete Work'}
                          </button>
                        )}
                        {job.status === 'completed' && (
                          <div style={{ color: '#4ade80', fontSize: 13, fontWeight: 600 }}>
                            ✅ Work completed · ₹{job.labourPrice || job.price || 0} earned
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* TAB: EARNINGS                                */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === 'earnings' && (
          <div>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ ...s.statCard, borderColor: 'rgba(250,204,21,0.25)', background: 'rgba(250,204,21,0.05)' }}>
                <div style={s.statLabel}>Today's Earnings</div>
                <div style={{ ...s.statValue, color: '#facc15' }}>₹{earnings.today}</div>
                <div style={s.statHint}>from completed jobs</div>
              </div>
              <div style={{ ...s.statCard, borderColor: 'rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.05)' }}>
                <div style={s.statLabel}>Total Earnings</div>
                <div style={{ ...s.statValue, color: '#4ade80' }}>₹{earnings.total}</div>
                <div style={s.statHint}>all time</div>
              </div>
              <div style={{ ...s.statCard, borderColor: 'rgba(96,165,250,0.25)', background: 'rgba(96,165,250,0.05)' }}>
                <div style={s.statLabel}>Jobs Completed</div>
                <div style={{ ...s.statValue, color: '#60a5fa' }}>{earnings.completed}</div>
                <div style={s.statHint}>total deliveries</div>
              </div>
            </div>

            {/* Profile info */}
            {profile && (
              <div style={s.profileCard}>
                <div style={s.cardHeader}>
                  <span style={{ fontSize: 24 }}>💪</span>
                  <div>
                    <div style={s.cardTitle}>{profile.name}</div>
                    <div style={s.cardSubtitle}>{profile.email}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                  {[
                    { label: 'Rate/Day',   value: `₹${profile.ratePerDay || 500}` },
                    { label: 'Experience', value: `${profile.experience || 0} years` },
                    { label: 'Phone',      value: profile.phone || 'Not set' },
                    { label: 'Status',     value: isOnline ? '🟢 Online' : '⚫ Offline' },
                  ].map(item => (
                    <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '12px 14px' }}>
                      <div style={{ fontSize: 11, color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#f4f4f5' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completed jobs list */}
            {myJobs.filter(j => j.status === 'completed').length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#71717a', marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Completed Jobs History
                </div>
                <div style={s.list}>
                  {myJobs.filter(j => j.status === 'completed').map(job => (
                    <div key={job.id} style={{ ...s.jobCard, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ color: '#f4f4f5', fontWeight: 700, fontSize: 14 }}>
                            {job.crop || 'General'} · {job.quantity || '—'} kg
                          </div>
                          <div style={{ color: '#52525b', fontSize: 12, marginTop: 3 }}>
                            📍 {job.pickup}
                            {job.completedAt && ` · ${new Date(job.completedAt?.toDate?.() || job.completedAt).toLocaleDateString('en-IN')}`}
                          </div>
                        </div>
                        <div style={{ color: '#4ade80', fontWeight: 800, fontSize: 16 }}>
                          +₹{job.labourPrice || job.price || 0}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default LabourDashboard

// ── Status style helper ───────────────────────────────────
function getStatusStyle(status) {
  if (status === 'accepted')    return { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' }
  if (status === 'in_progress') return { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.25)' }
  if (status === 'completed')   return { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)' }
  return { color: '#71717a', bg: 'rgba(113,113,122,0.1)', border: 'rgba(113,113,122,0.25)' }
}

// ── Styles ────────────────────────────────────────────────
const s = {
  root: { minHeight: '100vh', background: '#09090b', color: '#e4e4e7', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", position: 'relative' },
  blob: { position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 },
  grain: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.5, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", backgroundRepeat: 'repeat', backgroundSize: '256px' },
  nav: { position: 'sticky', top: 0, zIndex: 100, background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 60 },
  navLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  navLogo: { fontWeight: 700, fontSize: 16, color: '#f4f4f5', letterSpacing: '-0.02em' },
  navBadgeYellow: { background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.2)', borderRadius: 99, padding: '3px 10px', fontSize: 11, color: '#fde68a', fontWeight: 600 },
  navRight: { display: 'flex', alignItems: 'center', gap: 10 },
  navUser: { fontSize: 12, color: '#52525b' },
  logoutBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  onlinePill: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 99, padding: '4px 12px' },
  pulseDot: { width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' },
  body: { position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px' },
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  pageTitle: { fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fafafa', margin: 0 },
  pageSubtitle: { fontSize: 13, color: '#52525b', margin: '4px 0 0' },
  tabs: { display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 4, gap: 4 },
  tab: { background: 'transparent', border: 'none', color: '#71717a', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' },
  tabActive: { background: 'rgba(255,255,255,0.08)', color: '#f4f4f5' },
  tabBadge: { background: '#facc15', color: '#1a1000', borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 800 },
  alertBanner: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#fde68a', marginBottom: 16, fontWeight: 600, animation: 'fadeSlideIn 0.3s ease' },
  successBanner: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 14, color: '#86efac', marginBottom: 16, fontWeight: 600 },
  errorBanner: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 14, color: '#fca5a5', marginBottom: 16 },
  offlineNotice: { textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  jobCard: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '18px 20px' },
  jobTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cropBadge: { background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.2)', color: '#fde68a', borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 700 },
  qtyBadge: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa', borderRadius: 99, padding: '2px 10px', fontSize: 12 },
  jobDetails: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  detailRow: { display: 'flex', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 14, width: 20 },
  detailText: { fontSize: 13, color: '#71717a' },
  actionRow: { display: 'flex', gap: 10 },
  btnAccept: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#4ade80', color: '#052e16', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 16px rgba(74,222,128,0.2)' },
  btnReject: { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnGreen: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#4ade80', color: '#052e16', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  btnBlue: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  spinnerGreen: { width: 16, height: 16, border: '2px solid rgba(5,46,22,0.3)', borderTopColor: '#052e16', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' },
  spinnerBlue: { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' },
  statCard: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px' },
  statLabel: { fontSize: 11, color: '#52525b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 },
  statValue: { fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 },
  statHint: { fontSize: 12, color: '#3f3f46' },
  profileCard: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '24px' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 14 },
  cardTitle: { fontSize: 17, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' },
  cardSubtitle: { fontSize: 12, color: '#52525b', marginTop: 2 },
  emptyState: { textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: '#f4f4f5' },
  emptySubtitle: { fontSize: 14, color: '#52525b' },
}