import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid
} from 'recharts'
import { Download, BarChart3, TrendingUp, Calendar, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { format, differenceInDays } from 'date-fns'
import client from '../api/client'
import { useAuth } from '../context/AuthContext'
import { StatusBadge } from '../components/common/Badge'
import ProgressBar from '../components/common/ProgressBar'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  not_started: '#94a3b8',
  in_progress: '#3b82f6',
  completed: '#10b981',
  blocked: '#ef4444',
  on_hold: '#f59e0b',
}

const PRIORITY_COLORS = {
  low: '#94a3b8',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
}

export default function Reports() {
  const { user } = useAuth()
  const [selectedProject, setSelectedProject] = useState(null)

  const { data: overview } = useQuery({
    queryKey: ['reports-overview'],
    queryFn: () => client.get('/reports/overview').then(r => r.data),
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: () => client.get('/projects').then(r => r.data),
  })

  const { data: ganttData } = useQuery({
    queryKey: ['gantt', selectedProject],
    queryFn: () => client.get(`/reports/project/${selectedProject}/gantt`).then(r => r.data),
    enabled: !!selectedProject,
  })

  const projects = projectsData?.projects || []

  const statusData = overview?.status_distribution
    ? Object.entries(overview.status_distribution).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value,
        color: STATUS_COLORS[name],
      }))
    : []

  const priorityData = overview?.priority_distribution
    ? Object.entries(overview.priority_distribution).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        fill: PRIORITY_COLORS[name],
      }))
    : []

  const taskStatusData = overview?.task_status_distribution
    ? Object.entries(overview.task_status_distribution).map(([name, value]) => ({
        name: name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        value,
        fill: STATUS_COLORS[name] || '#94a3b8',
      }))
    : []

  const handleExportPDF = async () => {
    try {
      const res = await client.get('/reports/export/pdf', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `innovation-memphis-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Report exported!')
    } catch (e) {
      toast.error('Export failed')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Project health and analytics</p>
        </div>
        <button onClick={handleExportPDF} className="btn-primary">
          <Download size={16} /> Export PDF
        </button>
      </div>

      {overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Projects', value: overview.total_projects, color: 'text-memphis-600 dark:text-memphis-400' },
            { label: 'Total Tasks', value: overview.total_tasks, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Team Size', value: overview.team_size, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Avg Progress', value: `${overview.average_progress}%`, color: 'text-amber-600 dark:text-amber-400' },
          ].map(item => (
            <div key={item.label} className="card p-5 text-center">
              <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Status Distribution</h2>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false} fontSize={10}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {statusData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 dark:text-slate-300">{item.name}</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Priority Breakdown</h2>
          {priorityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {priorityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>

        <div className="card p-5">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Task Status</h2>
          {taskStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={taskStatusData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {taskStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar size={18} className="text-memphis-500" /> Project Timeline (Gantt)
        </h2>
        <div className="flex gap-3 mb-4 flex-wrap">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p.id === selectedProject ? null : p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                selectedProject === p.id
                  ? 'bg-memphis-500 text-white border-memphis-500'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-memphis-300'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {ganttData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-memphis-50 dark:bg-memphis-900/20 border border-memphis-100 dark:border-memphis-800">
              <div className="flex-1">
                <h3 className="font-semibold text-memphis-700 dark:text-memphis-300 text-sm">{ganttData.project.name}</h3>
                <div className="flex items-center gap-3 text-xs text-memphis-500 mt-0.5">
                  {ganttData.project.start_date && <span>{format(new Date(ganttData.project.start_date), 'MMM d, yyyy')}</span>}
                  <ChevronRight size={12} />
                  {ganttData.project.due_date && <span>{format(new Date(ganttData.project.due_date), 'MMM d, yyyy')}</span>}
                </div>
              </div>
              <div className="w-32">
                <ProgressBar value={ganttData.project.progress} size="sm" color="auto" />
              </div>
            </div>

            {ganttData.tasks.map((task, i) => {
              const startDate = ganttData.project.start_date ? new Date(ganttData.project.start_date) : new Date()
              const endDate = ganttData.project.due_date ? new Date(ganttData.project.due_date) : new Date()
              const taskEnd = task.due_date ? new Date(task.due_date) : endDate
              const totalDays = differenceInDays(endDate, startDate) || 1
              const taskDays = differenceInDays(taskEnd, startDate)
              const barWidth = Math.min(100, Math.max(5, (taskDays / totalDays) * 100))

              return (
                <motion.div
                  key={task.id}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="w-48 flex-shrink-0">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{task.title}</p>
                    <StatusBadge status={task.status} />
                  </div>
                  <div className="flex-1 h-7 bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden relative">
                    <div
                      className="h-full rounded-lg flex items-center px-2 transition-all"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: STATUS_COLORS[task.status] + 'cc',
                      }}
                    >
                      <span className="text-[10px] text-white font-medium truncate">{task.progress}%</span>
                    </div>
                  </div>
                  {task.due_date && (
                    <span className="text-xs text-slate-400 w-20 flex-shrink-0">{format(new Date(task.due_date), 'MMM d')}</span>
                  )}
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {!selectedProject && (
          <div className="text-center py-10 text-slate-400">
            <Calendar size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a project to view its Gantt chart</p>
          </div>
        )}
      </div>
    </div>
  )
}
