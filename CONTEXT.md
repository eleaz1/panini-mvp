# CONTEXT.md — Panini MVP

> Este archivo es el contrato de arquitectura del proyecto.
> Cursor debe leerlo antes de generar cualquier código.
> Actualízalo cada vez que se tome una decisión arquitectónica relevante.

---

## ¿Qué es este proyecto?

Tracker personal de láminas Panini para el Mundial 2026, pensado para un grupo
de ~20 amigos. Cada usuario registra qué láminas tiene, cuáles le faltan y cuáles
tiene repetidas. La app calcula automáticamente los posibles intercambios entre
usuarios del grupo.

El diseño está preparado para soportar múltiples álbumes (no solo Panini Mundial —
Copa América, Champions, etc.), configurables sin cambiar código.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Backend framework | FastAPI | ^0.111 |
| Validación | Pydantic v2 | ^2.7 |
| ORM | SQLAlchemy 2.x async | ^2.0 |
| DB (desarrollo) | SQLite + aiosqlite | — |
| DB (producción) | PostgreSQL + asyncpg | — |
| Autenticación | JWT con python-jose + bcrypt | — |
| Gestión de deps | Poetry (`pyproject.toml`) | — |
| Frontend framework | Angular 17 standalone | — |
| UI components | Angular Material | — |
| Contenedores | Docker + Docker Compose | — |
| Servidor web | nginx (prod) | alpine |

---

## Arquitectura del backend

El backend sigue **Clean Architecture + Hexagonal Architecture (Ports & Adapters)**.

### Regla de dependencias (NUNCA violar)

```
domain → (nadie)
application → domain
infrastructure → domain
interfaces → application + infrastructure
```

`domain` nunca importa nada de fuera. `application` nunca importa SQLAlchemy,
FastAPI ni ningún framework. Los routers nunca tienen lógica de negocio.

### Estructura de carpetas

```
backend/
├── src/
│   ├── config.py                          # Pydantic Settings — variables de entorno
│   ├── main.py                            # FastAPI app, lifespan, CORS, routers
│   │
│   ├── domain/
│   │   ├── entities/
│   │   │   └── models.py                  # User, Album, Sticker, SwapMatch, StickerStatus
│   │   └── ports/
│   │       └── repositories.py            # Interfaces abstractas (ABC) de repositorios
│   │
│   ├── application/
│   │   └── use_cases/
│   │       └── album_use_cases.py         # AuthUseCases, AlbumUseCases, StickerUseCases
│   │
│   ├── infrastructure/
│   │   ├── auth.py                        # hash_password, verify_password, JWT encode/decode
│   │   ├── db/
│   │   │   ├── orm_models.py              # UserORM, AlbumORM, StickerORM (SQLAlchemy mapped)
│   │   │   └── session.py                 # engine, async_session_factory, get_session, init_db
│   │   └── repositories/
│   │       └── sql_repositories.py        # SQLUserRepository, SQLAlbumRepository, SQLStickerRepository
│   │
│   └── interfaces/
│       ├── schemas/
│       │   └── api_schemas.py             # Schemas Pydantic v2 de request/response
│       └── api/
│           ├── dependencies/
│           │   └── deps.py                # FastAPI Depends — wiring de repos y use cases
│           └── routers/
│               └── api.py                 # auth_router, album_router, sticker_router
│
├── tests/
│   ├── unit/
│   │   └── test_domain.py                 # Tests de dominio (sin DB, sin mocks de infra)
│   └── integration/                       # Tests con DB SQLite en memoria (por implementar)
│
├── pyproject.toml
├── Dockerfile
└── .env.example
```

---

## Entidades de dominio

```python
# StickerStatus: "missing" | "have" | "duplicate"
# Ciclo: missing → have → duplicate → missing

@dataclass
class User:
    id: int; username: str; email: str; hashed_password: str; is_active: bool

@dataclass
class Album:
    id: int; name: str; total_stickers: int; owner_id: int; description: str
    def completion_percentage(self, have_count: int) -> float: ...

@dataclass
class Sticker:
    id: int; album_id: int; user_id: int; number: int; status: StickerStatus
    def cycle_status(self) -> None: ...  # cicla missing→have→duplicate→missing

@dataclass
class SwapMatch:  # Value Object — resultado del cálculo de intercambios
    friend_id: int; friend_username: str
    can_give: list[int]     # mis repetidas que al amigo le faltan
    can_receive: list[int]  # sus repetidas que a mí me faltan
```

---

## API endpoints implementados

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login                          → { access_token, token_type }
GET    /api/v1/auth/me

GET    /api/v1/albums
POST   /api/v1/albums                              body: { name, total_stickers, description }
PUT    /api/v1/albums/{id}
DELETE /api/v1/albums/{id}

GET    /api/v1/albums/{id}/stickers                ?status_filter=missing|have|duplicate
PATCH  /api/v1/albums/{id}/stickers/{number}       body: { status }
POST   /api/v1/albums/{id}/stickers/bulk           body: { stickers: [{number, status}] }
GET    /api/v1/albums/{id}/stickers/stats          → { total, have, missing, duplicate, completion_pct }
GET    /api/v1/albums/{id}/stickers/swaps          → lista de SwapMatch ordenada por total_possible desc

