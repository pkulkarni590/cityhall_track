import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, rectIntersection
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, GripVertical, Calendar, MessageSquare, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import client from '../../api/client'
import { StatusBadge, PriorityBadge } from '../common/Badge'
import Modal from '../common/Modal'
import TaskForm from './TaskForm'
import clsx from 'clsx'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-slate-400' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'review', label: 'Review', color: 'bg-purple-500' },
  { id: 'done', label: 'Done', color: 'bg-emerald-500' },
]

function TaskCard({ task, isDragging, onDelete, onEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id.toString() })
  const [expanded, setExpanded] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div ref={setNodeRef} style={style} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group">
      <div className="p-3">
        <div className="flex items-start gap-2">
          <button {...attributes} {...listeners} className="mt-0.5 p-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical size={14} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium text-slate-900 dark:text-white leading-tight">{task.title}</p>
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onEdit(task)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-memphis-500 transition-colors">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => onDelete(task.id)} className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <PriorityBadge priority={task.priority} />
              {isOverdue && <span className="badge bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400">Overdue</span>}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                {task.due_date && (
                  <span className={clsx('flex items-center gap-1', isOverdue && 'text-red-500')}>
                    <Calendar size={11} />
                    {format(new Date(task.due_date), 'MMM d')}
                  </span>
                )}
                {task.comment_count > 0 && (
                  <span className="flex items-center gap-1"><MessageSquare size={11} />{task.comment_count}</span>
                )}
              </div>
              <div className="flex -space-x-1.5">
                {task.assignees?.slice(0, 3).map(a => (
                  <div key={a.id} className="w-5 h-5 rounded-full bg-gradient-to-br from-memphis-400 to-emerald-400 border border-white dark:border-slate-800 flex items-center justify-center text-[9px] text-white font-bold" title={a.name}>
                    {a.name?.[0]?.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            {task.subtasks?.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setExpanded(e => !e)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  {task.subtasks.length} subtask{task.subtasks.length !== 1 ? 's' : ''}
                </button>
                <AnimatePresence>
                  {expanded && (
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                      className="overflow-hidden mt-1.5 space-y-1 pl-3 border-l-2 border-slate-200 dark:border-slate-700"
                    >
                      {task.subtasks.map(st => (
                        <div key={st.id} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 py-0.5">
                          <div className={clsx('w-2 h-2 rounded-full flex-shrink-0', st.status === 'done' ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600')} />
                          <span className={clsx(st.status === 'done' && 'line-through opacity-60')}>{st.title}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function KanbanBoard({ projectId }) {
  const qc = useQueryClient()
  const [activeId, setActiveId] = useState(null)
  const [taskModal, setTaskModal] = useState(false)
  const [editTask, setEditTask] = useState(null)
  const [addColumn, setAddColumn] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => client.get(`/projects/${projectId}/tasks`).then(r => r.data),
  })

  const updateTask = useMutation({
    mutationFn: ({ id, ...data }) => client.put(`/tasks/${id}`, data).then(r => r.data),
    onSuccess: () => qc.invalidateQueries(['tasks', projectId]),
  })

  const deleteTask = useMutation({
    mutationFn: (id) => client.delete(`/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries(['tasks', projectId])
      qc.invalidateQueries(['project', projectId])
      toast.success('Task deleted')
    },
  })

  const tasks = data?.tasks || []
  const activeTask = tasks.find(t => t.id.toString() === activeId)

  const tasksByColumn = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => t.status === col.id).sort((a, b) => a.position - b.position)
    return acc
  }, {})

  const handleDragEnd = ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return

    const activeTask = tasks.find(t => t.id.toString() === active.id)
    const overTask = tasks.find(t => t.id.toString() === over.id)
    const overColumn = COLUMNS.find(c => c.id === over.id)

    if (!activeTask) return

    const newStatus = overColumn?.id || overTask?.status || activeTask.status
    const newPosition = overTask ? overTask.position : 999

    updateTask.mutate({ id: activeTask.id, status: newStatus, position: newPosition })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-memphis-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEditTask(null); setAddColumn('todo'); setTaskModal(true) }}
          className="btn-primary text-sm"
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={({ active }) => setActiveId(active.id.toString())}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveId(null)}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto">
          {COLUMNS.map(col => (
            <div key={col.id} className="flex flex-col min-h-64">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={clsx('w-2.5 h-2.5 rounded-full', col.color)} />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{col.label}</span>
                  <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    {tasksByColumn[col.id].length}
                  </span>
                </div>
                <button
                  onClick={() => { setEditTask(null); setAddColumn(col.id); setTaskModal(true) }}
                  className="p-1 rounded-md text-slate-400 hover:text-memphis-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              <SortableContext items={tasksByColumn[col.id].map(t => t.id.toString())} strategy={verticalListSortingStrategy}>
                <div className="flex-1 space-y-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all min-h-20">
                  <AnimatePresence>
                    {tasksByColumn[col.id].map(task => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <TaskCard
                          task={task}
                          isDragging={task.id.toString() === activeId}
                          onDelete={(id) => deleteTask.mutate(id)}
                          onEdit={(t) => { setEditTask(t); setAddColumn(t.status); setTaskModal(true) }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div className="shadow-2xl opacity-95 rotate-2">
              <TaskCard task={activeTask} isDragging={false} onDelete={() => {}} onEdit={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <Modal
        open={taskModal}
        onClose={() => { setTaskModal(false); setEditTask(null) }}
        title={editTask ? 'Edit Task' : 'New Task'}
      >
        <TaskForm
          projectId={projectId}
          task={editTask}
          defaultStatus={addColumn || 'todo'}
          onClose={() => {
            setTaskModal(false)
            setEditTask(null)
            qc.invalidateQueries(['tasks', projectId])
            qc.invalidateQueries(['project', projectId])
          }}
        />
      </Modal>
    </div>
  )
}
