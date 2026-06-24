import { motion } from 'framer-motion'
import clsx from 'clsx'

export default function ProgressBar({ value = 0, size = 'md', showLabel = true, color = 'blue' }) {
  const h = { sm: 'h-1.5', md: 'h-2', lg: 'h-3' }[size]
  const colors = {
    blue: 'bg-memphis-500',
    green: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  }
  const auto = value >= 80 ? colors.green : value >= 50 ? colors.blue : value >= 25 ? colors.amber : colors.red

  return (
    <div className="flex items-center gap-2">
      <div className={clsx('flex-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden', h)}>
        <motion.div
          className={clsx('h-full rounded-full', color === 'auto' ? auto : colors[color] || colors.blue)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-8 text-right">
          {value}%
        </span>
      )}
    </div>
  )
}
