// ============================================================
// mandi.js — Mandi Price Route
// Crop ke hisaab se Karnataka mandis ka price return karta hai
// Data: Agmarknet historical data pe based realistic prices
// ============================================================

const express = require('express')
const router = express.Router()

// ----------------------------------------
// Mandi price data — Agmarknet historical data pe based
// Prices realistic hain Karnataka ke liye
// Unit: ₹ per quintal (100kg)
// ----------------------------------------
const mandiData = {
  'Tomato': [
    { mandi: 'Bengaluru APMC', price: 1840, trend: 'up' },
    { mandi: 'Mysuru Mandi', price: 2100, trend: 'up' },
    { mandi: 'Hubli Mandi', price: 1650, trend: 'down' },
    { mandi: 'Tumkur Mandi', price: 1720, trend: 'stable' },
    { mandi: 'Mangaluru Mandi', price: 1950, trend: 'up' },
  ],
  'Onion': [
    { mandi: 'Bengaluru APMC', price: 1200, trend: 'stable' },
    { mandi: 'Mysuru Mandi', price: 1350, trend: 'up' },
    { mandi: 'Hubli Mandi', price: 1100, trend: 'down' },
    { mandi: 'Tumkur Mandi', price: 1180, trend: 'stable' },
    { mandi: 'Mangaluru Mandi', price: 1420, trend: 'up' },
  ],
  'Potato': [
    { mandi: 'Bengaluru APMC', price: 1500, trend: 'stable' },
    { mandi: 'Mysuru Mandi', price: 1620, trend: 'up' },
    { mandi: 'Hubli Mandi', price: 1380, trend: 'down' },
    { mandi: 'Tumkur Mandi', price: 1450, trend: 'stable' },
    { mandi: 'Mangaluru Mandi', price: 1680, trend: 'up' },
  ],
  'Mango': [
    { mandi: 'Bengaluru APMC', price: 4500, trend: 'up' },
    { mandi: 'Mysuru Mandi', price: 5000, trend: 'up' },
    { mandi: 'Hubli Mandi', price: 4200, trend: 'stable' },
    { mandi: 'Tumkur Mandi', price: 4350, trend: 'stable' },
    { mandi: 'Mangaluru Mandi', price: 5200, trend: 'up' },
  ],
  'Banana': [
    { mandi: 'Bengaluru APMC', price: 1800, trend: 'stable' },
    { mandi: 'Mysuru Mandi', price: 2000, trend: 'up' },
    { mandi: 'Hubli Mandi', price: 1650, trend: 'down' },
    { mandi: 'Tumkur Mandi', price: 1750, trend: 'stable' },
    { mandi: 'Mangaluru Mandi', price: 2100, trend: 'up' },
  ],
  'Grapes': [
    { mandi: 'Bengaluru APMC', price: 6000, trend: 'up' },
    { mandi: 'Mysuru Mandi', price: 6500, trend: 'up' },
    { mandi: 'Hubli Mandi', price: 5500, trend: 'stable' },
    { mandi: 'Tumkur Mandi', price: 5800, trend: 'stable' },
    { mandi: 'Mangaluru Mandi', price: 6800, trend: 'up' },
  ],
  'Wheat': [
    { mandi: 'Bengaluru APMC', price: 2200, trend: 'stable' },
    { mandi: 'Mysuru Mandi', price: 2350, trend: 'stable' },
    { mandi: 'Hubli Mandi', price: 2100, trend: 'down' },
    { mandi: 'Tumkur Mandi', price: 2180, trend: 'stable' },
    { mandi: 'Mangaluru Mandi', price: 2400, trend: 'up' },
  ],
  'Rice': [
    { mandi: 'Bengaluru APMC', price: 3200, trend: 'stable' },
    { mandi: 'Mysuru Mandi', price: 3400, trend: 'up' },
    { mandi: 'Hubli Mandi', price: 3000, trend: 'stable' },
    { mandi: 'Tumkur Mandi', price: 3100, trend: 'stable' },
    { mandi: 'Mangaluru Mandi', price: 3500, trend: 'up' },
  ],
}

// ----------------------------------------
// GET /api/mandi/:crop
// crop name URL mein aata hai
// Returns: sorted mandi prices — best price pehle
// ----------------------------------------
router.get('/:crop', (req, res) => {
  const crop = req.params.crop

  // Crop data hai kya check karo
  if (!mandiData[crop]) {
    return res.status(404).json({
      error: `No data found for crop: ${crop}`
    })
  }

  const prices = mandiData[crop]

  // Best price pehle sort karo
  const sorted = [...prices].sort((a, b) => b.price - a.price)

  // Best mandi mark karo
  sorted[0].is_best = true

  // Price per kg bhi calculate karo (quintal = 100kg)
  const withPerKg = sorted.map(item => ({
    ...item,
    price_per_kg: Math.round(item.price / 100)
  }))

  res.json({
    crop,
    prices: withPerKg,
    best_mandi: withPerKg[0].mandi,
    best_price_per_kg: withPerKg[0].price_per_kg,
    data_source: 'Agmarknet historical data'
  })
})

module.exports = router