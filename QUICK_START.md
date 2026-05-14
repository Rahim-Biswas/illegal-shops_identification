# Setup & Quick Reference Guide

## 🚀 Quick Setup (5 Minutes)

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn src.main:app --reload
```
**Running at**: http://localhost:8000

### Frontend
```bash
cd frontend
npm install
npm run dev
```
**Running at**: http://localhost:3000

## 📝 First Time Setup

1. Create virtual environment (backend only once)
2. Install dependencies  
3. Run both backend and frontend in separate terminals
4. Visit http://localhost:3000
5. Login with: admin@example.com / admin123

## 🔑 Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | admin123 | Admin |
| user@example.com | user123 | Regular User |

## 📚 Key Files Reference

| File | Purpose |
|------|---------|
| `backend/src/main.py` | FastAPI application entry |
| `backend/src/models.py` | Database schemas |
| `backend/src/security.py` | JWT authentication |
| `frontend/src/App.jsx` | React routing |
| `frontend/src/store/store.js` | State management |
| `.env` | Environment variables |
| `DEPLOYMENT_GUIDE.md` | Production guide |

## 🔗 Important URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 📦 Docker Quick Start

```bash
docker-compose up -d
# Access at http://localhost:3000
```

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Port 8000 in use | `lsof -i :8000` then `kill -9 <PID>` |
| Port 3000 in use | `npm run dev -- --port 3001` |
| Module not found | `pip install -r requirements.txt` |
| CORS error | Check `ALLOWED_ORIGINS` in `.env` |
| DB not found | Delete `.db` file and restart |

## 📖 Documentation

- **[DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md)** - Complete guide
- **[README.md](../README.md)** - Project overview
- **[API Docs](http://localhost:8000/docs)** - Interactive API reference

## 💡 Common Commands

```bash
# Backend
python -m uvicorn src.main:app --reload --port 8000

# Frontend  
npm run build      # Production build
npm run preview    # Preview build
npm run lint       # Lint code

# Docker
docker-compose up -d       # Start services
docker-compose down        # Stop services
docker-compose ps          # Check status
docker-compose logs -f     # View logs
```

## 🏗️ Project Structure Summary

```
geoai-complaint-system/
├── backend/              → FastAPI backend
│   ├── src/
│   │   ├── main.py      → App entry
│   │   ├── models.py    → Database
│   │   ├── security.py  → Auth
│   │   └── routes/      → Endpoints
│   └── requirements.txt  → Dependencies
├── frontend/             → React frontend
│   ├── src/
│   │   ├── pages/       → Page components
│   │   ├── services/    → API client
│   │   ├── store/       → State
│   │   └── App.jsx      → Routing
│   └── package.json     → Dependencies
└── DEPLOYMENT_GUIDE.md   → Production guide
```

## 🎯 Next Steps

1. ✅ Run backend and frontend
2. ✅ Test login/registration
3. ✅ Create a sample complaint
4. ✅ View on map (admin only)
5. ✅ Check admin dashboard
6. 📚 Read DEPLOYMENT_GUIDE.md for production setup
7. 🚀 Deploy using Docker or cloud platform

## 📞 Support

- Check [DEPLOYMENT_GUIDE.md](../DEPLOYMENT_GUIDE.md) for troubleshooting
- Review [README.md](../README.md) for project info
- Check API docs at http://localhost:8000/docs
