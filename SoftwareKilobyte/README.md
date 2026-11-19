# Kilobyte Central

Aplicación interna de gestión para los empleados de Kilobyte SL. Centraliza clientes, soporte, tareas, equipos, licencias, contratos, presupuestos, facturas, documentación y administración del equipo.

## Producción

- Aplicación: https://soft-kb.web.app
- Proyecto Firebase: `software-kilobyte-sl`
- Hosting: Firebase Hosting (`soft-kb`)
- Datos: Cloud Firestore
- Acceso: Firebase Authentication con Google

Los usuarios deben ser invitados desde el módulo **Usuarios**. Los roles asignan permisos independientes de lectura y escritura por menú. Las reglas de Firestore vuelven a validar esos permisos en la base de datos.

El administrador inicial es `pinsugonsu@gmail.com`.

## Desarrollo local

Requisitos: Node.js 22 o posterior y pnpm.

```bash
pnpm install
pnpm dev
```

La previsualización local se abre en `http://127.0.0.1:5173` y usa el mismo proyecto Firebase.

## Comprobación y despliegue

```bash
pnpm build
pnpm dlx firebase-tools@latest deploy --only hosting,firestore
```

Archivos principales:

- `app/central.tsx`: interfaz de gestión.
- `app/firebase-data.ts`: lectura, escritura, invitaciones y permisos.
- `firestore.rules`: autorización en la base de datos.
- `firebase.json`: Hosting, reglas e índices.

No se deben subir `node_modules`, `dist`, `.firebase` ni archivos `.env`.
