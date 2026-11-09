# Next.js + Docker

Aplicación web creada con `create-next-app` y contenerizada con Docker para tener un entorno
consistente, aislado y portable: la misma imagen se ejecuta igual en cualquier equipo o servidor
que tenga Docker.

La página principal muestra datos que solo se conocen en tiempo de ejecución (hostname, versión de
Node.js, sistema operativo y puerto). Dentro del contenedor el hostname es el ID del contenedor y el
sistema es Linux, lo que sirve como prueba visual de que la app corre en Docker.

## Tecnologías

| Herramienta | Versión |
| --- | --- |
| Next.js (App Router) | 16.4.5 |
| React | 19.3 |
| TypeScript | 5 |
| Tailwind CSS | 4 |
| Node.js (imagen base) | `node:22-alpine` |

> **Sobre la versión de Node.js:** la actividad recomienda `node:18-alpine`, pero Next.js 16 exige
> Node.js 20.9 o superior y Node 18 ya no recibe soporte. Por eso la imagen usa `node:22-alpine`
> (versión LTS). La versión se puede cambiar sin editar el Dockerfile con
> `--build-arg NODE_VERSION=20-alpine`.

## Estructura relevante

```
.
├── Dockerfile            # Build multi-stage (deps → builder → prod-deps → runner)
├── .dockerignore         # Excluye node_modules, .next, .env, logs y temporales
├── .github/workflows/
│   └── docker.yml        # CI: construye la imagen, ejecuta el contenedor y lo prueba
├── src/app/
│   ├── page.tsx          # Página con información del entorno de ejecución
│   └── api/health/       # Endpoint usado por el HEALTHCHECK
└── package.json
```

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) o Docker Engine (Linux).
- Opcional, solo para desarrollo sin Docker: Node.js 20.9 o superior.

## Construir y ejecutar con Docker

### 1. Clonar el repositorio

```bash
git clone https://github.com/joscal06/next-docker.git
cd next-docker
```

### 2. Construir la imagen

```bash
docker build -t next-docker .
```

### 3. Ejecutar el contenedor

```bash
docker run -d --name next-docker -p 3000:3000 next-docker
```

Abrir <http://localhost:3000>. La página debe indicar **"Ejecutándose dentro de un contenedor
Docker"**.

### 4. Verificar que funciona

```bash
docker ps                                   # STATUS debe pasar a "(healthy)"
docker logs next-docker                     # salida de next start
curl http://localhost:3000/api/health       # {"status":"ok",...}
```

### 5. Detener y eliminar el contenedor

```bash
docker stop next-docker
docker rm next-docker
```

### Otras opciones útiles

```bash
# Usar otro puerto del equipo (p. ej. 8080 → 3000 del contenedor)
docker run -d --name next-docker -p 8080:3000 next-docker

# Ejecutar en primer plano y borrar el contenedor al salir (Ctrl + C)
docker run --rm -p 3000:3000 next-docker

# Pasar variables de entorno en tiempo de ejecución
docker run -d -p 3000:3000 --env-file .env next-docker

# Ver el tamaño de la imagen
docker images next-docker
```

## Cómo está construido el Dockerfile

El Dockerfile usa **multi-stage build** para que la imagen final no lleve herramientas de
compilación, devDependencies ni código fuente:

| Etapa | Qué hace |
| --- | --- |
| `base` | Parte de `node:22-alpine`, define `/app` y desactiva la telemetría de Next.js. |
| `deps` | Copia solo `package.json` y `package-lock.json` e instala **todas** las dependencias con `npm ci`. Al copiar primero estos archivos, Docker reutiliza la caché de esta capa mientras no cambien las dependencias. |
| `builder` | Copia el código y ejecuta `next build` (`npm run build`). |
| `prod-deps` | Instala solo las dependencias de producción con `npm ci --omit=dev`. |
| `runner` | Imagen final: copia `node_modules` de producción, `.next`, `public`, `package.json` y `next.config.ts`; expone el puerto **3000** y arranca con **`next start`**. |

Buenas prácticas aplicadas:

- **Imagen base oficial y ligera** (Alpine).
- **Instalación reproducible** con `npm ci` a partir del `package-lock.json`.
- **Caché de capas**: las dependencias se instalan antes de copiar el código.
- **Usuario sin privilegios**: el contenedor corre como el usuario `node`, no como `root`.
- **`HEALTHCHECK`** contra `/api/health`, visible en `docker ps`.
- **`.dockerignore`** para no enviar al contexto de build `node_modules`, `.next`, archivos
  `.env`, el historial de Git, logs ni archivos temporales.

## Integración continua

Cada push a `main` ejecuta el workflow [`docker.yml`](.github/workflows/docker.yml) en GitHub
Actions, que hace `docker build`, `docker run`, espera a que el contenedor esté *healthy* y
comprueba la página y el endpoint de salud.

## Desarrollo local sin Docker

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # compilación de producción
npm start        # next start
```
