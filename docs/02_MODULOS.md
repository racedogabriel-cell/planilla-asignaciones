# Módulos

Estados: **No iniciado** · **En desarrollo** · **Terminado**

## Semanas

**Objetivo:** Lista de semanas importadas y editor de asignaciones.

**Estado:** En desarrollo (sprint 1).

**Incluido en este sprint:** listar semanas desde Sheets; abrir una; pickers por hueco; completitud; autosave.

**Pendiente:** resetear semana, eliminar publicación/mes, indicadores visuales de sección idénticos al S-140.

## Personas

**Objetivo:** Padrón para asignaciones (no el de Informes).

**Estado:** En desarrollo (sprint 1).

**Campos:** ID (backend, inmutable), Nombre, Categoria, Activo.

**Categorías:** Anciano, Siervo ministerial, Publicador.

**Reglas:** baja lógica vía Activo. Persona de sistema `Sin confirmar` (SystemKey=Unconfirmed) no se edita ni elimina. En este sprint el picker muestra todas las activas (igual que el escritorio).

## Importar

**Objetivo:** Cargar el programa del mes.

**Estado:** En desarrollo (sprint 2: EPUB + JSON).

**Este sprint:** elegir un `.epub` de la Guía de actividades. El cliente lo parsea (`js/epub-parser.js`), arma el JSON del contrato, genera huecos y envía `importPrograma`. El JSON del sprint 1 sigue válido.

**Fuera de alcance:** guardar el EPUB o el XHTML en Sheets o en git.

## Imprimir

**Objetivo:** Programa listo para papel / PDF del navegador.

**Estado:** En desarrollo (sprint 1: vista básica).

**Este sprint:** vista de las semanas seleccionadas, `@media print`.

**Pendiente:** fidelidad S-140 (Letter, dos semanas, tipografía). JPEG 300 dpi fuera de alcance.

## Configuración

**Objetivo:** Congregación, hora de inicio, sala auxiliar, minutos de canción/intro/conclusión/corrección.

**Estado:** En desarrollo (sprint 1).
