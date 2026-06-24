import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FolderKanban, Play, CheckCircle, XCircle, TrendingUp, ArrowRight, Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import { StatusBadge, PriorityBadge } from '../components/common/Badge'
import ProgressBar from '../components/common/ProgressBar'
import { formatDistanceToNow } from 'date-fns'

function StatCard({ icon: Icon, label, value, color, trend }) {
  return (
    <motion.div
      className="card p-5 hover:shadow-md transition-all"
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      whileHover={{ translateY: -2 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{value}</p>
          {trend && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1"><TrendingUp size={12} />{trend}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const { data: statsData } = useQuery({
    queryKey: ['project-stats'],
    queryFn: () => client.get('/projects/stats').then(r => r.data),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['recent-projects'],
    queryFn: () => client.get('/projects?limit=5').then(r => r.data),
  })

  const { data: auditData } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => client.get('/reports/audit-log?limit=10').then(r => r.data),
    enabled: user?.role === 'director',
  })

  const stats = statsData || {}
  const projects = projectsData?.projects?.slice(0, 5) || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-memphis-600 via-memphis-500 to-emerald-500 p-8 text-white shadow-xl"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fill-rule=evenodd%3E%3Cg fill=%23ffffff fill-opacity=0.05%3E%3Ccircle cx=30 cy=30 r=4/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="relative">
          <p className="text-memphis-100 text-sm font-medium uppercase tracking-wider mb-1">Welcome back</p>
          <h1 className="text-4xl font-bold mb-1">Innovation Team Memphis</h1>
          <p className="text-memphis-100 text-lg">
            Hello, <span className="font-semibold text-white">{user?.name}</span> — here's your overview for today.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/projects" className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur rounded-lg text-sm font-medium transition-all">
              <FolderKanban size={16} /> View Projects <ArrowRight size={14} />
            </Link>
            {['director', 'manager'].includes(user?.role) && (
              <Link to="/reports" className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg text-sm font-medium transition-all">
                <TrendingUp size={16} /> Reports
              </Link>
            )}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Total Projects" value={stats.total ?? '—'} color="bg-memphis-500" />
        <StatCard icon={Play} label="In Progress" value={stats.in_progress ?? '—'} color="bg-blue-500" />
        <StatCard icon={CheckCircle} label="Completed" value={stats.completed ?? '—'} color="bg-emerald-500" />
        <StatCard icon={XCircle} label="Blocked" value={stats.blocked ?? '—'} color="bg-red-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Projects</h2>
            <Link to="/projects" className="text-sm text-memphis-500 hover:text-memphis-600 font-medium flex items-center gap-1">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <FolderKanban size={40} className="mx-auto mb-3 opacity-30" />
                <p>No projects yet</p>
              </div>
            ) : projects.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link
                  to={`/projects/${p.id}`}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: p.color + '20' }}>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate group-hover:text-memphis-600 dark:group-hover:text-memphis-400 transition-colors">
                        {p.name}
                      </p>
                      <StatusBadge status={p.status} />
                    </div>
                    <ProgressBar value={p.progress} size="sm" />
                  </div>
                  <div className="text-right flex-shrink-0">
                    <PriorityBadge priority={p.priority} />
                    <p className="text-xs text-slate-400 mt-1">{p.task_count} tasks</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {user?.role === 'director' ? 'Recent Activity' : 'Quick Stats'}
            </h2>
          </div>

          {user?.role === 'director' && auditData?.logs ? (
            <div className="space-y-3">
              {auditData.logs.slice(0, 8).map(log => (
                <div key={log.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-memphis-100 dark:bg-memphis-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-memphis-600 dark:text-memphis-400 text-xs font-bold">
                      {log.user_name?.[0]?.toUpperCase() || 'S'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{log.user_name}</span>{' '}
                      <span className="text-slate-500">{log.action.replace(/_/g, ' ')}</span>
                      {log.resource_name && <span className="font-medium"> "{log.resource_name}"</span>}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock size={10} className="text-slate-400" />
                      <span className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <Link to="/audit-log" className="text-xs text-memphis-500 hover:text-memphis-600 font-medium flex items-center gap-1 mt-2">
                View full log <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: 'On Hold', value: stats.on_hold, color: 'bg-amber-500' },
                { label: 'Not Started', value: stats.not_started, color: 'bg-slate-400' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{item.label}</span>
                  </div>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{item.value ?? 0}</span>
                </div>
              ))}
              <div className="p-3 rounded-xl bg-gradient-to-r from-memphis-50 to-emerald-50 dark:from-memphis-900/20 dark:to-emerald-900/20 border border-memphis-100 dark:border-memphis-800">
                <p className="text-xs text-slate-500 dark:text-slate-400">Overall Progress</p>
                <p className="text-2xl font-bold text-memphis-600 dark:text-memphis-400 mt-1">
                  {stats.total > 0 ? Math.round(((stats.completed || 0) / stats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-500 mt-0.5">projects complete</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
