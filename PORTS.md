# Ports Configuration

This document lists all ports used by the Reimbursement application.

## Development Environment

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Next.js Dev Server | Main application web server |
| 5433 | PostgreSQL | Database server (mapped from container port 5432) |

## Production Environment (Docker Compose)

| Port | Service | Description |
|------|---------|-------------|
| 3000 | Next.js App | Main application web server |
| 5432 | PostgreSQL | Database server (internal, not exposed by default) |

## Port Selection Rationale

- **5433** was chosen for development PostgreSQL to avoid conflicts with other local PostgreSQL instances (standard port is 5432)
- **3000** is the default Next.js port

## Checking Port Availability

```bash
# Check if a port is in use
lsof -i :3000
lsof -i :5433

# Check all Docker containers and their ports
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

## Changing Ports

### Development PostgreSQL Port
Edit `docker-compose.dev.yml`:
```yaml
ports:
  - "YOUR_PORT:5432"
```

Then update `DATABASE_URL` in `.env`:
```
DATABASE_URL=postgresql://postgres:postgres@localhost:YOUR_PORT/reimbursement
```

### Next.js Dev Server Port
```bash
npm run dev -- -p YOUR_PORT
```
