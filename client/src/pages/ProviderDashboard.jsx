// ============================================================
// ProviderDashboard.jsx — With Live Location Tracking
// Go Online → GPS fetch → Firestore save → 30sec update
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { auth, db } from '../firebase/config'
import { collection, getDocs, doc, updateDoc, query, where, getDoc } from 'firebase/firestore'
import { signOut, onAuthStateChanged } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import axios from 'axios'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const CITY_COORDS = {
  'Kolar': [13.1357, 78.1294], 'Davanagere': [14.4644, 75.9218],
  'Tumkur': [13.3409, 77.1010], 'Hassan': [13.0068, 76.0996],
  'Mandya': [12.5218, 76.8951], 'Mysuru': [12.2958, 76.6394],
  'Hubli': [15.3647, 75.1240], 'Bengaluru': [12.9716, 77.5946],
  'Shivamogga': [13.9299, 75.5681], 'Chitradurga': [14.2251, 76.3980],
  'Bengaluru APMC': [12.9716, 77.5946], 'Mysuru Mandi': [12.2958, 76.6394],
  'Hubli Mandi': [15.3647, 75.1240], 'Mangaluru Mandi': [12.9141, 74.8560],
  'Tumkur Mandi': [13.3409, 77.1010],
}

const getCoords = (name) => {
  if (CITY_COORDS[name]) return CITY_COORDS[name]
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (name?.toLowerCase().includes(city.toLowerCase())) return coords
  }
  return [12.9716, 77.5946]
}

const getStatusStyle = (status) => {
  if (status === 'pending')   return { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)' }
  if (status === 'accepted')  return { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  border: 'rgba(96,165,250,0.25)' }
  if (status === 'delivered') return { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)' }
  return { color: '#71717a', bg: 'rgba(113,113,122,0.12)', border: 'rgba(113,113,122,0.25)' }
}

const MAP_DARK_STYLE = `
  .leaflet-tile { filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.7); }
  .leaflet-container { background: #1a1a1f !important; }
  .leaflet-popup-content-wrapper { background: #18181b !important; color: #e4e4e7 !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 12px !important; box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important; }
  .leaflet-popup-tip { background: #18181b !important; }
  .leaflet-popup-close-button { color: #71717a !important; }
`

// Custom green marker for online driver
const onlineIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
})

