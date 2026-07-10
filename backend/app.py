import os
from datetime import datetime, timedelta, date
from flask import Flask, send_from_directory, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from models import db, User, Project, ProjectMember, Task, TaskAssignee
from routes.auth_routes import auth_bp
from routes.project_routes import projects_bp
from routes.task_routes import tasks_bp
from routes.team_routes import team_bp
from routes.document_routes import documents_bp
from routes.report_routes import reports_bp
from routes.notification_routes import notifications_bp


FRONTEND_DIST = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')


def create_app():
    app = Flask(__name__)

    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-jwt-secret')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    database_url = os.getenv('DATABASE_URL')
    if database_url:
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    else:
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(os.path.dirname(__file__), 'innovation_memphis.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024))

    db.init_app(app)
    JWTManager(app)
    allowed_origins = ['http://localhost:5173', 'http://localhost:3000']
    if os.getenv('FRONTEND_ORIGIN'):
        allowed_origins.append(os.getenv('FRONTEND_ORIGIN'))
    CORS(app, origins=allowed_origins, supports_credentials=True)

    app.register_blueprint(auth_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(tasks_bp)
    app.register_blueprint(team_bp)
    app.register_blueprint(documents_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(notifications_bp)

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        full_path = os.path.join(FRONTEND_DIST, path)
        if path and os.path.isfile(full_path):
            return send_from_directory(FRONTEND_DIST, path)
        index = os.path.join(FRONTEND_DIST, 'index.html')
        if os.path.isfile(index):
            return send_from_directory(FRONTEND_DIST, 'index.html')
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error'}), 500

    with app.app_context():
        db.create_all()
        seed_data()

    return app


def seed_data():
    if User.query.filter_by(email='jasmine.worles@innovationmemphis.gov').first():
        return

    director = User(
        name='Jasmine Worles',
        email='jasmine.worles@innovationmemphis.gov',
        role='director',
        title='Innovation Team Director',
        department='Innovation Team Memphis',
    )
    director.set_password('Memphis2026!')
    db.session.add(director)

    team_members_data = [
        {'name': 'April Steele', 'email': 'april.steele@innovationmemphis.gov', 'role': 'manager', 'title': 'Project Manager'},
        {'name': 'Prathmesh Kulkarni', 'email': 'prathmesh.kulkarni@innovationmemphis.gov', 'role': 'team_member', 'title': 'Full Stack Developer'},
        {'name': 'Justin Data', 'email': 'justin.data@innovationmemphis.gov', 'role': 'team_member', 'title': 'Data Engineer'},
        {'name': 'Forwadly', 'email': 'forwadly@innovationmemphis.gov', 'role': 'team_member', 'title': 'Team Member'},
    ]

    members = [director]
    for m_data in team_members_data:
        u = User(
            name=m_data['name'],
            email=m_data['email'],
            role=m_data['role'],
            title=m_data['title'],
            department='Innovation Team Memphis',
        )
        u.set_password('Memphis2026!')
        db.session.add(u)
        members.append(u)

    db.session.flush()

    project = Project(
        name='Home 901 Website Revamp',
        description='AI chatbot integration, data pipeline automation, and full website revamp for home901.org to address Memphis homelessness access gaps',
        status='in_progress',
        priority='high',
        progress=65,
        color='#0EA5E9',
        start_date=date(2026, 1, 15),
        due_date=date(2026, 8, 30),
        created_by=director.id,
    )
    db.session.add(project)
    db.session.flush()

    for i, member in enumerate(members):
        pm = ProjectMember(
            project_id=project.id,
            user_id=member.id,
            role_in_project='owner' if i == 0 else 'member',
        )
        db.session.add(pm)

    tasks_data = [
        {'title': 'Audit current home901.org website', 'status': 'done', 'priority': 'high', 'assignee_idx': 2},
        {'title': 'Design new website wireframes', 'status': 'done', 'priority': 'high', 'assignee_idx': 3},
        {'title': 'Set up AI chatbot infrastructure', 'status': 'in_progress', 'priority': 'critical', 'assignee_idx': 2},
        {'title': 'Build data pipeline for homelessness data', 'status': 'in_progress', 'priority': 'high', 'assignee_idx': 4},
        {'title': 'Frontend React development', 'status': 'in_progress', 'priority': 'high', 'assignee_idx': 2},
        {'title': 'Integrate chatbot with existing CMS', 'status': 'todo', 'priority': 'medium', 'assignee_idx': 2},
        {'title': 'User acceptance testing', 'status': 'todo', 'priority': 'medium', 'assignee_idx': 5},
        {'title': 'Deploy to production', 'status': 'todo', 'priority': 'high', 'assignee_idx': 2},
    ]

    for i, t_data in enumerate(tasks_data):
        t = Task(
            project_id=project.id,
            title=t_data['title'],
            status=t_data['status'],
            priority=t_data['priority'],
            position=i,
            created_by=director.id,
            due_date=date(2026, 7, 30),
        )
        db.session.add(t)
        db.session.flush()

        idx = t_data.get('assignee_idx', 0)
        if idx < len(members):
            ta = TaskAssignee(task_id=t.id, user_id=members[idx].id)
            db.session.add(ta)

    db.session.commit()
    print('✅ Seed data created successfully')


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5001)
