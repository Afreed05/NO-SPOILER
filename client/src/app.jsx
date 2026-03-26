import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { auth, db } from './firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import FarmerDashboard from './pages/FarmerDashboard'
import ProviderDashboard from './pages/ProviderDashboard'
import LabourDashboard from './pages/LabourDashboard'

function App() {
  const [user, setUser]       = useState(null)
  const [role, setRole]       = useState(null)
  const [loading, setLoading] = useState(true)  // jab tak ye true hai, kuch render mat karo

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const docSnap = await getDoc(doc(db, 'users', currentUser.uid))
          if (docSnap.exists()) {
            setRole(docSnap.data().role)
          } else {
            setRole(null)
          }
        } catch (err) {
          console.error('Role fetch failed:', err)
          setRole(null)
        }
        setUser(currentUser)
      } else {
        setUser(null)
        setRole(null)
      }
      setLoading(false)  // role aane ke BAAD loading false karo
    })
    return () => unsubscribe()
  }, [])

  // Jab tak user + role dono load nahi hote — blank screen dikhao
  // Navigate tab fire hoga jab role confirm ho chuka hoga
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#09090b',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#52525b', fontSize: 14, fontFamily: 'Inter, sans-serif'
    }}>
      Loading...
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* Login/Signup — agar already logged in hai toh redirect */}
        <Route path="/login"  element={
          !user ? <Login /> :
          role === 'farmer'   ? <Navigate to="/farmer"   replace /> :
          role === 'provider' ? <Navigate to="/provider" replace /> :
          role === 'labour'   ? <Navigate to="/labour" replace /> :
          <Login />
        } />
        <Route path="/signup" element={
          !user ? <Signup /> :
          role === 'farmer'   ? <Navigate to="/farmer"   replace /> :
          role === 'provider' ? <Navigate to="/provider" replace /> :
          role === 'labour'   ? <Navigate to="/labour" replace /> :
          <Signup />
        } />

        {/* Protected routes — role confirm hone ke baad hi access */}
        <Route path="/farmer" element={
          user && role === 'farmer'
            ? <FarmerDashboard />
            : <Navigate to="/login" replace />
        } />
        <Route path="/provider" element={
          user && (role === 'provider' || role === 'labour')
            ? <ProviderDashboard />
            : <Navigate to="/login" replace />
        } />
        <Route path="/labour" element={
          user && role === 'labour'
            ? <LabourDashboard />
            : <Navigate to="/login" replace />
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App