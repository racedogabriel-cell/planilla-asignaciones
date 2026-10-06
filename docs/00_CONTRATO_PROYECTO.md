# Contrato del proyecto

Documento oficial. Fuente de verdad del alcance de `planilla-asignaciones`.

## Objetivo

Replicar **Planilla Asignaciones** (Administrador VMC de escritorio) como PWA: importar el programa de la reunión Vida y Ministerio, asignar personas a cada hueco e imprimir el programa.

El ejecutable Windows en `Documents/Planilla Asignaciones` se conserva como referencia histórica. **No se modifica.** Esta carpeta es la única versión oficial de la PWA.

`informes-publicadores` es solo referencia de estructura (Pages + Apps Script + Sheets). No se fusionan repos, planillas ni padrón.

## Alcance incluido

- Un coordinador (encargado de Vida y Ministerio), una congregación.
- PWA estática en GitHub Pages.
- Google Apps Script como API.
- Google Sheets como única fuente de datos.
- Personas: nombre, categoría (Anciano / Siervo ministerial / Publicador), activo.
- Importar programa estructurado (JSON en este sprint; EPUB en sprint posterior).
- Generar huecos (roles y sala auxiliar) con las mismas reglas que el escritorio.
- Completar asignaciones y ver completitud de la semana.
- Vista imprimible del programa (CSS print; fidelidad S-140 exacta, más adelante).

## Fuera de alcance (salvo aprobación)

- Fusionar con Informes de publicadores.
- Otras congregaciones, usuarios públicos o segundo portal.
- Autoasignación / rotación LRU.
- JPEG 300 dpi, ZIP de backup, guardar el archivo EPUB.
- Firebase, SQL, SheetDB u otro backend.
- `localStorage` como fuente de verdad.
- Parser EPUB hasta el sprint que lo autorice.
- Dashboards, KPIs ficticios o placeholders que simulen producto terminado.

## Tecnologías aprobadas

| Capa | Tecnología |
|---|---|
| Hosting | GitHub Pages (un repositorio, una entrada `/`) |
| Cliente | HTML + CSS + JavaScript (PWA) |
| Parser / huecos / impresión | Cliente (navegador) |
| Backend | Google Apps Script |
| Datos | Google Sheets |

## Arquitectura

```text
GitHub Pages
  → PWA (HTML/CSS/JS)
    → Google Apps Script
      → Google Sheets
```

## Módulos oficiales

1. Semanas
2. Personas
3. Importar
4. Imprimir
5. Configuración

## Estados de un módulo

No iniciado · En desarrollo · Terminado

Que un módulo exista en la navegación no implica que esté implementado.

## Proceso

Diseño → aprobación → implementación → auditoría → correcciones → cierre de sprint.

Ninguna funcionalidad por iniciativa propia. Ante divergencia, el código se adapta a `docs/`.
