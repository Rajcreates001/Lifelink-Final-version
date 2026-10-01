import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext(null);

// ─── Workspace persistence key ──────────────────────────────
const WORKSPACE_KEY = 'lifelink_selected_org';

// ═══════════════════════════════════════════════════════════════
// ROLE-BASED ROUTING TABLE — single source of truth for all
// logout destinations across the entire platform.
// ═══════════════════════════════════════════════════════════════

// ─── Portal-based roles with two-level auth (portal → sub-role) ──
// Users in these roles stay authenticated at the portal level
// after logging out from a sub-role workspace.
// All other roles (ambulance, police, fire, public, etc.)
// are standalone — full logout always goes to /login.
const PORTAL_ROLES = new Set(['hospital', 'government']);

export const ROLE_ROUTES = {
  // ── Portal Roles (2-level auth: portal → workspace login) ──
  // Logout from dashboard → portal workspace selector (stays authenticated).
  government: {
    logoutRedirect: '/dashboard/government/roles',
    workspaceSelect: '/government',
    dashboard: '/dashboard/government',
    label: 'Government Gateway',
  },
  hospital: {
    logoutRedirect: '/dashboard/hospital/roles',
    workspaceSelect: '/hospital',
    dashboard: '/dashboard/hospital',
    label: 'Hospital Gateway',
  },
  // ── Standalone Roles (1-level auth: direct login → dashboard) ──
  // Logout → Main Login /login.
  ambulance: {
    logoutRedirect: '/login',
    // Ambulance role-selection page was removed; cross-role guards send
    // logged-in ambulance users straight to their dashboard.
    workspaceSelect: '/dashboard/ambulance',
    dashboard: '/dashboard/ambulance',
    label: 'Ambulance Command',
  },
  police: {
    logoutRedirect: '/login',
    workspaceSelect: '/police',
    dashboard: '/dashboard/police',
    label: 'Police Portal',
  },
  fire: {
    logoutRedirect: '/login',
    workspaceSelect: '/fire',
    dashboard: '/dashboard/fire',
    label: 'Fire Portal',
  },
  ngo: {
    logoutRedirect: '/login',
    workspaceSelect: '/ngo',
    dashboard: '/dashboard/ngo',
    label: 'NGO Portal',
  },
  'blood-bank': {
    logoutRedirect: '/login',
    workspaceSelect: '/blood-bank',
    dashboard: '/dashboard/blood-bank',
    label: 'Blood Bank Portal',
  },
  laboratory: {
    logoutRedirect: '/login',
    workspaceSelect: '/laboratory',
    dashboard: '/dashboard/laboratory',
    label: 'Laboratory Portal',
  },
  volunteer: {
    logoutRedirect: '/login',
    workspaceSelect: '/volunteer',
    dashboard: '/dashboard/volunteer',
    label: 'Volunteer Portal',
  },
  public: {
    logoutRedirect: '/login',
    workspaceSelect: '/public',
    dashboard: '/dashboard/public',
    label: 'Public Portal',
  },
  admin: {
    logoutRedirect: '/login',
    workspaceSelect: '/admin',
    dashboard: '/dashboard/admin',
    label: 'Administration',
  },
  system: {
    logoutRedirect: '/login',
    workspaceSelect: '/system',
    dashboard: '/dashboard/system',
    label: 'System Console',
  },
};

/**
 * getLoginRoute — Returns the correct landing page after sign-in
 * for any user role. Never hardcoded in components.
 */
export function getLoginRoute(user) {
  if (!user || !user.role) return '/login';
  const role = user.role.toLowerCase();
  // If the user has a subRole (already inside a workspace), go directly to dashboard
  if (user.subRole) {
    const route = ROLE_ROUTES[role];
    return route ? route.dashboard : '/dashboard/public';
  }
  // No subRole yet — go to workspace selector (or direct to dashboard for non-gateway roles)
  switch (role) {
    case 'hospital':
      return '/dashboard/hospital/roles';
    case 'government':
      return '/dashboard/government/roles';
    case 'ambulance':
      return '/dashboard/ambulance';
    case 'public':
      return '/dashboard/public';
    default: {
      const route = ROLE_ROUTES[role];
      return route ? route.dashboard : '/dashboard/public';
    }
  }
}

