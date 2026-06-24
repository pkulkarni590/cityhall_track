import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Camera, Save, Lock, User, Mail, Phone, Briefcase, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import clsx from 'clsx'

const roleColors = {
  director: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  team_member: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  viewer: 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400',
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const fileRef = useRef()

  const [info, setInfo] = useState({
    name: user?.name || '',
    title: user?.title || '',
    department: user?.department || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  })

  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm: '',
  })

  const updateProfile = useMutation({
    mutationFn: (data) => client.put('/auth/profile', data).then(r => r.data),
    onSuccess: (data) => {
      updateUser(data.user)
      toast.success('Profile updated')
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  })

  const updatePassword = useMutation({
    mutationFn: (data) => client.put('/auth/profile', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Password changed')
      setPasswords({ current_password: '', new_password: '', confirm: '' })
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Error'),
  })

  const uploadAvatar = useMutation({
    mutationFn: (file) => {
      const fd = new FormData()
      fd.append('avatar', file)
      return client.post('/auth/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    },
    onSuccess: (data) => {
      updateUser({ avatar: data.data.avatar })
      toast.success('Avatar updated')
    },
    onError: () => toast.error('Avatar upload failed'),
  })

  const handlePasswordSubmit = (e) => {
    e.preventDefault()
    if (passwords.new_password !== passwords.confirm) {
      toast.error('Passwords do not match')
      return
    }
    updatePassword.mutate({ current_password: passwords.current_password, new_password: passwords.new_password })
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage your account settings</p>
      </div>

      <motion.div className="card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-5 mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-memphis-400 to-emerald-400 flex items-center justify-center text-white text-3xl font-bold overflow-hidden shadow-lg">
              {user?.avatar
                ? <img src={user.avatar} className="w-20 h-20 object-cover" alt="" />
                : user?.name?.[0]?.toUpperCase()
              }
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-memphis-500 hover:bg-memphis-600 text-white flex items-center justify-center shadow-lg transition-colors"
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { if (e.target.files[0]) uploadAvatar.mutate(e.target.files[0]) }}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{user?.name}</h2>
            <p className="text-slate-400 text-sm">{user?.email}</p>
            <span className={clsx('mt-2 badge capitalize text-xs', roleColors[user?.role])}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutate(info) }} className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <User size={15} /> Personal Information
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Full Name</label>
              <input className="input" value={info.name} onChange={e => setInfo(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Job Title</label>
              <input className="input" placeholder="e.g. Senior Developer" value={info.title} onChange={e => setInfo(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Department</label>
              <input className="input" placeholder="e.g. Innovation" value={info.department} onChange={e => setInfo(f => ({ ...f, department: e.target.value }))} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="label">Phone</label>
              <input className="input" placeholder="+1 (901) 555-0100" value={info.phone} onChange={e => setInfo(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="label">Bio</label>
              <textarea className="input resize-none" rows={3} placeholder="Tell your team about yourself..." value={info.bio} onChange={e => setInfo(f => ({ ...f, bio: e.target.value }))} />
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={updateProfile.isPending} className="btn-primary">
              <Save size={16} /> {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>

      <motion.div className="card p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Lock size={15} /> Change Password
          </h3>

          {['current_password', 'new_password', 'confirm'].map(field => (
            <div key={field}>
              <label className="label">
                {field === 'current_password' ? 'Current Password' : field === 'new_password' ? 'New Password' : 'Confirm New Password'}
              </label>
              <input
                type="password" className="input"
                value={passwords[field]}
                onChange={e => setPasswords(p => ({ ...p, [field]: e.target.value }))}
                required={passwords.current_password || passwords.new_password ? true : false}
                placeholder="••••••••"
                minLength={field !== 'current_password' ? 8 : undefined}
              />
            </div>
          ))}

          <div className="flex justify-end">
            <button type="submit" disabled={updatePassword.isPending || !passwords.current_password} className="btn-primary">
              <Lock size={16} /> {updatePassword.isPending ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </motion.div>

      <motion.div className="card p-5 bg-slate-50 dark:bg-slate-800/80" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Account Info</h3>
        <div className="space-y-2.5">
          {[
            { label: 'Email', value: user?.email, icon: Mail },
            { label: 'Role', value: user?.role?.replace('_', ' '), icon: Briefcase },
            { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—', icon: FileText },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 text-sm">
              <item.icon size={14} className="text-slate-400 flex-shrink-0" />
              <span className="text-slate-500 w-28">{item.label}</span>
              <span className="text-slate-800 dark:text-slate-200 capitalize font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
