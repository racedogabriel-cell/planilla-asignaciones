# Arquitectura

## Diagrama

```text
                    GitHub Pages
                    (un repositorio)
                           │
                           ▼
              PWA  `/`  Portal coordinador
              HTML + CSS + JS + service worker
                           │
              parseo JSON/EPUB (cliente)
              generación de huecos (cliente)
              vista imprimible (cliente)
                           │
                           ▼
                   Google Apps Script
                   doGet / doPost
                           │
                           ▼
                    Google Sheets
         Config · Personas · Programa · Asignaciones
```

GitHub Pages no almacena asignaciones ni el EPUB. Solo sirve la app.

## Responsabilidades

### GitHub Pages

Hospedar la PWA. No ejecuta lógica de negocio sobre la planilla.

### Cliente

- Navegación por hash (`#semanas`, `#personas`, …).
- Importar JSON de programa (EPUB: sprint futuro).
- Generar `HuecoClave` según `js/slots.js`.
- Completar asignaciones (autosave por hueco).
- Imprimir con CSS.

### Apps Script

Conector. Crea el esquema si falta. CRUD de personas y configuración. Importa/reemplaza un mes o semana de programa. Guarda una asignación por request. `LockService` en escrituras.

No parsea EPUB. No genera PDF.

### Google Sheets

Fuente única de verdad. Modelo: `docs/09_MODELO_DATOS_SHEETS.md`.

## Comunicación

- Lectura: `GET ?action=…`
- Escritura: `POST` con `Content-Type: text/plain` (evita preflight CORS).
- URL del endpoint: `js/config.js` (se publica con Pages: no poner secretos).

## Relación con el escritorio

Se portan reglas de dominio (FunctionalId, huecos, categorías, sala auxiliar). No se porta SQLite, WPF, QuestPDF ni el sistema de archivos.
