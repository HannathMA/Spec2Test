import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  FlaskConical,
  PlaySquare,
  Network,
  GitCompare,
  Settings,
  Search,
  Bell,
  ChevronRight,
  Menu,
  X,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Spec2TestLogo } from '../common/Spec2TestLogo';
import { Project } from '../../types';

interface AppShellProps {
  children: React.ReactNode;
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (p: Project) => void;
  onRefreshData?: () => void;
  onResetDemo?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  projects,
  activeProject,
  onSelectProject,
  onRefreshData,
  onResetDemo
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Overview', path: '/', icon: LayoutDashboard },
    { label: 'Requirements', path: '/requirements', icon: FileText },
    { label: 'Test Lab', path: '/test-lab', icon: FlaskConical },
    { label: 'Execution', path: '/execution', icon: PlaySquare },
    { label: 'Traceability', path: '/traceability', icon: Network },
    { label: 'Change Impact', path: '/change-impact', icon: GitCompare },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F5F4EF] flex flex-col md:flex-row font-sans text-[#171717]">
      {/* Mobile top bar */}
      <div className="md:hidden bg-[#171717] text-white p-4 flex items-center justify-between border-b border-[#262626]">
        <Spec2TestLogo size={24} />
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-neutral-300 hover:text-white"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Primary Sidebar (Near-Black #171717) */}
      <aside
        className={`
          ${mobileMenuOpen ? 'block' : 'hidden'}
          md:flex md:flex-col md:w-64 bg-[#171717] text-neutral-300 border-r border-[#262626] flex-shrink-0 z-30
          fixed md:sticky top-0 h-screen overflow-y-auto
        `}
      >
        {/* Brand header */}
        <div className="p-5 border-b border-[#262626]">
          <Spec2TestLogo size={26} />
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 text-[13.5px] font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-[#262626] text-white border-l-2 border-[#C8F169] font-semibold'
                      : 'text-neutral-400 hover:bg-[#202020] hover:text-neutral-200'
                  }
                `}
              >
                <Icon size={17} className={isActive ? 'text-[#C8F169]' : 'text-neutral-400'} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom Section: Active Project & Quick Connection */}
        <div className="p-3 border-t border-[#262626] space-y-2">
          {/* Active project card */}
          <div className="relative">
            <button
              onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
              className="w-full text-left bg-[#202020] hover:bg-[#262626] border border-[#333333] p-2.5 flex items-center justify-between transition-colors"
            >
              <div className="truncate pr-2">
                <div className="text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                  Active Project
                </div>
                <div className="text-[13px] font-semibold text-white truncate">
                  {activeProject ? activeProject.name : 'Select Project'}
                </div>
              </div>
              <ChevronRight size={14} className="text-neutral-400 flex-shrink-0" />
            </button>

            {projectDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#1A1A1A] border border-[#333333] shadow-lg z-50">
                <div className="p-2 border-b border-[#2B2B2B] flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-mono text-[11px] uppercase">Switch Project</span>
                  {onResetDemo && (
                    <button
                      onClick={() => {
                        setProjectDropdownOpen(false);
                        onResetDemo();
                      }}
                      className="text-[#C8F169] hover:underline text-[11px] flex items-center gap-1"
                    >
                      <RefreshCw size={10} /> Reset Demo
                    </button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectProject(p);
                        setProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-[#262626] truncate ${
                        activeProject?.id === p.id ? 'text-[#C8F169] font-bold bg-[#222222]' : 'text-neutral-300'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Connection state */}
          <div className="px-2 py-1.5 flex items-center justify-between text-[11px] font-mono text-neutral-400 border border-[#262626] bg-[#141414]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#16845B]" />
              API: 127.0.0.1:8000
            </span>
            <span className="text-[#C8F169]">v1.0</span>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header navigation */}
        <header className="h-14 border-b border-[#D7D6D0] bg-white px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[#777777] uppercase tracking-wider">
              Workspace
            </span>
            <span className="text-[#D7D6D0]">/</span>
            <span className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
              {activeProject?.name || 'Commerce API Verification'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick search input */}
            <div className="hidden sm:flex items-center bg-[#F5F4EF] border border-[#D7D6D0] px-2.5 py-1 text-xs">
              <Search size={14} className="text-[#777777] mr-2" />
              <input
                type="text"
                placeholder="Search specs, tests, runs..."
                className="bg-transparent border-none outline-none text-xs text-[#171717] w-48 placeholder-[#888888]"
              />
            </div>

            {/* Notification bell */}
            <button className="text-[#777777] hover:text-[#171717] p-1.5 transition-colors relative">
              <Bell size={16} />
              <span className="w-1.5 h-1.5 bg-[#365CFF] rounded-full absolute top-1 right-1" />
            </button>

            {/* User avatar matching screenshot */}
            <div className="w-8 h-8 rounded-full bg-[#171717] text-white flex items-center justify-center font-bold text-xs tracking-wider border border-[#333333]">
              HM
            </div>
          </div>
        </header>

        {/* Content View */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
