import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

function getFirstName(value) {
  const name = String(value || '').trim()
  if (!name) return 'User'

  const firstPart = name.split(/[\s._-]+/)[0]
  return firstPart.charAt(0).toUpperCase() + firstPart.slice(1).toLowerCase()
}

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
          .ilike('work_email', user.email) // Case-insensitive email match
          .single()

        if (dbError || !employeeData) {
          // Fallback if no specific employee record is found yet
          const fallbackName = user.email.split('@')[0]
          setProfile({
            fullName: fallbackName,
            firstName: getFirstName(fallbackName),
            email: user.email,
          })
        } else {
          // Prefer the structured employee name fields, then safely fall back to the email prefix.
          const fullName = employeeData.name || employeeData.full_name || [employeeData.first_name, employeeData.middle_name, employeeData.last_name].filter(Boolean).join(' ') || user.email
          const firstName = employeeData.first_name || employeeData.firstName || fullName

          setProfile({
            ...employeeData,
            fullName,
            firstName: getFirstName(firstName),
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
