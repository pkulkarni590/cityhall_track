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
    director: 'bg-civic-100 text-civic-700 dark:bg-civic-900/40 dark:text-civic-300',
    manager: 'bg-accent-100 text-accent-700 dark:bg-accent-900/40 dark:text-accent-300',
    team_member: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    viewer: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  }

  return (
    <header className="h-16 bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 border-b-2 border-civic-200 dark:border-civic-700 flex items-center px-4 lg:px-6 gap-4 sticky top-0 z-20 shadow-md">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-civic-600 hover:bg-slate-100 dark:hover:text-civic-300 dark:hover:bg-slate-700 transition-colors"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1 max-w-sm hidden sm:block">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search projects..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-700/60 border-2 border-civic-200 dark:border-civic-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-civic-500 focus:border-civic-500 text-slate-900 dark:text-white placeholder-slate-400"
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
          className="p-2 rounded-lg text-slate-500 hover:text-civic-600 hover:bg-slate-100 dark:hover:text-civic-300 dark:hover:bg-slate-700 transition-colors"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <Link
          to="/notifications"
          className="relative p-2 rounded-lg text-slate-500 hover:text-civic-600 hover:bg-slate-100 dark:hover:text-civic-300 dark:hover:bg-slate-700 transition-colors"
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
            title={user?.name}
          >
            <img
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=1e3a8a&color=fff`}
              alt={user?.name}
              className="w-8 h-8 rounded-lg object-cover border-2 border-civic-300 dark:border-civic-700"
            />
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{user?.name?.split(' ')[0]}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColors[user?.role]}`}>
                {user?.role?.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <ChevronDown size={16} className={clsx('transition-transform', menuOpen && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-48 card p-2 space-y-1"
              >
                <Link
                  to="/profile"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-civic-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <User size={16} />
                  <span>Profile</span>
                </Link>
                <button
                  onClick={() => {
                    logout()
                    setMenuOpen(false)
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
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
