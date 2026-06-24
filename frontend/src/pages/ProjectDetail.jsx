import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Calendar, Users, Plus, Settings, Trash2,
  CheckSquare, FileText, UserPlus, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import { StatusBadge, PriorityBadge } from '../components/common/Badge'
import ProgressBar from '../components/common/ProgressBar'
import Modal from '../components/common/Modal'
import KanbanBoard from '../components/tasks/KanbanBoard'

function AddMemberModal({ projectId, existingIds, onClose }) {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['team'],
    queryFn: () => client.get('/team').then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: (uid) => client.post(`/projects/${projectId}/members`, { user_id: uid }),
    onSuccess: () => {
      qc.invalidateQueries(['project', projectId])
      toast.success('Member added')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  })

  const available = (data?.members || []).filter(m => !existingIds.includes(m.id))

  return (
    <div className="space-y-3">
      {available.length === 0 ? (
        <p className="text-center text-slate-400 py-4">All team members are already in this project</p>
      ) : available.map(m => (
        <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-memphis-400 to-emerald-400 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {m.name[0].toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white">{m.name}</p>
            <p className="text-xs text-slate-400 capitalize">{m.role?.replace('_', ' ')}</p>
          </div>
          <button onClick={() => mutation.mutate(m.id)} className="btn-primary py-1 px-3 text-xs">
            Add
          </button>
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <button onClick={onClose} className="btn-secondary">Done</button>
      </div>
    </div>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const qc = useQueryClient()
  const [addMemberOpen, setAddMemberOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('tasks')

  const { data, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => client.get(`/projects/${id}`).then(r => r.data),
  })

  const { data: docsData } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => client.get(`/projects/${id}/documents`).then(r => r.data),
    enabled: activeTab === 'documents',
  })

  const removeMember = useMutation({
    mutationFn: (uid) => client.delete(`/projects/${id}/members/${uid}`),
    onSuccess: () => {
      qc.invalidateQueries(['project', id])
      toast.success('Member removed')
    },
  })

  const deleteProject = useMutation({
    mutationFn: () => client.delete(`/projects/${id}`),
    onSuccess: () => {
      toast.success('Project deleted')
      navigate('/projects')
    },
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-memphis-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const project = data?.project
  if (!project) return <div className="text-center py-20 text-slate-400">Project not found</div>

  const canManage = ['director', 'manager'].includes(user?.role)

  const tabs = [
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'members', label: `Team (${project.members?.length || 0})`, icon: Users },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/projects" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white truncate">{project.name}</h1>
            <StatusBadge status={project.status} size="md" />
            <PriorityBadge priority={project.priority} />
          </div>
        </div>
        {user?.role === 'director' && (
          <button
            onClick={() => confirm('Delete this project permanently?') && deleteProject.mutate()}
            className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-2">Description</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {project.description || <span className="italic text-slate-400">No description provided</span>}
          </p>

          <div className="mt-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Overall Progress</span>
              <span className="font-bold text-slate-900 dark:text-white">{project.progress}%</span>
            </div>
            <ProgressBar value={project.progress} size="lg" color="auto" showLabel={false} />
            <p className="text-xs text-slate-400 mt-1.5">{project.completed_tasks} of {project.task_count} tasks completed</p>
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Project Info</h2>
          {[
            { label: 'Status', value: <StatusBadge status={project.status} /> },
            { label: 'Priority', value: <PriorityBadge priority={project.priority} /> },
            { label: 'Start Date', value: project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : '—', icon: Calendar },
            { label: 'Due Date', value: project.due_date ? format(new Date(project.due_date), 'MMM d, yyyy') : '—', icon: Calendar },
            { label: 'Tasks', value: `${project.task_count} total` },
            { label: 'Documents', value: `${project.document_count} files` },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase tracking-wide">{item.label}</span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-700 px-4 flex items-center gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-memphis-500 text-memphis-600 dark:text-memphis-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <tab.icon size={15} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'tasks' && <KanbanBoard projectId={id} />}

          {activeTab === 'documents' && (
            <DocumentsTab projectId={id} documents={docsData?.documents || []} canUpload={canManage} />
          )}

          {activeTab === 'members' && (
            <div className="space-y-3">
              {canManage && (
                <div className="flex justify-end">
                  <button onClick={() => setAddMemberOpen(true)} className="btn-primary text-sm py-1.5">
                    <UserPlus size={15} /> Add Member
                  </button>
                </div>
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {project.members?.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-memphis-400 to-emerald-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {m.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{m.name}</p>
                      <p className="text-xs text-slate-400 capitalize">{m.role_in_project}</p>
                    </div>
                    {canManage && m.role_in_project !== 'owner' && (
                      <button
                        onClick={() => removeMember.mutate(m.user_id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} title="Add Team Member">
        <AddMemberModal
          projectId={id}
          existingIds={project.members?.map(m => m.user_id) || []}
          onClose={() => setAddMemberOpen(false)}
        />
      </Modal>
    </div>
  )
}

function DocumentsTab({ projectId, documents, canUpload }) {
  const qc = useQueryClient()
  const [uploading, setUploading] = useState(false)

  const uploadMutation = useMutation({
    mutationFn: async (file) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('name', file.name)
      return client.post(`/projects/${projectId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: () => {
      qc.invalidateQueries(['documents', projectId])
      toast.success('File uploaded')
      setUploading(false)
    },
    onError: () => { toast.error('Upload failed'); setUploading(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/documents/${id}`),
    onSuccess: () => qc.invalidateQueries(['documents', projectId]),
  })

  const fileIcons = {
    'application/pdf': '📄',
    'image/': '🖼️',
    'video/': '🎬',
    'application/vnd.ms-excel': '📊',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
    'text/': '📝',
  }

  const getIcon = (type) => {
    for (const [key, icon] of Object.entries(fileIcons)) {
      if (type?.startsWith(key)) return icon
    }
    return '📎'
  }

  const formatSize = (bytes) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-4">
      {canUpload && (
        <div
          className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center cursor-pointer hover:border-memphis-400 hover:bg-memphis-50/50 dark:hover:bg-memphis-900/10 transition-all"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault()
            const file = e.dataTransfer.files[0]
            if (file) uploadMutation.mutate(file)
          }}
          onClick={() => document.getElementById('doc-upload').click()}
        >
          <input
            id="doc-upload" type="file" className="hidden"
            onChange={e => { if (e.target.files[0]) uploadMutation.mutate(e.target.files[0]) }}
          />
          <FileText size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {uploadMutation.isPending ? 'Uploading...' : 'Drop files here or click to upload'}
          </p>
          <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, images, and more (max 16MB)</p>
        </div>
      )}

      {documents.length === 0 ? (
        <p className="text-center text-slate-400 py-6">No documents attached yet</p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-all group">
              <span className="text-2xl">{getIcon(doc.file_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{doc.original_name}</p>
                <p className="text-xs text-slate-400">{formatSize(doc.file_size)} · {doc.uploader_name}</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <a
                  href={`/api/documents/${doc.id}/download`}
                  className="text-xs text-memphis-500 hover:text-memphis-600 font-medium"
                >
                  Download
                </a>
                {canUpload && (
                  <button
                    onClick={() => deleteMutation.mutate(doc.id)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
