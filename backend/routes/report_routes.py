from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required
from datetime import datetime
import io

from models import db, Project, Task, User, AuditLog
from auth import get_current_user, ROLE_HIERARCHY

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


@reports_bp.route('/overview', methods=['GET'])
@jwt_required()
def get_overview():
    user = get_current_user()
    if ROLE_HIERARCHY.get(user.role, 0) < ROLE_HIERARCHY.get('manager', 0):
        return jsonify({'error': 'Insufficient permissions'}), 403

    projects = Project.query.all()
    total = len(projects)
    status_counts = {}
    priority_counts = {}

    for p in projects:
        status_counts[p.status] = status_counts.get(p.status, 0) + 1
        priority_counts[p.priority] = priority_counts.get(p.priority, 0) + 1

    tasks = Task.query.all()
    task_status_counts = {}
    for t in tasks:
        task_status_counts[t.status] = task_status_counts.get(t.status, 0) + 1

    avg_progress = sum(p.progress for p in projects) / total if total else 0

    return jsonify({
        'total_projects': total,
        'status_distribution': status_counts,
        'priority_distribution': priority_counts,
        'total_tasks': len(tasks),
        'task_status_distribution': task_status_counts,
        'average_progress': round(avg_progress, 1),
        'team_size': User.query.filter_by(is_active=True).count(),
    })


@reports_bp.route('/project/<int:project_id>/gantt', methods=['GET'])
@jwt_required()
def get_gantt(project_id):
    user = get_current_user()
    project = Project.query.get_or_404(project_id)

    tasks = Task.query.filter_by(project_id=project_id, parent_id=None).all()
    gantt_data = []

    for t in tasks:
        gantt_data.append({
            'id': t.id,
            'title': t.title,
            'status': t.status,
            'priority': t.priority,
            'start_date': project.start_date.isoformat() if project.start_date else None,
            'due_date': t.due_date.isoformat() if t.due_date else None,
            'assignees': [a.to_dict() for a in t.assignees.all()],
            'subtask_count': t.subtasks.count(),
            'progress': 100 if t.status == 'done' else (50 if t.status == 'in_progress' else 0),
        })

    return jsonify({
        'project': {
            'id': project.id,
            'name': project.name,
            'start_date': project.start_date.isoformat() if project.start_date else None,
            'due_date': project.due_date.isoformat() if project.due_date else None,
            'progress': project.progress,
        },
        'tasks': gantt_data,
    })


@reports_bp.route('/audit-log', methods=['GET'])
@jwt_required()
def get_audit_log():
    user = get_current_user()
    if user.role != 'director':
        return jsonify({'error': 'Only directors can view audit logs'}), 403

    limit = min(int(request.args.get('limit', 100)), 500)
    resource_type = request.args.get('resource_type')
    user_id = request.args.get('user_id')

    query = AuditLog.query
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.filter(AuditLog.user_id == int(user_id))

    logs = query.order_by(AuditLog.created_at.desc()).limit(limit).all()
    return jsonify({'logs': [l.to_dict() for l in logs]})


@reports_bp.route('/export/pdf', methods=['GET'])
@jwt_required()
def export_pdf():
    user = get_current_user()
    if ROLE_HIERARCHY.get(user.role, 0) < ROLE_HIERARCHY.get('manager', 0):
        return jsonify({'error': 'Insufficient permissions'}), 403

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
    except ImportError:
        return jsonify({'error': 'PDF generation not available'}), 500

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    title = Paragraph("Innovation Team Memphis - Project Report", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 12))

    date_para = Paragraph(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", styles['Normal'])
    elements.append(date_para)
    elements.append(Spacer(1, 24))

    projects = Project.query.all()
    data = [['Project', 'Status', 'Priority', 'Progress', 'Due Date']]
    for p in projects:
        data.append([
            p.name[:40],
            p.status.replace('_', ' ').title(),
            p.priority.title(),
            f"{p.progress}%",
            p.due_date.isoformat() if p.due_date else 'N/A',
        ])

    table = Table(data, colWidths=[200, 90, 70, 70, 90])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0EA5E9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F0F9FF')]),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('PADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name=f"innovation-memphis-report-{datetime.utcnow().strftime('%Y%m%d')}.pdf",
        mimetype='application/pdf',
    )
