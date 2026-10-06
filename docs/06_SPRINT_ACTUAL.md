# Sprint actual

**Número:** 2  
**Nombre:** Parser EPUB en el cliente  
**Estado:** En desarrollo

## Objetivo

Importar la Guía de actividades desde el mismo EPUB que usa el escritorio, sin subir el archivo a Sheets.

## Entregables

- `js/epub-parser.js` (port de `EpubParser` + `PartFunctionalIdResolver`)
- Módulo Importar acepta `.epub` (y JSON de respaldo)
- Vista previa de semanas detectadas antes/después del envío

## Fuera de este sprint

- Fidelidad S-140
- Resetear / borrar mes
- Autoasignar

## Criterio de cierre

1. Un EPUB real de la Guía produce semanas visibles en Semanas.
2. Los `functionalId` coinciden con el escritorio (perlas, lectura, demostraciones, EBC).
3. Reimportar el mismo mes reemplaza programa y huecos de esas `weekKey`.
