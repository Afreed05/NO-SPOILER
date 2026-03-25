// ============================================================
// FarmerDashboard.jsx — Premium Dark Theme
// All logic same, UI fully redesigned
// ============================================================

import { useState, useEffect } from 'react'
import { auth, db } from '../firebase/config'
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import ProfitCalculator from '../components/ProfitCalculator'

const CROPS = ['Tomato', 'Onion', 'Potato', 'Mango', 'Banana', 'Grapes', 'Wheat', 'Rice']
const MARKETS = ['Bengaluru APMC', 'Mysuru Mandi', 'Hubli Mandi', 'Mangaluru Mandi', 'Tumkur Mandi']


const getRiskColor = (level) => {
  if (level === 'high') return '#ef4444'
  if (level === 'medium') return '#f59e0b'
  return '#4ade80'
}

const getRiskBg = (level) => {
  if (level === 'high') return 'rgba(239,68,68,0.12)'
  if (level === 'medium') return 'rgba(245,158,11,0.12)'
  return 'rgba(74,222,128,0.12)'
}

const getStatusStyle = (status) => {
  if (status === 'pending') return { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)' }
  if (status === 'accepted') return { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)' }
  if (status === 'delivered') return { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)' }
  return { color: '#71717a', bg: 'rgba(113,113,122,0.12)', border: 'rgba(113,113,122,0.25)' }
}

function FarmerDashboard() {
  const [crop, setCrop] = useState('')
  const [quantity, setQuantity] = useState('')
  const [pickup, setPickup] = useState('')
  const [destination, setDestination] = useState('')
  const [transportType, setTransportType] = useState('open')
  const [pricePerKg, setPricePerKg] = useState('')
  const [mandiPrices, setMandiPrices] = useState(null)
  const [riskData, setRiskData] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [dispatchDate, setDispatchDate] = useState('')
  const [dispatchTime, setDispatchTime] = useState('')
  const [showProfitCalc, setShowProfitCalc] = useState(false)
  const [labourCost, setLabourCost] = useState(500)
  const [transportRate, setTransportRate] = useState(12)
  const [nearbyDrivers, setNearbyDrivers]   = useState([])
const [nearbyLabours, setNearbyLabours]   = useState([])
const [selectedDriver, setSelectedDriver] = useState(null)
const [selectedLabour, setSelectedLabour] = useState(null)
const [showDrivers, setShowDrivers]       = useState(false)
const [showLabour, setShowLabour]         = useState(false)
  const [activeTab, setActiveTab] = useState('form') // 'form' | 'requests'

  const navigate = useNavigate()
  const user = auth.currentUser

  useEffect(() => { fetchRequests() }, [])

  const fetchRequests = async () => {
    try {
      const q = query(collection(db, 'requests'), where('farmerId', '==', user.uid))
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setRequests(data)
    } catch (err) { console.error(err) }
  }
  // Drivers fetch — same vehicleType as selected transport
const fetchNearbyDrivers = async (vType) => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'provider'),
      where('isAvailable', '==', true),
      where('vehicleType', '==', vType)
    )
    const snap = await getDocs(q)
    setNearbyDrivers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  } catch (err) { console.error('Driver fetch failed:', err) }
}

