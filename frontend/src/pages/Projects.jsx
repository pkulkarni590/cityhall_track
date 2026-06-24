import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Filter, FolderKanban, Trash2, Edit3, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import Modal from '../components/common/Modal'
import { StatusBadge, PriorityBadge } from '../components/common/Badge'
import ProgressBar from '../components/common/ProgressBar'

function ProjectForm({ project, onClose }) {
  const qc = useQueryClient()
  const { data: teamData } = useQuery({
    queryKey: ['team'],
    queryFn: () => client.get('/team').then(r => r.data),
  })

  const [form, setForm] = useState({
    name: project?.name || '',
    description: project?.description || '',
    status: project?.status || 'not_started',
    priority: project?.priority || 'medium',
    start_date: project?.start_date || '',
    due_date: project?.due_date || '',
    progress: project?.progress || 0,
    color: project?.color || '#0EA5E9',
    member_ids: project?.members?.map(m => m.user_id) || [],
  })

  const mutation = useMutation({
    mutationFn: (data) => project
      ? client.put(`/projects/${project.id}`, data).then(r => r.data)
      : client.post('/projects', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['projects'])
      qc.invalidateQueries(['project-stats'])
      toast.success(project ? 'Project updated' : 'Project created')
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  })

  const members = teamData?.members || []

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Project Name *</label>
          <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" />
        </div>
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea className="input resize-none" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the project..." />
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {['not_started', 'in_progress', 'completed', 'blocked', 'on_hold'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            {['low', 'medium', 'high', 'critical'].map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Start Date</label>
          <input type="date" className="input" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
        </div>
        <div>
          <label className="label">Due Date</label>
          <input type="date" className="input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <div>
          <label className="label">Progress ({form.progress}%)</label>
          <input type="range" min={0} max={100} value={form.progress} onChange={e => setForm(f => ({ ...f, progress: Number(e.target.value) }))} className="w-full accent-memphis-500" />
        </div>
        <div>
          <label className="label">Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
            <input type="text" className="input flex-1" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
          </div>
        </div>
        {!project && (
          <div className="col-span-2">
            <label className="label">Team Members</label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-lg divide-y divide-slate-100 dark:divide-slate-700">
              {members.map(m => (
                <label key={m.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700">
                  <input
                    type="checkbox"
                    checked={form.member_ids.includes(m.id)}
                    onChange={e => {
                      setForm(f => ({
                        ...f,
                        member_ids: e.target.checked ? [...f.member_ids, m.id] : f.member_ids.filter(id => id !== m.id)
                      }))
                    }}
                    className="accent-memphis-500"
                  />
                  <div className="w-7 h-7 rounded-full bg-memphis-100 dark:bg-memphis-900/30 flex items-center justify-center text-xs font-bold text-memphis-700 dark:text-memphis-400">
                    {m.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{m.name}</p>
                    <p className="text-xs text-slate-400 capitalize">{m.role?.replace('_', ' ')}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
        </button>
      </div>
    </form>
  )
}

export default function Projects() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [modalOpen, setModalOpen] = useState(false)
  const [editProject, setEditProject] = useState(null)

  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const priority = searchParams.get('priority') || ''

  const [localSearch, setLocalSearch] = useState(search)

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search, status, priority],
    queryFn: () => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      if (priority) params.set('priority', priority)
      return client.get(`/projects?${params}`).then(r => r.data)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['projects'])
      qc.invalidateQueries(['project-stats'])
      toast.success('Project deleted')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  })

  const canManage = ['director', 'manager'].includes(user?.role)

  const handleSearch = (e) => {
    const val = e.target.value
    setLocalSearch(val)
    const p = new URLSearchParams(searchParams)
    if (val) p.set('search', val); else p.delete('search')
    setSearchParams(p)
  }

  const projects = data?.projects || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Projects</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <button onClick={() => { setEditProject(null); setModalOpen(true) }} className="btn-primary">
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search projects..."
            value={localSearch}
            onChange={handleSearch}
          />
        </div>
        <div className="flex gap-3">
          <select
            className="input w-36"
            value={status}
            onChange={e => {
              const p = new URLSearchParams(searchParams)
              if (e.target.value) p.set('status', e.target.value); else p.delete('status')
              setSearchParams(p)
            }}
          >
            <option value="">All Status</option>
            {['not_started', 'in_progress', 'completed', 'blocked', 'on_hold'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
          <select
            className="input w-36"
            value={priority}
            onChange={e => {
              const p = new URLSearchParams(searchParams)
              if (e.target.value) p.set('priority', e.target.value); else p.delete('priority')
              setSearchParams(p)
            }}
          >
            <option value="">All Priority</option>
            {['low', 'medium', 'high', 'critical'].map(p => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-full mb-2" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderKanban size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No projects found</h3>
          <p className="text-slate-500 text-sm mb-6">
            {search || status || priority ? 'Try adjusting your filters' : 'Create your first project to get started'}
          </p>
          {canManage && !search && !status && !priority && (
            <button onClick={() => setModalOpen(true)} className="btn-primary mx-auto">
              <Plus size={18} /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {projects.map((p, i) => (
              <motion.div
                key={p.id}
                className="card p-5 hover:shadow-lg transition-all duration-200 flex flex-col"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ translateY: -2 }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ backgroundColor: p.color + '20' }}>
                      <div className="w-full h-full rounded-lg flex items-center justify-center">
                        <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: p.color }} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{p.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.preventDefault(); setEditProject(p); setModalOpen(true) }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-memphis-600 hover:bg-memphis-50 dark:hover:bg-memphis-900/20 transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      {user?.role === 'director' && (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            if (confirm('Delete this project?')) deleteMutation.mutate(p.id)
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {p.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{p.description}</p>
                )}

                <div className="mt-auto space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                      <span>Progress</span>
                      <PriorityBadge priority={p.priority} />
                    </div>
                    <ProgressBar value={p.progress} size="sm" color="auto" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {p.members?.slice(0, 4).map((m, idx) => (
                        <div key={m.id} className="w-7 h-7 rounded-full bg-gradient-to-br from-memphis-400 to-emerald-400 flex items-center justify-center border-2 border-white dark:border-slate-800 text-xs font-bold text-white">
                          {m.name?.[0]?.toUpperCase()}
                        </div>
                      ))}
                      {p.members?.length > 4 && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center border-2 border-white dark:border-slate-800 text-xs font-medium text-slate-500">
                          +{p.members.length - 4}
                        </div>
                      )}
                    </div>
                    <Link
                      to={`/projects/${p.id}`}
                      className="flex items-center gap-1 text-xs text-memphis-500 hover:text-memphis-600 font-medium transition-colors"
                    >
                      View <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditProject(null) }}
        title={editProject ? 'Edit Project' : 'New Project'}
        size="lg"
      >
        <ProjectForm
          project={editProject}
          onClose={() => { setModalOpen(false); setEditProject(null) }}
        />
      </Modal>
    </div>
  )
}
