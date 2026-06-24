import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Shield, Search, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

const actionColors = {
  login: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  signup: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  create_project: 'bg-memphis-100 text-memphis-700 dark:bg-memphis-900/30 dark:text-memphis-300',
  update_project: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  delete_project: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  create_task: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  update_task: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  delete_task: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  upload_document: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  update_profile: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
}

export default function AuditLog() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [resourceType, setResourceType] = useState('')

  if (user?.role !== 'director') {
    navigate('/')
    return null
  }

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', resourceType],
    queryFn: () => client.get(`/reports/audit-log?limit=200${resourceType ? `&resource_type=${resourceType}` : ''}`).then(r => r.data),
  })

  const logs = data?.logs || []

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield size={24} className="text-memphis-500" /> Audit Log
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{logs.length} records · Director access only</p>
        </div>
        <select
          className="input w-44"
          value={resourceType}
          onChange={e => setResourceType(e.target.value)}
        >
          <option value="">All Resources</option>
          {['user', 'project', 'task', 'document'].map(r => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                {['Time', 'User', 'Action', 'Resource', 'Name'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {[1,2,3,4,5].map(j => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    <Shield size={32} className="mx-auto mb-3 opacity-30" />
                    No audit logs found
                  </td>
                </tr>
              ) : logs.map((log, i) => (
                <motion.tr
                  key={log.id}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4) }}
                >
                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                    {format(new Date(log.created_at), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-memphis-100 dark:bg-memphis-900/30 flex items-center justify-center text-xs font-bold text-memphis-700 dark:text-memphis-400 flex-shrink-0">
                        {log.user_name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{log.user_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${actionColors[log.action] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {log.action?.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 capitalize">{log.resource_type}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300 max-w-xs truncate">{log.resource_name || '—'}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