// Labour fetch — all available labours
const fetchNearbyLabours = async () => {
  try {
    const q = query(
      collection(db, 'users'),
      where('role', '==', 'labour'),
      where('isAvailable', '==', true)
    )
    const snap = await getDocs(q)
    setNearbyLabours(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  } catch (err) { console.error('Labour fetch failed:', err) }
}

  const handleCheckRisk = async () => {
    if (!crop || !quantity || !pickup || !destination)
      return setAnalysisError('Fill all fields before checking risk')
    setAnalyzing(true)
    setAnalysisError('')
    setRiskData(null)
    try {
      const response = await axios.post('http://localhost:5000/api/ml/analyze', {
        crop, quantity: Number(quantity), pickup, destination,
        transport_type: transportType, price_per_kg: Number(pricePerKg) || 20,
        dispatch_date: dispatchDate || null,
        dispatch_time: dispatchTime || null
      })
      setRiskData(response.data)
    } catch (err) {
      setAnalysisError('Analysis failed. Make sure all servers are running.')
    }
    setAnalyzing(false)
  }

  const fetchMandiPrices = async (selectedCrop) => {
    if (!selectedCrop) return
    try {
      const response = await axios.get(`http://localhost:5000/api/mandi/${selectedCrop}`)
      setMandiPrices(response.data)
    } catch (err) { console.error('Mandi fetch failed:', err) }
  }

  const handleSubmit = async () => {
    if (!crop || !quantity || !pickup || !destination)
      return setError('All fields are required')
    setLoading(true)
    setError('')
    try {
      await addDoc(collection(db, 'requests'), {
        farmerId: user.uid,
        farmerEmail: user.email,
        crop, quantity: Number(quantity), pickup, destination,
        status: 'pending',
        riskAnalysis: riskData ? {
          spoilage_percent: riskData.prediction.best_window.spoilage_percent,
          best_window: riskData.prediction.best_window.window,
          savings_rupees: riskData.prediction.savings_rupees
        } : null,
        createdAt: new Date()
      })
      setSuccess('Request posted! Provider will accept soon.')
      setCrop(''); setQuantity(''); setPickup(''); setDestination('')
      setPricePerKg(''); setRiskData(null); setMandiPrices(null)
      fetchRequests()
      setActiveTab('requests')
      setTimeout(() => setSuccess(''), 4000)
    } catch (err) { setError('Failed to post request') }
    setLoading(false)
  }

  const handleLogout = async () => { await signOut(auth); navigate('/') }

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div style={s.root}>
      {/* Blobs */}
      <div style={{ ...s.blob, top: '-100px', left: '-60px', background: 'radial-gradient(circle, rgba(74,222,128,0.10) 0%, transparent 70%)', width: 500, height: 500 }} />
      <div style={{ ...s.blob, bottom: '0', right: '-80px', background: 'radial-gradient(circle, rgba(250,204,21,0.07) 0%, transparent 70%)', width: 400, height: 400 }} />
      <div style={s.grain} />

      {/* ── NAV ── */}
      <nav style={s.nav}>
        <div style={s.navLeft}>
          <span style={s.navLogo}>🌿 No Spoilers</span>
          <span style={s.navBadge}>🌾 Farmer</span>
        </div>
        <div style={s.navRight}>
          <span style={s.navUser}>{user?.email}</span>
          <button style={s.logoutBtn} onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* ── PAGE BODY ── */}
      <div style={s.body}>

        {/* Page title */}
        <div style={s.pageHeader}>
          <div>
            <h1 style={s.pageTitle}>Farmer Dashboard</h1>
            <p style={s.pageSubtitle}>Post pickups · Check ML risk · Compare mandi prices</p>
          </div>
          {/* Tab switcher */}
          <div style={s.tabs}>
            <button style={activeTab === 'form' ? { ...s.tab, ...s.tabActive } : s.tab}
              onClick={() => setActiveTab('form')}>New Request</button>
            <button style={activeTab === 'requests' ? { ...s.tab, ...s.tabActive } : s.tab}
              onClick={() => setActiveTab('requests')}>
              My Requests
              {requests.length > 0 && <span style={s.tabBadge}>{requests.length}</span>}
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* TAB: NEW REQUEST FORM                        */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === 'form' && (
          <div>
            {/* Success / Error banners */}
            {success && (
              <div style={s.successBanner}>
                <span>✓</span> {success}
              </div>
            )}
            {error && (
              <div style={s.errorBanner}>
                <span>⚠</span> {error}
              </div>
            )}

            {/* ── FORM CARD ── */}
            <div style={s.card}>
              <div style={s.cardHeader}>
                <span style={s.cardIcon}>📦</span>
                <div>
                  <div style={s.cardTitle}>Post New Pickup Request</div>
                  <div style={s.cardSubtitle}>Fill details, check ML risk, then post</div>
                </div>
              </div>

              <div style={s.formGrid}>
                {/* Crop */}
                <div style={s.field}>
                  <label style={s.label}>Crop</label>
                  <select style={s.select} value={crop}
                    onChange={e => { setCrop(e.target.value); fetchMandiPrices(e.target.value) }}>
                    <option value="">Select crop</option>
                    {CROPS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Quantity */}
                <div style={s.field}>
                  <label style={s.label}>Quantity (kg)</label>
                  <input style={s.input} type="number" placeholder="e.g. 500"
                    value={quantity} onChange={e => setQuantity(e.target.value)}
                    onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                    onBlur={e => Object.assign(e.target.style, s.input)} />
                </div>

                {/* Pickup */}
                <div style={s.field}>
                  <label style={s.label}>Pickup Location</label>
                  <input style={s.input} placeholder="Village / Town name"
                    value={pickup} onChange={e => setPickup(e.target.value)}
                    onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                    onBlur={e => Object.assign(e.target.style, s.input)} />
                </div>

                {/* Destination */}
                <div style={s.field}>
                  <label style={s.label}>Destination Market</label>
                  <select style={s.select} value={destination}
                    onChange={e => setDestination(e.target.value)}>
                    <option value="">Select market</option>
                    {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Transport Type — 3 options */}
<div style={s.field}>
  <label style={s.label}>Transport Type</label>
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
    {[
      { key: 'open',         emoji: '🚛', label: 'Open Truck' },
      { key: 'closed',       emoji: '📦', label: 'Closed Truck' },
      { key: 'refrigerated', emoji: '❄️', label: 'Refrigerated' },
    ].map(v => (
      <div
        key={v.key}
        onClick={() => {
          setTransportType(v.key)
          fetchNearbyDrivers(v.key)
          setSelectedDriver(null)
        }}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          background: transportType === v.key ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${transportType === v.key ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10, padding: '12px 8px', cursor: 'pointer', transition: 'all 0.2s',
          fontSize: 20,
        }}
      >
        <span>{v.emoji}</span>
        <span style={{ fontSize: 11, color: transportType === v.key ? '#86efac' : '#71717a', fontWeight: 600 }}>
          {v.label}
        </span>
      </div>
    ))}
  </div>
