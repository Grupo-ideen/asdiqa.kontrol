# Checklist de Implementación Multi-Obra

- [x] **Base de Datos y Modelos**
  - [x] Modificar `schema.sql` con tablas `obras` y `usuarios_obras` e integrar `obra_id` en tablas hijas.
  - [x] Modificar `types.ts` para declarar tipos `Obra` y `UsuarioObra` y propiedades nullable de `obra_id`.
- [x] **Servicios y Persistencia**
  - [x] Actualizar base de datos local mock en `services.ts` con semillas iniciales adaptadas a obras.
  - [x] Implementar métodos `getObras`, `saveObra`, `deleteObra`, `getObrasUsuario` y `saveUsuarioObras` en `services.ts`.
  - [x] Modificar los selectores de datos en `services.ts` para filtrar por `obra_id` activo.
- [x] **Contexto Global (`AppContext`)**
  - [x] Añadir estados de `obras`, `currentObra` y de filtro de permisos.
  - [x] Actualizar `refreshAll` para realizar llamadas segmentadas por la obra seleccionada.
- [x] **Interfaces de Usuario (UI)**
  - [x] Modificar `page.tsx` para forzar la selección de obra antes del cuadro de mando.
  - [x] Modificar `Header.tsx` para albergar el selector de obra superior con estilo premium.
  - [x] Modificar `ConfigView.tsx` añadiendo la pestaña "Obras y Accesos" (Tab 6) con CRUD de obras y control de visibilidad a lectores.