function ProviderDashboard() {
  const [requests,      setRequests]      = useState([])
  const [myJobs,        setMyJobs]        = useState([])
  const [loading,       setLoading]       = useState(false)
  const [successMsg,    setSuccessMsg]    = useState('')
  const [activeTab,     setActiveTab]     = useState('map')
  const [routeCoords,   setRouteCoords]   = useState(null)
  const [activeJob,     setActiveJob]     = useState(null)
  const [routeInfo,     setRouteInfo]     = useState(null)
  const [fetchingRoute, setFetchingRoute] = useState(false)

  // ── Location tracking states ──
  const [isOnline,      setIsOnline]      = useState(false)
  const [myLocation,    setMyLocation]    = useState(null)
  const [locationError, setLocationError] = useState('')
  const [locating,      setLocating]      = useState(false)
  const locationIntervalRef = useRef(null)

  const navigate = useNavigate()
  const [user, setUser] = useState(auth.currentUser)

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      // Role Firestore se fetch karo
      const { getDoc, doc: fsDoc } = await import('firebase/firestore')
      const userDoc = await getDoc(fsDoc(db, 'users', currentUser.uid))
      const userData = userDoc.data()
      setUser({ ...currentUser, role: userData?.role })
    }
  })
  return () => unsubscribe()
}, [])

  useEffect(() => {
    fetchPendingRequests()
    if (!document.getElementById('map-dark-css')) {
      const style = document.createElement('style')
      style.id = 'map-dark-css'
      style.textContent = MAP_DARK_STYLE
      document.head.appendChild(style)
    }
    // Check if provider was already online
    checkOnlineStatus()
  }, [])

  useEffect(() => {
    if (user) fetchMyJobs()
  }, [user])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (locationIntervalRef.current) clearInterval(locationIntervalRef.current)
    }
  }, [])

  const checkOnlineStatus = async () => {
    if (!auth.currentUser) return
    try {
      const snap = await getDoc(doc(db, 'users', auth.currentUser.uid))
      if (snap.exists() && snap.data().isOnline) {
        setIsOnline(true)
        if (snap.data().location) setMyLocation(snap.data().location)
      }
    } catch (err) { console.error(err) }
  }

  // ── Get GPS location ──────────────────────────────────
  const getGPSLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  // ── Save location to Firestore ────────────────────────
  const saveLocationToFirestore = async (location) => {
    if (!auth.currentUser) return
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        location,
        isOnline:    true,
        isAvailable: true,
        lastSeen:    new Date(),
      })
    } catch (err) { console.error('Location save failed:', err) }
  }

  // ── Go Online ─────────────────────────────────────────
  const handleGoOnline = async () => {
    setLocating(true)
    setLocationError('')
    try {
      const location = await getGPSLocation()
      setMyLocation(location)
      setIsOnline(true)
      await saveLocationToFirestore(location)

      // Update location every 30 seconds
      locationIntervalRef.current = setInterval(async () => {
        try {
          const newLocation = await getGPSLocation()
          setMyLocation(newLocation)
          await saveLocationToFirestore(newLocation)
          console.log('Location updated:', newLocation)
        } catch (err) { console.error('Auto-update failed:', err) }
      }, 30000)

      setSuccessMsg('You are now ONLINE — Farmers can see your location!')
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err) {
      setLocationError('Location access denied. Please allow GPS in browser settings.')
    }
    setLocating(false)
  }

  // ── Go Offline ────────────────────────────────────────
  const handleGoOffline = async () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current)
      locationIntervalRef.current = null
    }
    setIsOnline(false)
    setMyLocation(null)
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        isOnline:    false,
        isAvailable: false,
        location:    null,
      })
    } catch (err) { console.error(err) }
    setSuccessMsg('You are now OFFLINE')
    setTimeout(() => setSuccessMsg(''), 3000)
  }

  const fetchPendingRequests = async () => {
  try {
    // Labour bhi provider dashboard use karta hai
    // Agar labour hai toh sirf apne assigned requests dikhao
    // Agar provider hai toh saare pending requests dikhao
    const q = query(
      collection(db, 'requests'),
      where('status', '==', 'pending')
    )
    const snap = await getDocs(q)
    const allRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }))

    // Labour ke liye — sirf wo requests jo unhe assign ki hain
    // Provider ke liye — saari pending requests
    if (user?.role === 'labour') {
      setRequests(allRequests.filter(r => r.labour?.id === user.uid))
    } else {
      setRequests(allRequests)
    }
  } catch (err) { console.error(err) }
}

  const fetchMyJobs = async () => {
    try {
      const q = query(collection(db, 'requests'), where('providerId', '==', user.uid))
      const snap = await getDocs(q)
      setMyJobs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { console.error(err) }
  }

  const handleAccept = async (request) => {
    setLoading(true)
    try {
      await updateDoc(doc(db, 'requests', request.id), {
        status: 'accepted',
        providerId: user.uid,
        providerEmail: user.email,
        acceptedAt: new Date(),
        // Driver status update — snapshot already saved, sirf status update karo
        'driver.status': 'accepted',
      })
      setSuccessMsg('Job accepted! Route loading...')
      setTimeout(() => setSuccessMsg(''), 4000)
      fetchPendingRequests(); fetchMyJobs()
      await fetchRoute(request)
      setActiveTab('map')
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const fetchRoute = async (job) => {
    setFetchingRoute(true)
    try {
      const response = await axios.post('http://localhost:5000/api/ml/analyze', {
        crop: job.crop, quantity: job.quantity,
        pickup: job.pickup, destination: job.destination,
        transport_type: 'open', price_per_kg: 20
      })
      const data = response.data
      setRouteInfo({ distance_km: data.route.distance_km, travel_hours: data.route.travel_hours, temperature: data.weather.temperature, crop: job.crop, quantity: job.quantity, pickup: job.pickup, destination: job.destination })
      setActiveJob(job)
      const geometry = data.route?.geometry
        if (geometry && geometry.length > 2) {
            setRouteCoords(geometry)
        } else {
          setRouteCoords([
          data.route?.originCoords || getCoords(job.pickup),
          data.route?.destCoords   || getCoords(job.destination)
          ])
          }     
    } catch (err) {
      setRouteCoords([getCoords(job.pickup), getCoords(job.destination)])
      setActiveJob(job)
    }
    setFetchingRoute(false)
  }

  const handleShowRoute = async (job) => { setActiveTab('map'); await fetchRoute(job) }
  const handleLogout = async () => { await handleGoOffline(); await signOut(auth); navigate('/') }

  return (
    <div style={s.root}>
      <div style={{ ...s.blob, top: '-80px', right: '-60px', background: 'radial-gradient(circle,rgba(96,165,250,0.10) 0%,transparent 70%)', width: 480, height: 480 }} />
      <div style={{ ...s.blob, bottom: '0', left: '-60px', background: 'radial-gradient(circle,rgba(74,222,128,0.07) 0%,transparent 70%)', width: 380, height: 380 }} />
      <div style={s.grain} />

      <nav style={s.nav}>
        <div style={s.navLeft}>
          <span style={s.navLogo}>🌿 No Spoilers</span>
          <span style={s.navBadgeBlue}>🚛 Provider</span>
        </div>
        <div style={s.navRight}>

          {/* ── ONLINE / OFFLINE TOGGLE ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isOnline && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 99, padding: '4px 12px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                <span style={{ fontSize: 12, color: '#86efac', fontWeight: 600 }}>ONLINE</span>
              </div>
            )}
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
          </div>

          <span style={s.navUser}>{user?.email}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div style={s.body}>
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>Provider Dashboard</h1>
            <p style={s.pageSubtitle}>Find jobs · Go online · Get route · Deliver</p>
          </div>
          <div style={s.tabs}>
            {[
              { id: 'map',       label: '🗺️ Map' },
              { id: 'available', label: 'Available', count: requests.length },
              { id: 'jobs',      label: 'My Jobs',   count: myJobs.length },
            ].map(tab => (
              <button key={tab.id}
                style={activeTab === tab.id ? { ...s.tab, ...s.tabActive } : s.tab}
                onClick={() => setActiveTab(tab.id)}>
                {tab.label}
                {tab.count > 0 && <span style={tab.id === 'jobs' ? { ...s.tabBadge, ...s.tabBadgeBlue } : s.tabBadge}>{tab.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Location error */}
        {locationError && (
          <div style={{ ...s.successBanner, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', marginBottom: 16 }}>
            ⚠ {locationError}
          </div>
        )}

        {successMsg && <div style={s.successBanner}><span>✓</span> {successMsg}</div>}

        {/* ══ MAP TAB ══ */}
        {activeTab === 'map' && (
          <div style={s.card}>
            <div style={s.cardHeader}>
              <span style={s.cardIcon}>📍</span>
              <div>
                <div style={s.cardTitle}>Karnataka — Live Map</div>
                <div style={s.cardSubtitle}>{requests.length} pending pickups · {isOnline ? '🟢 Your location visible to farmers' : '🔴 Go online to share location'}</div>
              </div>
              {fetchingRoute && <div style={s.routeLoadingPill}><span style={s.spinnerBlue} /> Loading route...</div>}
            </div>

            <div style={s.mapWrap}>
              <MapContainer center={[13.5, 76.5]} zoom={7} style={{ height: '420px', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />

                {/* Pending request markers */}
                {requests.map(req => (
                  <Marker key={req.id} position={getCoords(req.pickup)}>
                    <Popup>
                      <div style={s.popupBody}>
                        <div style={s.popupCrop}>{req.crop} · {req.quantity} kg</div>
                        <div style={s.popupRoute}>📍 {req.pickup}</div>
                        <div style={s.popupRoute}>🏪 {req.destination}</div>
                        {req.riskAnalysis && <div style={s.popupMl}>💰 ₹{req.riskAnalysis.savings_rupees} savings · {req.riskAnalysis.spoilage_percent}% spoilage</div>}
                        <button onClick={() => handleAccept(req)} disabled={loading} style={s.popupBtn}>
                          {loading ? 'Accepting...' : '✅ Accept Job'}
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* My own location marker (green) */}
                {isOnline && myLocation && (
                  <Marker position={[myLocation.lat, myLocation.lng]} icon={onlineIcon}>
                    <Popup>
                      <div style={s.popupBody}>
                        <div style={s.popupCrop}>🚛 Your Location</div>
                        <div style={s.popupRoute}>📡 GPS Active — updating every 30s</div>
                        <div style={{ ...s.popupRoute, color: '#86efac', fontWeight: 600 }}>● ONLINE</div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Route line */}
                {routeCoords && (
                  <>
                    <Marker position={routeCoords[0]}>
                      <Popup><div style={s.popupBody}><div style={s.popupCrop}>📦 Pickup</div><div style={s.popupRoute}>{activeJob?.pickup}</div></div></Popup>
                    </Marker>
                    <Marker position={routeCoords[1]}>
                      <Popup><div style={s.popupBody}><div style={s.popupCrop}>🏪 Destination</div><div style={s.popupRoute}>{activeJob?.destination}</div></div></Popup>
                    </Marker>
                    <Polyline positions={routeCoords} color="#60a5fa" weight={4} opacity={0.85} />
                  </>
                )}
              </MapContainer>
            </div>

            {/* Route info bar */}
            {routeInfo ? (
              <div style={s.routeBar}>
                <div style={s.routeBarItem}><div style={s.routeBarLabel}>Route</div><div style={s.routeBarValue}>{routeInfo.pickup} → {routeInfo.destination}</div></div>
                <div style={s.routeBarDivider} />
                <div style={s.routeBarItem}><div style={s.routeBarLabel}>Distance</div><div style={{ ...s.routeBarValue, color: '#60a5fa' }}>{routeInfo.distance_km} km</div></div>
                <div style={s.routeBarDivider} />
                <div style={s.routeBarItem}><div style={s.routeBarLabel}>Travel Time</div><div style={{ ...s.routeBarValue, color: '#60a5fa' }}>{routeInfo.travel_hours} hrs</div></div>
                <div style={s.routeBarDivider} />
                <div style={s.routeBarItem}><div style={s.routeBarLabel}>Temperature</div><div style={{ ...s.routeBarValue, color: '#fbbf24' }}>{routeInfo.temperature}°C</div></div>
                <div style={s.routeBarDivider} />
                <div style={s.routeBarItem}><div style={s.routeBarLabel}>Cargo</div><div style={s.routeBarValue}>{routeInfo.crop} · {routeInfo.quantity} kg</div></div>
              </div>
            ) : (
              <div style={s.routeBarEmpty}>Accept a job or click "Show Route" to see route details</div>
            )}
          </div>
        )}

        {/* ══ AVAILABLE TAB ══ */}
        {activeTab === 'available' && (
          <div>
            {requests.length === 0 ? (
              <div style={s.emptyState}><div style={s.emptyIcon}>📭</div><div style={s.emptyTitle}>No pending requests</div><div style={s.emptySubtitle}>Check back soon</div></div>
            ) : (
              <div style={s.list}>
                {requests.map(req => (
                  <div key={req.id} style={s.requestCard}>
                    <div style={s.requestLeft}>
                      <div style={s.requestCropRow}>
                        <span style={s.requestCrop}>{req.crop}</span>
                        <span style={s.requestQty}>{req.quantity} kg</span>
                        <span style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>PENDING</span>
                      </div>
                      <div style={s.requestRoute}>
                        <span style={s.routeFrom}>📍 {req.pickup}</span>
                        <span style={s.routeArrow}>→</span>
                        <span style={s.routeTo}>{req.destination}</span>
                      </div>
                      {req.riskAnalysis && (
                        <div style={s.mlChipsRow}>
                          <span style={s.mlChip}>💰 ₹{req.riskAnalysis.savings_rupees} savings</span>
                          <span style={s.mlChip}>⏰ {req.riskAnalysis.best_window}</span>
                          <span style={s.mlChip}>🧠 {req.riskAnalysis.spoilage_percent}% spoilage</span>
                        </div>
                      )}
                    </div>
                    <div style={s.requestActions}>
                      <button style={s.btnPreview} onClick={() => { setActiveTab('map'); fetchRoute(req) }}>🗺️ Preview</button>
                      <button style={loading ? { ...s.btnAccept, opacity: 0.6 } : s.btnAccept} onClick={() => handleAccept(req)} disabled={loading}>
                        {loading ? <span style={s.spinnerGreen} /> : '✅ Accept'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ MY JOBS TAB ══ */}
        {activeTab === 'jobs' && (
          <div>
            {myJobs.length === 0 ? (
              <div style={s.emptyState}><div style={s.emptyIcon}>🚚</div><div style={s.emptyTitle}>No jobs yet</div><div style={s.emptySubtitle}>Accept a request to get started</div><button style={s.btnAccept} onClick={() => setActiveTab('available')}>View Available</button></div>
            ) : (
              <div style={s.list}>
                {myJobs.map(job => {
                  const st = getStatusStyle(job.status)
                  const isActive = activeJob?.id === job.id
                  return (
                    <div key={job.id} style={isActive ? { ...s.jobCard, ...s.jobCardActive } : s.jobCard}>
                      <div style={s.jobTop}>
                        <div style={s.requestCropRow}>
                          <span style={s.requestCrop}>{job.crop}</span>
                          <span style={s.requestQty}>{job.quantity} kg</span>
                        </div>
                        <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, padding: '3px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>{job.status}</span>
                      </div>
                      <div style={s.requestRoute}>
                        <span style={s.routeFrom}>📍 {job.pickup}</span>
                        <span style={s.routeArrow}>→</span>
                        <span style={s.routeTo}>{job.destination}</span>
                      </div>
                      {job.riskAnalysis && (
                        <div style={s.mlChipsRow}>
                          <span style={s.mlChip}>💰 ₹{job.riskAnalysis.savings_rupees} saved</span>
                          <span style={s.mlChip}>⏰ {job.riskAnalysis.best_window}</span>
                        </div>
                      )}
                      <div style={s.jobActions}>
                        <button style={fetchingRoute ? { ...s.btnRoute, opacity: 0.6 } : s.btnRoute} onClick={() => handleShowRoute(job)} disabled={fetchingRoute}>
                          {fetchingRoute && activeJob?.id === job.id ? <><span style={s.spinnerBlue} /> Loading...</> : '🗺️ Show Route on Map'}
                        </button>
                        {isActive && routeInfo && (
                          <div style={s.jobRouteChips}>
                            <span style={s.routeChip}>📏 {routeInfo.distance_km} km</span>
                            <span style={s.routeChip}>⏱ {routeInfo.travel_hours} hrs</span>
                            <span style={s.routeChip}>🌡️ {routeInfo.temperature}°C</span>
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
      </div>
    </div>
  )
}

export default ProviderDashboard

const s = {
  root: { minHeight: '100vh', background: '#09090b', color: '#e4e4e7', fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", position: 'relative' },
  blob: { position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 },
  grain: { position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.5, backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")", backgroundRepeat: 'repeat', backgroundSize: '256px' },
  nav: { position: 'sticky', top: 0, zIndex: 100, background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 60 },
  navLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  navLogo: { fontWeight: 700, fontSize: 16, color: '#f4f4f5', letterSpacing: '-0.02em' },
  navBadgeBlue: { background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 99, padding: '3px 10px', fontSize: 11, color: '#93c5fd', fontWeight: 600 },
  navRight: { display: 'flex', alignItems: 'center', gap: 12 },
  navUser: { fontSize: 12, color: '#52525b' },
  logoutBtn: { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 600 },
  body: { position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto', padding: '32px 20px 80px' },
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  pageTitle: { fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fafafa', margin: 0 },
  pageSubtitle: { fontSize: 13, color: '#52525b', margin: '4px 0 0' },
  tabs: { display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 4, gap: 4 },
  tab: { background: 'transparent', border: 'none', color: '#71717a', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' },
  tabActive: { background: 'rgba(255,255,255,0.08)', color: '#f4f4f5' },
  tabBadge: { background: '#4ade80', color: '#052e16', borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 800 },
  tabBadgeBlue: { background: '#60a5fa', color: '#0c1a2e' },
  successBanner: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '10px 16px', fontSize: 14, color: '#86efac', marginBottom: 16, fontWeight: 600 },
  card: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', marginBottom: 20 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 14, padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  cardIcon: { fontSize: 22 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' },
  cardSubtitle: { fontSize: 12, color: '#52525b', marginTop: 2 },
  routeLoadingPill: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 99, padding: '5px 14px', fontSize: 12, color: '#93c5fd', fontWeight: 600 },
  mapWrap: { position: 'relative' },
  routeBar: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(96,165,250,0.04)' },
  routeBarItem: { padding: '14px 20px', flex: 1, minWidth: 120 },
  routeBarLabel: { fontSize: 10, color: '#52525b', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 },
  routeBarValue: { fontSize: 14, fontWeight: 700, color: '#e4e4e7' },
  routeBarDivider: { width: 1, height: 40, background: 'rgba(255,255,255,0.07)', alignSelf: 'center' },
  routeBarEmpty: { padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 13, color: '#3f3f46', textAlign: 'center' },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  requestCard: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  requestLeft: { flex: 1 },
  requestCropRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  requestCrop: { fontSize: 17, fontWeight: 800, color: '#fafafa', letterSpacing: '-0.02em' },
  requestQty: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 99, padding: '2px 10px', fontSize: 12, color: '#a1a1aa' },
  requestRoute: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  routeFrom: { fontSize: 13, color: '#71717a' },
  routeArrow: { color: '#3f3f46', fontSize: 12 },
  routeTo: { fontSize: 13, color: '#71717a' },
  mlChipsRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  mlChip: { background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 8, padding: '3px 10px', fontSize: 11, color: '#86efac', fontWeight: 600 },
  requestActions: { display: 'flex', gap: 10, alignItems: 'center' },
  btnPreview: { background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#93c5fd', borderRadius: 9, padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  btnAccept: { display: 'flex', alignItems: 'center', gap: 6, background: '#4ade80', color: '#052e16', border: 'none', borderRadius: 9, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 16px rgba(74,222,128,0.2)' },
  btnRoute: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', color: '#93c5fd', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' },
  spinnerGreen: { width: 14, height: 14, border: '2px solid rgba(5,46,22,0.3)', borderTopColor: '#052e16', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' },
  spinnerBlue: { width: 14, height: 14, border: '2px solid rgba(147,197,253,0.3)', borderTopColor: '#93c5fd', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' },
  jobCard: { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '20px' },
  jobCardActive: { border: '1px solid rgba(96,165,250,0.3)', background: 'rgba(96,165,250,0.04)', boxShadow: '0 0 24px rgba(96,165,250,0.08)' },
  jobTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  jobActions: { display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' },
  jobRouteChips: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  routeChip: { background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.2)', borderRadius: 8, padding: '3px 10px', fontSize: 11, color: '#93c5fd', fontWeight: 600 },
  popupBody: { padding: '4px 0', minWidth: 200 },
  popupCrop: { fontWeight: 700, fontSize: 14, color: '#f4f4f5', marginBottom: 6 },
  popupRoute: { fontSize: 12, color: '#a1a1aa', marginBottom: 3 },
  popupMl: { fontSize: 11, color: '#86efac', marginBottom: 8, marginTop: 4, fontWeight: 600 },
  popupBtn: { width: '100%', padding: '8px', background: '#4ade80', color: '#052e16', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 6 },
  emptyState: { textAlign: 'center', padding: '80px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: '#f4f4f5' },
  emptySubtitle: { fontSize: 14, color: '#52525b', marginBottom: 8 },
}