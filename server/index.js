// ============================================================
// index.js — Node Express Server Entry Point
// Saare routes yahan register hote hain
// Port 5000 pe chalta hai
// ============================================================

const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()

// ----------------------------------------
// Middleware
// cors — React (3000/5173) se requests allow karo
// express.json — JSON body parse karo
// ----------------------------------------
app.use(cors())
app.use(express.json())

// ----------------------------------------
// Routes register karo
// ----------------------------------------
const requestsRouter = require('./routes/requests')
const mlRouter = require('./routes/ml')
const mandiRouter = require('./routes/mandi')

app.use('/api/requests', requestsRouter)
app.use('/api/ml', mlRouter)
app.use('/api/mandi', mandiRouter)


// ----------------------------------------
// Health check route
// ----------------------------------------
app.get('/', (req, res) => {
  res.json({ message: "Node Server is running!" })
})

// ----------------------------------------
// Server start karo
// ----------------------------------------
const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Node server running on port ${PORT}`)
})
