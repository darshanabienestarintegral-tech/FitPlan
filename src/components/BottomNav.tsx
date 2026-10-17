import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, LayoutDashboard, CalendarDays, Dumbbell, TrendingUp, ShieldCheck } from 'lucide-react';
import { useUserStore } from '../store/useUserStore';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const baseNavItems: NavItem[] = [
  { to: '/', label: 'Inicio', icon: Home },
  { to: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { to: '/rutina', label: 'Rutina', icon: CalendarDays },
  { to: '/ejercicios', label: 'Ejercicios', icon: Dumbbell },
  { to: '/progreso', label: 'Progreso', icon: TrendingUp },
];

export const BottomNav: React.FC = () => {
  const currentUser = useUserStore((s) => s.currentUser);
  const items = currentUser?.isAdmin
    ? [...baseNavItems, { to: '/admin', label: 'Admin', icon: ShieldCheck }]
    : baseNavItems;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#EAE3D9] px-2 shadow-lg no-print"
      aria-label="Navegación principal"
    >
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center min-w-[44px] min-h-[48px] px-2 sm:px-3 py-1 rounded-xl transition-all select-none ${
                  isActive
                    ? 'text-[#9E5325] font-bold scale-105'
                    : 'text-[#78716C] hover:text-[#1C1917] active:scale-95'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#9E5325] rounded-full" />
                    )}
                  </div>
                  <span className="text-[10px] sm:text-[11px] mt-1 tracking-tight font-medium whitespace-nowrap truncate max-w-[58px] sm:max-w-none text-center">
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
