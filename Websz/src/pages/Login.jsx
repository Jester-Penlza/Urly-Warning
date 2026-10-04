import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import BackgroundPaths from '../components/ui/background-paths'
import { configManagerInstance } from '../config/useConfig'
import './Login.css'

const AUTH_TOKEN_KEY = 'urly_auth_token'
const AUTH_EMAIL_KEY = 'urly_auth_email'
const AUTH_EXPIRES_KEY = 'urly_auth_expires_at'

function getApiBaseUrl() {
  const endpoint = configManagerInstance.get('api.endpoint') || 'http://localhost:5050/api/scan'
  return endpoint.replace(/\/api\/scan\/?$/, '')
}

function EyeIcon({ closed = false }) {
  if (closed) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 3l18 18" />
        <path d="M10.6 10.6a2.5 2.5 0 103.54 3.54" />
        <path d="M9.88 5.08A10.94 10.94 0 0112 5c5.5 0 9.7 4.1 11 7-0.76 1.63-2.06 3.49-3.86 5.03" />
        <path d="M6.1 6.1C3.74 7.65 2.06 9.78 1 12c1.3 2.9 5.5 7 11 7 1.15 0 2.23-.12 3.24-.34" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
      <path d="M12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7Z" />
    </svg>
  )
}

export default function Login() {
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [form, setForm] = useState({ email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const body = document.body
    body.classList.add('theme-dark', 'login-route')

    return () => {
      body.classList.remove('theme-dark', 'login-route')
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok || !data?.token) {
        const message = data?.error || 'Login failed. Please check your credentials.'
        throw new Error(message)
      }

      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem(AUTH_TOKEN_KEY, data.token)
      storage.setItem(AUTH_EMAIL_KEY, data.user?.email || form.email.trim())
      storage.setItem(AUTH_EXPIRES_KEY, data.expiresAt || '')

      if (rememberMe) {
        sessionStorage.removeItem(AUTH_TOKEN_KEY)
        sessionStorage.removeItem(AUTH_EMAIL_KEY)
        sessionStorage.removeItem(AUTH_EXPIRES_KEY)
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        localStorage.removeItem(AUTH_EMAIL_KEY)
        localStorage.removeItem(AUTH_EXPIRES_KEY)
      }

      window.__urlyAuthToken = data.token
      window.__urlyIsLoggedIn = true
      window.dispatchEvent(new Event('urly-auth-changed'))

      navigate('/home')
    } catch (submitError) {
      setError(submitError.message || 'Login failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <BackgroundPaths title="" subtitle="" />

      <div className="login-page__shell">
        <section className="login-layout">
          <motion.div
            className="login-marketing"
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <span className="login-marketing__eyebrow">URLy Warning</span>
            <h2>Secure Access for Users.</h2>
            <p>
              Log in to review link checks, history, and safety recommendations in a focused,
              responsive workspace.
            </p>

            <div className="login-points">
              <div className="login-point">
                <strong>Fast sign-in</strong>
                <span>Clean login flow with zero clutter.</span>
              </div>
              <div className="login-point">
                <strong>Protected access</strong>
                <span>Built for trusted dashboard entry.</span>
              </div>
              <div className="login-point">
                <strong>Responsive UI</strong>
                <span>Works smoothly on mobile and desktop.</span>
              </div>
            </div>
          </motion.div>

          <motion.section
            className="login-card"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <div className="login-card__header">
              <span className="login-card__badge">Protected access</span>
              <h2>Login</h2>
              <p>Use your email and password to access the system.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>

              <div className="login-field">
                <label htmlFor="login-password">Password</label>
                <div className="login-password">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="login-password__toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <EyeIcon closed={showPassword} />
                  </button>
                </div>
              </div>

              <div className="login-form__row">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span>Remember me</span>
                </label>

                <a className="login-forgot" href="#/contact">
                  Forgot password?
                </a>
              </div>

              <button className="login-submit" type="submit">
                {isSubmitting ? 'Signing in...' : 'Login'}
              </button>

              {error ? <p className="login-card__footer">{error}</p> : null}

              <p className="login-card__footer">
                No account yet? <Link to="/register">Register</Link>
              </p>

              <p className="login-card__footer">
                Need help signing in? <a href="#/contact">Contact support</a>
              </p>
            </form>
          </motion.section>
        </section>
      </div>
    </main>
  )
}