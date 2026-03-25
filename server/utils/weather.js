// ============================================================
// weather.js — OpenWeatherMap API Utility
// Ye function city name leke real time temperature
// aur humidity return karta hai
// ============================================================

const axios = require('axios')
require('dotenv').config()

// ----------------------------------------
// Main function — city ka weather fetch karo
// cityName: string — "Kolar", "Davanagere" etc.
// Returns: { temperature, humidity, description }
// ----------------------------------------
const getWeather = async (cityName) => {
  try {
    // OpenWeatherMap API call
    // units=metric matlab temperature Celsius mein aayega
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          q: `${cityName},IN`,        // IN = India
          appid: process.env.OPENWEATHER_API_KEY,
          units: 'metric'             // Celsius
        }
      }
    )

    const data = response.data

    // Sirf zaroori cheezein return karo
    return {
      temperature: data.main.temp,           // Current temp in Celsius
      humidity: data.main.humidity,          // Humidity in %
      feels_like: data.main.feels_like,      // Feels like temp
      description: data.weather[0].description, // "clear sky" etc.
      city: data.name
    }

  } catch (error) {
    // Agar city nahi mili ya API fail hua
    // toh Karnataka ka average default use karo
    console.error(`Weather fetch failed for ${cityName}:`, error.message)
    return {
      temperature: 30,      // Karnataka average
      humidity: 65,
      feels_like: 32,
      description: 'default fallback',
      city: cityName
    }
  }
}

module.exports = { getWeather }