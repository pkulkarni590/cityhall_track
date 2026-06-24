import clsx from 'clsx'

const statusConfig = {
  not_started: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  on_hold: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  todo: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
  review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
}

const priorityConfig = {
  low: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
  medium: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
}

const statusDot = {
  not_started: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  completed: 'bg-emerald-500',
  blocked: 'bg-red-500',
  on_hold: 'bg-amber-500',
  todo: 'bg-slate-400',
  review: 'bg-purple-500',
  done: 'bg-emerald-500',
}

export function StatusBadge({ status, size = 'sm' }) {
  const label = status?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || ''
  return (
    <span className={clsx('badge gap-1.5', statusConfig[status], size === 'md' && 'px-2.5 py-1 text-sm')}>
      <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', statusDot[status])} />
      {label}
    </span>
  )
}

export function PriorityBadge({ priority }) {
  const label = priority?.charAt(0).toUpperCase() + priority?.slice(1) || ''
  return (
    <span className={clsx('badge', priorityConfig[priority])}>
      {priority === 'critical' && '🔴 '}
      {priority === 'high' && '🟠 '}
      {label}
    </span>
  )
}
