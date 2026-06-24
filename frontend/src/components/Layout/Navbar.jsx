import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, Bell, Sun, Moon, LogOut, User, ChevronDown, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import client from '../../api/client'
import clsx from 'clsx'

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth()
  const { dark, toggleDark } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const { data: notifData } = useQuery({
    queryKey: ['notifications-count'],
    queryFn: () => client.get('/notifications?unread_only=true&limit=1').then(r => r.data),
    refetchInterval: 30000,
  })

  const unreadCount = notifData?.unread_count || 0

  const roleColors = {
    director: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    team_member: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    viewer: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  }

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-20 shadow-sm">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-700 transition-colors"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1 max-w-sm hidden sm:block">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search projects..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-memphis-500 focus:border-transparent text-slate-900 dark:text-white placeholder-slate-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value) {
                navigate(`/projects?search=${encodeURIComponent(e.target.value)}`)
              }
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={toggleDark}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-700 transition-colors"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Link
          to="/notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-700 transition-colors"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-memphis-400 to-emerald-400 flex items-center justify-center flex-shrink-0">
              {user?.avatar
                ? <img src={user.avatar} className="w-7 h-7 rounded-full object-cover" alt="" />
                : <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">{user?.name}</p>
              <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize', roleColors[user?.role])}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl py-1 z-50"
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <User size={15} /> Profile
                </Link>
                <hr className="my-1 border-slate-200 dark:border-slate-700" />
                <button
                  onClick={logout}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
