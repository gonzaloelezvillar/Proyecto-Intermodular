# Kilobyte Central

Aplicación interna de gestión para los empleados de Kilobyte SL. Centraliza clientes, soporte, tareas, equipos, licencias, contratos, presupuestos, facturas, documentación y administración del equipo.

## Producción

- Aplicación: https://soft-kb.web.app
- Proyecto Firebase: `software-kilobyte-sl`
- Hosting: Firebase Hosting (`soft-kb`)
- Datos: Cloud Firestore
- Acceso: cuentas internas con usuario y contraseña

Los administradores crean las cuentas desde el módulo **Usuarios**, indicando correo de acceso, contraseña inicial, rol y departamento. Las contraseñas no se guardan en Firestore. Los roles asignan permisos independientes de lectura y escritura por menú y las reglas de la base de datos vuelven a validarlos.

## Persistencia y protección de datos

- El programa entra directamente en el espacio de datos reales; la demostración es de solo lectura y nunca se mezcla con Firestore.
- Los registros de todas las áreas, usuarios, roles, departamentos, invitaciones, permisos y actividad se guardan en Firestore.
- Cada cambio conserva fecha y autor, aumenta una revisión y genera una entrada de trazabilidad que no se puede modificar ni borrar.
- Los registros se archivan en lugar de eliminarse y las reglas de seguridad impiden su borrado definitivo desde la aplicación.
- Firestore mantiene una caché persistente en el navegador para conservar datos y cambios pendientes durante cortes de conexión y sincronizarlos al recuperarla.
- Las contraseñas se gestionan exclusivamente con Firebase Authentication y nunca se almacenan en Firestore ni en el código.

Las cuentas administradoras iniciales son `pinsugonsu@gmail.com` y `admin@kilobyte.es`. Para los empleados siguientes, la contraseña inicial se define al crear el usuario desde la aplicación.

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
