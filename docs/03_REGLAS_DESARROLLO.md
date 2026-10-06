# Reglas de desarrollo

## Principio

Ninguna funcionalidad por iniciativa propia. Diseño previo y aprobación.

## Documentación primero

`docs/` prima sobre el código. Ante divergencia, se adapta el código.

## Módulos

Toda funcionalidad pertenece a un módulo oficial e indica: módulo, objetivo, estado, sprint.

No implementar módulos en **No iniciado**.

## Proceso

1. Diseño funcional  
2. Aprobación  
3. Implementación de lo aprobado  
4. Auditoría  
5. Correcciones (sin ampliar alcance)  
6. Cierre de sprint  

## Prohibido salvo aprobación

- `localStorage` como fuente de verdad
- Datos demo / KPIs ficticios
- Mezclar planilla o código con `informes-publicadores`
- Modificar el escritorio Administrador VMC
- Guardar EPUB o XHTML en git o en Sheets
- Backends no listados en el contrato
