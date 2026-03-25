// ============================================================
// ProfitCalculator.jsx — Fixed
// Bug fix: driver.name → selectedDriver.name
// Bug fix: subtitle crash when no driver selected
// ============================================================

export default function ProfitCalculator({
  riskData, quantity, pricePerKg,
  selectedDriver, selectedLabour,
  mandiPrices, onClose
}) {

  const distanceKm    = riskData?.route?.distance_km || 150
  const ratePerKm     = selectedDriver?.ratePerKm || 12
  const driverName    = selectedDriver?.name || 'Estimated (₹12/km)'
  const transportCost = Math.round(distanceKm * ratePerKm)
  const labourCost    = selectedLabour ? (selectedLabour.ratePerDay || 500) : 0

  const bestWindow    = riskData?.prediction?.best_window
  const spoilageLoss  = Math.round(bestWindow?.loss_rupees || 0)
  const spoilagePct   = bestWindow?.spoilage_percent || 0

  // Revenue range from mandi prices
  let minPrice = pricePerKg || 20
  let maxPrice = pricePerKg || 20
  if (mandiPrices?.prices?.length > 0) {
    const allPrices = mandiPrices.prices.map(p => p.price_per_kg)
    minPrice = Math.min(...allPrices)
    maxPrice = Math.max(...allPrices)
  }

  const effectiveQty = quantity * (1 - spoilagePct / 100)
  const revenueMin   = Math.round(effectiveQty * minPrice)
  const revenueMax   = Math.round(effectiveQty * maxPrice)
  const totalCost    = transportCost + labourCost + spoilageLoss
  const profitMin    = revenueMin - totalCost
  const profitMax    = revenueMax - totalCost
  const isProfit     = profitMax > 0

  const worstWindow  = riskData?.prediction?.all_windows?.[0]
  const extraSavings = worstWindow
    ? Math.round((worstWindow.loss_rupees || 0) - (bestWindow?.loss_rupees || 0))
    : 0

  return (
    <div style={s.card}>

      {/* Header */}
      <div style={s.header}>
        <div>
          <div style={s.title}>📊 Profit Calculator</div>
          {/* FIX: driverName use karo — never crashes */}
          <div style={s.subtitle}>
            {quantity}kg · {driverName} · {distanceKm}km route
          </div>
        </div>
        <button onClick={onClose} style={s.closeBtn}>✕</button>
      </div>

      {/* Driver + Labour info */}
      <div style={s.infoRow}>
        <div style={s.infoChip}>
          <span style={{ color: '#93c5fd', fontSize: 11, fontWeight: 600 }}>DRIVER</span>
          {/* FIX: selectedDriver.name — not driver.name */}
          <span style={{ color: '#f4f4f5', fontWeight: 700 }}>
            {driverName} · ₹{ratePerKm}/km
          </span>
        </div>
        <div style={s.infoChip}>
          <span style={{ color: '#fde68a', fontSize: 11, fontWeight: 600 }}>LABOUR</span>
          <span style={{ color: selectedLabour ? '#f4f4f5' : '#52525b', fontWeight: 700 }}>
            {selectedLabour ? `${selectedLabour.name} · ₹${labourCost}/day` : 'None'}
          </span>
        </div>
      </div>

      {/* Breakdown */}
      <div style={s.breakdown}>
        <Row
          label="💰 Revenue Range"
          sub={`${Math.round(effectiveQty)}kg × ₹${minPrice}–₹${maxPrice}/kg (after spoilage)`}
          value={`+₹${revenueMin} → ₹${revenueMax}`}
          color="#4ade80"
        />
        <Row
          label="🚛 Transport Cost"
          sub={`${distanceKm}km × ₹${ratePerKm}/km`}
          value={`-₹${transportCost}`}
          color="#f87171"
        />
        <Row
          label="💪 Labour Cost"
          sub={selectedLabour ? 'Loading & unloading' : 'No labour hired'}
          value={labourCost > 0 ? `-₹${labourCost}` : '₹0'}
          color={labourCost > 0 ? '#f87171' : '#52525b'}
        />
        <Row
          label="🍅 Spoilage Loss"
          sub={`${spoilagePct.toFixed(1)}% at best dispatch time`}
          value={`-₹${spoilageLoss}`}
          color="#fbbf24"
        />
      </div>

      <div style={s.divider} />

      {/* Final Profit — BIG */}
      <div style={{
        ...s.profitBox,
        background: isProfit ? 'rgba(74,222,128,0.07)' : 'rgba(248,113,113,0.07)',
        border: `2px solid ${isProfit ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
      }}>
        <div style={s.profitLabel}>NET PROFIT RANGE</div>
        <div style={{ ...s.profitValue, color: isProfit ? '#4ade80' : '#f87171' }}>
          ₹{profitMin} → ₹{profitMax}
        </div>
        <div style={s.profitHint}>
          {isProfit
            ? `Mandi price range ₹${minPrice}–₹${maxPrice}/kg`
            : 'Consider best dispatch time to improve profit'}
        </div>
      </div>

      {/* Best time tip */}
      {extraSavings > 100 && (
        <div style={s.tipBox}>
          <span style={{ fontSize: 20 }}>💡</span>
          <div>
            <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: 13 }}>
              Dispatch at {bestWindow?.window}
            </div>
            <div style={{ color: '#4ade80', fontWeight: 800, fontSize: 15, marginTop: 2 }}>
              Save ₹{extraSavings} more vs dispatching now
            </div>
            <div style={{ color: '#52525b', fontSize: 12, marginTop: 2 }}>
              Spoilage drops to {spoilagePct.toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, sub, value, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', padding: '12px 0',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div>
        <div style={{ color: '#d4d4d8', fontSize: 14 }}>{label}</div>
        <div style={{ color: '#52525b', fontSize: 12, marginTop: 2 }}>{sub}</div>
      </div>
      <div style={{ color, fontWeight: 700, fontSize: 14 }}>{value}</div>
    </div>
  )
}

const s = {
  card: {
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 24, marginTop: 20,
    backdropFilter: 'blur(8px)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  },
  title: { fontSize: 17, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.02em' },
  subtitle: { fontSize: 12, color: '#52525b', marginTop: 3 },
  closeBtn: { background: 'none', border: 'none', color: '#52525b', cursor: 'pointer', fontSize: 18 },
  infoRow: { display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' },
  infoChip: {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, padding: '10px 14px',
    display: 'flex', flexDirection: 'column', gap: 4, flex: 1,
  },
  breakdown: { marginBottom: 20 },
  divider: { borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 },
  profitBox: { borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 16 },
  profitLabel: {
    fontSize: 11, color: '#52525b', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8,
  },
  profitValue: { fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em' },
  profitHint: { fontSize: 13, color: '#52525b', marginTop: 6 },
  tipBox: {
    background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)',
    borderRadius: 12, padding: '14px 16px',
    display: 'flex', alignItems: 'center', gap: 12,
  },
}