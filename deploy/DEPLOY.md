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

## 2. Instalar Docker

```bash
apt-get update -y
apt-get install -y ca-certificates curl gnupg ufw

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

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
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
Voy por aqui

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
| `CORS_ORIGINS` | Pon la IP del Droplet: `["http://<IP>"]` |
| `FRONTEND_URL` | `http://<IP_DEL_DROPLET>` |
| `POSTGRES_PASSWORD` | La misma contraseña que pusiste en DATABASE_URL |
| `ADMIN_EMAIL` | Tu email de admin |
| `ADMIN_PASSWORD` | Contraseña fuerte para el admin |
| `SMTP_USER` | Tu Gmail (opcional, si quieres enviar emails) |
| `SMTP_PASSWORD` | App password de Gmail (opcional) |

Guardar en nano: `Ctrl+O` → Enter → `Ctrl+X`

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

## 7. Verificar que funciona

```bash
# Health check del backend
curl http://localhost:8000/health

# Ver en el navegador:
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
