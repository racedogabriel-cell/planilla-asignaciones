# Modelo de datos (Google Sheets)

Cuatro pestañas. Encabezados en la fila 1. Datos desde la fila 2.

## Config

Clave / valor. Una fila por ajuste.

| Clave | Valor por defecto |
|---|---|
| Congregacion | (vacío) |
| HoraInicio | 19:00 |
| SalaAuxiliar | No |
| MinCancion | 5 |
| MinIntro | 1 |
| MinConclusion | 3 |
| MinCorreccion | 1 |
| EspacioReunionesMm | 6 |
| Version | 1 |

`SalaAuxiliar`: `Sí` / `No`.

## Personas

| Columna | Campo | Notas |
|---|---|---|
| A | ID | Entero, generado en backend, inmutable |
| B | Nombre | Texto |
| C | Categoria | `Elder` \| `MinisterialServant` \| `Publisher` |
| D | Activo | `Sí` / `No` |
| E | IsSystem | `Sí` / `No` |
| F | SystemKey | Vacío o `Unconfirmed` |

Semilla: una fila sistema Nombre=`Sin confirmar`, Categoria=`Publisher`, Activo=`Sí`, IsSystem=`Sí`, SystemKey=`Unconfirmed`.

No hay DELETE físico.

## Programa

Una fila por parte de una semana. Lo escribe `importPrograma`; el coordinador no lo edita a mano en la PWA.

| Columna | Campo |
|---|---|
| A | SemanaClave |
| B | FechaEtiqueta |
| C | FechaInicio |
| D | FechaFin |
| E | LecturaBiblia |
| F | CancionApertura |
| G | CancionIntermedia |
| H | CancionCierre |
| I | PublicacionTitulo |
| J | PartKey |
| K | SectionType |
| L | Numero |
| M | Titulo |
| N | Minutos |
| O | Detalle |
| P | FunctionalId |
| Q | SortOrder |

`SemanaClave`: `YYYY-MM-DD` (lunes de esa semana o `startDate` del JSON).  
`SectionType`: `Treasures` \| `ApplyYourself` \| `LivingAsChristians` \| `Unknown`.  
`FunctionalId`: ver escritorio (`TreasuresTalk`, `SpiritualGems`, `BibleReading`, `MinistryDemo`, `MinistryTalk`, `WhatDoYouSay`, `ExplainBeliefs`, `LivingTalk`, `LocalNeeds`, `CongregationBibleStudy`, `Other`).

## Asignaciones

Una fila por hueco (parte o rol de reunión).

| Columna | Campo |
|---|---|
| A | SemanaClave |
| B | HuecoClave |
| C | PartKey |
| D | Rol |
| E | Sala |
| F | Etiqueta |
| G | SortOrder |
| H | PersonaID |

`HuecoClave` determinista:

- Parte: `{PartKey}|{Rol}|{Sala}` — ej. `lectura|Student|Main`
- Reunión: `meeting|{Rol}|Main` — `Chairman`, `AuxiliaryCounselor`, `OpeningPrayer`, `ClosingPrayer`

`Sala`: `Main` \| `Auxiliary`.  
`PersonaID` vacío = sin asignar. `Sin confirmar` usa el ID de esa persona sistema.

Al importar una semana se **reemplazan** sus filas de Programa y Asignaciones. Las asignaciones previas de esa `SemanaClave` se pierden (el escritorio también regenera huecos al cambiar sala auxiliar).

Roles de parte: `Speaker`, `SpiritualGemsConductor`, `Student`, `Assistant`, `CbsConductor`, `CbsReader`.
