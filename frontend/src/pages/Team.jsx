import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, Search, BarChart2, Mail, Briefcase, CheckSquare } from 'lucide-react'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import clsx from 'clsx'

const roleColors = {
  director: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  team_member: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  viewer: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

export default function Team() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [view, setView] = useState('directory')
  const [selectedMember, setSelectedMember] = useState(null)

  const { data: teamData, isLoading } = useQuery({
    queryKey: ['team', search],
    queryFn: () => client.get(`/team?search=${encodeURIComponent(search)}`).then(r => r.data),
  })

  const { data: workloadData } = useQuery({
    queryKey: ['workload'],
    queryFn: () => client.get('/team/workload').then(r => r.data),
    enabled: view === 'workload',
  })

  const { data: memberDetail } = useQuery({
    queryKey: ['member', selectedMember],
    queryFn: () => client.get(`/team/${selectedMember}`).then(r => r.data),
    enabled: !!selectedMember,
  })

  const members = teamData?.members || []
  const workload = workloadData?.workload || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Team</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{members.length} members</p>
        </div>
        <div className="flex gap-2">
          {['directory', 'workload'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize',
                view === v
                  ? 'bg-memphis-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-memphis-300'
              )}
            >
              {v === 'workload' ? <BarChart2 size={14} className="inline mr-1.5" /> : <Users size={14} className="inline mr-1.5" />}
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9 max-w-sm"
          placeholder="Search team members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {view === 'directory' && (
        isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="card p-5 animate-pulse">
                <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 mb-3" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {members.map((member, i) => (
              <motion.div
                key={member.id}
                className="card p-5 cursor-pointer hover:shadow-lg transition-all"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ translateY: -3 }}
                onClick={() => setSelectedMember(member.id)}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-memphis-400 to-emerald-400 flex items-center justify-center text-white text-2xl font-bold mb-3 shadow-lg">
                    {member.avatar
                      ? <img src={member.avatar} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                      : member.name[0].toUpperCase()
                    }
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">{member.name}</h3>
                  {member.title && <p className="text-xs text-slate-400 mt-0.5">{member.title}</p>}
                  <span className={clsx('mt-2 badge capitalize', roleColors[member.role])}>
                    {member.role?.replace('_', ' ')}
                  </span>

                  <div className="mt-4 w-full flex items-center justify-around border-t border-slate-100 dark:border-slate-700 pt-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{member.active_tasks ?? 0}</p>
                      <p className="text-xs text-slate-400">Active Tasks</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{member.project_count ?? 0}</p>
                      <p className="text-xs text-slate-400">Projects</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )
      )}

      {view === 'workload' && (
        <div className="space-y-4">
          {workload.map((item, i) => (
            <motion.div
              key={item.user.id}
              className="card p-5"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-memphis-400 to-emerald-400 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {item.user.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{item.user.name}</h3>
                    <span className={clsx('badge capitalize', roleColors[item.user.role])}>
                      {item.user.role?.replace('_', ' ')}
                    </span>
                    <span className="ml-auto text-sm font-medium text-slate-500 dark:text-slate-400">
                      {item.task_count} active task{item.task_count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {item.active_tasks.length === 0 ? (
                    <p className="text-sm text-slate-400">No active tasks</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {item.active_tasks.slice(0, 6).map(task => (
                        <div
                          key={task.id}
                          className={clsx('px-2.5 py-1 rounded-lg text-xs font-medium border', {
                            'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300': task.status === 'in_progress',
                            'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300': task.status === 'review',
                            'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300': task.status === 'todo',
                          })}
                        >
                          {task.title}
                        </div>
                      ))}
                      {item.active_tasks.length > 6 && (
                        <div className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600">
                          +{item.active_tasks.length - 6} more
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selectedMember && memberDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedMember(null)}>
          <motion.div
            className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[85vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-memphis-400 to-emerald-400 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                  {memberDetail.member.name[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{memberDetail.member.name}</h2>
                  {memberDetail.member.title && <p className="text-slate-500 text-sm">{memberDetail.member.title}</p>}
                  <span className={clsx('mt-1.5 badge capitalize', roleColors[memberDetail.member.role])}>
                    {memberDetail.member.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {memberDetail.member.email && (
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                  <Mail size={15} className="text-slate-400" />
                  {memberDetail.member.email}
                </div>
              )}

              {memberDetail.member.bio && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{memberDetail.member.bio}</p>
              )}

              {memberDetail.projects?.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <Briefcase size={14} /> Projects ({memberDetail.projects.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {memberDetail.projects.map(p => (
                      <span key={p.id} className="px-2.5 py-1 text-xs font-medium rounded-lg bg-memphis-50 dark:bg-memphis-900/20 text-memphis-700 dark:text-memphis-300 border border-memphis-100 dark:border-memphis-800">
                        {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {memberDetail.tasks?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <CheckSquare size={14} /> Active Tasks ({memberDetail.tasks.length})
                  </h3>
                  <div className="space-y-2">
                    {memberDetail.tasks.map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                        <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', {
                          'bg-blue-500': t.status === 'in_progress',
                          'bg-purple-500': t.status === 'review',
                          'bg-slate-300': t.status === 'todo',
                        })} />
                        <span className="text-slate-700 dark:text-slate-300 flex-1 truncate">{t.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex justify-end">
                <button onClick={() => setSelectedMember(null)} className="btn-secondary">Close</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
