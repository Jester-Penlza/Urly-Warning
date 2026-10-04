import React, { useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import Services from './pages/Services'
import Contact from './pages/Contact'
import ConfigButton from './components/ConfigButton'
import ConfigPanel from './components/ConfigPanel'
import './App.css'

export default function App(){
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<Home/>} />
        <Route path="/about" element={<About/>} />
        <Route path="/services" element={<Services/>} />
        <Route path="/contact" element={<Contact/>} />
        <Route path="/login" element={<Navigate to="/home" replace />} />
        <Route path="/register" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>

      {!isAuthRoute && (
        <>
          {/* Configuration System - Available on all pages */}
          <ConfigButton onClick={() => setIsConfigOpen(true)} />
          <ConfigPanel isOpen={isConfigOpen} onClose={() => setIsConfigOpen(false)} />
        </>
      )}
    </>
  )
}
