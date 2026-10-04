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

export default function Register() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '' })
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

    const email = form.email.trim().toLowerCase()
    const password = form.password

    if (!email || !password) {
      setError('Email and password are required.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const registerResponse = await fetch(`${getApiBaseUrl()}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const registerData = await registerResponse.json().catch(() => ({}))
      if (!registerResponse.ok) {
        throw new Error(registerData?.error || 'Unable to create account.')
      }

      // Auto-login immediately after successful registration.
      const loginResponse = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const loginData = await loginResponse.json().catch(() => ({}))
      if (!loginResponse.ok || !loginData?.token) {
        throw new Error(loginData?.error || 'Account created, but automatic login failed.')
      }

      const storage = rememberMe ? localStorage : sessionStorage
      storage.setItem(AUTH_TOKEN_KEY, loginData.token)
      storage.setItem(AUTH_EMAIL_KEY, loginData.user?.email || email)
      storage.setItem(AUTH_EXPIRES_KEY, loginData.expiresAt || '')

      if (rememberMe) {
        sessionStorage.removeItem(AUTH_TOKEN_KEY)
        sessionStorage.removeItem(AUTH_EMAIL_KEY)
        sessionStorage.removeItem(AUTH_EXPIRES_KEY)
      } else {
        localStorage.removeItem(AUTH_TOKEN_KEY)
        localStorage.removeItem(AUTH_EMAIL_KEY)
        localStorage.removeItem(AUTH_EXPIRES_KEY)
      }

      window.__urlyAuthToken = loginData.token
      window.__urlyIsLoggedIn = true
      window.dispatchEvent(new Event('urly-auth-changed'))

      navigate('/home')
    } catch (submitError) {
      setError(submitError.message || 'Unable to create account. Please try again.')
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
            <h2>Create Your Account.</h2>
            <p>
              Register to start scanning URLs, track history, and keep your account session
              securely synced with the backend database.
            </p>

            <div className="login-points">
              <div className="login-point">
                <strong>Database-backed auth</strong>
                <span>Your account is stored in your configured Supabase database.</span>
              </div>
              <div className="login-point">
                <strong>Unified sessions</strong>
                <span>Same auth flow for website and Flutter app.</span>
              </div>
              <div className="login-point">
                <strong>Instant access</strong>
                <span>Automatic login after successful registration.</span>
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
              <span className="login-card__badge">Create account</span>
              <h2>Register</h2>
              <p>Use your email and a strong password to create an account.</p>
            </div>

            <form className="login-form" onSubmit={handleSubmit}>
              <div className="login-field">
                <label htmlFor="register-email">Email</label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>

              <div className="login-field">
                <label htmlFor="register-password">Password</label>
                <div className="login-password">
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
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

              <div className="login-field">
                <label htmlFor="register-confirm-password">Confirm password</label>
                <div className="login-password">
                  <input
                    id="register-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Re-enter password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className="login-password__toggle"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    <EyeIcon closed={showConfirmPassword} />
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

                <Link className="login-forgot" to="/login">
                  Already have an account?
                </Link>
              </div>

              <button className="login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </button>

              {error ? <p className="login-card__footer">{error}</p> : null}

              <p className="login-card__footer">
                Already registered? <Link to="/login">Go to login</Link>
              </p>
            </form>
          </motion.section>
        </section>
      </div>
    </main>
  )
}
