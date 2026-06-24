from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime

from models import db, Task, TaskAssignee, Project, ProjectMember, User, Notification, Comment
from auth import get_current_user, log_action, ROLE_HIERARCHY

tasks_bp = Blueprint('tasks', __name__, url_prefix='/api')


def check_project_access(user, project_id):
    if user.role in ['director', 'manager']:
        return True
    member = ProjectMember.query.filter_by(project_id=project_id, user_id=user.id).first()
    return member is not None


@tasks_bp.route('/projects/<int:project_id>/tasks', methods=['GET'])
@jwt_required()
def get_tasks(project_id):
    user = get_current_user()
    if not check_project_access(user, project_id):
        return jsonify({'error': 'Access denied'}), 403

    Project.query.get_or_404(project_id)
    tasks = Task.query.filter_by(project_id=project_id, parent_id=None).order_by(Task.position).all()
    return jsonify({'tasks': [t.to_dict() for t in tasks]})


@tasks_bp.route('/projects/<int:project_id>/tasks', methods=['POST'])
@jwt_required()
def create_task(project_id):
    user = get_current_user()
    if not check_project_access(user, project_id):
        return jsonify({'error': 'Access denied'}), 403

    if ROLE_HIERARCHY.get(user.role, 0) < ROLE_HIERARCHY.get('team_member', 0):
        return jsonify({'error': 'Insufficient permissions'}), 403

    Project.query.get_or_404(project_id)
    data = request.get_json()
    title = data.get('title', '').strip()
    if not title:
        return jsonify({'error': 'Task title required'}), 400

    max_pos = db.session.query(db.func.max(Task.position)).filter_by(
        project_id=project_id, status=data.get('status', 'todo'), parent_id=None
    ).scalar() or 0

    task = Task(
        project_id=project_id,
        title=title,
        description=data.get('description', ''),
        status=data.get('status', 'todo'),
        priority=data.get('priority', 'medium'),
        position=max_pos + 1,
        parent_id=data.get('parent_id'),
        created_by=user.id,
    )
    if data.get('due_date'):
        task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()

    db.session.add(task)
    db.session.flush()

    if data.get('assignee_ids'):
        for uid in data['assignee_ids']:
            assignee = TaskAssignee(task_id=task.id, user_id=uid)
            db.session.add(assignee)
            if uid != user.id:
                notif = Notification(
                    user_id=uid,
                    title='Task Assigned',
                    message=f'You were assigned to task "{title}"',
                    type='assignment',
                    link=f'/projects/{project_id}',
                )
                db.session.add(notif)

    db.session.commit()
    log_action(db, user.id, 'create_task', resource_type='task', resource_id=task.id, resource_name=title)

    update_project_progress(project_id)
    return jsonify({'task': task.to_dict()}), 201