/**
 * isPortalRole — Returns true if the role has two-level authentication
 * (hospital, government) where workspace logout preserves portal login.
 */
export function isPortalRole(role) {
  if (!role) return false;
  return PORTAL_ROLES.has(role.toLowerCase());
}

/**
 * getLogoutRoute — Returns the correct logout redirect route
 * for any authenticated user based on their primary role.
 * Never infers from URL. Always reads from the role table.
 *
 * Portal roles (hospital, government): redirect to workspace selector.
 * Standalone roles: redirect to /login.
 */
/**
 * getLogoutDestination — Alias for getLogoutRoute.
 * Named per user spec for clarity: "Read session.logoutRoute."
 */
export const getLogoutDestination = getLogoutRoute;

/**
 * getLogoutRoute — Returns the correct logout redirect route
 * for any authenticated user based on their primary role.
 * Never infers from URL. Always reads from the role table.
 *
 * Portal roles (hospital, government): redirect to workspace selector.
 * Standalone roles: redirect to /login.
 */
export function getLogoutRoute(user) {
  if (!user || !user.role) return '/login';
  const role = user.role.toLowerCase();
  const route = ROLE_ROUTES[role];
  if (route) return route.logoutRedirect;
  // Fallback: if the user has a portal role via subRole
  if (user.subRole && PORTAL_ROLES.has(user.subRole.toLowerCase())) {
    const subRoute = ROLE_ROUTES[user.subRole.toLowerCase()];
    if (subRoute) return subRoute.logoutRedirect;
  }
  return '/login';
}

/**
 * getDashboardRoute — Returns the correct dashboard route for a given role.
 */
export function getDashboardRoute(user) {
  if (!user || !user.role) return '/dashboard/public';
  const role = user.role.toLowerCase();
  const route = ROLE_ROUTES[role];
  return route ? route.dashboard : '/dashboard/public';
}

/**
 * getWorkspaceRoute — Returns the workspace/role-selection route.
 * Falls back to /login (not /government) so unknown roles never land
 * on a portal they do not belong to.
 */
