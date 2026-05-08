# Panini MVP — Album Tracker

Tracker personal de láminas Panini para el Mundial 2026. Pensado para 20 amigos, con
Clean Architecture en el backend (FastAPI) y Angular en el frontend.

---

## Arranque rápido

### Opción A — Docker Compose (recomendada, cero instalaciones)

```bash
# 1. Clonar y entrar al proyecto
git clone <repo> panini-mvp && cd panini-mvp

# 2. Generar secret key
echo "SECRET_KEY=$(openssl rand -hex 32)" > .env

# 3. Levantar todo
docker compose up --build

# Backend:  http://localhost:8000
# Docs API: http://localhost:8000/api/docs
# Frontend: http://localhost:80
```

### Opción B — Desarrollo local

**Backend:**
```bash
cd backend
cp .env.example .env          # editar si quieres
poetry install
uvicorn src.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
ng serve                      # http://localhost:4200
```

---

## Estructura del proyecto

```
panini-mvp/
├── backend/
│   ├── src/
│   │   ├── domain/           # Entidades y ports (sin dependencias externas)
│   │   │   ├── entities/     # User, Album, Sticker, SwapMatch
│   │   │   └── ports/        # Interfaces abstractas de repositorios
│   │   ├── application/      # Casos de uso: AuthUseCases, AlbumUseCases, StickerUseCases
│   │   ├── infrastructure/   # SQLAlchemy, auth JWT, repositorios SQL
│   │   └── interfaces/       # FastAPI routers, schemas Pydantic v2, deps
│   ├── tests/
│   │   ├── unit/             # Tests de dominio (sin DB)
│   │   └── integration/      # Tests con DB en memoria
│   ├── pyproject.toml
│   └── Dockerfile
├── frontend/
│   ├── src/app/
│   │   ├── core/             # AuthService, AlbumService, interceptors, guards
│   │   ├── features/         # albums/, stickers/, swaps/, auth/
│   │   └── shared/           # Componentes reutilizables
│   ├── Dockerfile
│   └── nginx.conf
└── docker-compose.yml
```

---

## API Reference

```
POST   /api/v1/auth/register    — Registro de usuario
POST   /api/v1/auth/login       — Login, retorna JWT
GET    /api/v1/auth/me          — Usuario actual

GET    /api/v1/albums           — Mis álbumes
POST   /api/v1/albums           — Crear álbum (name, total_stickers, description)
PUT    /api/v1/albums/{id}      — Actualizar álbum
DELETE /api/v1/albums/{id}      — Eliminar álbum

GET    /api/v1/albums/{id}/stickers            — Lista láminas (filtrar por ?status_filter=)
PATCH  /api/v1/albums/{id}/stickers/{number}   — Actualizar una lámina
POST   /api/v1/albums/{id}/stickers/bulk       — Actualizar muchas a la vez
GET    /api/v1/albums/{id}/stickers/stats      — Estadísticas de completado
GET    /api/v1/albums/{id}/stickers/swaps      — Posibles intercambios con amigos

GET    /health                  — Health check
```

---

## Escalado a producción (cuando quieras)

1. Cambiar `DATABASE_URL` de SQLite a PostgreSQL: `postgresql+asyncpg://...`
2. Desplegar en Railway/Fly.io/Render con el mismo `docker-compose.yml`
3. El código no cambia — los repositorios son intercambiables (Hexagonal Architecture)

---

## Tests

```bash
cd backend
poetry run pytest tests/unit -v          # Tests de dominio (rápido, sin DB)
poetry run pytest tests/ -v              # Todos los tests
```

---

## Agregar un nuevo álbum (ej: Copa América)

Desde la app o directamente via API:
```json
POST /api/v1/albums
{
  "name": "Copa América 2024",
  "total_stickers": 400,
  "description": "Album Copa América USA 2024"
}
```