GET    /health
```

Todos los endpoints (excepto register, login y health) requieren `Authorization: Bearer <token>`.

---

## Frontend Angular

### Estructura esperada

```
frontend/
├── src/
│   └── app/
│       ├── core/
│       │   ├── services/
│       │   │   ├── auth.service.ts        # AuthService con signals, login/register/logout
│       │   │   └── album.service.ts       # AlbumService — CRUD albums + stickers + swaps
│       │   ├── interceptors/
│       │   │   └── auth.interceptor.ts    # Inyecta Bearer token en cada request
│       │   └── guards/
│       │       └── auth.guard.ts          # Redirige a /login si no hay token
│       ├── features/
│       │   ├── auth/                      # LoginComponent, RegisterComponent
│       │   ├── albums/                    # AlbumListComponent, AlbumFormComponent
│       │   ├── stickers/                  # StickerGridComponent (el tracker principal)
│       │   └── swaps/                     # SwapMatchesComponent
│       └── shared/                        # Componentes reutilizables
├── environments/
│   ├── environment.ts                     # apiUrl: 'http://localhost:8000'
│   └── environment.prod.ts               # apiUrl: '' (nginx hace proxy)
├── Dockerfile                             # multi-stage: ng build → nginx
└── nginx.conf                             # SPA fallback + proxy /api/ → backend:8000
```

### Convenciones Angular

- **Standalone components** en todos los componentes (Angular 17)
- **Signals** para estado reactivo (`signal()`, `computed()`, `effect()`)
- **inject()** en lugar de constructor injection
- **HttpClient** con `withInterceptors([authInterceptor])` en `app.config.ts`
- Angular Material para UI — tema ya configurado
- Nombres: `feature-name.component.ts`, `feature-name.service.ts`

---

## Convenciones Python (aplicar siempre)

- Type hints completos en todas las funciones públicas
- Docstrings Google Style donde aplique
- Máximo 88 caracteres por línea (Black)
- `snake_case` para variables/funciones, `PascalCase` para clases
- Imports: stdlib → third-party → local
- Nunca `except Exception` genérico sin re-raise o logging
- Nunca lógica de negocio dentro de routers FastAPI
- Nunca imports de SQLAlchemy/FastAPI dentro de `domain/`
- Errores de dominio: lanzar `ValueError` o `PermissionError` desde use cases;
  los routers los capturan y los convierten en HTTPException

---

## Variables de entorno

```bash
# .env (copiar de .env.example)
DATABASE_URL=sqlite+aiosqlite:///./panini.db
SECRET_KEY=<openssl rand -hex 32>
DEBUG=false
CORS_ORIGINS=["http://localhost:4200","http://localhost:80"]
```

Para producción cambiar `DATABASE_URL` a `postgresql+asyncpg://user:pass@host/db`.
El código no cambia — los repositorios son intercambiables.

---

## Arranque local

```bash
# Backend
cd backend
cp .env.example .env
poetry install
uvicorn src.main:app --reload --port 8000
# Docs: http://localhost:8000/api/docs

# Frontend
cd frontend
npm install
ng serve
# App: http://localhost:4200

# Todo con Docker
docker compose up --build
```

---

## Estado actual del proyecto

| Módulo | Estado |
|---|---|
| Backend — dominio | ✅ Completo |
| Backend — repositorios SQL | ✅ Completo |
| Backend — use cases | ✅ Completo |
| Backend — API REST | ✅ Completo |
| Backend — auth JWT | ✅ Completo |
| Backend — tests unitarios | ✅ Completo (dominio) |
| Backend — tests integración | ⬜ Pendiente |
| Frontend — services | ✅ Completo (AuthService, AlbumService) |
| Frontend — interceptor + guard | ✅ Completo |
| Frontend — componentes UI | ⬜ Pendiente |
| Docker Compose | ✅ Completo |

---

## Próximos pasos sugeridos

1. `ng new panini-frontend --standalone --routing --style=scss` dentro de `frontend/`
2. Instalar Angular Material: `ng add @angular/material`
3. Crear `app.config.ts` con `provideHttpClient(withInterceptors([authInterceptor]))`
4. Implementar `LoginComponent` y `RegisterComponent` (feature: auth)
5. Implementar `StickerGridComponent` — el tracker principal con grid de números
6. Agregar tests de integración en `backend/tests/integration/` con DB SQLite en memoria

---

## Decisiones de diseño tomadas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| SQLite en dev | PostgreSQL desde el inicio | Cero infraestructura, mismo código |
| JWT stateless | Sessions con Redis | Simplicidad para 20 usuarios |
| `dataclasses` en dominio | Pydantic en dominio | Dominio sin dependencias externas |
| Bulk endpoint para stickers | WebSocket | Suficiente para el volumen actual |
| nginx como reverse proxy | FastAPI sirviendo frontend | Separación correcta de responsabilidades |
