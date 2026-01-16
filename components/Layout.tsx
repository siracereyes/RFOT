
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
    <div className="flex min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:flex lg:flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 border-b border-slate-100 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="https://i.ibb.co/rf28pYjw/rspc2.png" 
                alt="NCR Logo" 
                className="w-12 h-12 object-contain rounded-xl shadow-sm border border-slate-100 bg-slate-50 p-1"
              />
              <div>
                <h1 className="text-xl font-black font-header tracking-tighter leading-none">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">NCR</span> <span className="text-[#FFD700]">2026</span>
                </h1>
                <p className="text-[8px] text-slate-400 mt-1 uppercase tracking-[0.1em] font-black">
                  NATIONAL CAPITAL REGION
                </p>
              </div>
            </div>
            <button onClick={toggleMobileMenu} className="lg:hidden p-2 text-slate-400">
              <X size={24} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.filter(item => item.roles.includes(user.role)).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'} transition-colors`}>
                  {item.icon}
                </span>
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-6 border-t border-slate-100">
          <button 
            onClick={onLogout}
            className="flex items-center gap-4 px-5 py-4 w-full text-slate-400 hover:text-red-500 transition-all rounded-2xl hover:bg-red-50 group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            <span className="font-bold text-sm tracking-wide">Logout Session</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleMobileMenu}
              className="lg:hidden p-3 bg-slate-50 rounded-xl text-slate-500 hover:text-slate-900 transition-all"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-center gap-3">
              <img 
                src="https://i.ibb.co/rf28pYjw/rspc2.png" 
                alt="NCR Logo" 
                className="w-8 h-8 object-contain rounded-lg lg:hidden"
              />
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 hidden sm:block">
                {location.pathname === '/' ? 'System Overview' : location.pathname.substring(1).split('/').join(' • ').toUpperCase()}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button className="hidden sm:flex p-3 text-slate-400 hover:text-blue-600 transition-all relative">
              <Bell size={20} />
              <span className="absolute top-3.5 right-3.5 w-1.5 h-1.5 bg-blue-600 rounded-full ring-2 ring-white"></span>
            </button>
            <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
              <div className="text-right hidden md:block">
                <p className="text-sm font-black text-slate-900 leading-none">{user.name}</p>
                <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest font-black">{user.role.replace('_', ' ')}</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-lg font-black text-white shadow-lg shadow-blue-600/20 border border-white/20">
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
