# Conector Google Sheets

1. Creá una planilla de Google Sheets vacía.
2. **Extensiones → Apps Script**. Pegá `Code.gs`.
3. Completá `SPREADSHEET_ID` (el ID de la URL `/d/ESTE_ID/edit`).
4. Implementar → Nueva implementación → Tipo **Aplicación web**.
   - Ejecutar como: yo
   - Quién tiene acceso: solo vos, o «cualquiera con el enlace» si la PWA está en Pages (sin secreto en el cliente).
5. Copiá la URL `/exec` a `js/config.js`.
6. El primer `GET ?action=ping` crea las pestañas y la persona `Sin confirmar`.

No publiques acceso anónimo si más adelante hay autenticación. GitHub Pages no guarda secretos.
