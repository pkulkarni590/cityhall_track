from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime

from models import db, Project, ProjectMember, User, Notification
from auth import get_current_user, log_action, require_min_role, ROLE_HIERARCHY

projects_bp = Blueprint('projects', __name__, url_prefix='/api/projects')


@projects_bp.route('', methods=['GET'])
@jwt_required()
def get_projects():
    user = get_current_user()
    query = Project.query

    status = request.args.get('status')
    priority = request.args.get('priority')
    search = request.args.get('search', '').strip()
    member_id = request.args.get('member_id')

    if status:
        query = query.filter(Project.status == status)
    if priority:
        query = query.filter(Project.priority == priority)
    if search:
        query = query.filter(Project.name.ilike(f'%{search}%'))
    if member_id:
        query = query.join(ProjectMember).filter(ProjectMember.user_id == int(member_id))

    if user.role not in ['director', 'manager']:
        member_project_ids = [m.project_id for m in user.project_memberships.all()]
        query = query.filter(Project.id.in_(member_project_ids))

    projects = query.order_by(Project.updated_at.desc()).all()
    return jsonify({'projects': [p.to_dict() for p in projects]})


@projects_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    user = get_current_user()
    project = Project.query.get_or_404(project_id)

    if user.role not in ['director', 'manager']:
        member = ProjectMember.query.filter_by(project_id=project_id, user_id=user.id).first()
        if not member:
            return jsonify({'error': 'Access denied'}), 403

    return jsonify({'project': project.to_dict()})


@projects_bp.route('', methods=['POST'])
@jwt_required()
def create_project():
    user = get_current_user()
    if ROLE_HIERARCHY.get(user.role, 0) < ROLE_HIERARCHY.get('manager', 0):
        return jsonify({'error': 'Insufficient permissions'}), 403

    data = request.get_json()
    name = data.get('name', '').strip()
    if not name:
        return jsonify({'error': 'Project name is required'}), 400

    project = Project(
        name=name,
        description=data.get('description', ''),
        status=data.get('status', 'not_started'),
        priority=data.get('priority', 'medium'),
        progress=data.get('progress', 0),
        color=data.get('color', '#0EA5E9'),
        created_by=user.id,
    )

    if data.get('start_date'):
        project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    if data.get('due_date'):
        project.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date()

    db.session.add(project)
    db.session.flush()

    member = ProjectMember(project_id=project.id, user_id=user.id, role_in_project='owner')
    db.session.add(member)

    if data.get('member_ids'):
        for uid in data['member_ids']:
            if uid != user.id:
                m = ProjectMember(project_id=project.id, user_id=uid, role_in_project='member')
                db.session.add(m)
                notify_user = User.query.get(uid)
                if notify_user:
                    notif = Notification(
                        user_id=uid,
                        title='Added to Project',
                        message=f'You were added to project "{name}"',
                        type='info',
                        link=f'/projects/{project.id}',
                    )
                    db.session.add(notif)

    db.session.commit()
    log_action(db, user.id, 'create_project', resource_type='project', resource_id=project.id, resource_name=name)

    return jsonify({'project': project.to_dict()}), 201


@projects_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    user = get_current_user()
    project = Project.query.get_or_404(project_id)

    if ROLE_HIERARCHY.get(user.role, 0) < ROLE_HIERARCHY.get('manager', 0):
        return jsonify({'error': 'Insufficient permissions'}), 403

    data = request.get_json()
    old_status = project.status

    if 'name' in data:
        project.name = data['name'].strip()
    if 'description' in data:
        project.description = data['description']
    if 'status' in data:
        project.status = data['status']
    if 'priority' in data:
        project.priority = data['priority']
    if 'progress' in data:
        project.progress = min(100, max(0, int(data['progress'])))
    if 'color' in data:
        project.color = data['color']
    if 'start_date' in data:
        project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data['start_date'] else None
    if 'due_date' in data:
        project.due_date = datetime.strptime(data['due_date'], '%Y-%m-%d').date() if data['due_date'] else None

    project.updated_at = datetime.utcnow()
    db.session.commit()

    if old_status != project.status:
        members = ProjectMember.query.filter_by(project_id=project_id).all()
        for m in members:
            if m.user_id != user.id:
                notif = Notification(
                    user_id=m.user_id,
                    title='Project Status Changed',
                    message=f'"{project.name}" status changed to {project.status.replace("_", " ").title()}',
                    type='info',
                    link=f'/projects/{project_id}',
                )
                db.session.add(notif)
        db.session.commit()

    log_action(db, user.id, 'update_project', resource_type='project', resource_id=project.id, resource_name=project.name)
    return jsonify({'project': project.to_dict()})


@projects_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    user = get_current_user()
    if user.role != 'director':
        return jsonify({'error': 'Only directors can delete projects'}), 403

    project = Project.query.get_or_404(project_id)
    name = project.name
    db.session.delete(project)
    db.session.commit()

    log_action(db, user.id, 'delete_project', resource_type='project', resource_id=project_id, resource_name=name)
    return jsonify({'message': 'Project deleted'})


@projects_bp.route('/<int:project_id>/members', methods=['POST'])
@jwt_required()
def add_member(project_id):
    user = get_current_user()
    if ROLE_HIERARCHY.get(user.role, 0) < ROLE_HIERARCHY.get('manager', 0):
        return jsonify({'error': 'Insufficient permissions'}), 403

    project = Project.query.get_or_404(project_id)
    data = request.get_json()
    user_id = data.get('user_id')

    if not user_id:
        return jsonify({'error': 'user_id required'}), 400

    target_user = User.query.get_or_404(user_id)
    existing = ProjectMember.query.filter_by(project_id=project_id, user_id=user_id).first()
    if existing:
        return jsonify({'error': 'User already a member'}), 409

    member = ProjectMember(project_id=project_id, user_id=user_id, role_in_project=data.get('role_in_project', 'member'))
    db.session.add(member)

    notif = Notification(
        user_id=user_id,
        title='Added to Project',
        message=f'You were added to project "{project.name}"',
        type='info',
        link=f'/projects/{project_id}',
    )
    db.session.add(notif)
    db.session.commit()

    log_action(db, user.id, 'add_project_member', resource_type='project', resource_id=project_id, resource_name=project.name, details=f'Added user {target_user.email}')
    return jsonify({'member': member.to_dict()}), 201


@projects_bp.route('/<int:project_id>/members/<int:user_id>', methods=['DELETE'])
@jwt_required()
def remove_member(project_id, user_id):
    user = get_current_user()
    if ROLE_HIERARCHY.get(user.role, 0) < ROLE_HIERARCHY.get('manager', 0):
        return jsonify({'error': 'Insufficient permissions'}), 403

    member = ProjectMember.query.filter_by(project_id=project_id, user_id=user_id).first_or_404()
    db.session.delete(member)
    db.session.commit()

    return jsonify({'message': 'Member removed'})


@projects_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    user = get_current_user()

    if user.role in ['director', 'manager']:
        all_projects = Project.query.all()
    else:
        member_project_ids = [m.project_id for m in user.project_memberships.all()]
        all_projects = Project.query.filter(Project.id.in_(member_project_ids)).all()

    return jsonify({
        'total': len(all_projects),
        'in_progress': sum(1 for p in all_projects if p.status == 'in_progress'),
        'completed': sum(1 for p in all_projects if p.status == 'completed'),
        'blocked': sum(1 for p in all_projects if p.status == 'blocked'),
        'not_started': sum(1 for p in all_projects if p.status == 'not_started'),
        'on_hold': sum(1 for p in all_projects if p.status == 'on_hold'),
    })
