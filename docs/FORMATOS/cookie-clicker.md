# Formato de Cookie Clicker

El export es el string que arma `Game.WriteSave` y que `Game.LoadSave` vuelve a abrir. Lo confirmamos en el `main.js` del juego (espejo público [ozh/cookieclicker](https://github.com/ozh/cookieclicker/blob/master/main.js), el mismo que sirve [orteil.dashnet.org](https://orteil.dashnet.org/cookieclicker/)) y en la tabla de la wiki, revisada para la 2.052: [Save — Cookie Clicker Wiki](https://cookieclicker.wiki.gg/wiki/Save).

Los nombres en español salen de la localización oficial, `http://orteil.dashnet.org/cookieclicker/loc/ES.js`, bajada el 2026-10-19. Si ahí la traducción es `/`, usamos el nombre en inglés. La primera letra se muestra en mayúscula cuando el oficial arranca en minúscula (`consola Javascript` se ve como `Consola Javascript`).

## El sobre

1. `WriteSave(1)` hace `escape(utf8_to_b64(plano) + '!END!')`. Por eso a veces ves `%3D` y `%21END%21` en vez de `==!END!`.
2. Sacamos el escape de URL (también `%uXXXX`, que es lo que produce `escape` con caracteres no ASCII).
3. Ignoramos espacios, saltos de línea y espacios de ancho cero pegados al copiar, y los sacamos antes de decodificar el escape de URL. Así un `%2B` o un `!END!` partido por el pegado sigue siendo el cierre o el relleno, no un código dañado.
4. Cortamos en `!END!`. Si no está, igual intentamos leer y dejamos una advertencia.
5. Decodificamos Base64 a UTF-8 con el mismo camino que `b64_to_utf8` del juego.

Adentro, las secciones van separadas por `|`. Dentro de una sección, los campos van por `;`, salvo los bitfields de la versión actual, que son una tira de `0` y `1` sin separador. `pack3` hoy devuelve el texto tal cual: el comentario del fuente dice que el empaquetado viejo corrompía saves.

| Índice | Sección | Qué es |
| --- | --- | --- |
| 0 | Versión | `Game.version`, por ejemplo `2.053` |
| 1 | Reservada | Vacía. El fuente dice “just in case we need some more stuff here” |
| 2 | Partida | Fechas, nombre, semilla, apariencia de Tú |
| 3 | Opciones | Bitfield de preferencias |
| 4 | Estadísticas | Galletas, prestigio, terrones y el resto |
| 5 | Edificios | Uno por `;`, campos por `,` |
| 6 | Mejoras | Dos bits por id: desbloqueada, comprada |
| 7 | Logros | Un bit por id |
| 8 | Efectos | Buffs activos al guardar |
| 9 | Mods | Datos de mods y, en Steam, la lista `META` |

Una versión anterior a 2.0046 guarda las opciones, las mejoras y los logros con `unpack2` (grupos de 14 bits). Antes de 1.0502 el juego usaba `unpack` o `UncompressLargeBin`, y antes de 1.035 las mejoras venían como `desbloqueada,comprada` separado por `;`. Esos caminos están en el lector porque `LoadSave` todavía los acepta. No tenemos un fixture real de esas épocas: el de prueba es 2.053.

## Partida (sección 2)

Separada por `;`, en este orden. Las tres fechas son milisegundos desde el 1 de enero de 1970 UTC, como dice la wiki y como las usa el juego (`parseInt` directo a `Date`).

| Campo | Variable | En el ejemplo |
| --- | --- | --- |
| Arranque de esta ascensión | `Game.startDate` | `1792211960953` (2026-10-17 04:39 UTC) |
| Arranque de toda la partida | `Game.fullDate` | `1686353674943` (2023-06-09 23:34 UTC) |
| Último guardado | `Game.lastDate` | `1792386084103` (2026-10-19 05:01 UTC) |
| Panadería | `Game.bakeryName` | `Elluis` |
| Semilla | `Game.seed` | `qdlfx` |
| Apariencia de Tú | `Game.YouCustomizer.save()` | `0,1,0,0,0,0,0` |

La apariencia son los índices de `Game.YouCustomizer.genes`, en este orden: `hair`, `hairCol`, `skinCol`, `head`, `face`, `acc1`, `acc2`. Cada número elige un sprite. El nombre visual de esa opción no está en el save: lo dejamos como índice.

El nombre de la panadería no se escapa. Si tuviera `|` o `;`, el propio juego partiría mal el string. No lo “arreglamos”.

## Opciones (sección 3)

Desde la 2.0046 es una tira de `0`/`1` en el orden en que `WriteSave` las concatena: particles, numbers, autosave, autoupdate, milk, fancy, warn, cursors, focus, format, notifs, wobbly, monospace, filters, cookiesound, crates, showBackupWarning, extraButtons, askLumps, customGrandmas, timeout, cloudSave, bgMusic, notScary, fullscreen, screenreader, discordPresence. El ejemplo trae 27 bits. No las mostramos en los paneles: no cambian la lectura de la partida.

## Estadísticas (sección 4)

El orden es el de `WriteSave`, que coincide con la tabla de la wiki. Los números grandes van en notación científica, como los escribe `parseFloat(...).toString()`.

| # | Variable | Qué es |
| --- | --- | --- |
| 0 | `Game.cookies` | Galletas en el banco |
| 1 | `Game.cookiesEarned` | Horneadas esta ascensión |
| 2 | `Game.cookieClicks` | Clics esta ascensión |
| 3 | `Game.goldenClicks` | Galletas doradas, en total |
| 4 | `Game.handmadeCookies` | Hechas a mano |
| 5 | `Game.missedGoldenClicks` | Doradas perdidas. Queda en los datos, no en el panel |
| 6 | `Game.bgType` | Id de fondo. El dibujo de cada id no está mapeado |
| 7 | `Game.milkType` | Id de leche. Igual que el fondo |
| 8 | `Game.cookiesReset` | Entregadas al ascender |
| 9 | `Game.elderWrath` | Ira de las ancianas, 0 a 3. En los datos |
| 10 | `Game.pledges` | Veces que se compró el pacto. Esta versión no lo extrae |
| 11 | `Game.pledgeT` | Tiempo de pacto restante, en fotogramas. Esta versión no lo extrae |
| 12 | `Game.nextResearch` | Id de la investigación en curso |
| 13 | `Game.researchT` | Fotogramas de investigación. `-1` es “ya terminó” |
| 14 | `Game.resets` | Cantidad de ascensiones |
| 15 | `Game.goldenClicksLocal` | Doradas esta ascensión |
| 16 | `Game.cookiesSucked` | Absorbidas por devoradores esta ascensión |
| 17 | `Game.wrinklersPopped` | Devoradores explotados |
| 18 | `Game.santaLevel` | Nivel de Papá Noel |
| 19 | `Game.reindeerClicked` | Renos esta ascensión |
| 20 | `Game.seasonT` | Tiempo de temporada, en fotogramas. Ver abajo |
| 21 | `Game.seasonUses` | Veces que se usó el cambiador de temporada |
| 22 | `Game.season` | Id de temporada, o vacío |
| 23 | galletas en devoradores | `SaveWrinklers().amount` |
| 24 | devoradores normales | `SaveWrinklers().number` |
| 25 | `Game.prestige` | Prestigio guardado |
| 26 | `Game.heavenlyChips` | Pepitas sin gastar. En inglés, heavenly chips |
| 27 | `Game.heavenlyChipsSpent` | Pepitas gastadas |
| 28 | `Game.heavenlyCookies` | Campo viejo. Esta versión no lo extrae |
| 29 | `Game.ascensionMode` | `0` ninguno, `1` Renacido |
| 30–34 | `Game.permanentUpgrades` | Cinco ids de mejora. `-1` o vacío es ranura libre |
| 35 | `Game.dragonLevel` | Índice de etapa. El título de cada etapa no lo mostramos |
| 36 | `Game.dragonAura` | Id de aura. El nombre no está mapeado |
| 37 | `Game.dragonAura2` | Segunda aura, igual |
| 38 | `Game.chimeType` | Sonido de galleta dorada |
| 39 | `Game.volume` | Volumen |
| 40 | devoradores brillantes | cantidad |
| 41 | galletas en los brillantes | cantidad |
| 42 | `Game.lumps` | Terrones en el banco. `-1` si todavía no se desbloquean |
| 43 | `Game.lumpsTotal` | Terrones cosechados |
| 44 | `Game.lumpT` | Cuándo empezó a formarse el terrón actual, en ms |
| 45 | `Game.lumpRefill` | Última vez que un terrón rellenó un minijuego, en ms |
| 46 | `Game.lumpCurrentType` | Ver tipos más abajo |
| 47 | `Game.vault` | Ids de mejoras en la bóveda, separados por coma. `WriteSave` hace `Game.vault.join(',')`. Las 876 mejoras de la loc, si estuvieran todas, arman unos 3.400 caracteres. |
| 48 | `Game.heralds` | Heraldos al momento de guardar. Al cargar, el juego pone los de ahora |
| 49 | `Game.fortuneGC` | Si se clickeó la fortuna de galleta dorada esta ascensión |
| 50 | `Game.fortuneCPS` | Si se clickeó la fortuna de g/s |
| 51 | `Game.cookiesPsRawHighest` | Mayor g/s crudo de esta ascensión |
| 52 | `Game.volumeMusic` | Volumen de la música |
| 53 | `Game.cookiesSent` | Galletas regaladas |
| 54 | `Game.cookiesReceived` | Galletas recibidas |

Lo que venga después del 54, en una versión más nueva, queda como desconocido y se avisa.

Los paneles de esta versión muestran panadería, fechas, galletas (banco, ascensión y total), clics, hechas a mano, doradas, temporada, terrones, edificios, logros, mejoras, prestigio, pepitas, ascensiones, modo, nivel del dragón, heraldos, el efecto activo y los mods. Si un campo de esta tabla no está en esa lista, queda documentado para no inventarlo después, pero esta versión no lo extrae.

Las horneadas en total no son un campo. El juego las muestra como `cookiesEarned + cookiesReset` (está así en el armado de las estadísticas, alrededor de la línea del texto “Cookies baked (all time)”). Hacemos la misma suma.

El prestigio guardado puede no coincidir con el que ves al importar: `LoadSave` lo pisa con `floor((cookiesReset / 1e12) ^ (1/3))`, porque `Game.HCfactor` es 3. Mostramos el número del archivo.

### Temporadas

El id sale de `Game.seasons` y el nombre visible, de la loc:

| Id | Nombre |
| --- | --- |
| vacío | Ninguna |
| `halloween` | Halloween |
| `christmas` | Navidad |
| `valentines` | San Valentín |
| `easter` | Pascua |
| `fools` | Día laborable |

La wiki dice que `seasonT` está en milisegundos. El fuente no: `Game.fps` es 30 (“do not touch”), `getSeasonDuration` devuelve `fps * 60 * 60 * 24` y al cargar se restan fotogramas, no milisegundos. Seguimos al fuente y pasamos los fotogramas a tiempo con 30 fps. Un id de temporada que no esté en la tabla se muestra crudo y se avisa.

### Terrón en curso

Sale de las ramas de `lumpCurrentType` en el fuente, con el adjetivo de la loc:

| Id | Nombre |
| --- | --- |
| 0 | normal |
| 1 | bifurcado |
| 2 | dorado |
| 3 | carnoso |
| 4 | caramelizado |

## Edificios (sección 5)

El orden es el de `new Game.Object`, que no cambió: cada edificio nuevo se agrega al final. Nombres de la loc ES.

| # | Inglés | Español |
| --- | --- | --- |
| 0 | Cursor | Cursor |
| 1 | Grandma | Abuela |
| 2 | Farm | Granja |
| 3 | Mine | Mina |
| 4 | Factory | Fábrica |
| 5 | Bank | Banca |
| 6 | Temple | Templo |
| 7 | Wizard tower | Torre mágica |
| 8 | Shipment | Envío |
| 9 | Alchemy lab | Laboratorio de alquimia |
| 10 | Portal | Portal |
| 11 | Time machine | Máquina del tiempo |
| 12 | Antimatter condenser | Condensador de antimateria |
| 13 | Prism | Prisma |
| 14 | Chancemaker | Probabilizador |
| 15 | Fractal engine | Motor fractal |
| 16 | Javascript console | Consola Javascript |
| 17 | Idleverse | Universo paralelo |
| 18 | Cortex baker | Panadero cerebral |
| 19 | You | Tú |

Desde la 2.024 cada edificio es `cantidad,comprados,galletas,nivel,minijuego,silenciado,máximo`. `comprados` cuenta también los que se vendieron. `máximo` es el pico de esta ascensión. Antes de la 2.024 no hay máximo y usamos la cantidad. Antes de la 2.003 el nivel se fuerza a 0, como hace `LoadSave`.

El minijuego (jardín, bolsa, panteón, grimorio) va en el quinto campo, con `:`, espacios o `/`. No lo interpretamos. `LoadSave` lee silenciado y máximo en los índices fijos 5 y 6, o sea que asume que el minijuego no trae comas. `WriteSave` los agrega al final. Si ese campo trajera comas, nos quedamos con los dos últimos, que es lo que se escribió. En el ejemplo no hay comas adentro.

En la partida de ejemplo hay 20 edificios y 14.023 en total. El Cursor tiene 893 y Tú tiene 452.

## Mejoras y logros

Cada mejora aporta dos bits, en orden de id: desbloqueada y comprada. Cada logro aporta uno. El id es la posición en la que el juego creó el objeto vanilla. Los nombres están en `js/lectores/cookie-clicker/catalogo.js`.

La loc del 2026-10-19 tiene 876 mejoras (ids 0 a 875) y 643 logros (ids 0 a 642). El save 2.053 del ejemplo trae 875 pares y 643 bits: la mejora 875 (`Devorador ambar gris`, en inglés Wrinkler ambergris) se agregó después y no entra en ese bitfield. La 874 sigue siendo Ratón omnipresente, que es la última que la wiki de la 2.052 nombra (Omniplast mouse). Si un save trae más bits que nombres, el sobrante se llama “Mejora desconocida #id” o “Logro desconocido #id”.

En el ejemplo: 717 mejoras compradas, 742 desbloqueadas, 523 logros. Las cinco ranuras permanentes son los ids 766, 825, 739, 874 y 835. La 874 es Ratón omnipresente.

El logro 230 trae en la loc un `<div>` con el sprite de una moneda. Acá queda solo el texto: no cargamos imágenes del juego. El 240 trae `<br>` y la entidad `&amp;`; en pantalla se ve el texto, con el ampersand de verdad.

## Efectos (sección 8)

`tipo,duracionMaxima,restante,arg1,arg2,arg3`, separados por `;` si hay más de uno. El tipo es el índice de `Game.buffType`, en el orden del fuente. El tiempo está en fotogramas a 30 fps, igual que la temporada. `arg1` en un frenesí es el multiplicador (7).

Traducimos los que están en la loc: Frenesí, Frenesí de ancianas (`blood frenzy`), Grumo, Cosecha de dragones, Liquidación, Dedo maldito, Frenesí de clics, Vuelo de dragón, Tormenta de galletas, Bendición de azúcar, Experto en magia, Devastación, Frenesí de azúcar. El resto se muestra con el nombre interno del fuente (`building buff`, `loan 1`, etc.) porque no hay una entrada suelta en la loc que podamos citar sin dudar.

## Mods (sección 9)

`LoadSave` parte por `;` y después por el primer `:`. El id `META` se saltea al cargar datos y lo escribe `App.saveMods`, que el `main.js` web solo llama si existe (`if (App && App.saveMods)`). Esa función no está en el fuente web público: es de la versión de Steam.

Cada otro id es `id` + datos. `|` y `;` viajan como `[P]` y `[S]` (`safeSaveString`). Si los datos son JSON y traen `lastVersion`, mostramos esa versión. El resto del JSON no se interpreta: es el formato del mod, no del juego.

En el ejemplo:

- Datos propios: `Cookie Assistant 2 0`, JSON, `lastVersion` `0.9.33`.
- `META`: `*cooler sample mod`, `*lang sample mod`, `*sample mod`, `gincookiwizord`, `The Best Autoclicker`, `cookieassistant2`.

El `*` no está documentado en el `main.js` web. Lo leemos como “desactivado” porque esos tres primeros son exactamente los mods de ejemplo que el juego trae apagados (la guía del workshop y el menú de mods los describen así). Si aparece un asterisco en otro nombre, lo mostramos igual, marcado, sin inventar otra cosa.

## Números en pantalla

La notación corta imita `formatEveryThirdPower` + `formatLong` del juego: a partir del millón, grupos de mil, con el nombre de la escala corta estadounidense. En español: millón, billón (10^9, no el billón de la escala larga), trillón, …, septendecillón (10^54). El ejemplo `4.615326035923986e+56` se ve como `461,533 septendecillones`. La científica, para ese mismo número, es `4,615e+56`. Se cambia con el selector de la página.

## Entradas que no son una partida

Si el texto no se puede abrir, la página muestra un aviso y sigue. No hay stack ni un resultado a medias.

- Más de 4 millones de caracteres se rechaza antes de decodificar. Justo en el tope se intenta leer; un carácter más, no.
- Base64 inválido, binario, UTF-16 o el export de otro juego: error amable. Sin `!END!` y sin la forma de una partida (versión, estadísticas y un edificio), este lector ni siquiera se elige.
- En el sobre se ignoran espacios, saltos de línea y espacios de ancho cero, que se cuelan al copiar, incluso si parten un `%XX`. Un `!END!` partido por un salto cuenta como cierre.
- Una sección muy por encima de una partida 2.053 no se expande: se rechaza con un aviso. La de referencia tiene 20 edificios, 1.750 bits de mejoras y 643 de logros. Los topes son 80 edificios, 20.000 bits, 80 efectos, 200 mods y 30 `|`. El JSON de un mod de más de 100.000 caracteres, o anidado a más de 40 niveles, se cuenta y no se interpreta.
- Un campo numérico de las estadísticas con más de 100 caracteres se muestra en cero y se avisa. La bóveda y el id de temporada no entran en esa cuenta.
- Una fecha fuera del rango de `Date` se muestra como desconocida, con aviso. El resto de la partida sigue.
- Una versión mayor a 2.053 se lee con las reglas actuales y se avisa: el formato puede haber corrido un campo.
