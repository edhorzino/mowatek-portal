import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export function useEmployeeProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProfileData() {
      try {
        // 1. Get the currently logged-in user from Supabase Auth
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user || !user.email) {
          setLoading(false)
          return
        }

        // 2. Query your manually uploaded employee records matching this email
        const { data: employeeData, error: dbError } = await supabase
          .from('employees')
          .select('*')
          .ilike('email', user.email) // Case-insensitive email match
          .single()

        if (dbError || !employeeData) {
          // Fallback if no specific employee record is found yet
          const fallbackName = user.email.split('@')[0].replace('.', ' ')
          setProfile({
            fullName: fallbackName,
            firstName: fallbackName.split(' ')[0],
            email: user.email,
          })
        } else {
          // Extract first name dynamically from the employee record's name field
          const fullName = employeeData.name || employeeData.full_name || user.email
          const firstName = fullName.trim().split(' ')[0]

          setProfile({
            ...employeeData,
            fullName,
            firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase(),
            email: user.email,
          })
        }
      } catch (err) {
        console.error('Error loading employee profile:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfileData()
  }, [])

  return { profile, loading }
}