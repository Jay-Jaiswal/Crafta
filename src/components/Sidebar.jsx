import { NavLink } from 'react-router-dom';
import { BarChart3, Clock, Home, Video } from 'lucide-react';
import useThemeStore from '../store/useThemeStore';

const navItems = [
  { path: '/home', icon: Home, label: 'Home' },
  { path: '/dashboard', icon: Video, label: 'Analyze' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/history', icon: Clock, label: 'History' },
];

const Sidebar = () => {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <aside className={`fixed left-0 top-0 bottom-0 w-20 md:w-56 z-30 flex flex-col border-r backdrop-blur-xl transition-colors duration-300 ${
      isDark
        ? 'bg-slate-950/75 border-slate-800/80'
        : 'bg-white/55 border-white/60'
    }`}>
      <div className="px-3 md:px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-fuchsia-500 flex items-center justify-center shadow-sm">
            <Video className="w-4 h-4 text-white" />
          </div>
          <div className="hidden md:block">
            <h1 className={`text-sm font-semibold leading-tight ${isDark ? 'text-white' : 'text-[#0B1535]'}`}>
              Crafta
            </h1>
            <p className={`text-[10px] leading-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Video Analyzer
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 md:px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center justify-center md:justify-start gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isActive
                  ? isDark
                    ? 'bg-orange-500/15 text-orange-300'
                    : 'bg-white/75 text-[#0B1535] border border-white/70 shadow-sm'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
                  : 'text-slate-600 hover:text-[#0B1535] hover:bg-white/65'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={`w-4 h-4 ${isActive ? '' : 'opacity-60'}`} />
                <span className="hidden md:inline">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={`px-3 py-3 border-t ${isDark ? 'border-slate-800/90' : 'border-white/70'}`}>
        <button
          onClick={toggleTheme}
          className={`flex items-center justify-center md:justify-start gap-2.5 w-full px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
            isDark
              ? 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
              : 'text-slate-600 hover:text-[#0B1535] hover:bg-white/65'
          }`}
        >
          {isDark ? (
            <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
            </svg>
          )}
          <span className="hidden md:inline">{isDark ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
