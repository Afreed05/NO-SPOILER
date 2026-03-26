// ============================================================
// routing.js — OSRM (Free, No API Key needed)
// Replaces OpenRouteService completely
// ============================================================

const axios = require('axios')

const CITY_COORDS = {
  'Kolar': [13.1357, 78.1294],
  'Davanagere': [14.4644, 75.9218],
  'Davangere': [14.4644, 75.9218],
  'Tumkur': [13.3409, 77.1010],
  'Hassan': [13.0068, 76.0996],
  'Mandya': [12.5218, 76.8951],
  'Mysuru': [12.2958, 76.6394],
  'Mysore': [12.2958, 76.6394],
  'Hubli': [15.3647, 75.1240],
  'Bengaluru': [12.9716, 77.5946],
  'Bangalore': [12.9716, 77.5946],
  'Shivamogga': [13.9299, 75.5681],
  'Shimoga': [13.9299, 75.5681],
  'Chitradurga': [14.2251, 76.3980],
  'Harihar': [14.5124, 75.8130],
  'Raichur': [16.2120, 77.3566],
  'Bellary': [15.1394, 76.9214],
  'Bidar': [17.9104, 77.5199],
  'Gadag': [15.4166, 75.6333],
  'Dharwad': [15.4589, 75.0078],
  'Belagavi': [15.8497, 74.4977],
  'Hospet': [15.2689, 76.3909],
  'Udupi': [13.3409, 74.7421],
  'Mangaluru': [12.9141, 74.8560],
  'Mangalore': [12.9141, 74.8560],
  'Chamarajanagar': [11.9261, 76.9437],
  'Chikkamagaluru': [13.3161, 75.7720],
  'Kodagu': [12.3375, 75.8069],
  'Madikeri': [12.4244, 75.7382],
  'Hassan': [13.0068, 76.0996],
  'Holenarasipur': [12.7833, 76.2333],
  'Arsikere': [13.3156, 76.2547],
  'Tiptur': [13.2641, 76.4780],
  'Srirangapatna': [12.4167, 76.6833],
  'Maddur': [12.5833, 77.0500],
  'Malavalli': [12.3833, 77.0500],
  'Pandavapura': [12.4833, 76.6833],
  'Nagamangala': [12.8194, 76.7517],
  'Bengaluru APMC': [12.9716, 77.5946],
  'Mysuru Mandi': [12.2958, 76.6394],
  'Hubli Mandi': [15.3647, 75.1240],
  'Mangaluru Mandi': [12.9141, 74.8560],
  'Tumkur Mandi': [13.3409, 77.1010],
}

// ----------------------------------------
// Find nearest known city for unknown location
// Returns coordinates with small random offset
// ----------------------------------------
const findNearestCity = (locationName) => {
  const lower = locationName.toLowerCase()

  // Check partial match
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (lower.includes(city.toLowerCase()) ||
        city.toLowerCase().includes(lower)) {
      return coords
    }
  }

  // Karnataka region hints
  if (lower.includes('mysur') || lower.includes('mysore') ||
      lower.includes('mandya') || lower.includes('pandav') ||
      lower.includes('melukot') || lower.includes('nagamang')) {
    const base = CITY_COORDS['Mandya']
    return [
      base[0] + (Math.random() - 0.5) * 0.3,
      base[1] + (Math.random() - 0.5) * 0.3
    ]
  }

  if (lower.includes('kolar') || lower.includes('bangarp') ||
      lower.includes('srinivaspur') || lower.includes('malur')) {
    const base = CITY_COORDS['Kolar']
    return [
      base[0] + (Math.random() - 0.5) * 0.3,
      base[1] + (Math.random() - 0.5) * 0.3
    ]
  }

  if (lower.includes('hassan') || lower.includes('arsik') ||
      lower.includes('saklesh') || lower.includes('belur')) {
    const base = CITY_COORDS['Hassan']
    return [
      base[0] + (Math.random() - 0.5) * 0.3,
      base[1] + (Math.random() - 0.5) * 0.3
    ]
  }

  // Default: Karnataka center with random offset
  console.log(`Unknown location: ${locationName} — using Karnataka center fallback`)
  return [
    13.5 + (Math.random() - 0.5) * 2,
    76.5 + (Math.random() - 0.5) * 2
  ]
}

const getCoords = (locationName) => {
  if (CITY_COORDS[locationName]) return CITY_COORDS[locationName]
  return findNearestCity(locationName)
}

// ----------------------------------------
// Main function — OSRM routing
// No API key needed — completely free
// ----------------------------------------
const getRoute = async (origin, destination) => {
  try {
    const [originLat, originLng]   = getCoords(origin)
    const [destLat,   destLng]     = getCoords(destination)

    // OSRM format: lng,lat (opposite of leaflet)
    const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`

    const response = await axios.get(url, { timeout: 8000 })

    if (response.data.code !== 'Ok' || !response.data.routes?.[0]) {
      throw new Error('OSRM returned no route')
    }

    const route          = response.data.routes[0]
    const distance_km    = Math.round(route.distance / 1000)
    const travel_hours   = Math.round((route.duration / 3600) * 10) / 10
    const duration_minutes = Math.round(route.duration / 60)

    // GeoJSON coordinates — [lng, lat] pairs
    // Convert to leaflet format [lat, lng] for frontend
    const geometry = route.geometry.coordinates.map(([lng, lat]) => [lat, lng])

    return {
      distance_km,
      travel_hours,
      duration_minutes,
      origin,
      destination,
      geometry, // array of [lat, lng] for Leaflet Polyline
      originCoords:  [originLat, originLng],
      destCoords:    [destLat,   destLng],
    }

  } catch (error) {
    console.error('OSRM routing failed:', error.message)

    // Fallback: straight line with estimated distance
    const [originLat, originLng] = getCoords(origin)
    const [destLat,   destLng]   = getCoords(destination)

    // Haversine distance
    const R    = 6371
    const dLat = (destLat - originLat) * Math.PI / 180
    const dLng = (destLng - originLng) * Math.PI / 180
    const a    = Math.sin(dLat/2)**2 +
                 Math.cos(originLat * Math.PI/180) *
                 Math.cos(destLat * Math.PI/180) *
                 Math.sin(dLng/2)**2
    const distance_km    = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1.3)
    const travel_hours   = Math.round((distance_km / 40) * 10) / 10

    return {
      distance_km,
      travel_hours,
      duration_minutes: travel_hours * 60,
      origin,
      destination,
      geometry: [[originLat, originLng], [destLat, destLng]],
      originCoords: [originLat, originLng],
      destCoords:   [destLat, destLng],
    }
  }
}

module.exports = { getRoute, getCoords }