# Contrato JSON de programa

Formato que acepta el módulo Importar. El parser EPUB del cliente (`js/epub-parser.js`) produce este JSON y no persiste el archivo.

No incluir XHTML, rutas de archivo ni el EPUB.

```json
{
  "version": 1,
  "title": "Guía de actividades para la reunión Vida y Ministerio cristiano — septiembre 2026",
  "language": "es",
  "weeks": [
    {
      "weekKey": "2026-09-07",
      "dateLabel": "7-13 de septiembre",
      "startDate": "2026-09-07",
      "endDate": "2026-09-13",
      "bibleReading": "ISAÍAS 1-2",
      "openingSongNumber": 2,
      "middleSongNumber": 10,
      "closingSongNumber": 3,
      "parts": [
        {
          "partKey": "tesoros-discurso",
          "sectionType": "Treasures",
          "number": 1,
          "title": "Título de la parte",
          "durationMinutes": 10,
          "detailText": "",
          "functionalId": "TreasuresTalk",
          "sortOrder": 0
        }
      ]
    }
  ]
}
```

## Reglas

- `version` debe ser `1`.
- `weekKey` único, `YYYY-MM-DD`.
- `partKey` único dentro de la semana; estable si se reimporta el mismo mes.
- `functionalId` obligatorio; el cliente no adivina títulos en runtime (igual que el escritorio).
- `detailText` puede usarse para `ExplainBeliefs` + «escenificación».
- Importar un `weekKey` ya existente **reemplaza** programa y asignaciones de esa semana.

Ejemplo mínimo: `docs/examples/programa.ejemplo.json`.
