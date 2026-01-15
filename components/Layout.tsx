
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../constants';
import { UserRole } from '../types';
import { LogOut, Bell, User as UserIcon, Menu, X } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  user: { name: string; role: UserRole };
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200 overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 glass border-r border-white/10 transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:flex lg:flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black font-header bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent tracking-tighter">
              RFOT 2024
            </h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-[0.3em] font-black">
              REGIONAL SCORING
            </p>
          </div>
          <button onClick={toggleMobileMenu} className="lg:hidden p-2 text-slate-400">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-6 space-y-3 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.filter(item => item.roles.includes(user.role)).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20' 
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <span className={`${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`}>
                  {item.icon}
                </span>
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/10">
          <button 
            onClick={onLogout}
            className="flex items-center gap-4 px-5 py-4 w-full text-slate-500 hover:text-red-400 transition-all rounded-2xl hover:bg-red-500/5 group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="font-bold text-sm tracking-wide">Logout Session</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-20 glass border-b border-white/10 px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleMobileMenu}
              className="lg:hidden p-3 bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 hidden sm:block">
              {location.pathname === '/' ? 'System Overview' : location.pathname.substring(1).split('/').join(' • ').toUpperCase()}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <button className="hidden sm:flex p-3 text-slate-500 hover:text-blue-400 transition-all relative">
              <Bell size={20} />
              <span className="absolute top-3.5 right-3.5 w-1.5 h-1.5 bg-blue-500 rounded-full ring-2 ring-slate-900"></span>
            </button>
            <div className="flex items-center gap-4 pl-6 border-l border-white/10">
              <div className="text-right hidden md:block">
                <p className="text-sm font-black text-white leading-none">{user.name}</p>
                <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest font-black">{user.role.replace('_', ' ')}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-blue-600/20 border border-white/10">
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 lg:p-12 animate-in fade-in duration-700 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
