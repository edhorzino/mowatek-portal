import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext({})
const INACTIVITY_LIMIT_MS = 8 * 60 * 60 * 1000
const LAST_ACTIVITY_KEY = 'mowatek-last-activity-at'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch extra profile data (role, approval status, department)
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      setProfile(data)
      return data
    } catch (err) {
      console.error('Error fetching user profile:', err.message)
      setProfile(null)
      return null
    }
  }

  useEffect(() => {
    // 1. Get initial active session from Supabase
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      localStorage.removeItem(LAST_ACTIVITY_KEY)
      return undefined
    }

    let signingOut = false
    const endInactiveSession = async () => {
      if (signingOut) return
      signingOut = true
      localStorage.removeItem(LAST_ACTIVITY_KEY)
      await supabase.auth.signOut({ scope: 'local' })
      setUser(null)
      setSession(null)
      setProfile(null)
    }

    const getLastActivity = () => Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0)
    const checkInactivity = () => {
      if (Date.now() - getLastActivity() >= INACTIVITY_LIMIT_MS) {
        void endInactiveSession()
      }
    }
    const refreshActivity = () => {
      checkInactivity()
      if (!signingOut) localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    }

    if (!getLastActivity()) localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    checkInactivity()

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll']
    activityEvents.forEach((eventName) => window.addEventListener(eventName, refreshActivity, { passive: true }))
    window.addEventListener('focus', checkInactivity)
    document.addEventListener('visibilitychange', checkInactivity)
    const timer = window.setInterval(checkInactivity, 60 * 1000)

    return () => {
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, refreshActivity))
      window.removeEventListener('focus', checkInactivity)
      document.removeEventListener('visibilitychange', checkInactivity)
      window.clearInterval(timer)
    }
  }, [user])

  // Sign up handler enforcing @mowatek.com domain and profile creation
  const signup = async (email, password, fullName) => {
    if (!email.toLowerCase().endsWith('@mowatek.com')) {
      throw new Error('Registration is restricted to @mowatek.com corporate email addresses.')
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })

    if (error) throw new Error(error.message)

    if (data?.user) {
      // Create profile row with is_approved set to false by default
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: data.user.id,
          email: email,
          full_name: fullName,
          role: 'staff',
          is_approved: false
        }
      ])
      if (profileError) throw new Error(profileError.message)
    }

    return data
  }

  // Login handler connected directly to Supabase with Admin Approval Gate & Live Session Tracking
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw new Error(error.message)

    if (data?.user) {
      const userProfile = await fetchProfile(data.user.id)

      // Check if approved by admin
      if (!userProfile || !userProfile.is_approved) {
        await supabase.auth.signOut()
        setUser(null)
        setSession(null)
        setProfile(null)
        throw new Error('Your account is pending admin approval. Please contact the administrator.')
      }

      // Record active login session for real-time dashboard metrics
      await supabase.from('user_sessions').insert([
        {
          user_id: data.user.id,
          email: email,
          full_name: userProfile.full_name || email,
          department: userProfile.department || 'General'
        }
      ])
      localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
    }

    return data
  }

  // Logout handler
  const logout = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) console.error('Error signing out:', error.message)
    setUser(null)
    setSession(null)
    setProfile(null)
    localStorage.removeItem(LAST_ACTIVITY_KEY)
  }

  // Extract display details safely
  const attributes = {
    email: user?.email || '',
    name: profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Employee',
    department: profile?.department || 'General',
  }

  const groups = profile?.role ? [profile.role] : ['staff']

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        attributes,
        groups,
        loading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
