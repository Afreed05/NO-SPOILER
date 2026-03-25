// ============================================================
// RiskCard.jsx — Schedule Analysis + AI Feedback
// Ye component FarmerDashboard mein riskData aane ke baad render hota hai
// schedule section tab dikhta hai jab user ne date/time select kiya ho
// ============================================================

// ─── Helper: spoilage % → color ───────────────────────────
function getSpoilageColor(pct) {
  if (pct <= 8)  return '#4ade80'   // green — safe
  if (pct <= 15) return '#fbbf24'   // yellow — moderate risk
  return '#f87171'                   // red — high risk
}

// ─── AI Feedback Box ──────────────────────────────────────
function AIFeedbackBox({ selectedWindow, route, bestWindow }) {
  const spoilage = selectedWindow?.spoilage_percent || 0
  const isGood   = spoilage <= 10
  const reasons  = []

  // Dynamic reasons based on actual data
  if (selectedWindow?.temperature_at_dispatch > 32) {
    reasons.push(`🌡️ Temperature at dispatch: ${selectedWindow.temperature_at_dispatch}°C — high heat accelerates spoilage`)
  } else {
    reasons.push(`🌡️ Temperature at dispatch: ${selectedWindow.temperature_at_dispatch}°C — manageable for transport`)
  }

  if (route?.travel_hours > 4) {
    reasons.push(`🚛 Long route: ${route.travel_hours.toFixed(1)} hrs in transit — more exposure time`)
  } else {
    reasons.push(`🚛 Short route: ${route.travel_hours.toFixed(1)} hrs — low transit risk`)
  }

  if (selectedWindow?.time_context?.includes('Midday') || selectedWindow?.time_context?.includes('Afternoon')) {
    reasons.push(`⏰ Midday/afternoon dispatch — peak heat hours, not ideal for perishables`)
  } else if (selectedWindow?.time_context?.includes('Morning') || selectedWindow?.time_context?.includes('Night')) {
    reasons.push(`⏰ Early morning or night dispatch — cool hours, best for fresh produce`)
  } else {
    reasons.push(`⏰ ${selectedWindow?.time_context || 'Dispatch time selected'}`)
  }

  // How much more can farmer save by switching to best window?
  const extraSavings = bestWindow?.loss_rupees !== undefined && selectedWindow?.loss_rupees !== undefined
    ? (selectedWindow.loss_rupees - bestWindow.loss_rupees)
    : null

  return (
    <div style={{
      background: isGood ? 'rgba(74,222,128,0.06)' : 'rgba(248,113,113,0.06)',
      border:     `1px solid ${isGood ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
      borderRadius: 14,
      padding: '18px 20px',
    }}>
      {/* Verdict header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: 28 }}>{isGood ? '✅' : '⚠️'}</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: isGood ? '#4ade80' : '#f87171', letterSpacing: '-0.02em' }}>
            Your selected schedule is {isGood ? 'GOOD' : 'NOT IDEAL'}
          </div>
          <div style={{ fontSize: 12, color: '#52525b', marginTop: 2 }}>
            {isGood
              ? `${spoilage.toFixed(1)}% spoilage — within safe range`
              : `${spoilage.toFixed(1)}% spoilage — consider dispatching earlier or later`}
          </div>
        </div>
      </div>

      {/* Reasons */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 12, marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#52525b', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          WHY:
        </div>
        {reasons.map((r, i) => (
          <div key={i} style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 7, lineHeight: 1.5 }}>
            {r}
          </div>
        ))}
      </div>

      {/* Switch to best window CTA — only if meaningful savings available */}
      {extraSavings > 50 && (
        <div style={{
          marginTop: 14,
          background: 'rgba(167,139,250,0.08)',
          border:     '1px solid rgba(167,139,250,0.2)',
          borderRadius: 10,
          padding: '12px 14px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>
            💡 Switch to: {bestWindow?.window}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#4ade80', marginTop: 4 }}>
            Save ₹{extraSavings.toFixed(0)} more by dispatching at best time
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main RiskCard Component ──────────────────────────────
export default function RiskCard({ data }) {
  if (!data) return null

  return (
    <div>
      {/* ══════════════════════════════════════════════ */}
      {/* SCHEDULE ANALYSIS — only if user picked date/time */}
      {/* ══════════════════════════════════════════════ */}
      {data.schedule && data.schedule.selected_window && (
        <div style={{
          background: 'rgba(255,255,255,0.025)',
          border:     '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          padding: '24px',
          marginBottom: 20,
          backdropFilter: 'blur(8px)',
          animation: 'fadeSlideIn 0.4s ease',
        }}>
          {/* Section header */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' }}>
              📅 Your Schedule Analysis
            </div>
            <div style={{ fontSize: 12, color: '#52525b', marginTop: 4 }}>
              {data.schedule.date} at {data.schedule.time} — {data.schedule.time_context}
            </div>
          </div>

          {/* 3 stat tiles: spoilage, loss, temp */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: getSpoilageColor(data.schedule.selected_window.spoilage_percent), letterSpacing: '-0.02em' }}>
                {data.schedule.selected_window.spoilage_percent?.toFixed(1)}%
              </div>
              <div style={{ fontSize: 11, color: '#52525b', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Spoilage
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f87171', letterSpacing: '-0.02em' }}>
                ₹{data.schedule.selected_window.loss_rupees?.toFixed(0)}
              </div>
              <div style={{ fontSize: 11, color: '#52525b', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Est. Loss
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '16px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#fbbf24', letterSpacing: '-0.02em' }}>
                {data.weather.scheduled_temperature}°C
              </div>
              <div style={{ fontSize: 11, color: '#52525b', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Temp at Dispatch
              </div>
            </div>
          </div>

          {/* AI Feedback */}
          <AIFeedbackBox
            selectedWindow={data.schedule.selected_window}
            route={data.route}
            bestWindow={data.prediction?.best_window}
          />
        </div>
      )}
    </div>
  )
}