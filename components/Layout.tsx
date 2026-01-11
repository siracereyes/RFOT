
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../constants';
import { UserRole } from '../types';
import { LogOut, Bell, User as UserIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: { name: string; role: UserRole };
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 glass border-r border-white/10 hidden md:flex flex-col fixed inset-y-0 z-50">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold font-header bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            RFOT 2024
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">
            Regional Scoring System
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {NAV_ITEMS.filter(item => item.roles.includes(user.role)).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 relative">
        <header className="sticky top-0 z-40 h-16 glass border-b border-white/10 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-300 hidden md:block">
              {location.pathname === '/' ? 'Overview' : location.pathname.substring(1).toUpperCase()}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-white/10">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold leading-none">{user.name}</p>
                <p className="text-xs text-slate-400 mt-1 uppercase tracking-tighter">{user.role.replace('_', ' ')}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold">
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 md:p-8 animate-in fade-in duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
