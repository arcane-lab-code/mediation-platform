# Deployment Instructions - Mediation Platform

## Current Status

✅ Application container is running
⚠️ Waiting for PostgreSQL database

## Quick Fix: Deploy PostgreSQL Database

### Option 1: Via Coolify UI (Recommended)

1. Go to https://coolify.arcanelab.es
2. Navigate to: Resources → Databases → Add Database
3. Select: **PostgreSQL 15**
4. Configuration:
   ```
   Name: mediation-db
   Database: mediation_db
   Username: postgres
   Password: MediationSecure2025!
   Port: 5432
   ```
5. Click "Create"
6. Wait for database to start

### Option 2: Via Docker Compose

```bash
cd /root/arcaneclaude/mediation-platform

# Create .env file with database credentials
cat > .env << 'EOF'
DB_NAME=mediation_db
DB_USER=postgres
DB_PASSWORD=MediationSecure2025!
EOF

# Start only PostgreSQL
docker-compose up -d postgres

# Verify it's running
docker ps | grep postgres
```

### Option 3: Using Existing PostgreSQL

If you already have PostgreSQL running, update the environment variables in Coolify:

1. Go to: Applications → mediation-platform → Environment Variables
2. Add/Update:
   ```
   DB_HOST=your_postgres_host
   DB_PORT=5432
   DB_NAME=mediation_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   ```
3. Restart the application

## After Database is Running

### Configure Environment Variables in Coolify

1. Go to: Applications → mediation-platform
2. Click on "Environment Variables"
3. Add these variables:
   ```
   NODE_ENV=production
   PORT=5000
   DB_HOST=postgres  # or your database host
   DB_PORT=5432
   DB_NAME=mediation_db
   DB_USER=postgres
   DB_PASSWORD=MediationSecure2025!
   JWT_SECRET=mediation_jwt_secret_key_2025_prod_change_this
   JWT_EXPIRE=7d
   ```
4. Click "Save"
5. Restart the application

### Configure Domain

1. In Coolify UI, go to: Applications → mediation-platform → Domains
2. Add domain:
   - Simple: `mediation-i0ggoo48.91.99.162.155.sslip.io`
   - Custom: `mediation.arcanelab.es`
3. Enable SSL (automatic with Let's Encrypt)
4. Save

### Verify Deployment

```bash
# Check container status
docker ps | grep mediation

# Check logs
docker logs -f i0ggoo48gsgwgoc4k8oko4k4-222403316531

# Test health endpoint (after domain is configured)
curl https://your-domain/health

# Test API
curl https://your-domain/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mediation.com","password":"Admin123!"}'
```

## Troubleshooting

### Container keeps restarting
- Check logs: `docker logs -f <container-name>`
- Verify database is accessible
- Check environment variables are set correctly

### Database connection fails
```bash
# Test database connectivity
docker exec -it <postgres-container> psql -U postgres -d mediation_db -c "SELECT version();"
```

### Application won't start
- Verify all environment variables are set
- Check that PostgreSQL is running and accessible
- Review Coolify deployment logs

## Quick Start with Docker Compose (Local Testing)

```bash
cd /root/arcaneclaude/mediation-platform

# Start everything
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Access the app
curl http://localhost:5000/health
```

## Next Steps

1. ✅ Fix Docker build (Done)
2. ⏳ Deploy PostgreSQL database
3. ⏳ Configure environment variables
4. ⏳ Configure domain
5. ⏳ Test the application
6. ⏳ Change default admin password

---

**Current Deployment UUID:** i0ggoo48gsgwgoc4k8oko4k4
**GitHub:** https://github.com/arcane-lab-code/mediation-platform
**Latest Commit:** 900ffe7
