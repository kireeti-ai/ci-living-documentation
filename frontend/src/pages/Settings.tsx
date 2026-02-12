import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { fetchUsers, createUser, updateUserRole, deleteUser, clearUsersError } from '../store/slices/usersSlice'
import Navbar from '../components/Navbar'

const Settings = () => {
  const dispatch = useAppDispatch()
  const { users, isLoading, error } = useAppSelector((state) => state.users)
  const { user: currentUser } = useAppSelector((state) => state.auth)

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    dispatch(fetchUsers())
  }, [dispatch])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.username.trim()) {
      errors.username = 'Full name is required'
    }
    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    dispatch(clearUsersError())

    if (!validateForm()) return

    const result = await dispatch(createUser(formData))
    if (createUser.fulfilled.match(result)) {
      setShowModal(false)
      setFormData({ username: '', email: '', password: '', role: 'user' })
      setSuccessMessage('User created successfully!')
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    const result = await dispatch(updateUserRole({ userId, role: newRole }))
    if (updateUserRole.fulfilled.match(result)) {
      setSuccessMessage('User role updated successfully!')
    }
  }

  const handleDelete = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user "${email}"?`)) return

    const result = await dispatch(deleteUser(userId))
    if (deleteUser.fulfilled.match(result)) {
      setSuccessMessage('User deleted successfully!')
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setFormData({ username: '', email: '', password: '', role: 'user' })
    setFormErrors({})
    dispatch(clearUsersError())
  }

  return (
    <div className="page-container">
      <Navbar title="Settings" />
      <div className="page-content">
        {successMessage && (
          <div className="alert alert-success">{successMessage}</div>
        )}

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>User Management</h2>
            <button 
              className="btn btn-primary" 
              style={{ width: 'auto' }}
              onClick={() => setShowModal(true)}
            >
              + Add User
            </button>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {isLoading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={user.id === currentUser?.id}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                          }}
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <span className="badge badge-active">
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(user.id, user.email)}
                            disabled={user.id === currentUser?.id}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                        No users found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New User</h3>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="username">Full Name</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={formErrors.username ? 'error' : ''}
                  placeholder="Enter full name"
                />
                {formErrors.username && <p className="error-text">{formErrors.username}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={formErrors.email ? 'error' : ''}
                  placeholder="Enter email"
                />
                {formErrors.email && <p className="error-text">{formErrors.email}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={formErrors.password ? 'error' : ''}
                  placeholder="At least 8 characters"
                />
                {formErrors.password && <p className="error-text">{formErrors.password}</p>}
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
