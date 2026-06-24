import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderKanban, Users, FileText,
  BarChart3, Bell, User, Shield, X, ChevronRight, Calendar
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import clsx from 'clsx'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['director', 'manager'] },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/audit-log', label: 'Audit Log', icon: Shield, roles: ['director'] },
]

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  const location = useLocation()

  const filtered = navItems.filter(item =>
    !item.roles || item.roles.includes(user?.role)
  )

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className={clsx(
          'fixed top-0 left-0 h-full z-40 w-64 bg-slate-900 dark:bg-slate-950 flex flex-col',
          'lg:relative lg:translate-x-0 lg:flex lg:z-auto transition-transform duration-300',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-memphis-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-lg font-bold">M</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Innovation</p>
              <p className="text-memphis-400 text-xs">Team Memphis</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white p-1">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filtered.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              onClick={() => window.innerWidth < 1024 && onClose()}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-memphis-600 text-white shadow-md shadow-memphis-900/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              )}
            >
              <Icon size={18} className="flex-shrink-0" />
              <span>{label}</span>
              <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-50 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-slate-800/60">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-memphis-400 to-emerald-400 flex items-center justify-center flex-shrink-0">
              {user?.avatar
                ? <img src={user.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                : <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name}</p>
              <p className="text-slate-400 text-xs capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
