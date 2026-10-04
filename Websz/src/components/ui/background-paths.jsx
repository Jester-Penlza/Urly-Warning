import React from 'react'
import { motion } from 'framer-motion'
import './background-paths.css'

export default function BackgroundPaths({ title = 'Welcome Back', subtitle = 'Secure access to your dashboard' }) {
  return (
    <div className="background-paths" aria-hidden="true">
      <div className="background-paths__glow background-paths__glow--one" />
      <div className="background-paths__glow background-paths__glow--two" />
      <div className="background-paths__grid" />

      <svg className="background-paths__svg" viewBox="0 0 1440 960" preserveAspectRatio="none">
        <motion.path
          d="M-80 700 C 180 540, 320 540, 540 640 S 960 820, 1210 640 S 1590 360, 1540 240"
          pathLength="1"
          strokeDasharray="1 16"
          animate={{ strokeDashoffset: [0, -28] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        />
        <motion.path
          d="M-120 260 C 120 160, 300 140, 520 210 S 900 370, 1160 270 S 1490 130, 1560 210"
          pathLength="1"
          strokeDasharray="1 20"
          animate={{ strokeDashoffset: [0, 30] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
        />
        <motion.path
          d="M-60 890 C 160 760, 360 740, 560 820 S 980 1030, 1220 860 S 1500 610, 1580 680"
          pathLength="1"
          strokeDasharray="1 18"
          animate={{ strokeDashoffset: [0, -24] }}
          transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
        />
      </svg>

      {title ? (
        <motion.div
          className="background-paths__panel"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          <span className="background-paths__eyebrow">URLy Warning</span>
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </motion.div>
      ) : null}
    </div>
  )
}