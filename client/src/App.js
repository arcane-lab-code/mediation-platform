import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import './App.css';

// API Configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// API Service
const api = {
  setAuthToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },

  getAuthToken: () => localStorage.getItem('token'),

  request: async (endpoint, options = {}) => {
    const token = api.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  }
};

// Auth Context
const AuthContext = React.createContext();

function AuthProvider({ children }) {
  // Mock user - bypass authentication temporarily
  const [user, setUser] = useState({
    id: 1,
    email: 'demo@mediation.com',
    first_name: 'Demo',
    last_name: 'User',
    role: 'client'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Skip authentication check
    // checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      if (api.getAuthToken()) {
        const data = await api.request('/auth/me');
        setUser(data.user);
      }
    } catch (error) {
      api.setAuthToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const data = await api.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    api.setAuthToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const data = await api.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    api.setAuthToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    api.setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

const useAuth = () => React.useContext(AuthContext);

// Login Page
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register({
          email,
          password,
          ...formData,
        });
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🏛️ Mediation Platform</h1>
        <h2>{isRegister ? 'Create Account' : 'Login'}</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
              <input
                type="tel"
                placeholder="Phone (optional)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Please wait...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          {' '}
          <button onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? 'Login' : 'Register'}
          </button>
        </p>

        <div className="demo-credentials">
          <p><strong>Demo Admin Account:</strong></p>
          <p>Email: admin@mediation.com</p>
          <p>Password: Admin123!</p>
        </div>
      </div>
    </div>
  );
}

// Dashboard Page
function DashboardPage() {
  const { user, logout } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewCase, setShowNewCase] = useState(false);

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      const data = await api.request('/cases');
      setCases(data.cases);
    } catch (error) {
      console.error('Error loading cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
      await api.request('/cases', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.get('title'),
          description: formData.get('description'),
          category: formData.get('category'),
          priority: formData.get('priority'),
        }),
      });

      setShowNewCase(false);
      loadCases();
    } catch (error) {
      alert('Error creating case: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: '#fbbf24',
      active: '#3b82f6',
      suspended: '#6b7280',
      resolved: '#10b981',
      closed: '#64748b'
    };
    return colors[status] || '#6b7280';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#10b981',
      medium: '#3b82f6',
      high: '#f59e0b',
      urgent: '#ef4444'
    };
    return colors[priority] || '#6b7280';
  };

  return (
    <div className="dashboard">
      <nav className="navbar">
        <h1>🏛️ Mediation Platform</h1>
        <div className="nav-right">
          <span>Welcome, {user.first_name}!</span>
          <span className="role-badge">{user.role}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </nav>

      <div className="container">
        <div className="header">
          <h2>My Cases</h2>
          <button className="btn-primary" onClick={() => setShowNewCase(!showNewCase)}>
            {showNewCase ? 'Cancel' : '+ New Case'}
          </button>
        </div>

        {showNewCase && (
          <div className="new-case-form">
            <h3>Create New Case</h3>
            <form onSubmit={handleCreateCase}>
              <input
                type="text"
                name="title"
                placeholder="Case Title"
                required
              />
              <textarea
                name="description"
                placeholder="Case Description"
                rows="4"
              />
              <select name="category">
                <option value="">Select Category</option>
                <option value="family">Family</option>
                <option value="commercial">Commercial</option>
                <option value="labor">Labor</option>
                <option value="civil">Civil</option>
                <option value="other">Other</option>
              </select>
              <select name="priority">
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
              <button type="submit" className="btn-primary">Create Case</button>
            </form>
          </div>
        )}

        {loading ? (
          <p>Loading cases...</p>
        ) : cases.length === 0 ? (
          <div className="empty-state">
            <p>No cases yet. Create your first case to get started!</p>
          </div>
        ) : (
          <div className="cases-grid">
            {cases.map((caseItem) => (
              <div key={caseItem.id} className="case-card">
                <div className="case-header">
                  <h3>{caseItem.title}</h3>
                  <span className="case-number">{caseItem.case_number}</span>
                </div>

                <p className="case-description">{caseItem.description}</p>

                <div className="case-meta">
                  <span
                    className="badge"
                    style={{ backgroundColor: getStatusColor(caseItem.status) }}
                  >
                    {caseItem.status}
                  </span>
                  <span
                    className="badge"
                    style={{ backgroundColor: getPriorityColor(caseItem.priority) }}
                  >
                    {caseItem.priority}
                  </span>
                  {caseItem.category && (
                    <span className="badge">{caseItem.category}</span>
                  )}
                </div>

                <div className="case-footer">
                  <small>Created: {new Date(caseItem.created_at).toLocaleDateString()}</small>
                  {caseItem.mediator_name && (
                    <small>Mediator: {caseItem.mediator_name}</small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Protected Route
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  // Bypass authentication - always show content
  return children;
}

// Main App
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
