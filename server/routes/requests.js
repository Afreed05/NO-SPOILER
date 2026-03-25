const express = require('express')
const router = express.Router()

// Placeholder - Firebase direct se handle karenge frontend mein
router.get('/test', (req, res) => {
  res.json({ message: "Requests route working!" })
})

module.exports = router