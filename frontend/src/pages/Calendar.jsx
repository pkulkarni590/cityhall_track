import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, Calendar as CalIcon,
  List, FolderKanban, CheckSquare, Flag, X,
  ArrowRight, AlertCircle, Clock
} from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, isToday,
  format, addMonths, subMonths, isPast, isFuture,
  parseISO, isWithinInterval, startOfDay, addDays,
  differenceInDays
} from 'date-fns'
import client from '../api/client'
import clsx from 'clsx'

const STATUS_COLORS = {
  not_started: '#94a3b8',
  in_progress: '#3b82f6',
  completed: '#10b981',
  blocked: '#ef4444',
  on_hold: '#f59e0b',
  todo: '#94a3b8',
  review: '#a855f7',
  done: '#10b981',
}

const PRIORITY_ICON = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '⚪',
}

function EventPill({ event, compact = false }) {
  const isProjectDue = event.type === 'project_due'
  const isProjectStart = event.type === 'project_start'
  const isTask = event.type === 'task'
  const overdue = isPast(parseISO(event.date)) && event.status !== 'done' && event.status !== 'completed'

  return (
    <div
      className={clsx(
        'flex items-center gap-1 rounded-md px-1.5 text-white truncate cursor-default',
        compact ? 'py-0.5 text-[10px]' : 'py-1 text-xs',
        overdue && 'ring-1 ring-red-400 ring-inset'
      )}
      style={{ backgroundColor: overdue ? '#ef4444' : event.color }}
      title={`${isProjectDue ? '📅 Due: ' : isProjectStart ? '🚀 Start: ' : '✅ '}${event.title}${event.project_name ? ` (${event.project_name})` : ''}`}
    >
      <span className="flex-shrink-0 text-[9px]">
        {isProjectDue ? '📅' : isProjectStart ? '🚀' : '✅'}
      </span>
      <span className="truncate font-medium">{event.title}</span>
    </div>
  )
}

