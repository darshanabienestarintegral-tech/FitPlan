import React from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { Home } from './pages/Home';
import { Routine } from './pages/Routine';
import { Exercises } from './pages/Exercises';
import { Progress } from './pages/Progress';
import { Onboarding } from './pages/Onboarding';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';
import { Dashboard } from './pages/Dashboard';
import { BottomNav } from './components/BottomNav';
import { useUserStore } from './store/useUserStore';

// Main App layout with bottom navigation & auth guard
const AppLayout: React.FC = () => {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const isOnboarded = useUserStore((s) => s.isOnboarded);

  // If user is not authenticated, redirect to login screen
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user hasn't completed onboarding yet, redirect to /onboarding
  if (!isOnboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <div className="relative min-h-screen bg-[#FAF7F2] text-[#1C1917] flex flex-col justify-between">
      <div className="flex-1">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
};

// Onboarding route guard
const OnboardingRoute: React.FC = () => {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Onboarding />;
};

// Login route guard: if already logged in, redirect to appropriate destination
const LoginRoute: React.FC = () => {
  const isAuthenticated = useUserStore((s) => s.isAuthenticated);
  const isOnboarded = useUserStore((s) => s.isOnboarded);

  if (isAuthenticated) {
    return isOnboarded ? <Navigate to="/" replace /> : <Navigate to="/onboarding" replace />;
  }

  return <Login />;
};

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginRoute />,
  },
  {
    path: '/onboarding',
    element: <OnboardingRoute />,
  },
  {
    path: '/admin',
    element: <Admin />,
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'rutina',
        element: <Routine />,
      },
      {
        path: 'ejercicios',
        element: <Exercises />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'panel',
        element: <Dashboard />,
      },
      {
        path: 'panel-de-control',
        element: <Dashboard />,
      },
      {
        path: 'progreso',
        element: <Progress />,
      },
      {
        path: 'admin',
        element: <Admin />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
