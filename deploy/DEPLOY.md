# Deployment Guide — DigitalOcean Droplet

## Requisitos
- Droplet Ubuntu 22.04, 2GB RAM, $12/mes
- SSH key configurada al crear el Droplet
- Repositorio: https://github.com/eleaz1/panini-mvp

---

## 1. Conectarse al servidor

```bash
ssh root@<IP_DEL_DROPLET>
```

---

## 2. Instalar Docker y Git

```bash
apt-get update -y
apt-get install -y ca-certificates curl gnupg ufw git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

systemctl enable docker
systemctl start docker

# Verificar que Docker funciona
docker --version
docker compose version
```

---

## 3. Configurar Firewall

> **Importante:** NO abrir el puerto 8000. El frontend (nginx) hace proxy interno
> hacia el backend — el puerto 8000 nunca debe ser accesible desde internet.

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw --force enable

# Verificar reglas
ufw status
```

---

## 4. Clonar el repositorio

```bash
git clone https://github.com/eleaz1/panini-mvp /app
cd /app
```

---

## 5. Configurar variables de entorno

```bash
cp deploy/backend.env.production.example backend/.env
nano backend/.env
```

Valores que DEBES cambiar en el editor:

| Variable | Cómo obtenerla |
|----------|---------------|
| `DATABASE_URL` | Reemplaza `<DB_PASSWORD>` con tu contraseña elegida |
| `SECRET_KEY` | Ejecuta: `openssl rand -hex 32` y pega el resultado |
| `CORS_ORIGINS` | IP del Droplet en formato JSON: `["http://123.45.67.89"]` |
| `FRONTEND_URL` | `http://<IP_DEL_DROPLET>` |
| `POSTGRES_PASSWORD` | La misma contraseña que pusiste en `DATABASE_URL` |
| `ADMIN_EMAIL` | Tu email de admin |
| `ADMIN_PASSWORD` | Contraseña fuerte para el admin |
| `SMTP_USER` | Tu Gmail (opcional, si quieres enviar emails) |
| `SMTP_PASSWORD` | App password de Gmail (opcional) |

Guardar en nano: `Ctrl+O` → Enter → `Ctrl+X`

> **CORS_ORIGINS** debe ser JSON válido. Ejemplo con dominio:
> `CORS_ORIGINS=["http://123.45.67.89","https://tudominio.com"]`

---

## 6. Construir y arrancar los contenedores

```bash
cd /app

# Primera vez: construir imágenes y arrancar
docker compose up -d --build

# Ver que todos los servicios estén corriendo
docker compose ps

# Ver logs en tiempo real (Ctrl+C para salir)
docker compose logs -f
```

Esperar hasta ver en los logs:
```
backend  | INFO:     Application startup complete.
```

---

## 7. Primera ejecución — datos iniciales

Al arrancar por primera vez el backend ejecuta seeders automáticamente.
Se crean los siguientes datos si no existen:

| Recurso | Usuario | Contraseña |
|---------|---------|------------|
| Admin | valor de `ADMIN_USERNAME` (default: `admin`) | valor de `ADMIN_PASSWORD` (default: `admin123`) |
| Usuario de prueba | `usuario` | `usuario123` |
| Plantilla | FIFA World Cup 2026 | — |

> **Cambia las credenciales por defecto** en `backend/.env` antes de arrancar,
> especialmente `ADMIN_PASSWORD`. Si ya arrancaste con los defaults, cámbialos
> desde el panel admin o con `docker compose restart backend`.

---

## 8. Verificar que funciona

```bash
# Health check del backend
curl http://localhost:8000/health

# Acceder desde el navegador:
# http://<IP_DEL_DROPLET>
```

---

## Comandos útiles del día a día

```bash
# Ver estado de los contenedores
docker compose ps

# Ver logs de un servicio específico
docker compose logs backend -f
docker compose logs frontend -f
docker compose logs db -f

# Reiniciar un servicio
docker compose restart backend

# Detener todo
docker compose down

# Detener y borrar volúmenes (OJO: borra la base de datos)
docker compose down -v

# Actualizar la app con nuevos cambios del repo
git pull
docker compose up -d --build
```

---

## Actualizar la app (deployments futuros)

```bash
cd /app
git pull
docker compose up -d --build
docker compose logs -f
```

---

## Backup de la base de datos

```bash
# Crear backup
docker compose exec db pg_dump -U laminy laminy > backup_$(date +%Y%m%d).sql

# Restaurar backup
docker compose exec -T db psql -U laminy laminy < backup_YYYYMMDD.sql
```

---

## Troubleshooting

**El backend no arranca / error de conexión a DB:**
```bash
# Verificar que la DB está healthy antes que el backend
docker compose ps
# Si db no está healthy, revisar que POSTGRES_PASSWORD en .env no esté vacío
docker compose logs db
```

**Error `POSTGRES_PASSWORD is not set`:**
```bash
# El docker-compose requiere esta variable sin valor por defecto
grep POSTGRES_PASSWORD backend/.env
```

**El frontend carga pero las llamadas API fallan (404 / network error):**
```bash
# Verificar que CORS_ORIGINS incluye la IP exacta con la que accedes
grep CORS_ORIGINS backend/.env
# Verificar que nginx proxea correctamente
docker compose logs frontend
```

**Reconstruir solo un servicio tras un cambio:**
```bash
docker compose up -d --build backend
```

**Ver variables de entorno que cargó el backend:**
```bash
docker compose exec backend env | grep -E "DATABASE|SECRET|CORS|SMTP"
```
