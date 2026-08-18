import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BrandLogo } from './BrandLogo'

export function LoginPage() {
  const { login, signup } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setIsLoading(true)

    try {
      if (isSignUp) {
        await signup(email, password, fullName)
        setSuccessMessage('Registration successful! Your account is pending admin approval.')
        setIsLoading(false)
      } else {
        await login(email, password)
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Operation failed. Please check your credentials.')
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Responsive Injection Style to handle Mobile Stacking safely */}
      <style>{`
        .login-grid-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        @media (max-width: 850px) {
          .login-grid-container {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 20%, #1e293b 0%, #0f172a 60%, #020617 100%)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        padding: '16px',
        boxSizing: 'border-box'
      }}>
        
        {/* Container Card */}
        <div className="login-grid-container" style={{
          width: '100%',
          maxWidth: '960px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(6, 182, 212, 0.1)',
          overflow: 'hidden'
        }}>

          {/* Left Side: Brand Identity Banner */}
          <div style={{
            padding: '36px 32px',
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
            borderRight: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <BrandLogo size={48} showWordmark />
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', lineHeight: '1.2', marginBottom: '12px' }}>
                Enterprise Operations Portal
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.6' }}>
                Secure access for engineering, document vaults, inventory management, and technical workflows.
              </p>
            </div>

            <div style={{
              marginTop: '24px',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#64748b'
            }}>
              🔒 Controlled System • MWT-SOP-2026 Compliant
            </div>
          </div>

          {/* Right Side: Form Area (Sign In / Register) */}
          <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#fff', margin: '0 0 4px 0' }}>
                {isSignUp ? 'Staff Registration' : 'System Sign In'}
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                {isSignUp ? 'Register using your @mowatek.com corporate email' : 'Enter your corporate credentials to continue'}
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isSignUp && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '6px' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.12)',
                      background: 'rgba(0,0,0,0.3)',
                      color: '#fff',
                      fontSize: '14px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '6px' }}>
                  Corporate Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@mowatek.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fff',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderRadius: '8px',
                  color: '#fca5a5',
                  fontSize: '13px'
                }}>
                  {error}
                </div>
              )}

              {successMessage && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  borderRadius: '8px',
                  color: '#6ee7b7',
                  fontSize: '13px'
                }}>
                  {successMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  marginTop: '4px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
                  transition: 'transform 0.15s ease',
                  width: '100%'
                }}
              >
                {isLoading ? 'Processing...' : isSignUp ? 'Submit Registration →' : 'Sign In to Portal →'}
              </button>
            </form>

            {/* Toggle Button for Sign In / Sign Up */}
            <div style={{ textAlign: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                {isSignUp ? 'Already have an approved account?' : "New staff member?"}{' '}
                <span
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMessage(''); }}
                  style={{ color: '#06b6d4', cursor: 'pointer', fontWeight: 600 }}
                >
                  {isSignUp ? 'Sign In' : 'Register here'}
                </span>
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

export default LoginPage
