# GEO AI Complaint System - Deployment & Setup Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Setup](#backend-setup)
3. [Frontend Setup](#frontend-setup)
4. [Running Locally](#running-locally)
5. [Environment Configuration](#environment-configuration)
6. [Production Deployment](#production-deployment)
7. [Database Setup](#database-setup)
8. [API Documentation](#api-documentation)
9. [Troubleshooting](#troubleshooting)
10. [Future Upgrades](#future-upgrades)

---

## Prerequisites

### System Requirements
- **OS**: Windows, macOS, or Linux
- **Python**: 3.8+ (for backend)
- **Node.js**: 16+ (for frontend)
- **npm**: 8+ or **yarn**: 1.22+
- **Git**: For version control

### Required Tools
- Code editor (VS Code recommended)
- PostgreSQL (for production)
- Docker (optional, for containerization)
- Postman or similar (for API testing)

---

## Backend Setup

### 1. Create Virtual Environment

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate
```

### 2. Install Dependencies

```bash
# Install Python packages
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
# Create .env file from template
cp .env.example .env

# Edit .env with your configuration
# Important variables to set:
# - SECRET_KEY: Generate a strong random key
# - DATABASE_URL: Set your database connection string
# - DEBUG: Set to False in production
```

### 4. Generate Secret Key

```python
# Run in Python interactive shell
import secrets
print(secrets.token_urlsafe(32))
# Copy the output to SECRET_KEY in .env
```

### 5. Initialize Database

```bash
# Database will auto-create with SQLite
# For production with PostgreSQL, create database first:
# psql -U postgres -c "CREATE DATABASE geoai_complaints;"
```

### 6. Run Backend Server

```bash
# Development mode
python -m uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

# Production mode (use Gunicorn)
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 src.main:app
```

The API will be available at: `http://localhost:8000`
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Frontend Setup

### 1. Install Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install npm packages
npm install
# or
yarn install
```

### 2. Configure Environment Variables

```bash
# Create .env file
cat > .env << EOF
REACT_APP_API_URL=http://localhost:8000/api
EOF
```

### 3. Run Development Server

```bash
# Start development server
npm run dev
# or
yarn dev
```

The frontend will be available at: `http://localhost:3000`

### 4. Build for Production

```bash
# Create optimized production build
npm run build
# or
yarn build

# Preview production build
npm run preview
# or
yarn preview
```

---

## Running Locally

### Quick Start (Both Backend & Frontend)

**Terminal 1 - Backend:**
```bash
cd backend
.venv\Scripts\activate  # or source .venv/bin/activate
python -m uvicorn src.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open your browser and navigate to `http://localhost:3000`

### Test Credentials

```
Email: admin@example.com
Password: admin123
Role: Admin (has access to all features)
```

---

## Environment Configuration

### Backend (.env)

```env
# Database
DATABASE_URL=sqlite:///./geoai_complaints.db
# For PostgreSQL: postgresql://user:password@localhost/geoai_complaints

# JWT Security
SECRET_KEY=your-super-secret-key-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Application
DEBUG=True
APP_NAME=GEO AI Complaint System
APP_VERSION=1.0.0

# CORS
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:8000"]

# Email (optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-password

# KoboToolbox Integration (optional)
KOBO_API_URL=https://kf.kobotoolbox.org/api/v2/
KOBO_API_TOKEN=your-kobo-token
```

### Frontend (.env)

```env
REACT_APP_API_URL=http://localhost:8000/api
```

---

## Production Deployment

### Backend Deployment on Linux

#### Using Gunicorn + Nginx

1. **Install system dependencies:**
```bash
sudo apt-get update
sudo apt-get install python3-pip python3-venv postgresql postgresql-contrib nginx
```

2. **Setup application:**
```bash
cd /var/www/geoai-complaint-system/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. **Create systemd service** (`/etc/systemd/system/geoai-backend.service`):
```ini
[Unit]
Description=GEO AI Complaint System Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/geoai-complaint-system/backend
Environment="PATH=/var/www/geoai-complaint-system/backend/venv/bin"
ExecStart=/var/www/geoai-complaint-system/backend/venv/bin/gunicorn -w 4 -b 127.0.0.1:8000 src.main:app

[Install]
WantedBy=multi-user.target
```

4. **Enable and start service:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable geoai-backend
sudo systemctl start geoai-backend
```

#### Nginx Configuration

Create `/etc/nginx/sites-available/geoai-api`:
```nginx
server {
    listen 80;
    server_name api.your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/geoai-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Frontend Deployment

#### Using Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Configure build settings:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Set environment variables in Vercel dashboard
4. Deploy with a single push to main branch

#### Using AWS S3 + CloudFront

```bash
# Build frontend
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

#### Using Docker

Create `docker-compose.yml` in root directory:
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/geoai
      - SECRET_KEY=your-secret-key
    depends_on:
      - db

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=geoai
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Run with Docker:
```bash
docker-compose up -d
```

---

## Database Setup

### Using PostgreSQL

1. **Create database:**
```bash
psql -U postgres
CREATE DATABASE geoai_complaints;
CREATE USER geoai_user WITH PASSWORD 'secure_password';
ALTER ROLE geoai_user SET client_encoding TO 'utf8';
ALTER ROLE geoai_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE geoai_user SET default_transaction_deferrable TO on;
ALTER ROLE geoai_user SET default_transaction_read_committed TO 'on';
GRANT ALL PRIVILEGES ON DATABASE geoai_complaints TO geoai_user;
\q
```

2. **Update .env:**
```env
DATABASE_URL=postgresql://geoai_user:secure_password@localhost:5432/geoai_complaints
```

3. **Initialize tables:**
The tables will be created automatically when the backend starts.

### Backup Database

```bash
# PostgreSQL backup
pg_dump -U geoai_user geoai_complaints > backup.sql

# Restore from backup
psql -U geoai_user geoai_complaints < backup.sql
```

---

## API Documentation

### Authentication Endpoints

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "full_name": "User Name",
  "phone": "+1234567890",
  "organization": "Org Name"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {...}
}
```

### Complaint Endpoints

#### Create Complaint
```
POST /api/complaints
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Landslide on Main Street",
  "description": "Major landslide blocking traffic",
  "disaster_type": "Landslide",
  "severity": "High",
  "latitude": 28.6139,
  "longitude": 77.2090,
  "location_name": "Main Street, City",
  "affected_people": 50,
  "damage_description": "Road blocked, 3 buildings damaged"
}
```

#### List Complaints
```
GET /api/complaints?skip=0&limit=10&status=submitted&disaster_type=Landslide
Authorization: Bearer <token>
```

#### Get Complaint Details
```
GET /api/complaints/{complaint_id}
Authorization: Bearer <token>
```

#### Update Complaint
```
PUT /api/complaints/{complaint_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "under_review",
  "admin_notes": "Investigation in progress"
}
```

### Admin Endpoints

#### Get Statistics
```
GET /api/complaints/admin/statistics
Authorization: Bearer <admin_token>
```

#### Get Map Data
```
GET /api/complaints/admin/map-data
Authorization: Bearer <admin_token>
```

For complete API documentation, visit: `http://localhost:8000/docs`

---

## Troubleshooting

### Backend Issues

**Issue: `ModuleNotFoundError: No module named 'fastapi'`**
```bash
# Solution: Install dependencies
pip install -r requirements.txt
```

**Issue: `Address already in use` on port 8000**
```bash
# Find process using port 8000
lsof -i :8000  # Linux/macOS
netstat -ano | findstr :8000  # Windows

# Kill the process
kill -9 <PID>  # Linux/macOS
taskkill /PID <PID> /F  # Windows
```

**Issue: Database connection error**
```bash
# Verify DATABASE_URL in .env
# For SQLite: sqlite:///./geoai_complaints.db
# For PostgreSQL: postgresql://user:password@localhost/dbname

# Test connection
python -c "from src.database import engine; engine.connect(); print('OK')"
```

### Frontend Issues

**Issue: `npm: command not found`**
```bash
# Install Node.js from https://nodejs.org/
# Or use package manager:
# Ubuntu: sudo apt-get install nodejs npm
# macOS: brew install node
```

**Issue: CORS errors**
```bash
# Update ALLOWED_ORIGINS in backend .env:
ALLOWED_ORIGINS=["http://localhost:3000","http://your-domain.com"]
```

**Issue: API calls failing**
```bash
# Check REACT_APP_API_URL in frontend .env
# Ensure backend is running
# Check browser console for errors
```

---

## Future Upgrades

### 1. Custom Submission Service
**Current**: Using KoboToolbox for data collection
**Upgrade**: Replace with custom service
- Create custom form builder
- Direct database integration
- Enhanced data validation
- Custom workflows

### 2. Advanced Analytics
- Real-time data dashboard
- Predictive analytics for disaster hotspots
- Trend analysis and reporting
- Export to various formats

### 3. Mobile Application
- React Native app
- Offline support
- Push notifications
- Enhanced geolocation features

### 4. Third-party Integrations
- SMS/WhatsApp notifications
- Email alerts
- Slack integration
- Integration with emergency services

### 5. AI/ML Features
- Complaint classification
- Severity prediction
- Location clustering
- Anomaly detection

### 6. Enhanced Security
- Two-factor authentication (2FA)
- OAuth2.0 integration
- Advanced encryption
- Audit logging

### 7. Performance Optimization
- Redis caching
- Database query optimization
- CDN for static assets
- Load balancing

### 8. Scalability Improvements
- Horizontal scaling setup
- Message queue implementation (RabbitMQ/Celery)
- Microservices architecture
- Kubernetes deployment

---

## Support & Documentation

- **API Docs**: Visit `http://backend-url/docs`
- **GitHub Issues**: Report bugs and request features
- **Community**: Reach out to the development team
- **License**: MIT License

---

## Version History

- **v1.0.0** (2024): Initial release
  - User authentication
  - Complaint submission and management
  - Admin dashboard
  - Map visualization with OpenLayers
  - Basic analytics

---

Last Updated: May 2024