export function getWorkspaceRoute(user) {
  if (!user || !user.role) return '/login';
  const role = user.role.toLowerCase();
  const route = ROLE_ROUTES[role];
  return route ? route.workspaceSelect : '/login';
}

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('lifelink_user') || 'null'); }
        catch { sessionStorage.removeItem('lifelink_user'); return null; }
    });
    const [loading, setLoading] = useState(true);
    const [selectedOrg, setSelectedOrgRaw] = useState(() => {
        try { return JSON.parse(localStorage.getItem(WORKSPACE_KEY) || 'null'); }
        catch { return null; }
    });

    // Complete hydration after first paint (lazy initializers above restore
    // synchronously; this just clears the loading flag without cascading)
    useEffect(() => {
        const t = setTimeout(() => setLoading(false), 0);
        return () => clearTimeout(t);
    }, []);

    // Persist selectedOrg to localStorage whenever it changes
    const setSelectedOrg = useCallback((org) => {
        setSelectedOrgRaw(org);
        if (org) {
            localStorage.setItem(WORKSPACE_KEY, JSON.stringify(org));
        } else {
            localStorage.removeItem(WORKSPACE_KEY);
        }
    }, []);

    const login = useCallback((userData, token, refreshToken) => {
        // Ensure userData has a normalized role
        const role = (userData.role || '').toLowerCase();
        const route = ROLE_ROUTES[role];
        // Enrich session with computed navigation routes for direct access
        const normalized = {
            ...userData,
            role,
            // Computed navigation routes — stored in session so components
            // can read session.logoutRoute directly without calling helpers.
            logoutRoute: route?.logoutRedirect || '/login',
            loginRoute: getLoginRoute({ ...userData, role }),
            dashboardRoute: route?.dashboard || '/dashboard/public',
            workspaceRoute: route?.workspaceSelect || '/login',
        };
        // SECURITY: Only store in sessionStorage, never localStorage.
        // Token and user data are session-scoped to minimize XSS exposure.
        sessionStorage.setItem('lifelink_user', JSON.stringify(normalized));
        sessionStorage.setItem('lifelink_token', token);
        if (refreshToken) {
            sessionStorage.setItem('lifelink_refresh_token', refreshToken);
        }
        setUser(normalized);
    }, []);

    const updateUser = (updates) => {
        setUser((prev) => {
            if (!prev) return prev;
            const next = { ...prev, ...updates };
            sessionStorage.setItem('lifelink_user', JSON.stringify(next));
            return next;
        });
    };

    /**
     * clearAuth — Core function: clears ALL auth tokens and user
     * data from both sessionStorage and localStorage.
     * Does NOT handle navigation — that is the caller's responsibility.
     * Use this for FULL logout (standalone roles, gateway pages).
     */
    const clearAuth = useCallback(() => {
        // Best-effort server-side revocation: burn the access + refresh tokens
        // so a stolen copy dies with this logout. Fire-and-forget; local cleanup
        // happens regardless of the outcome.
        const refreshToken = sessionStorage.getItem('lifelink_refresh_token');
        const token = sessionStorage.getItem('lifelink_token');
        if (token) {
            fetch(`${API_BASE_URL}/v2/auth/logout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ refreshToken: refreshToken || null }),
            }).catch(() => { /* network error — local session is cleared anyway */ });
        }
        sessionStorage.removeItem('lifelink_user');
        sessionStorage.removeItem('lifelink_token');
        sessionStorage.removeItem('lifelink_refresh_token');
        // Kill the legacy localStorage copy too — WorkspaceRedirect used to
        // read it as a fallback, resurrecting stale users after logout
        // (e.g. ambulance users bounced to /ambulance instead of /login).
        localStorage.removeItem('lifelink_user');
        setUser(null);
    }, []);

    /**
     * clearWorkspace — Clears the sub-role / workspace context
     * but PRESERVES the portal-level authentication.
     * Use this for workspace logout in portal roles (hospital, government).
     * The user stays authenticated at the portal level and can select
     * another department/organization without re-entering credentials.
     */
    const clearWorkspace = useCallback(() => {
        setUser((prev) => {
            if (!prev) return prev;
            // Preserve portal identity but clear workspace context.
            // CRITICAL: subRole MUST be cleared — role-select pages treat a
            // stored subRole as "workspace still active" and bounce the user
            // straight back into the dashboard, making logout impossible.
            const { subRole: _subRole, department_name: _deptName, department_key: _deptKey, organization: _org, workspaceId: _wsId, ...rest } = prev;
            // Persist cleaned user (still authenticated at portal level)
            sessionStorage.setItem('lifelink_user', JSON.stringify(rest));
            return rest;
        });
        // Clear selected organization so workspace selector shows fresh
        localStorage.removeItem(WORKSPACE_KEY);
        setSelectedOrgRaw(null);
    }, []);

    /**
     * performLogin — Centralized sign-in that records the event,
     * stores the user, and returns the correct landing page route.
     * Navigation is the caller's responsibility.
     */
    const performLogin = useCallback((userData, token, refreshToken) => {
        const normalized = {
            ...userData,
            role: (userData.role || '').toLowerCase(),
        };
        login(normalized, token, refreshToken);

        // Record sign-in to LifeTimeline
        try {
            const timelineKey = `lifelink:timeline:${normalized.id || 'guest'}`;
            const existing = JSON.parse(localStorage.getItem(timelineKey) || '[]');
            existing.unshift({
                type: 'login',
                action: `Signed in as ${normalized.name || normalized.role}`,
                detail: `Role: ${normalized.role}${normalized.subRole ? `, Sub-Role: ${normalized.subRole}` : ''}`,
                timestamp: new Date().toISOString(),
            });
            if (existing.length > 100) existing.length = 100;
            localStorage.setItem(timelineKey, JSON.stringify(existing));
        } catch { /* non-critical */ }

        return getLoginRoute(normalized);
    }, [login]);

    /**
     * performLogout — Context-aware centralized logout.
     *
     * PORTAL ROLES (hospital, government):
     *   Clears the sub-role/workspace but KEEPS the portal-level
     *   authentication. User returns to workspace selector
     *   (/dashboard/hospital/roles or /dashboard/government/roles)
     *   without needing to re-enter portal credentials.
     *
     * STANDALONE ROLES (ambulance, police, fire, public, etc.):
     *   Fully clears all authentication. User returns to /login.
     *
     * Navigation is the caller's responsibility.
     * Use this from DASHBOARD pages.
     */
    const performLogout = useCallback(() => {
        const currentUser = user;
        const role = currentUser?.role?.toLowerCase();
        const isPortal = PORTAL_ROLES.has(role);

        // Record to LifeTimeline before clearing
        try {
            const orgName = currentUser?.department_name || currentUser?.subRole || currentUser?.role || 'Workspace';
            const timelineKey = `lifelink:timeline:${currentUser?.id || 'guest'}`;
            const existing = JSON.parse(localStorage.getItem(timelineKey) || '[]');
            existing.unshift({
                type: 'logout',
                action: `Signed out of ${orgName}`,
                detail: isPortal
                    ? 'Workspace context cleared — portal session preserved'
                    : 'Full sign-out — all sessions cleared',
                timestamp: new Date().toISOString(),
            });
            if (existing.length > 100) existing.length = 100;
            localStorage.setItem(timelineKey, JSON.stringify(existing));
        } catch { /* non-critical */ }

        const redirectRoute = getLogoutRoute(currentUser);

        if (isPortal) {
            // Portal role: clear workspace, keep portal auth.
            // Clear the subRole even if it was somehow already absent so the
            // role-select gate (user?.subRole redirect) cannot re-enter the
            // dashboard after logout.
            clearWorkspace();
        } else {
            // Standalone role (ambulance, police, fire, public, …): full logout
            clearAuth();
        }

        return redirectRoute;
    }, [user, clearAuth, clearWorkspace]);

    /**
     * performGatewayLogout — Centralized logout for GATEWAY pages
     * (Government Gateway, Hospital Gateway, etc.).
     * Unlike performLogout, this redirects to /login (main role selection)
     * instead of back to the same gateway page.
     */
    const performGatewayLogout = useCallback(() => {
        const currentUser = user;
        // Record to LifeTimeline
        try {
            const orgName = currentUser?.department_name || currentUser?.subRole || currentUser?.role || 'Workspace';
            const timelineKey = `lifelink:timeline:${currentUser?.id || 'guest'}`;
            const existing = JSON.parse(localStorage.getItem(timelineKey) || '[]');
            existing.unshift({
                type: 'logout',
                action: `Signed out of ${orgName}`,
                detail: 'Workspace gateway - redirecting to role selection',
                timestamp: new Date().toISOString(),
            });
            if (existing.length > 100) existing.length = 100;
            localStorage.setItem(timelineKey, JSON.stringify(existing));
        } catch { /* non-critical */ }

        clearAuth();
        // Gateway pages always redirect to /login, never to the same gateway
        return '/login';
    }, [user, clearAuth]);

    /**
     * workspaceLogout — Clears authentication but PRESERVES the
     * selected organization so the user returns to the workspace
     * sub-role selection page, NOT the org gateway.
     */
    const workspaceLogout = useCallback(() => {
        clearAuth();
        // selectedOrg is preserved in localStorage
    }, [clearAuth]);

    /**
     * exitWorkspace — Clears EVERYTHING including the selected
     * organization, returning the user to the full org gateway.
     */
    const exitWorkspace = useCallback(() => {
        clearAuth();
        localStorage.removeItem(WORKSPACE_KEY);
        setSelectedOrgRaw(null);
    }, [clearAuth]);

    return (
        <AuthContext.Provider value={{
            user,
            login,
            logout: workspaceLogout,
            fullLogout: exitWorkspace,
            clearAuth,
            clearWorkspace,
            performLogin,
            performLogout,
            performGatewayLogout,
            updateUser,
            loading,
            selectedOrg,
            setSelectedOrg,
            exitWorkspace,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// Exporting the hook at the bottom is standard practice
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};