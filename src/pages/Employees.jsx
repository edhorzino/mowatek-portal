import { useEffect, useState } from 'react'
import { getEmployees } from '../services/api'

function Employees() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await getEmployees()

        const list = Array.isArray(data)
          ? data
          : data?.employees || data?.items || []

        setEmployees(list)
      } catch (err) {
        console.error(err)
        setError(err.message || 'Unable to load employees.')
      } finally {
        setLoading(false)
      }
    }

    loadEmployees()
  }, [])

  if (loading) {
    return (
      <div className="page-placeholder">
        <h2>Loading employees...</h2>
        <p>Connecting to the Mowatek employee database.</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-placeholder">
        <h2>Unable to load employees</h2>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="welcome">
        <div>
          <span className="eyebrow">EMPLOYEE MANAGEMENT</span>
          <h2>Employees</h2>
          <p>Employee records connected to the Mowatek database.</p>
        </div>

        <div className="date-box">
          <span>Total Employees</span>
          <strong>{employees.length}</strong>
        </div>
      </div>

      <div className="panel">
        {employees.length === 0 ? (
          <div className="page-placeholder">
            <h2>No employees returned</h2>
            <p>
              The API connection is working, but the employee endpoint
              returned no records.
            </p>
          </div>
        ) : (
          <div className="employee-table-wrapper">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Employee</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee, index) => (
                  <tr key={employee.id || employee.employee_id || index}>
                    <td>{index + 1}</td>

                    <td>
                      <strong>
                        {employee.name ||
                          employee.full_name ||
                          employee.employee_name ||
                          '—'}
                      </strong>
                    </td>

                    <td>
                      {employee.email ||
                        employee.email_address ||
                        '—'}
                    </td>

                    <td>
                      {employee.department ||
                        employee.department_name ||
                        '—'}
                    </td>

                    <td>
                      <span className="employee-status">
                        {employee.status || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Employees
