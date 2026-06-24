import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import client from '../../api/client'

export default function TaskForm({ projectId, task, defaultStatus = 'todo', onClose }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || defaultStatus,
    priority: task?.priority || 'medium',
    due_date: task?.due_date || '',
    assignee_ids: task?.assignees?.map(a => a.user_id) || [],
  })

  const { data: projectData } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => client.get(`/projects/${projectId}`).then(r => r.data),
  })

  const mutation = useMutation({
    mutationFn: (data) => task
      ? client.put(`/tasks/${task.id}`, data).then(r => r.data)
      : client.post(`/projects/${projectId}/tasks`, data).then(r => r.data),
    onSuccess: () => {
      toast.success(task ? 'Task updated' : 'Task created')
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  })

  const members = projectData?.project?.members || []

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form) }} className="space-y-4">
      <div>
        <label className="label">Task Title *</label>
        <input className="input" required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title..." />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Task details..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
            {['todo', 'in_progress', 'review', 'done'].map(s => (
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
      </div>

      <div>
        <label className="label">Due Date</label>
        <input type="date" className="input" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
      </div>

      <div>
        <label className="label">Assignees</label>
        <div className="flex flex-wrap gap-2">
          {members.map(m => {
            const selected = form.assignee_ids.includes(m.user_id)
            return (
              <button
                key={m.user_id}
                type="button"
                onClick={() => setForm(f => ({
                  ...f,
                  assignee_ids: selected
                    ? f.assignee_ids.filter(id => id !== m.user_id)
                    : [...f.assignee_ids, m.user_id]
                }))}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  selected
                    ? 'bg-memphis-500 text-white border-memphis-500'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-memphis-300'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[9px] font-bold">
                  {m.name?.[0]?.toUpperCase()}
                </div>
                {m.name}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary">
          {mutation.isPending ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  )
}
