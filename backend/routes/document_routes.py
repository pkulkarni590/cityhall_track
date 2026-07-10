from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required
import base64

from models import db, Document, Project, ProjectMember
from auth import get_current_user, log_action, ROLE_HIERARCHY

documents_bp = Blueprint('documents', __name__, url_prefix='/api')

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'csv', 'zip'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def check_project_access(user, project_id):
    if user.role in ['director', 'manager']:
        return True
    member = ProjectMember.query.filter_by(project_id=project_id, user_id=user.id).first()
    return member is not None


@documents_bp.route('/projects/<int:project_id>/documents', methods=['GET'])
@jwt_required()
def get_documents(project_id):
    user = get_current_user()
    if not check_project_access(user, project_id):
        return jsonify({'error': 'Access denied'}), 403

    Project.query.get_or_404(project_id)
    docs = Document.query.filter_by(project_id=project_id).order_by(Document.created_at.desc()).all()
    return jsonify({'documents': [d.to_dict() for d in docs]})


@documents_bp.route('/projects/<int:project_id>/documents', methods=['POST'])
@jwt_required()
def upload_document(project_id):
    user = get_current_user()
    if not check_project_access(user, project_id):
        return jsonify({'error': 'Access denied'}), 403

    if ROLE_HIERARCHY.get(user.role, 0) < ROLE_HIERARCHY.get('team_member', 0):
        return jsonify({'error': 'Insufficient permissions'}), 403

    Project.query.get_or_404(project_id)

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if not file.filename or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400

    raw = file.read()

    doc = Document(
        project_id=project_id,
        name=request.form.get('name', file.filename),
        original_name=file.filename,
        file_data=base64.b64encode(raw).decode('ascii'),
        file_type=file.content_type,
        file_size=len(raw),
        uploaded_by=user.id,
    )
    db.session.add(doc)
    db.session.commit()

    log_action(db, user.id, 'upload_document', resource_type='document', resource_id=doc.id, resource_name=doc.original_name)
    return jsonify({'document': doc.to_dict()}), 201


@documents_bp.route('/documents/<int:doc_id>', methods=['DELETE'])
@jwt_required()
def delete_document(doc_id):
    user = get_current_user()
    doc = Document.query.get_or_404(doc_id)

    if not check_project_access(user, doc.project_id):
        return jsonify({'error': 'Access denied'}), 403

    if ROLE_HIERARCHY.get(user.role, 0) < ROLE_HIERARCHY.get('manager', 0) and doc.uploaded_by != user.id:
        return jsonify({'error': 'Can only delete your own documents'}), 403

    db.session.delete(doc)
    db.session.commit()

    log_action(db, user.id, 'delete_document', resource_type='document', resource_id=doc_id, resource_name=doc.original_name)
    return jsonify({'message': 'Document deleted'})


@documents_bp.route('/documents/<int:doc_id>/download', methods=['GET'])
@jwt_required()
def download_document(doc_id):
    user = get_current_user()
    doc = Document.query.get_or_404(doc_id)

    if not check_project_access(user, doc.project_id):
        return jsonify({'error': 'Access denied'}), 403

    raw = base64.b64decode(doc.file_data)
    return Response(
        raw,
        mimetype=doc.file_type or 'application/octet-stream',
        headers={'Content-Disposition': f'attachment; filename="{doc.original_name}"'},
    )
