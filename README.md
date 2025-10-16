# Mediation Platform - Online Dispute Resolution System

A comprehensive web application for managing online mediation procedures and dispute resolution cases.

## Features

### Case Management
- Create and track mediation cases
- Assign mediators to cases
- Track case status (pending, active, suspended, resolved, closed)
- Priority levels (low, medium, high, urgent)
- Case categories (family, commercial, labor, civil, etc.)

### User Roles
- **Admin**: Full system access and user management
- **Mediator**: Manage assigned cases and conduct sessions
- **Client**: Create cases and participate in mediation

### Session Management
- Schedule mediation sessions
- Online meeting links integration
- Track participant attendance
- Session notes and outcomes

### Communication
- Secure messaging between parties
- Document upload and management
- Activity timeline for transparency
- Notification system

### Additional Features
- User authentication with JWT
- Role-based access control
- Responsive design (mobile & desktop)
- RESTful API backend
- PostgreSQL database

## Tech Stack

### Backend
- Node.js + Express.js
- PostgreSQL database
- JWT authentication
- bcrypt password hashing
- Input validation

### Frontend
- React.js
- React Router for navigation
- Modern CSS with gradients
- Responsive design

### Infrastructure
- Docker & Docker Compose
- nginx (in production)
- PostgreSQL 15

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- PostgreSQL 15+ (for local development)

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server
NODE_ENV=production
PORT=5000

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=mediation_db
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_key_change_this
JWT_EXPIRE=7d

# Optional: Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_password
```

### Installation

#### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/mediation-platform.git
cd mediation-platform

# Create .env file
cp .env.example .env
# Edit .env with your values

# Build and start containers
docker-compose up -d

# Check logs
docker-compose logs -f
```

The application will be available at:
- Frontend: http://localhost:5000
- API: http://localhost:5000/api
- Health Check: http://localhost:5000/health

#### Local Development

```bash
# Install dependencies
npm run install-all

# Start PostgreSQL (via Docker)
docker-compose up -d postgres

# Initialize database
psql -h localhost -U postgres -d mediation_db -f server/database/schema.sql

# Start development servers
npm run dev

# Backend will run on http://localhost:5000
# Frontend will run on http://localhost:3000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Cases
- `GET /api/cases` - List all cases (filtered by role)
- `GET /api/cases/:id` - Get case details
- `POST /api/cases` - Create new case
- `PUT /api/cases/:id` - Update case
- `DELETE /api/cases/:id` - Delete case (admin only)
- `POST /api/cases/:id/parties` - Add party to case

### Sessions
- `GET /api/sessions/case/:caseId` - Get sessions for case
- `POST /api/sessions` - Create session
- `PUT /api/sessions/:id` - Update session
- `POST /api/sessions/:id/participants` - Add participant

## Default Credentials

**Admin Account:**
- Email: `admin@mediation.com`
- Password: `Admin123!`

Change these credentials immediately after first login!

## Database Schema

The system includes the following main tables:
- `users` - System users (admin, mediators, clients)
- `cases` - Mediation cases
- `case_parties` - Parties involved in cases
- `sessions` - Mediation sessions
- `session_participants` - Session attendees
- `documents` - Case documents
- `messages` - Inter-party communications
- `case_activities` - Activity log
- `agreements` - Mediation agreements
- `notifications` - User notifications

## Deployment

### Deploy to Coolify

1. Create new application in Coolify
2. Connect your GitHub repository
3. Set environment variables in Coolify
4. Use the Dockerfile for build
5. Expose port 5000
6. Add PostgreSQL database service
7. Deploy!

### Deploy to Other Platforms

The application is containerized and can be deployed to:
- Docker Swarm
- Kubernetes
- AWS ECS
- Google Cloud Run
- Azure Container Instances
- Any Docker-compatible platform

## Security Considerations

- Change default admin password immediately
- Use strong JWT secret in production
- Enable HTTPS (use reverse proxy like nginx)
- Regularly update dependencies
- Implement rate limiting (recommended)
- Enable database backups
- Review and rotate credentials regularly

## License

MIT License - Feel free to use this project for any purpose.

## Support

For issues, questions, or contributions, please open an issue on GitHub.

## Roadmap

Future enhancements:
- [ ] Video conferencing integration
- [ ] E-signature functionality
- [ ] Advanced reporting and analytics
- [ ] Email notifications
- [ ] Calendar integration
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] AI-powered case analysis

---

**Built with ❤️ by ArcaneCode Labs**
