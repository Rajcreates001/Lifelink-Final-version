import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, getLoginRoute, getWorkspaceRoute } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { getAuthToken } from './config/api';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/responsive.css';
import './i18n'; // Initialize i18n

// Pages
const Signup = lazy(() => import('./pages/Signup'));
const Login = lazy(() => import('./pages/Login'));
const PublicDashboard = lazy(() => import('./pages/PublicDashboard'));
const HospitalDashboard = lazy(() => import('./pages/HospitalDashboard'));
const GovernmentDashboard = lazy(() => import('./pages/GovernmentDashboard'));
const AmbulanceDashboard = lazy(() => import('./pages/AmbulanceDashboard'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ApiTest = lazy(() => import('./pages/ApiTest'));
const HospitalRoleSelect = lazy(() => import('./pages/HospitalRoleSelect'));
const GovernmentRoleSelect = lazy(() => import('./pages/GovernmentRoleSelect'));
const SwitchPortal = lazy(() => import('./pages/SwitchPortal'));
const StatusPage = lazy(() => import('./pages/StatusPage'));

// Protected Route Component
// ... existing imports

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    
    // 1. Wait for the AuthProvider to check sessionStorage
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
                    <p className="text-gray-500 font-medium">Authenticating...</p>
                </div>
            </div>
        );
    }
    
    // 2. If session check is done and no user exists
    //    Redirect to workspace (if org selected) or login
    if (!user) {
        return <WorkspaceRedirect />;
    }

    // 3. If there is no auth token, force login again
    if (!getAuthToken()) {
        return <WorkspaceRedirect />;
    }

    // 4. Check for role authorization (normalized to lowercase)
    if (allowedRoles && !allowedRoles.includes(user.role.toLowerCase())) {
        // Cross-role access — redirect to the user's own workspace gateway
        // instead of the landing page. An ambulance user typing /dashboard/government
        // will be redirected to /ambulance, not the home page.
        const targetRoute = getWorkspaceRoute(user);
        return <Navigate to={targetRoute} replace />;
    }

    return children;
};

const DashboardRedirect = () => {
    const { user } = useAuth();
    // Use centralized getLoginRoute — single source of truth for sign-in landing
    const landingRoute = getLoginRoute(user);
    return <Navigate to={landingRoute} replace />;
};

// ─── Workspace-aware redirect — role-based via pure function ──
const WorkspaceRedirect = () => {
    // Read the last known user from storage to determine the correct
    // workspace redirect. When a user has no active session but has
    // stored data, redirect to their workspace gateway.
    // When there's no stored data at all, redirect to /login.
    let redirectRoute = '/login';
    try {
        const stored = sessionStorage.getItem('lifelink_user') || localStorage.getItem('lifelink_user');
        if (stored) {
            const lastUser = JSON.parse(stored);
            // Use getWorkspaceRoute to find the correct gateway
            redirectRoute = getWorkspaceRoute(lastUser);
        }
    } catch { /* fall through */ }
    return <Navigate to={redirectRoute} replace />;
};

// ... keep rest of App component as provided

const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-800"></div>
            <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
    </div>
);

const App = () => {
    return (
        <ThemeProvider>
        <AuthProvider>
      <Router>
        <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/login" element={<Login />} />

                    {/* Protected: Public User Dashboard */}
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <DashboardRedirect />
                            </ProtectedRoute>
                        }
                    />

                    <Route 
                        path="/dashboard/public" 
                        element={
                            <ProtectedRoute allowedRoles={['public']}>
                                <PublicDashboard />
                            </ProtectedRoute>
                        } 
                    />

                    <Route
                        path="/dashboard/public/:module"
                        element={
                            <ProtectedRoute allowedRoles={['public']}>
                                <PublicDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* ── Public Organization Gateway ── */}
                    <Route path="/government" element={<GovernmentRoleSelect />} />
                    <Route path="/government/:orgKey" element={<GovernmentRoleSelect />} />
                    <Route path="/hospital" element={<HospitalRoleSelect />} />
                    <Route path="/hospital/:orgKey" element={<HospitalRoleSelect />} />

                    {/* Protected: Hospital Dashboard */}
                    <Route 
                        path="/dashboard/hospital" 
                        element={
                            <ProtectedRoute allowedRoles={['hospital']}>
                                <HospitalDashboard />
                            </ProtectedRoute>
                        } 
                    />

                    <Route
                        path="/dashboard/hospital/roles"
                        element={
                            <ProtectedRoute allowedRoles={['hospital']}>
                                <HospitalRoleSelect />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/hospital/:module"
                        element={
                            <ProtectedRoute allowedRoles={['hospital']}>
                                <HospitalDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Protected: Government Dashboard */}
                    <Route 
                        path="/dashboard/government" 
                        element={
                            <ProtectedRoute allowedRoles={['government']}>
                                <GovernmentDashboard />
                            </ProtectedRoute>
                        } 
                    />

                    <Route
                        path="/dashboard/government/roles"
                        element={
                            <ProtectedRoute allowedRoles={['government']}>
                                <GovernmentRoleSelect />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/government/:module"
                        element={
                            <ProtectedRoute allowedRoles={['government']}>
                                <GovernmentDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* Protected: Ambulance Dashboard */}
                    <Route
                        path="/dashboard/ambulance"
                        element={
                            <ProtectedRoute allowedRoles={['ambulance']}>
                                <AmbulanceDashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route path="/dashboard/ambulance/roles" element={<Navigate to="/dashboard/ambulance" replace />} />

                    <Route
                        path="/dashboard/ambulance/:module"
                        element={
                            <ProtectedRoute allowedRoles={['ambulance']}>
                                <AmbulanceDashboard />
                            </ProtectedRoute>
                        }
                    />

                    {/* API Test Page */}
                    <Route path="/api-test" element={<ApiTest />} />

                    {/* Public Status Page */}
                    <Route path="/status" element={<StatusPage />} />

                    {/* Switch Portal */}
                    <Route
                        path="/switch-portal"
                        element={
                            <ProtectedRoute>
                                <SwitchPortal />
                            </ProtectedRoute>
                        }
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                </Suspense>
        </ErrorBoundary>
            </Router>
        </AuthProvider>
        </ThemeProvider>
    );
};

export default App;