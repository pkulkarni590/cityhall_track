import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, CheckCheck, Trash2, Info, AlertTriangle, UserCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import client from '../api/client'
import clsx from 'clsx'

const typeIcons = {
  info: <Info size={15} className="text-blue-500" />,
  warning: <AlertTriangle size={15} className="text-amber-500" />,
  assignment: <UserCheck size={15} className="text-emerald-500" />,
  error: <AlertTriangle size={15} className="text-red-500" />,
}

export default function Notifications() {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => client.get('/notifications?limit=50').then(r => r.data),
    refetchInterval: 15000,
  })

  const markRead = useMutation({
    mutationFn: (id) => client.put(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries(['notifications'])
      qc.invalidateQueries(['notifications-count'])
    },
  })

  const markAll = useMutation({
    mutationFn: () => client.put('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries(['notifications'])
      qc.invalidateQueries(['notifications-count'])
      toast.success('All marked as read')
    },
  })

  const del = useMutation({
    mutationFn: (id) => client.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const notifications = data?.notifications || []
  const unreadCount = data?.unread_count || 0

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">{unreadCount}</span>
            )}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{notifications.length} total</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => markAll.mutate()} className="btn-secondary text-sm">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="card p-16 text-center">
          <Bell size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">All caught up!</h3>
          <p className="text-slate-500 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {notifications.map((n, i) => (
              <motion.div
                key={n.id}
                className={clsx(
                  'card p-4 flex items-start gap-3 transition-all',
                  !n.is_read && 'border-l-4 border-l-memphis-500 bg-memphis-50/30 dark:bg-memphis-900/10'
                )}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ delay: i * 0.03 }}
              >
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  {typeIcons[n.type] || typeIcons.info}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={clsx('text-sm font-medium', n.is_read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white')}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.is_read && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      title="Mark as read"
                    >
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => del.mutate(n.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
