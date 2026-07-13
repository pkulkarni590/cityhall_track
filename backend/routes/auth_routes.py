from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity
)
from datetime import datetime, timedelta
import secrets
import base64

from models import db, User
from auth import get_current_user, log_action

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'Account is deactivated'}), 403

    user.last_active = datetime.utcnow()
    db.session.commit()

    access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(hours=8))
    refresh_token = create_refresh_token(identity=str(user.id), expires_delta=timedelta(days=30))

    log_action(db, user.id, 'login', resource_type='user', resource_name=user.email)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token,
        'user': user.to_dict()
    })


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user or not user.is_active:
        return jsonify({'error': 'User not found'}), 401

    access_token = create_access_token(identity=user_id, expires_delta=timedelta(hours=8))
    return jsonify({'access_token': access_token})


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user.last_active = datetime.utcnow()
    db.session.commit()
    return jsonify({'user': user.to_dict()})


@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user = get_current_user()
    data = request.get_json()

    if 'name' in data:
        user.name = data['name'].strip()
    if 'title' in data:
        user.title = data['title']
    if 'department' in data:
        user.department = data['department']
    if 'phone' in data:
        user.phone = data['phone']
    if 'bio' in data:
        user.bio = data['bio']

    if 'current_password' in data and 'new_password' in data:
        if not user.check_password(data['current_password']):
            return jsonify({'error': 'Current password is incorrect'}), 400
        if len(data['new_password']) < 8:
            return jsonify({'error': 'New password must be at least 8 characters'}), 400
        user.set_password(data['new_password'])

    db.session.commit()
    log_action(db, user.id, 'update_profile', resource_type='user', resource_name=user.email)
    return jsonify({'user': user.to_dict()})


@auth_bp.route('/avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    user = get_current_user()
    if 'avatar' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['avatar']
    if not file.filename:
        return jsonify({'error': 'No file selected'}), 400

    allowed = {'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'gif': 'image/gif', 'webp': 'image/webp'}
    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in allowed:
        return jsonify({'error': 'Invalid file type'}), 400

    encoded = base64.b64encode(file.read()).decode('ascii')
    user.avatar = f"data:{allowed[ext]};base64,{encoded}"
    db.session.commit()

    return jsonify({'avatar': user.avatar})


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email', '').lower().strip()
    user = User.query.filter_by(email=email).first()

    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.session.commit()

    return jsonify({'message': 'If the email exists, a reset link has been sent'})


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json()
    token = data.get('token', '')
    password = data.get('password', '')

    if not token or not password:
        return jsonify({'error': 'Token and password required'}), 400

    user = User.query.filter_by(reset_token=token).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        return jsonify({'error': 'Invalid or expired reset token'}), 400

    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters'}), 400

    user.set_password(password)
    user.reset_token = None
    user.reset_token_expires = None
    db.session.commit()

    return jsonify({'message': 'Password reset successfully'})