@tasks_bp.route('/tasks/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    user = get_current_user()
    task = Task.query.get_or_404(task_id)
    if not check_project_access(user, task.project_id):
        return jsonify({'error': 'Access denied'}), 403
    return jsonify({'task': task.to_dict()})


@tasks_bp.route('/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    user = get_current_user()
    task = Task.query.get_or_404(task_id)

    if not check_project_access(user, task.project_id):
        return jsonify({'error': 'Access denied'}), 403

    if ROLE_HIERARCHY.get(user.role, 0) < ROLE_HIERARCHY.get('team_member', 0):
        return jsonify({'error': 'Insufficient permissions'}), 403

    data = request.get_json()
    old_status = task.status

    if 'title' in data:
        task.title = data['title'].strip()
    if 'description' in data:
        task.description = data['description']
    if 'status' in data:
        task.status = data['status']
    if 'priority' in data:
        task.priority = data['priority']
    if 'position' in data:
        task.position = data['position']
    if 'due_date' in data:
        task.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date() if data['due_date'] else None

    task.updated_at = datetime.utcnow()
    db.session.commit()

    if old_status != task.status:
        members = ProjectMember.query.filter_by(project_id=task.project_id).all()
        for m in members:
            if m.user_id != user.id:
                notif = Notification(
                    user_id=m.user_id,
                    title='Task Updated',
                    message=f'Task "{task.title}" moved to {task.status.replace("_", " ").title()}',
                    type='info',
                    link=f'/projects/{task.project_id}',
                )
                db.session.add(notif)
        db.session.commit()

    log_action(db, user.id, 'update_task', resource_type='task', resource_id=task.id, resource_name=task.title)
    update_project_progress(task.project_id)
    return jsonify({'task': task.to_dict()})


@tasks_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    user = get_current_user()
    task = Task.query.get_or_404(task_id)

    if not check_project_access(user, task.project_id):
        return jsonify({'error': 'Access denied'}), 403

    if ROLE_HIERARCHY.get(user.role, 0) < ROLE_HIERARCHY.get('manager', 0):
        return jsonify({'error': 'Insufficient permissions'}), 403

    project_id = task.project_id
    db.session.delete(task)
    db.session.commit()

    log_action(db, user.id, 'delete_task', resource_type='task', resource_id=task_id)
    update_project_progress(project_id)
    return jsonify({'message': 'Task deleted'})


@tasks_bp.route('/tasks/<int:task_id>/assign', methods=['POST'])
@jwt_required()
def assign_task(task_id):
    user = get_current_user()
    task = Task.query.get_or_404(task_id)

    if not check_project_access(user, task.project_id):
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()
    user_id = data.get('user_id')
    target_user = User.query.get_or_404(user_id)

    existing = TaskAssignee.query.filter_by(task_id=task_id, user_id=user_id).first()
    if existing:
        return jsonify({'error': 'User already assigned'}), 409

    assignee = TaskAssignee(task_id=task_id, user_id=user_id)
    db.session.add(assignee)

    notif = Notification(
        user_id=user_id,
        title='Task Assigned',
        message=f'You were assigned to task "{task.title}"',
        type='assignment',
        link=f'/projects/{task.project_id}',
    )
    db.session.add(notif)
    db.session.commit()

    return jsonify({'message': 'Assigned', 'assignee': assignee.to_dict()})


@tasks_bp.route('/tasks/<int:task_id>/assign/<int:user_id>', methods=['DELETE'])
@jwt_required()
def unassign_task(task_id, user_id):
    user = get_current_user()
    task = Task.query.get_or_404(task_id)

    if not check_project_access(user, task.project_id):
        return jsonify({'error': 'Access denied'}), 403

    assignee = TaskAssignee.query.filter_by(task_id=task_id, user_id=user_id).first_or_404()
    db.session.delete(assignee)
    db.session.commit()
    return jsonify({'message': 'Unassigned'})


@tasks_bp.route('/tasks/<int:task_id>/comments', methods=['GET'])
@jwt_required()
def get_comments(task_id):
    user = get_current_user()
    task = Task.query.get_or_404(task_id)
    if not check_project_access(user, task.project_id):
        return jsonify({'error': 'Access denied'}), 403

    comments = Comment.query.filter_by(task_id=task_id).order_by(Comment.created_at).all()
    return jsonify({'comments': [c.to_dict() for c in comments]})


@tasks_bp.route('/tasks/<int:task_id>/comments', methods=['POST'])
@jwt_required()
def add_comment(task_id):
    user = get_current_user()
    task = Task.query.get_or_404(task_id)
    if not check_project_access(user, task.project_id):
        return jsonify({'error': 'Access denied'}), 403

    data = request.get_json()
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Comment content required'}), 400

    comment = Comment(task_id=task_id, user_id=user.id, content=content)
    db.session.add(comment)
    db.session.commit()

    return jsonify({'comment': comment.to_dict()}), 201


@tasks_bp.route('/tasks/reorder', methods=['PUT'])
@jwt_required()
def reorder_tasks():
    user = get_current_user()
    data = request.get_json()
    updates = data.get('updates', [])

    for upd in updates:
        task = Task.query.get(upd.get('id'))
        if task and check_project_access(user, task.project_id):
            task.status = upd.get('status', task.status)
            task.position = upd.get('position', task.position)

    db.session.commit()
    return jsonify({'message': 'Reordered'})


@tasks_bp.route('/tasks/calendar', methods=['GET'])
@jwt_required()
def get_calendar_events():
    user = get_current_user()

    if user.role in ['director', 'manager']:
        projects = Project.query.all()
    else:
        member_ids = [m.project_id for m in user.project_memberships.all()]
        projects = Project.query.filter(Project.id.in_(member_ids)).all()

    project_events = []
    for p in projects:
        if p.start_date:
            project_events.append({
                'type': 'project_start',
                'id': p.id,
                'title': p.name,
                'date': p.start_date.isoformat(),
                'status': p.status,
                'priority': p.priority,
                'color': p.color or '#0EA5E9',
                'project_id': p.id,
                'progress': p.progress,
            })
        if p.due_date:
            project_events.append({
                'type': 'project_due',
                'id': p.id,
                'title': p.name,
                'date': p.due_date.isoformat(),
                'status': p.status,
                'priority': p.priority,
                'color': p.color or '#0EA5E9',
                'project_id': p.id,
                'progress': p.progress,
            })

    task_events = []
    for p in projects:
        tasks = p.tasks.filter(Task.due_date.isnot(None), Task.parent_id.is_(None)).all()
        for t in tasks:
            task_events.append({
                'type': 'task',
                'id': t.id,
                'title': t.title,
                'date': t.due_date.isoformat(),
                'status': t.status,
                'priority': t.priority,
                'color': p.color or '#0EA5E9',
                'project_id': p.id,
                'project_name': p.name,
                'assignees': [a.to_dict() for a in t.assignees.all()],
            })

    return jsonify({'events': project_events + task_events})


def update_project_progress(project_id):
    project = Project.query.get(project_id)
    if not project:
        return
    total = project.tasks.filter_by(parent_id=None).count()
    done = project.tasks.filter_by(status='done', parent_id=None).count()
    if total > 0:
        project.progress = int((done / total) * 100)
    else:
        project.progress = 0
    project.updated_at = datetime.utcnow()
    db.session.commit()
