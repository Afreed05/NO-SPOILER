// ============================================================
// ml.js — ML Route (UPDATED — dispatch schedule support added)
// ============================================================

const express = require('express')
const router = express.Router()
const axios = require('axios')
require('dotenv').config()

const { getWeather } = require('../utils/weather')
const { getRoute } = require('../utils/routing')

// ----------------------------------------
// Helper: Temperature adjustment by hour of day
// Same pattern Flask uses internally for 8-window simulation
// 6AM = coolest, 12PM = hottest
// ----------------------------------------
function getTempAdjustmentForHour(hour) {
  if (hour >= 4 && hour < 7)   return -5   // Pre-dawn — coolest
  if (hour >= 7 && hour < 10)  return -2   // Morning
  if (hour >= 10 && hour < 13) return +5   // Noon — hottest
  if (hour >= 13 && hour < 16) return +3   // Afternoon
  if (hour >= 16 && hour < 19) return +1   // Evening
  if (hour >= 19 && hour < 22) return -1   // Night
  return -3                                 // Late night / early morning
}

// ----------------------------------------
// Helper: Human-readable time context
// ----------------------------------------
function getTimeContext(hour) {
  if (hour >= 5 && hour < 10)  return 'Early Morning — cool, ideal for perishables'
  if (hour >= 10 && hour < 14) return 'Midday — peak heat, high risk'
  if (hour >= 14 && hour < 18) return 'Afternoon — hot, avoid for long trips'
  if (hour >= 18 && hour < 21) return 'Evening — moderate temperature'
  return 'Night / Early Morning — cool, good for dispatch'
}

// ----------------------------------------
// POST /api/ml/analyze
// Input: crop, quantity, pickup, destination,
//        transport_type, price_per_kg,
//        dispatch_date (optional), dispatch_time (optional)
// Output: ML prediction + schedule analysis if date/time given
// ----------------------------------------
router.post('/analyze', async (req, res) => {
  try {
    const {
  crop,
  quantity,
  pickup,
  destination,
  transport_type = 'open',
  price_per_kg = 20,
  dispatch_date = null,
  dispatch_time = null
} = req.body

    if (!crop || !quantity || !pickup || !destination) {
      return res.status(400).json({ error: 'crop, quantity, pickup, destination required' })
    }

    console.log(`Analyzing: ${crop} ${quantity}kg from ${pickup} to ${destination}`)
    if (dispatch_date && dispatch_time) {
      console.log(`Scheduled dispatch: ${dispatch_date} at ${dispatch_time}`)
    }

    // ── Step 1: Real weather for pickup city ──
    const weather = await getWeather(pickup)
    console.log(`Weather at ${pickup}: ${weather.temperature}°C, ${weather.humidity}% humidity`)

    // ── Step 2: Route distance + travel time ──
    const route = await getRoute(pickup, destination)
    console.log(`Route: ${route.distance_km}km, ${route.travel_hours} hours`)

    // ── Step 3: Calculate scheduled temperature ──
    // If user selected a specific dispatch time, estimate temperature at that hour
    // If not selected, use current temperature directly
    let scheduledTemperature = weather.temperature
    let scheduledHour = new Date().getHours()
    let timeContext = 'Current time'
    let isScheduled = false

    if (dispatch_date && dispatch_time) {
      isScheduled = true
      scheduledHour = parseInt(dispatch_time.split(':')[0])  // "06:30" → 6
      const currentHour = new Date().getHours()

      // How much hotter/cooler will it be at selected hour vs right now?
      const selectedAdj = getTempAdjustmentForHour(scheduledHour)
      const currentAdj  = getTempAdjustmentForHour(currentHour)
      const tempDelta   = selectedAdj - currentAdj

      scheduledTemperature = Math.round((weather.temperature + tempDelta) * 10) / 10
      timeContext = getTimeContext(scheduledHour)

      console.log(`Temp adjustment: ${weather.temperature}°C + ${tempDelta} = ${scheduledTemperature}°C at ${scheduledHour}:00`)
    }

    // ── Step 4: Call Flask ML with scheduled temperature ──
    const mlResponse = await axios.post(
  `${process.env.FLASK_ML_URL}/optimize`,
  {
    crop: crop,
    travel_hours: route.travel_hours,
    temperature: weather.temperature,
    humidity: weather.humidity,
    transport_type: transport_type,
    quantity_kg: Number(quantity),
    price_per_kg: Number(price_per_kg),
    dispatch_date: dispatch_date,
    dispatch_time: dispatch_time
  }
)

    const mlData = mlResponse.data

    // ── Step 5: Build schedule analysis if user picked a time ──
    // Flask gives all_windows — find the one closest to selected hour
    let scheduleResult = null

    if (isScheduled && mlData.all_windows && mlData.all_windows.length > 0) {
      const currentHour = new Date().getHours()

      // How many hours from now is the selected dispatch time?
      let hoursFromNow = scheduledHour - currentHour
      if (hoursFromNow < 0) hoursFromNow += 24  // selected time is tomorrow

      // Flask windows are at 0h, 6h, 12h, 18h, 24h, 30h, 36h, 42h from now
      const windowOffsets = [0, 6, 12, 18, 24, 30, 36, 42]
      let nearestWindow = mlData.all_windows[0]
      let minDiff = Infinity

      mlData.all_windows.forEach((w, i) => {
        const diff = Math.abs(windowOffsets[i] - hoursFromNow)
        if (diff < minDiff) {
          minDiff = diff
          nearestWindow = w
        }
      })

      scheduleResult = {
        date:                    dispatch_date,
        time:                    dispatch_time,
        hour:                    scheduledHour,
        time_context:            timeContext,
        temperature_at_dispatch: scheduledTemperature,
        selected_window: {
          spoilage_percent:        nearestWindow.spoilage_percent,
          loss_kg:                 nearestWindow.loss_kg,
          loss_rupees:             nearestWindow.loss_rupees,
          risk_level:              nearestWindow.risk_level,
          temperature_at_dispatch: scheduledTemperature,
          time_context:            timeContext
        }
      }
    }

    // ── Step 6: Return everything to React ──
    res.json({
      success: true,
      crop,
      quantity,
      pickup,
      destination,
      weather: {
        temperature:           weather.temperature,        // real current temp
        scheduled_temperature: scheduledTemperature,       // temp at selected time
        humidity:              weather.humidity,
        description:           weather.description
      },
      route: {
        distance_km:    route.distance_km,
        travel_hours:   route.travel_hours,
        geometry:       route.geometry,
        originCoords:   route.originCoords,
        destCoords:     route.destCoords,
      },
      prediction: {
        best_window:    mlData.best_window,
        all_windows:    mlData.all_windows,
        savings_rupees: mlData.savings_rupees,
        recommendation: mlData.recommendation
      },
      schedule: scheduleResult   // null if no date/time selected
    })

  } catch (error) {
    console.error('ML analyze error:', error.message)
    res.status(500).json({ error: 'Analysis failed', message: error.message })
  }
})

module.exports = router