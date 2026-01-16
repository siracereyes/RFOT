
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../constants';
import { UserRole } from '../types';
import { LogOut, Bell, User as UserIcon, Menu, X, ShieldCheck } from 'lucide-react';

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
    <div className="flex min-h-screen bg-[#fcfdfe] text-slate-900 overflow-x-hidden">
      {/* Sidebar - Desktop */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-76 bg-white border-r border-slate-100 transition-transform duration-500 ease-out
        lg:translate-x-0 lg:static lg:flex lg:flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-10 border-b border-slate-50 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-blue-600/10 rounded-2xl blur-xl group-hover:bg-blue-600/20 transition-all"></div>
                <img 
                  src="https://i.ibb.co/rf28pYjw/rspc2.png" 
                  alt="NCR Logo" 
                  className="w-14 h-14 object-contain rounded-2xl relative z-10 p-1 bg-white shadow-sm border border-slate-50"
                />
              </div>
              <div>
                <h1 className="text-2xl font-black font-header tracking-tighter leading-none">
                  <span className="text-blue-800">NCR</span> <span className="text-amber-500">2026</span>
                </h1>
                <p className="text-[10px] text-slate-400 mt-1.5 uppercase tracking-[0.15em] font-black opacity-80">
                  Regional Portal
                </p>
              </div>
            </div>
            <button onClick={toggleMobileMenu} className="lg:hidden p-2 text-slate-400 hover:text-slate-900 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-8 space-y-3 overflow-y-auto no-scrollbar">
          {NAV_ITEMS.filter(item => item.roles.includes(user.role)).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={`flex items-center gap-5 px-6 py-5 rounded-[2rem] transition-all group relative overflow-hidden ${
                  isActive 
                    ? 'bg-blue-800 text-white shadow-2xl shadow-blue-800/30' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-blue-700'
                }`}
              >
                <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-700'} transition-all duration-300`}>
                  {item.icon}
                </span>
                <span className="font-black text-sm tracking-wide uppercase">{item.label}</span>
                {isActive && (
                  <div className="absolute right-6 w-1.5 h-1.5 bg-white rounded-full"></div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-8 border-t border-slate-50">
          <button 
            onClick={onLogout}
            className="flex items-center gap-5 px-6 py-5 w-full text-slate-400 hover:text-red-600 transition-all rounded-[2rem] hover:bg-red-50 group font-black uppercase text-[11px] tracking-widest"
          >
            <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
            <span>End Session</span>
          </button>
        </div>
      </aside>

      {/* Backdrop for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-40 lg:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-24 bg-white/90 backdrop-blur-2xl border-b border-slate-100 px-8 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={toggleMobileMenu}
              className="lg:hidden p-4 bg-slate-50 rounded-2xl text-slate-500 hover:text-slate-900 transition-all shadow-sm active:scale-95"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-4">
              <img 
                src="https://i.ibb.co/rf28pYjw/rspc2.png" 
                alt="NCR Logo" 
                className="w-10 h-10 object-contain rounded-xl lg:hidden shadow-sm"
              />
              <div className="hidden sm:block">
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                  {location.pathname === '/' ? 'Operational Overview' : location.pathname.substring(1).replace('/', ' • ').toUpperCase()}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Live Regional Data Stream</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <button className="hidden sm:flex p-4 text-slate-400 hover:text-blue-700 transition-all relative bg-slate-50 rounded-2xl group active:scale-95 shadow-sm">
              <Bell size={22} className="group-hover:rotate-12 transition-transform" />
              <span className="absolute top-4 right-4 w-2 h-2 bg-blue-700 rounded-full ring-4 ring-white"></span>
            </button>
            
            <div className="flex items-center gap-5 pl-8 border-l border-slate-100">
              <div className="text-right hidden md:block">
                <p className="text-[14px] font-black text-slate-900 leading-none">{user.name}</p>
                <p className="text-[10px] text-blue-700 mt-2 uppercase tracking-widest font-black flex items-center justify-end gap-1.5 opacity-80">
                  <ShieldCheck size={12} /> {user.role.replace('_', ' ')}
                </p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-800 to-indigo-900 flex items-center justify-center text-xl font-black text-white shadow-xl shadow-blue-900/20 border-2 border-white/20 relative group">
                {user.name.charAt(0)}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-6 md:p-10 lg:p-14 animate-in fade-in duration-1000 overflow-y-auto no-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
