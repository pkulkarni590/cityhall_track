import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { FileText, FolderOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import { StatusBadge } from '../components/common/Badge'

export default function Documents() {
  const { data: projectsData, isLoading } = useQuery({
    queryKey: ['projects-for-docs'],
    queryFn: () => client.get('/projects').then(r => r.data),
  })

  const projects = projectsData?.projects || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Documents</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Browse and manage project documents</p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
              <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderOpen size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-1">No projects yet</h3>
          <p className="text-slate-500 text-sm">Create projects first to attach documents</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                to={`/projects/${p.id}`}
                state={{ tab: 'documents' }}
                className="card p-5 flex items-start gap-4 hover:shadow-lg transition-all block"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: p.color + '20' }}>
                  <FileText size={20} style={{ color: p.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={p.status} />
                    <span className="text-xs text-slate-400">{p.document_count} file{p.document_count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <div className="card p-8 text-center border-dashed">
        <FileText size={36} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Upload documents to a project</p>
        <p className="text-xs text-slate-400">Click on any project above, then go to the Documents tab to upload files</p>
      </div>
    </div>
  )
}
