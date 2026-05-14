# GEO AI Complaint System

A production-ready, full-stack web application for disaster complaint management with geospatial visualization and AI capabilities.

## 📋 Quick Links

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete setup and deployment instructions
- **[API Docs](http://localhost:8000/docs)** - Interactive API documentation (when running)

## ✨ Features

### Core Functionality
- ✅ **Multi-channel Submission**: Web form, mobile app integration, Telegram, WhatsApp
- ✅ **Complaint Management**: Create, read, update, delete complaints with geolocation
- ✅ **Real-time Status Tracking**: Track complaint status from submission to resolution
- ✅ **Geospatial Visualization**: Interactive OpenLayers map showing complaint locations
- ✅ **Admin Dashboard**: System statistics and user management
- ✅ **Comments & Updates**: Admin feedback on complaints
- ✅ **Data Analytics**: Complaints statistics by type, status, and severity

### Security
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Role-Based Access Control**: Admin and User roles with different permissions
- ✅ **Password Security**: bcrypt password hashing
- ✅ **CORS Protection**: Configured cross-origin resource sharing

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate    # Linux/macOS
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn src.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Access Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Test Credentials
- **Email**: admin@example.com
- **Password**: admin123

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | FastAPI, Python 3.8+, SQLAlchemy, PostgreSQL/SQLite |
| **Frontend** | React 18, Vite, Tailwind CSS, Zustand |
| **Mapping** | OpenLayers, Recharts |
| **Auth** | JWT, bcrypt, python-jose |
| **Deployment** | Docker, Nginx, Gunicorn |

## 📁 Project Structure

```
geoai-complaint-system/
├── backend/                    # FastAPI backend
│   ├── src/
│   │   ├── main.py            # FastAPI app entry
│   │   ├── config.py          # Configuration
│   │   ├── models.py          # Database models
│   │   ├── schemas.py         # Validation schemas
│   │   ├── security.py        # Authentication
│   │   └── routes/            # API endpoints
│   ├── requirements.txt        # Python dependencies
│   └── .env.example           # Environment template
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── pages/             # Page components
│   │   ├── components/        # Shared components
│   │   ├── services/          # API client
│   │   ├── store/             # State management
│   │   └── utils/             # Utilities
│   ├── package.json           # NPM dependencies
│   └── vite.config.js         # Build configuration
├── DEPLOYMENT_GUIDE.md         # Deployment documentation
└── README.md                   # This file
```

## 🔑 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get token
- `GET /api/auth/me` - Get current user

### Complaints
- `POST /api/complaints` - Create complaint
- `GET /api/complaints` - List user's complaints
- `GET /api/complaints/{id}` - Get complaint details
- `PUT /api/complaints/{id}` - Update complaint
- `DELETE /api/complaints/{id}` - Delete complaint (admin only)

### Admin
- `GET /api/complaints/admin/statistics` - Get statistics
- `GET /api/complaints/admin/map-data` - Get map data
- `GET /api/users` - List all users (admin only)

## 👥 User Roles

### Regular User
- Register and login
- Create and manage own complaints
- View and filter own complaints
- Add comments to own complaints
- View profile and edit settings

### Admin User
- All regular user features +
- View all complaints
- Edit and delete any complaint
- Add admin notes to complaints
- View system map and statistics
- Manage user accounts
- Access admin dashboard

## 📊 Database Models

- **User**: Email, username, password, role, profile info
- **Complaint**: Title, description, location, disaster type, status, severity
- **Comment**: Text, is_admin, timestamp
- **ComplaintStatus**: submitted, under_review, acknowledged, resolved, closed

## 🔐 Security Features

- **JWT Tokens**: 30-minute expiration (configurable)
- **Password Hashing**: bcrypt with salt
- **Role-Based Authorization**: Endpoint-level access control
- **CORS Protection**: Configured allowed origins
- **SQL Injection Prevention**: Parameterized queries via SQLAlchemy
- **XSS Protection**: React's built-in XSS prevention

## 📦 Deployment

### Using Docker
```bash
docker-compose up -d
```

### Production (Ubuntu/Linux)
See complete guide in [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

Key steps:
1. Setup PostgreSQL database
2. Configure environment variables
3. Deploy backend with Gunicorn + Nginx
4. Deploy frontend to CDN or static server
5. Setup SSL/TLS certificates

### Using Vercel (Frontend)
1. Connect GitHub repo to Vercel
2. Configure build settings (npm run build, dist folder)
3. Set REACT_APP_API_URL environment variable
4. Deploy on push to main branch

## 📈 Future Enhancements

- [ ] Custom submission service (replace KoboToolbox)
- [ ] Mobile app (React Native)
- [ ] AI-powered complaint classification
- [ ] Real-time notifications (WebSocket)
- [ ] Two-factor authentication (2FA)
- [ ] SMS/WhatsApp integration
- [ ] Predictive analytics for disaster hotspots
- [ ] Advanced geospatial analysis
- [ ] Message queues (RabbitMQ/Celery)
- [ ] Microservices architecture

## 🐛 Troubleshooting

**Port already in use**
```bash
# Find and kill process
lsof -i :8000          # Linux/macOS
netstat -ano | findstr :8000  # Windows
```

**Module not found**
```bash
pip install -r requirements.txt
```

**CORS errors**
Update `ALLOWED_ORIGINS` in backend `.env` file.

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for more troubleshooting.

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete setup, configuration, and deployment guide
- **[API Swagger UI](http://localhost:8000/docs)** - Interactive API documentation
- **Backend Code Documentation** - Inline comments and docstrings in src/ files

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📞 Support

For issues and questions:
- 🐛 GitHub Issues
- 📧 Contact the development team
- 📖 Check [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

**Version**: 1.0.0  
**Status**: Production Ready ✅  
**Last Updated**: May 2024
