from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from models import db, User, Task, TaskAssignee, ProjectMember
from auth import get_current_user, log_action, ROLE_HIERARCHY

team_bp = Blueprint('team', __name__, url_prefix='/api/team')


@team_bp.route('', methods=['GET'])
@jwt_required()
def get_team():
    search = request.args.get('search', '').strip()
    role = request.args.get('role')

    query = User.query.filter_by(is_active=True)
    if search:
        query = query.filter(User.name.ilike(f'%{search}%') | User.email.ilike(f'%{search}%'))
    if role:
        query = query.filter(User.role == role)

    users = query.order_by(User.name).all()
    return jsonify({'members': [u.to_dict(include_stats=True) for u in users]})


@team_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_member(user_id):
    user = User.query.get_or_404(user_id)
    data = user.to_dict(include_stats=True)

    projects = [m.project.to_dict(include_members=False) for m in user.project_memberships.all() if m.project]
    data['projects'] = projects

    tasks = []
    for ta in user.task_assignments.all():
        t = ta.task
        if t and t.status != 'done':
            tasks.append({
                'id': t.id,
                'title': t.title,
                'status': t.status,
                'priority': t.priority,
                'due_date': t.due_date.isoformat() if t.due_date else None,
                'project_id': t.project_id,
            })
    data['tasks'] = tasks

    return jsonify({'member': data})


@team_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_member(user_id):
    current_user = get_current_user()
    if current_user.role != 'director' and current_user.id != user_id:
        return jsonify({'error': 'Insufficient permissions'}), 403

    user = User.query.get_or_404(user_id)
    data = request.get_json()

    if current_user.role == 'director':
        if 'role' in data:
            user.role = data['role']
        if 'is_active' in data:
            user.is_active = data['is_active']

    if 'name' in data:
        user.name = data['name'].strip()
    if 'title' in data:
        user.title = data['title']
    if 'department' in data:
        user.department = data['department']

    db.session.commit()
    log_action(db, current_user.id, 'update_member', resource_type='user', resource_id=user.id, resource_name=user.email)
    return jsonify({'member': user.to_dict()})


@team_bp.route('/workload', methods=['GET'])
@jwt_required()
def get_workload():
    users = User.query.filter_by(is_active=True).all()
    workload = []
    for u in users:
        active_tasks = []
        for ta in u.task_assignments.all():
            t = ta.task
            if t and t.status in ['todo', 'in_progress', 'review']:
                active_tasks.append({
                    'id': t.id,
                    'title': t.title,
                    'status': t.status,
                    'priority': t.priority,
                    'due_date': t.due_date.isoformat() if t.due_date else None,
                    'project_id': t.project_id,
                })
        workload.append({
            'user': u.to_dict(),
            'active_tasks': active_tasks,
            'task_count': len(active_tasks),
        })
    workload.sort(key=lambda x: x['task_count'], reverse=True)
    return jsonify({'workload': workload})
