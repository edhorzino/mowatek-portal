import { supabase } from '../supabaseClient'

export async function getEmployees() {
  const { data, error } = await supabase
    .from('employees')
    .select('*')

  if (error) {
    console.warn('Supabase employees query notice:', error.message)
    // Return an empty array fallback if the table doesn't exist yet
    return []
  }

  return data || []
}
// Add a new employee
export async function createEmployee(employeeData) {
  const response = await fetch('/api/employees', { // Replace '/api/employees' with your actual AWS API gateway URL if different
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(employeeData),
  })
  if (!response.ok) throw new Error('Failed to create employee')
  return await response.json()
}

// Update an employee
export async function updateEmployeeApi(id, employeeData) {
  const response = await fetch(`/api/employees/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(employeeData),
  })
  if (!response.ok) throw new Error('Failed to update employee')
  return await response.json()
}

// Delete an employee
export async function deleteEmployeeApi(id) {
  const response = await fetch(`/api/employees/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) throw new Error('Failed to delete employee')
  return await response.json()
}