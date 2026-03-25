// ============================================================
// routing.js — OpenRouteService API Utility
// Ye function origin aur destination city leke
// actual road distance aur travel time return karta hai
// ============================================================

const axios = require('axios')
require('dotenv').config()

// ----------------------------------------
// Karnataka cities ke coordinates
// OpenRouteService ko lat/lng chahiye city name nahi
// ----------------------------------------
const CITY_COORDS = {
  'Kolar': [78.1294, 13.1357],
  'Davanagere': [75.9218, 14.4644],
  'Tumkur': [77.1010, 13.3409],
  'Hassan': [76.0996, 13.0068],
  'Mandya': [76.8951, 12.5218],
  'Mysuru': [76.6394, 12.2958],
  'Hubli': [75.1240, 15.3647],
  'Bengaluru': [77.5946, 12.9716],
  'Shivamogga': [75.5681, 13.9299],
  'Chitradurga': [76.3980, 14.2251],
  'Bengaluru APMC': [77.5946, 12.9716],
  'Mysuru Mandi': [76.6394, 12.2958],
  'Hubli Mandi': [75.1240, 15.3647],
  'Mangaluru Mandi': [74.8560, 12.9141],
  'Tumkur Mandi': [77.1010, 13.3409]
}

// ----------------------------------------
// Helper — city name se coordinates nikalo
// Agar exact match nahi mila toh partial match try karo
// ----------------------------------------
const getCoords = (locationName) => {
  // Exact match try karo pehle
  if (CITY_COORDS[locationName]) {
    return CITY_COORDS[locationName]
  }

  // Partial match try karo
  // Example: "Kolar village" → match "Kolar"
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (locationName.toLowerCase().includes(city.toLowerCase())) {
      return coords
    }
  }

  // Default: Bengaluru
  return [77.5946, 12.9716]
}

// ----------------------------------------
// Main function — route calculate karo
// origin: string — pickup location
// destination: string — destination market
// Returns: { distance_km, travel_hours, duration_minutes }
// ----------------------------------------
const getRoute = async (origin, destination) => {
  try {
    const originCoords = getCoords(origin)
    const destCoords = getCoords(destination)

    // OpenRouteService directions API
    // coordinates format: [[lng, lat], [lng, lat]]
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car',
      {
        coordinates: [originCoords, destCoords]
      },
      {
        headers: {
          'Authorization': process.env.OPENROUTE_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    const summary = response.data.routes[0].summary

    // distance meters → kilometers
    const distance_km = Math.round(summary.distance / 1000)

    // duration seconds → hours
    const travel_hours = Math.round((summary.duration / 3600) * 10) / 10

    // duration seconds → minutes
    const duration_minutes = Math.round(summary.duration / 60)

    return {
      distance_km,
      travel_hours,
      duration_minutes,
      origin,
      destination
    }

  } catch (error) {
    // API fail hua toh distance se estimate karo
    console.error(`Routing failed for ${origin} → ${destination}:`, error.message)

    // Fallback: average Karnataka distance estimate
    return {
      distance_km: 150,
      travel_hours: 3.5,
      duration_minutes: 210,
      origin,
      destination
    }
  }
}

module.exports = { getRoute }