</div>

                {/* Price */}
                <div style={s.field}>
                  <label style={s.label}>Price per kg (₹)</label>
                  <input style={s.input} type="number" placeholder="e.g. 25"
                    value={pricePerKg} onChange={e => setPricePerKg(e.target.value)}
                    onFocus={e => Object.assign(e.target.style, s.inputFocus)}
                    onBlur={e => Object.assign(e.target.style, s.input)} />
                </div>
              </div>
              {/* Dispatch Schedule */}
              <div style={{
                display: 'grid',
                 gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginTop: '8px'
                }}>
              <div>
              <label style={{ color: '#aaa', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                  📅 Dispatch Date
                  </label>
                  <input
                    type="date"
                    value={dispatchDate}
                    min={new Date().toISOString().split('T')[0]}  
                    onChange={e => setDispatchDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: '#1a1a2e',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                                  }}
                  />
                </div>
  <div>
    <label style={{ color: '#aaa', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
      ⏰ Dispatch Time
    </label>
    <input
      type="time"
      value={dispatchTime}
      onChange={e => setDispatchTime(e.target.value)}
      style={{
        width: '100%',
        padding: '10px 12px',
        background: '#1a1a2e',
        border: '1px solid #333',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '14px',
        boxSizing: 'border-box'
      }}
    />
  </div>
</div>

              {/* Action buttons */}
              {analysisError && <div style={{ ...s.errorBanner, margin: '16px 0 0' }}>⚠ {analysisError}</div>}
              <div style={s.actionRow}>
                <button style={analyzing ? { ...s.btnBlue, opacity: 0.6 } : s.btnBlue}
                  onClick={handleCheckRisk} disabled={analyzing}>
                  {analyzing
                    ? <><span style={s.spinnerBlue} /> Analyzing...</>
                    : '🔍 Check Spoilage Risk'}
                </button>
                <button style={loading ? { ...s.btnGreen, opacity: 0.6 } : s.btnGreen}
                  onClick={handleSubmit} disabled={loading}>
                  {loading ? <><span style={s.spinnerGreen} /> Posting...</> : '🚛 Post Pickup Request'}
                </button>
                <button
                  onClick={() => {
                    if (!riskData) {
                      alert('Pehle risk check karo')
                      return
                    }
                    setShowProfitCalc(true)
                  }}
                  style={{
                    background: '#a855f7',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 22px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  📊 Calculate Profit
                </button>
                              </div>
                            </div>
            {/* ══ NEARBY DRIVERS ══ */}
{crop && quantity && pickup && (
  <div style={s.card}>
    {/* Header with toggle */}
    <div
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      onClick={() => {
        setShowDrivers(!showDrivers)
        if (!showDrivers && nearbyDrivers.length === 0) fetchNearbyDrivers(transportType)
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={s.cardIcon}>🚛</span>
        <div>
          <div style={s.cardTitle}>Nearby Drivers</div>
          <div style={s.cardSubtitle}>
            {nearbyDrivers.length > 0
              ? `${nearbyDrivers.length} available • ${transportType} truck`
              : `Tap to find ${transportType} truck drivers`}
          </div>
        </div>
      </div>
      <span style={{ color: '#52525b', fontSize: 18 }}>{showDrivers ? '▲' : '▼'}</span>
    </div>

    {showDrivers && (
      <div style={{ marginTop: 16 }}>
        {nearbyDrivers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#52525b', fontSize: 13 }}>
            No {transportType} truck drivers available right now
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nearbyDrivers.map(driver => (
              <div
                key={driver.id}
                onClick={() => setSelectedDriver(selectedDriver?.id === driver.id ? null : driver)}
                style={{
                  background: selectedDriver?.id === driver.id
                    ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedDriver?.id === driver.id
                    ? 'rgba(74,222,128,0.35)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'rgba(96,165,250,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>🚛</div>
                  <div>
                    <div style={{ color: '#f4f4f5', fontWeight: 700, fontSize: 14 }}>{driver.name}</div>
                    <div style={{ color: '#52525b', fontSize: 12, marginTop: 2 }}>
                      {driver.vehicleType === 'refrigerated' ? '❄️ Refrigerated' :
                       driver.vehicleType === 'closed' ? '📦 Closed Truck' : '🚛 Open Truck'}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 14 }}>
                    ₹{driver.ratePerKm || 12}/km
                  </div>
                  {selectedDriver?.id === driver.id && (
                    <div style={{ color: '#86efac', fontSize: 11, marginTop: 2 }}>✓ Selected</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
)}

{/* ══ NEARBY LABOUR ══ */}
{crop && quantity && pickup && (
  <div style={s.card}>
    <div
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
      onClick={() => {
        setShowLabour(!showLabour)
        if (!showLabour && nearbyLabours.length === 0) fetchNearbyLabours()
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={s.cardIcon}>💪</span>
        <div>
          <div style={s.cardTitle}>Hire Labour <span style={{ color: '#52525b', fontWeight: 400, fontSize: 12 }}>(optional)</span></div>
          <div style={s.cardSubtitle}>
            {nearbyLabours.length > 0
              ? `${nearbyLabours.length} available for loading/unloading`
              : 'Tap to find available labour'}
          </div>
        </div>
      </div>
      <span style={{ color: '#52525b', fontSize: 18 }}>{showLabour ? '▲' : '▼'}</span>
    </div>

    {showLabour && (
      <div style={{ marginTop: 16 }}>
        {nearbyLabours.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#52525b', fontSize: 13 }}>
            No labour available right now
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nearbyLabours.map(labour => (
              <div
                key={labour.id}
                onClick={() => setSelectedLabour(selectedLabour?.id === labour.id ? null : labour)}
                style={{
                  background: selectedLabour?.id === labour.id
                    ? 'rgba(250,204,21,0.06)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedLabour?.id === labour.id
                    ? 'rgba(250,204,21,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'rgba(250,204,21,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                  }}>💪</div>
                  <div>
                    <div style={{ color: '#f4f4f5', fontWeight: 700, fontSize: 14 }}>{labour.name}</div>
                    <div style={{ color: '#52525b', fontSize: 12, marginTop: 2 }}>Loading & Unloading</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#facc15', fontWeight: 700, fontSize: 14 }}>
                    ₹{labour.ratePerDay || 500}/day
                  </div>
                  {selectedLabour?.id === labour.id && (
                    <div style={{ color: '#fde68a', fontSize: 11, marginTop: 2 }}>✓ Selected</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
)}

            {/* ════════════════════════════════════════════ */}
            {/* ML RISK CARD                                 */}
            {/* ════════════════════════════════════════════ */}
            {riskData && (
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <span style={s.cardIcon}>🧠</span>
                  <div>
                    <div style={s.cardTitle}>ML Spoilage Analysis</div>
                    <div style={s.cardSubtitle}>XGBoost · Real weather + road data</div>
                  </div>
                </div>
            {showProfitCalc && riskData && (
  <ProfitCalculator
    riskData={riskData}
    quantity={parseFloat(quantity)}
    pricePerKg={parseFloat(pricePerKg) || 20}
    selectedDriver={selectedDriver}
    selectedLabour={selectedLabour}
    mandiPrices={mandiPrices}
    onClose={() => setShowProfitCalc(false)}
  />
)}

                {/* Weather + Route */}
                <div style={s.infoGrid}>
                  <div style={s.infoTile}>
                    <div style={s.infoTileLabel}>🌡️ Temperature</div>
                    <div style={s.infoTileValue}>{riskData.weather.temperature}°C</div>
                    <div style={s.infoTileHint}>Humidity {riskData.weather.humidity}%</div>
                  </div>
                  <div style={s.infoTile}>
                    <div style={s.infoTileLabel}>🛣️ Distance</div>
                    <div style={s.infoTileValue}>{riskData.route.distance_km} km</div>
                    <div style={s.infoTileHint}>{riskData.route.travel_hours} hrs travel</div>
                  </div>
                  <div style={{ ...s.infoTile, borderColor: 'rgba(250,204,21,0.25)', background: 'rgba(250,204,21,0.06)' }}>
                    <div style={s.infoTileLabel}>⏰ Best Window</div>
                    <div style={{ ...s.infoTileValue, color: '#facc15', fontSize: 16 }}>
                      {riskData.prediction.best_window.window}
                    </div>
                    <div style={s.infoTileHint}>{riskData.prediction.best_window.spoilage_percent}% spoilage</div>
                  </div>
                  <div style={{ ...s.infoTile, borderColor: 'rgba(74,222,128,0.25)', background: 'rgba(74,222,128,0.06)' }}>
                    <div style={s.infoTileLabel}>💰 You Save</div>
                    <div style={{ ...s.infoTileValue, color: '#4ade80' }}>₹{riskData.prediction.savings_rupees}</div>
                    <div style={s.infoTileHint}>vs worst window</div>
                  </div>
                </div>

                {/* Recommendation */}
                <div style={s.recommendBox}>
                  <span style={s.recommendIcon}>💡</span>
                  <span style={s.recommendText}>{riskData.prediction.recommendation}</span>
                </div>

                {/* All windows table */}
                <div style={s.tableWrap}>
                  <div style={s.tableHeader}>📊 All Dispatch Windows</div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          {['Time', 'Temp', 'Spoilage', 'Loss (₹)', 'Risk'].map(h => (
                            <th key={h} style={s.th}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {riskData.prediction.all_windows.map((w, i) => {
                          const isBest = w.window === riskData.prediction.best_window.window
                          return (
                            <tr key={i} style={isBest ? s.trBest : s.tr}>
                              <td style={s.td}>
                                {isBest && <span style={s.bestStar}>★</span>}
                                {w.window}
                              </td>
                              <td style={s.td}>{w.temperature}°C</td>
                              <td style={s.td}>{w.spoilage_percent}%</td>
                              <td style={s.td}>₹{w.loss_rupees}</td>
                              <td style={s.td}>
                                <span style={{
                                  background: getRiskBg(w.risk_level),
                                  color: getRiskColor(w.risk_level),
                                  border: `1px solid ${getRiskColor(w.risk_level)}40`,
                                  padding: '2px 10px',
                                  borderRadius: 99,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em'
                                }}>{w.risk_level}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════ */}
            {/* MANDI PRICE TABLE                            */}
            {/* ════════════════════════════════════════════ */}
            {mandiPrices && (
              <div style={s.card}>
                <div style={s.cardHeader}>
                  <span style={s.cardIcon}>🏪</span>
                  <div>
                    <div style={s.cardTitle}>Mandi Price Comparison — {mandiPrices.crop}</div>
                    <div style={s.cardSubtitle}>Agmarknet historical data · ₹ per kg</div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        {['Mandi', 'Price/kg', 'Trend', 'Status'].map(h => (
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mandiPrices.prices.map((item, i) => (
                        <tr key={i} style={item.is_best ? s.trBest : s.tr}>
                          <td style={{ ...s.td, fontWeight: item.is_best ? 700 : 400 }}>
                            {item.is_best && <span style={s.bestStar}>★</span>}
                            {item.mandi}
                          </td>
                          <td style={{ ...s.td, color: item.is_best ? '#4ade80' : '#e4e4e7', fontWeight: item.is_best ? 700 : 400 }}>
                            ₹{item.price_per_kg}
                          </td>
                          <td style={s.td}>
                            {item.trend === 'up' ? '📈' : item.trend === 'down' ? '📉' : '➡️'}
                          </td>
                          <td style={s.td}>
                            {item.is_best && (
                              <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>
                                Best Price
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={s.recommendBox}>
                  <span style={s.recommendIcon}>💡</span>
                  <span style={s.recommendText}>
                    Send to <strong style={{ color: '#4ade80' }}>{mandiPrices.best_mandi}</strong> — Best price at ₹{mandiPrices.best_price_per_kg}/kg
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════ */}
        {/* TAB: MY REQUESTS                             */}
        {/* ════════════════════════════════════════════ */}
        {activeTab === 'requests' && (
          <div>
            {requests.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>📭</div>
                <div style={s.emptyTitle}>No requests yet</div>
                <div style={s.emptySubtitle}>Post your first pickup request to get started</div>
                <button style={s.btnGreen} onClick={() => setActiveTab('form')}>
                  + Post Request
                </button>
              </div>
            ) : (
              <div style={s.requestsList}>
                {requests.map(req => {
                  const st = getStatusStyle(req.status)
                  return (
                    <div key={req.id} style={s.requestCard}>
                      <div style={s.requestTop}>
                        <div style={s.requestCropRow}>
                          <span style={s.requestCrop}>{req.crop}</span>
                          <span style={s.requestQty}>{req.quantity} kg</span>
                        </div>
                        <span style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}`, padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {req.status}
                        </span>
                      </div>

                      <div style={s.requestRoute}>
                        <span style={s.routeFrom}>📍 {req.pickup}</span>
                        <span style={s.routeArrow}>→</span>
                        <span style={s.routeTo}>{req.destination}</span>
                      </div>

                      {req.riskAnalysis && (
                        <div style={s.requestMlRow}>
                          <span style={s.mlChip}>💰 Saved ₹{req.riskAnalysis.savings_rupees}</span>
                          <span style={s.mlChip}>⏰ {req.riskAnalysis.best_window}</span>
                          <span style={s.mlChip}>🧠 {req.riskAnalysis.spoilage_percent}% spoilage</span>
                        </div>
                      )}
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

export default FarmerDashboard

/* ─── STYLES ─────────────────────────────────────────────── */
const s = {
  root: {
    minHeight: '100vh',
    background: '#09090b',
    color: '#e4e4e7',
    fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    position: 'relative',
  },
  blob: { position: 'fixed', borderRadius: '50%', pointerEvents: 'none', zIndex: 0 },
  grain: {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.5,
    backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
    backgroundRepeat: 'repeat', backgroundSize: '256px',
  },

  // NAV
  nav: {
    position: 'sticky', top: 0, zIndex: 100,
    background: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', height: 60,
  },
  navLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  navLogo: { fontWeight: 700, fontSize: 16, color: '#f4f4f5', letterSpacing: '-0.02em' },
  navBadge: {
    background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
    borderRadius: 99, padding: '3px 10px', fontSize: 11, color: '#86efac', fontWeight: 600,
  },
  navRight: { display: 'flex', alignItems: 'center', gap: 12 },
  navUser: { fontSize: 12, color: '#52525b' },
  logoutBtn: {
    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
    color: '#fca5a5', borderRadius: 8, padding: '6px 14px', fontSize: 13,
    cursor: 'pointer', fontWeight: 600,
  },

  // BODY
  body: { position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px' },

  // PAGE HEADER
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 },
  pageTitle: { fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', color: '#fafafa', margin: 0 },
  pageSubtitle: { fontSize: 13, color: '#52525b', margin: '4px 0 0' },

  // TABS
  tabs: {
    display: 'flex', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 4, gap: 4,
  },
  tab: {
    background: 'transparent', border: 'none', color: '#71717a',
    borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
    transition: 'all 0.2s',
  },
  tabActive: { background: 'rgba(255,255,255,0.08)', color: '#f4f4f5' },
  tabBadge: {
    background: '#4ade80', color: '#052e16', borderRadius: 99,
    padding: '1px 7px', fontSize: 10, fontWeight: 800,
  },

  // CARDS
  card: {
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: '28px 24px', marginBottom: 20,
    backdropFilter: 'blur(8px)',
  },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 },
  cardIcon: { fontSize: 24 },
  cardTitle: { fontSize: 17, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' },
  cardSubtitle: { fontSize: 12, color: '#52525b', marginTop: 2 },

  // FORM
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 11, fontWeight: 700, color: '#71717a', letterSpacing: '0.05em', textTransform: 'uppercase' },
  input: {
    padding: '11px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    fontSize: 14, color: '#f4f4f5', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box', width: '100%',
  },
  inputFocus: {
    padding: '11px 14px', background: 'rgba(74,222,128,0.05)',
    border: '1px solid rgba(74,222,128,0.35)', borderRadius: 10,
    fontSize: 14, color: '#f4f4f5', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box', width: '100%',
  },
  select: {
    padding: '11px 14px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
    fontSize: 14, color: '#e4e4e7', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box', width: '100%', cursor: 'pointer',
  },

  // TRANSPORT
  transportGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 },
  transportCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '12px 8px', cursor: 'pointer', transition: 'all 0.2s',
    fontSize: 20,
  },
  transportActive: {
    background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.3)',
  },
  transportActiveBlue: {
    background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.3)',
  },
  transportLabel: { fontSize: 11, color: '#71717a', fontWeight: 600 },

  // BUTTONS
  actionRow: { display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' },
  btnBlue: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#3b82f6', color: '#fff', border: 'none',
    borderRadius: 10, padding: '12px 22px', fontSize: 14,
    fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 0 20px rgba(59,130,246,0.2)',
  },
  btnGreen: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#4ade80', color: '#052e16', border: 'none',
    borderRadius: 10, padding: '12px 22px', fontSize: 14,
    fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 0 20px rgba(74,222,128,0.2)',
  },
  spinnerBlue: {
    width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    display: 'inline-block', animation: 'spin 0.7s linear infinite',
  },
  spinnerGreen: {
    width: 14, height: 14, border: '2px solid rgba(5,46,22,0.3)',
    borderTopColor: '#052e16', borderRadius: '50%',
    display: 'inline-block', animation: 'spin 0.7s linear infinite',
  },

  // BANNERS
  successBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)',
    borderRadius: 10, padding: '10px 16px', fontSize: 14, color: '#86efac',
    marginBottom: 16, fontWeight: 600,
  },
  errorBanner: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 10, padding: '10px 16px', fontSize: 14, color: '#fca5a5',
    marginBottom: 16,
  },

  // ML RISK TILES
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 16 },
  infoTile: {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, padding: '16px',
  },
  infoTileLabel: { fontSize: 11, color: '#71717a', marginBottom: 6, fontWeight: 600 },
  infoTileValue: { fontSize: 24, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.03em' },
  infoTileHint: { fontSize: 11, color: '#52525b', marginTop: 4 },
  recommendBox: {
    background: 'rgba(250,204,21,0.06)', border: '1px solid rgba(250,204,21,0.18)',
    borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 16,
  },
  recommendIcon: { fontSize: 16 },
  recommendText: { fontSize: 13, color: '#d4b200', lineHeight: 1.5 },

  // TABLES
  tableWrap: { marginTop: 20 },
  tableHeader: { fontSize: 13, fontWeight: 700, color: '#71717a', marginBottom: 10, letterSpacing: '0.02em' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: {
    padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700,
    color: '#52525b', letterSpacing: '0.05em', textTransform: 'uppercase',
    borderBottom: '1px solid rgba(255,255,255,0.07)',
  },
  tr: { borderBottom: '1px solid rgba(255,255,255,0.04)' },
  trBest: { background: 'rgba(74,222,128,0.05)', borderBottom: '1px solid rgba(74,222,128,0.1)' },
  td: { padding: '10px 12px', color: '#d4d4d8' },
  bestStar: { color: '#facc15', marginRight: 6, fontSize: 12 },

  // REQUESTS LIST
  requestsList: { display: 'flex', flexDirection: 'column', gap: 12 },
  requestCard: {
    background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16, padding: '20px',
  },
  requestTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  requestCropRow: { display: 'flex', alignItems: 'center', gap: 10 },
  requestCrop: { fontSize: 17, fontWeight: 800, color: '#fafafa', letterSpacing: '-0.02em' },
  requestQty: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 99, padding: '2px 10px', fontSize: 12, color: '#a1a1aa',
  },
  requestRoute: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  routeFrom: { fontSize: 13, color: '#71717a' },
  routeArrow: { color: '#3f3f46', fontSize: 12 },
  routeTo: { fontSize: 13, color: '#71717a' },
  requestMlRow: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  mlChip: {
    background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)',
    borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#86efac', fontWeight: 600,
  },

  // EMPTY STATE
  emptyState: {
    textAlign: 'center', padding: '80px 20px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
  },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: 700, color: '#f4f4f5' },
  emptySubtitle: { fontSize: 14, color: '#52525b', marginBottom: 8 },
}