function DayCell({ day, events, currentMonth, onSelect, selected }) {
  const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day))
  const isCurrentMonth = isSameMonth(day, currentMonth)
  const isSelected = selected && isSameDay(day, selected)
  const todayDay = isToday(day)
  const MAX_VISIBLE = 3

  return (
    <motion.div
      onClick={() => dayEvents.length > 0 || onSelect(day)}
      className={clsx(
        'min-h-[90px] p-1.5 border-b border-r border-slate-100 dark:border-slate-700/60 cursor-pointer transition-colors',
        !isCurrentMonth && 'bg-slate-50/50 dark:bg-slate-800/30',
        isCurrentMonth && 'hover:bg-memphis-50/40 dark:hover:bg-memphis-900/10',
        isSelected && 'bg-memphis-50 dark:bg-memphis-900/20 ring-inset ring-1 ring-memphis-400',
        dayEvents.length > 0 && 'cursor-pointer'
      )}
      onClick={() => onSelect(day)}
      whileHover={{ scale: 1.005 }}
      transition={{ duration: 0.1 }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={clsx(
          'w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold',
          todayDay && 'bg-memphis-500 text-white shadow-sm',
          !todayDay && isCurrentMonth && 'text-slate-700 dark:text-slate-200',
          !isCurrentMonth && 'text-slate-300 dark:text-slate-600',
        )}>
          {format(day, 'd')}
        </span>
        {dayEvents.length > MAX_VISIBLE && (
          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500">
            +{dayEvents.length - MAX_VISIBLE}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        {dayEvents.slice(0, MAX_VISIBLE).map((ev, i) => (
          <EventPill key={`${ev.type}-${ev.id}-${i}`} event={ev} compact />
        ))}
      </div>
    </motion.div>
  )
}

function DayDetail({ day, events, onClose }) {
  const dayEvents = events.filter(e => isSameDay(parseISO(e.date), day))
  const projects = dayEvents.filter(e => e.type === 'project_due' || e.type === 'project_start')
  const tasks = dayEvents.filter(e => e.type === 'task')
  const overdue = (e) => isPast(parseISO(e.date)) && e.status !== 'done' && e.status !== 'completed'

  return (
    <motion.div
      className="w-72 flex-shrink-0 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col h-full overflow-hidden"
      initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
        <div>
          <p className="font-semibold text-slate-900 dark:text-white text-sm">
            {format(day, 'EEEE')}
          </p>
          <p className="text-memphis-500 font-bold">{format(day, 'MMMM d, yyyy')}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {dayEvents.length === 0 && (
          <div className="text-center py-8">
            <CalIcon size={32} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400">Nothing scheduled</p>
          </div>
        )}

        {projects.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FolderKanban size={12} /> Projects ({projects.length})
            </p>
            <div className="space-y-2">
              {projects.map((ev, i) => (
                <Link
                  key={i}
                  to={`/projects/${ev.project_id}`}
                  className="block p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-memphis-300 dark:hover:border-memphis-600 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: ev.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-memphis-600 dark:group-hover:text-memphis-400 transition-colors">
                        {ev.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={clsx('text-[10px] font-medium px-1.5 py-0.5 rounded-full', {
                          'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400': ev.status === 'not_started',
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300': ev.status === 'in_progress',
                          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300': ev.status === 'completed',
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300': ev.status === 'blocked',
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300': ev.status === 'on_hold',
                        })}>
                          {ev.status.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {ev.type === 'project_due' ? '📅 Due date' : '🚀 Start date'}
                        </span>
                        {overdue(ev) && <span className="text-[10px] text-red-500 font-medium">⚠ Overdue</span>}
                      </div>
                      {ev.progress !== undefined && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                            <span>Progress</span><span>{ev.progress}%</span>
                          </div>
                          <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-memphis-500 transition-all" style={{ width: `${ev.progress}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <ArrowRight size={12} className="text-slate-300 group-hover:text-memphis-400 transition-colors flex-shrink-0 mt-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {tasks.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckSquare size={12} /> Tasks ({tasks.length})
            </p>
            <div className="space-y-2">
              {tasks.map((ev, i) => (
                <Link
                  key={i}
                  to={`/projects/${ev.project_id}`}
                  className="block p-3 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-memphis-300 dark:hover:border-memphis-600 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: STATUS_COLORS[ev.status] || '#94a3b8' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-memphis-600 dark:group-hover:text-memphis-400 transition-colors">
                        {ev.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {ev.project_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-[10px] font-medium">{PRIORITY_ICON[ev.priority]} {ev.priority}</span>
                        {overdue(ev) && <span className="text-[10px] text-red-500 font-medium">⚠ Overdue</span>}
                      </div>
                      {ev.assignees?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          {ev.assignees.slice(0, 3).map(a => (
                            <div key={a.id} className="w-4 h-4 rounded-full bg-gradient-to-br from-memphis-400 to-emerald-400 flex items-center justify-center text-[8px] text-white font-bold" title={a.name}>
                              {a.name?.[0]?.toUpperCase()}
                            </div>
                          ))}
                          {ev.assignees.length > 3 && <span className="text-[10px] text-slate-400">+{ev.assignees.length - 3}</span>}
                        </div>
                      )}
                    </div>
                    <ArrowRight size={12} className="text-slate-300 group-hover:text-memphis-400 transition-colors flex-shrink-0 mt-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}

function UpcomingList({ events }) {
  const today = startOfDay(new Date())
  const next90 = addDays(today, 90)

  const upcoming = events
    .filter(e => {
      const d = parseISO(e.date)
      return d >= today && d <= next90
    })
    .sort((a, b) => parseISO(a.date) - parseISO(b.date))

  const overdue = events
    .filter(e => {
      const d = parseISO(e.date)
      return d < today && e.status !== 'done' && e.status !== 'completed'
    })
    .sort((a, b) => parseISO(b.date) - parseISO(a.date))

  const groupByDate = (arr) => {
    const groups = {}
    arr.forEach(e => {
      const key = format(parseISO(e.date), 'yyyy-MM-dd')
      if (!groups[key]) groups[key] = []
      groups[key].push(e)
    })
    return groups
  }

  const upcomingGroups = groupByDate(upcoming)
  const overdueGroups = groupByDate(overdue)

  const renderGroup = (dateKey, evs, isOverdueGroup = false) => (
    <div key={dateKey} className="mb-4">
      <div className={clsx(
        'flex items-center gap-2 mb-2 px-1',
        isOverdueGroup ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'
      )}>
        <div className={clsx('h-px flex-1', isOverdueGroup ? 'bg-red-200 dark:bg-red-900/40' : 'bg-slate-200 dark:bg-slate-700')} />
        <span className="text-xs font-semibold whitespace-nowrap">
          {isOverdueGroup
            ? `⚠ ${format(parseISO(dateKey), 'MMM d')} (overdue)`
            : isToday(parseISO(dateKey))
              ? '📌 Today'
              : differenceInDays(parseISO(dateKey), today) === 1
                ? '⏰ Tomorrow'
                : format(parseISO(dateKey), 'EEE, MMM d')
          }
        </span>
        <div className={clsx('h-px flex-1', isOverdueGroup ? 'bg-red-200 dark:bg-red-900/40' : 'bg-slate-200 dark:bg-slate-700')} />
      </div>
      <div className="space-y-2">
        {evs.map((ev, i) => (
          <Link
            key={i}
            to={`/projects/${ev.project_id}`}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-xl border transition-all group hover:shadow-sm',
              isOverdueGroup
                ? 'border-red-100 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-700 bg-red-50/40 dark:bg-red-900/10'
                : 'border-slate-100 dark:border-slate-700 hover:border-memphis-200 dark:hover:border-memphis-700'
            )}
          >
            <div className="flex-shrink-0">
              {ev.type === 'project_due' || ev.type === 'project_start' ? (
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: ev.color + '25' }}>
                  <FolderKanban size={15} style={{ color: ev.color }} />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                  <CheckSquare size={15} className="text-slate-500 dark:text-slate-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-memphis-600 dark:group-hover:text-memphis-400 transition-colors">
                {ev.title}
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span>
                  {ev.type === 'project_due' ? '📅 Due' : ev.type === 'project_start' ? '🚀 Starts' : `✅ ${ev.project_name}`}
                </span>
                {ev.priority && <span>{PRIORITY_ICON[ev.priority]}</span>}
              </div>
            </div>
            <ArrowRight size={13} className="text-slate-300 group-hover:text-memphis-400 transition-colors flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-1">
      {overdue.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm font-medium text-red-700 dark:text-red-300">{overdue.length} overdue item{overdue.length !== 1 ? 's' : ''}</p>
          </div>
          {Object.entries(overdueGroups).map(([date, evs]) => renderGroup(date, evs, true))}
        </div>
      )}

      {upcoming.length === 0 && overdue.length === 0 && (
        <div className="text-center py-16">
          <CalIcon size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-400 text-sm">No upcoming deadlines in the next 90 days</p>
        </div>
      )}

      {Object.entries(upcomingGroups).map(([date, evs]) => renderGroup(date, evs, false))}
    </div>
  )
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [view, setView] = useState('calendar') // 'calendar' | 'list'

  const { data, isLoading } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: () => client.get('/tasks/calendar').then(r => r.data),
    staleTime: 60000,
  })

  const events = data?.events || []

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const eventsByDay = useMemo(() => {
    const map = {}
    events.forEach(e => {
      const key = format(parseISO(e.date), 'yyyy-MM-dd')
      if (!map[key]) map[key] = []
      map[key].push(e)
    })
    return map
  }, [events])

  const thisMonthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const monthEvents = events.filter(e => {
      const d = parseISO(e.date)
      return isWithinInterval(d, { start: monthStart, end: monthEnd })
    })
    return {
      total: monthEvents.length,
      projects: monthEvents.filter(e => e.type !== 'task').length,
      tasks: monthEvents.filter(e => e.type === 'task').length,
    }
  }, [events, currentMonth])

  const handleDayClick = (day) => {
    const key = format(day, 'yyyy-MM-dd')
    const hasEvents = (eventsByDay[key] || []).length > 0
    if (selectedDay && isSameDay(day, selectedDay)) {
      setSelectedDay(null)
    } else {
      setSelectedDay(day)
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CalIcon size={24} className="text-memphis-500" /> Calendar
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            All project deadlines and milestones at a glance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {[
              { id: 'calendar', icon: CalIcon, label: 'Month' },
              { id: 'list', icon: List, label: 'List' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-all',
                  view === v.id
                    ? 'bg-memphis-500 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                )}
              >
                <v.icon size={14} /> {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
        {[
          { label: 'Events this month', value: thisMonthStats.total, color: 'text-memphis-600 dark:text-memphis-400', bg: 'bg-memphis-50 dark:bg-memphis-900/20' },
          { label: 'Project milestones', value: thisMonthStats.projects, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Task deadlines', value: thisMonthStats.tasks, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
        ].map(s => (
          <div key={s.label} className={clsx('rounded-xl p-4 border border-transparent', s.bg)}>
            <p className={clsx('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="card h-96 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-memphis-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'list' ? (
        <div className="card p-5 max-w-2xl mx-auto">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock size={16} className="text-memphis-500" /> Upcoming Deadlines
          </h2>
          <UpcomingList events={events} />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
            <button
              onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setSelectedDay(null) }}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()) }}
                className="text-xs text-memphis-500 hover:text-memphis-600 font-medium mt-0.5 transition-colors"
              >
                Today: {format(new Date(), 'MMM d')}
              </button>
            </div>
            <button
              onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setSelectedDay(null) }}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex overflow-hidden">
            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
                {WEEKDAYS.map(d => (
                  <div key={d} className="py-2 text-center text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide border-r border-slate-100 dark:border-slate-700/60 last:border-r-0">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((day, i) => {
                  const key = format(day, 'yyyy-MM-dd')
                  return (
                    <DayCell
                      key={key}
                      day={day}
                      events={eventsByDay[key] || []}
                      currentMonth={currentMonth}
                      onSelect={handleDayClick}
                      selected={selectedDay}
                    />
                  )
                })}
              </div>

              <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-5 flex-wrap">
                {[
                  { icon: '📅', label: 'Project due date' },
                  { icon: '🚀', label: 'Project start' },
                  { icon: '✅', label: 'Task deadline' },
                  { label: 'Overdue', pill: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    {item.pill ? (
                      <div className="w-3 h-3 rounded-full bg-red-500 ring-1 ring-red-400 ring-offset-1 dark:ring-offset-slate-800" />
                    ) : (
                      <span>{item.icon}</span>
                    )}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {selectedDay && (
                <DayDetail
                  day={selectedDay}
                  events={events}
                  onClose={() => setSelectedDay(null)}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}
