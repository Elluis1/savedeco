# Formato de Kittens Game

Kittens Game guarda la partida como un objeto JSON y, para copiarla, la comprime con LZString. Esta nota no implementa el lector. Describe lo que se pudo confirmar en el fuente público para leerla en el navegador, solo lectura. Donde el fuente no llega, el campo queda como desconocido.

El enlace `nuclearunicorn/kittensgame` (sin guión) responde 404. El repo público es [nuclear-unicorn/kittensgame](https://github.com/nuclear-unicorn/kittensgame). Todo lo de abajo sale del commit [`781e379f79f1e7512d168849cba21ed111502644`](https://github.com/nuclear-unicorn/kittensgame/commit/781e379f79f1e7512d168849cba21ed111502644) (31 de agosto de 2026, «Merge translation/l10n updates»), revisado el 2026-10-21.

La licencia del juego es WET PAWS (`license.txt`): cambios personales o educativos, y no permite obras derivadas. Por eso acá se describe el comportamiento y no se copia código ni las traducciones de `res/i18n/`. Los nombres que ve el jugador viven en esa carpeta. Un lector de Savedeco muestra el `name` interno.

Fuentes:

- [`game.js`](https://github.com/nuclear-unicorn/kittensgame/blob/781e379f79f1e7512d168849cba21ed111502644/game.js). `save`, `saveExport`, `decompressLZData`, `migrateSave` y el objeto `game`.
- [`core.js`](https://github.com/nuclear-unicorn/kittensgame/blob/781e379f79f1e7512d168849cba21ed111502644/core.js). `filterMetadata`, `loadMetadata` y el save de la consola.
- Los managers en `js/`: `resources.js`, `village.js`, `calendar.js`, `buildings.js`, `science.js`, `workshop.js`, `diplomacy.js`, `religion.js`, `space.js`, `time.js`, `challenges.js`, `prestige.js`, `achievements.js`, `stats.js`, `void.js`, `settings.js`.
- [`lib/lz-string.js`](https://github.com/nuclear-unicorn/kittensgame/blob/781e379f79f1e7512d168849cba21ed111502644/lib/lz-string.js). Copia minificada, sin cabecera de licencia. La salida coincide con [lz-string 1.4.4](https://github.com/pieroxy/lz-string/blob/1.4.4/libs/lz-string.js).
- [LICENSE.txt de LZString 1.4.4](https://github.com/pieroxy/lz-string/blob/1.4.4/LICENSE.txt) (WTFPL-2.0) y el [LICENSE.md](https://github.com/pieroxy/lz-string/blob/master/LICENSE.md) del repo actual (MIT). El detalle está más abajo.
- Changelog del mismo commit: la entrada de arriba es `v 1.6.1.6 (30 Aug 2026)`. `index.html` deja `"1.6.1.0"` como reserva; el número que se muestra sale de `version.json`, y ese archivo no está en el árbol de git (lo estampa el release). `package.json` dice `"version": "14.8.0"`: es el paquete npm, no la versión del juego.
- Wiki del juego, [scripts de terceros](https://wiki.kittensgame.com/en/general-information/third-party-scripts) y [bugs](https://wiki.kittensgame.com/en/general-information/bugs). Nombran el export y decodificadores de la comunidad. No describen el JSON campo por campo. La estructura sale del fuente, no de la wiki.
- Trimps, para no confundir el sobre: `save` y `load` en [trimps.github.io/main.js](https://trimps.github.io/main.js), bajado el 2026-10-21 (`main.js?62`). No hay un commit fijado: si el juego se actualiza, hay que volver a mirar esa función.
- El test `tests/kittens-game.test.js` arma un JSON mínimo, lo comprime y lo abre. No hay un save real con licencia libre.

## Dónde está la partida

En el navegador, `localStorage["com.nuclearunicorn.kittengame.savedata"]`. Lo escribe `game.save` y lo lee `game.load`.

Otras claves, que no son la partida:

| Clave | Qué es |
| --- | --- |
| `com.nuclearunicorn.kittengame.savedata` | La partida. JSON pelado, o LZString. |
| `com.nuclearunicorn.kittengame.ui` | JSON pelado de la interfaz: `fontSize`, `isCenter`, `theme`. `js/ui.js`, `save`. |
| `com.nuclearunicorn.kittengame.language` | El idioma. `i18n.js`. |

`game.wipe` borra la partida y el idioma.

El export que se copia está en el textarea `#exportData`. `saveExport` le pasa la cadena ya comprimida, sin prefijo ni sufijo (`js/ui.js`, `saveExport`). El archivo que se baja es esa misma cadena, `text/plain`, nombre `Kittens Game.txt` o, si se pide el nombre largo, `Kittens Game - Run N - <año y estación>.txt` (`game.saveToFile`).

La nube (KGNet, `Server.pushSave`) manda otra variante: el mismo JSON, comprimido en UTF-16. Dropbox ya no está: el changelog 1.6.1.6 lo saca y en este commit no hay referencias a Dropbox en el JS.

No miramos un binario de la tienda (Android, iOS, Steam). En este repo `getPlatform` lee `window.KGVersion.platform` (`"web"`, `"mobile"` o `"steam"`) y el `save` es el mismo. Si una app de tienda se apartó de este commit, queda desconocido.

## El sobre

Hay tres formas de la misma partida. Las tres, una vez abiertas, son el objeto de `save`.

### Export y archivo: Base64 de LZString

`saveExport` y `saveToFile` hacen esto:

1. `game.save()` junta el objeto y, de paso, lo escribe en `localStorage`.
2. `JSON.stringify` de ese objeto.
3. `compressLZData(json)` sin el segundo argumento. Eso es `LZString.compressToBase64`.

El comentario de `compressLZData` lo dice: UTF-16 entra más denso, Base64 sobrevive el copiar y pegar. El alfabeto es `A–Z`, `a–z`, `0–9`, `+`, `/` y `=`. El largo es múltiplo de 4: si falta relleno, la función agrega `=`, `==` o `===`.

No es el Base64 de Cookie Clicker. `atob` de esta cadena no devuelve el JSON. Cada carácter son 6 bits del flujo LZ, no un byte de un deflate. Hay que usar `LZString.decompressFromBase64`.

### localStorage: JSON pelado, o UTF-16 si no entra

`_saveDataToString` hace `JSON.stringify(saveData, JSONreplacer)`. El replacer tira las propiedades `undefined`. Si el texto mide más de 5.000.000 caracteres, o si `opts.forceLZ` está prendido, lo reemplaza por `compressLZData(json, true)`, que es `LZString.compressToUTF16`. Si no, guarda el JSON tal cual.

`forceLZ` está en `js/settings.js`. El default es `false`. El rótulo del juego dice que comprime el save en memoria en UTF-16 y que es experimental.

UTF-16 de LZString suma 32 al código de cada símbolo y termina con un espacio. El espacio también puede aparecer en el medio: es un símbolo del alfabeto, no un separador.

Al cargar, `_parseLSSaveData` mira el primer carácter. Si es `{`, hace `JSON.parse` directo. Si no, `decompressLZData`: prueba `decompressFromBase64` y, si el resultado no arranca con `{`, prueba `decompressFromUTF16`.

### La nube: UTF-16

`Server.pushSave` manda `compressLZData(JSON.stringify(saveData, JSONreplacer), true)`. Es el mismo UTF-16 del localStorage grande, no el Base64 del portapapeles. Al bajarla, el juego la mete en `localStorage` y llama a `load`, así que el camino de lectura es el de arriba.

### El import del textarea

`saveImport` lee `#importData`, le saca todo el whitespace (`replace(/\s/g, "")`) y llama a `_loadSaveJson`. Ahí solo corre `decompressLZData`. Si el texto no arranca con `{` después de descomprimir, tira `"Integrity check failure"` y no pisa el save.

Consecuencia, confirmada con el port del test:

- Un Base64 partido por saltos de línea se abre, porque el import se los saca y el Base64 no los usa como dato.
- `compressToUTF16` siempre cierra con un espacio. Ese espacio, y otros blancos que `\s` agarra (U+00A0, U+2009 y el resto), también pueden ser un símbolo: cada símbolo es el código de 15 bits más 32. Si el único blanco era el cierre, un blob corto sigue abriendo después del recorte. Si un símbolo de dato era blanco, el recorte corre el flujo y el import no devuelve el JSON. El test lo muestra con un UTF-16 que mete un U+2009 en el medio. `localStorage` no recorta, y el mismo blob abre desde ahí.
- Un JSON pelado (el de un `localStorage` chico) no abre por el textarea. `decompressFromBase64` devuelve `null`. `localStorage` sí lo abre, por el `{` del principio.

Un lector de Savedeco tiene que aceptar las tres. El gesto de la página es pegar un texto: lo habitual va a ser el Base64 del export. Si alguien pega el valor de `localStorage`, puede venir JSON pelado o UTF-16, y en el UTF-16 no hay que borrar los espacios de adentro.

## Cómo se reconoce

Cookie Clicker, Kittens y Trimps pueden parecer una tira larga. Se separan así.

Cookie Clicker, ya leído en este repo, cierra con `!END!` o con `%21END%21`. Ese `!` y ese `%` no están en el alfabeto Base64 de LZString. Si aparecen, es Cookie Clicker.

Si el texto, sin el BOM y sin espacios de las puntas, arranca con `{` y `JSON.parse` da un objeto con `saveVersion` numérico, o un array `resources` junto con `village`, `buildings` o `science`, es el JSON pelado de Kittens.

Si no, se le sacan los espacios (el camino del import) y se prueba `decompressFromBase64`. Si el resultado arranca con `{`:

- Kittens: el objeto tiene `saveVersion` numérico, o un `resources` que es un array de `{ name, value }` junto con `village`, `buildings` o `science`.
- Trimps: el objeto tiene `global`, y adentro `global.version` (número) o `global.stringVersion` (string). `load` de Trimps rechaza el save si `global` no está. `resources` y `buildings` son objetos con nombre de clave, no arrays. El export también es `LZString.compressToBase64` (`save`, alrededor de la línea 219 del `main.js` bajado). La clave de `localStorage` es `trimpSave1`. Trimps no usa el UTF-16 de Kittens en ese `save`.

Si el Base64 no abre un `{`, se prueba `decompressFromUTF16` sobre el texto original, sin sacarle los espacios. Un `{` al principio es el JSON pelado de Kittens. Trimps no escribe ese UTF-16 en la función que miramos.

El test traba las cuatro: Base64 de Kittens, JSON pelado, UTF-16, Base64 de un Trimps mínimo, y un texto con `!END!`. También traba que el detector de Cookie Clicker que ya está en la página devuelve menos de 0,5 con esos tres sobres de Kittens, así que hoy caen en «no reconocí este texto».

Un save viejo de Kittens puede no traer `saveVersion`. `migrateSave` trata `undefined` como 1. En ese caso alcanzan las claves de manager (`resources` array y `village`, por ejemplo). No vimos un archivo de esa época.

`game/beforesave` deja que un script de afuera agregue claves antes de serializar. Un lector guarda las que no conoce y no las descarta.

## LZString, en vanilla

El port cabe en un módulo ES, sin dependencia y sin build. Hacen falta cuatro funciones: `compressToBase64`, `decompressFromBase64`, `compressToUTF16` y `decompressFromUTF16`. El test las tiene en `tests/kittens-lz.js`. La página no lo carga: el lector todavía no está.

El algoritmo es el de Pieroxy, versión 1.4.4. En corto:

1. Un diccionario LZ arranca con tres códigos reservados (0, 1 y 2, el 2 marca el fin).
2. Cada carácter nuevo entra como código de 8 bits si el código es menor a 256, o de 16 si no. Los siguientes se escriben con el ancho que tenga el diccionario en ese momento.
3. En Base64, esos bits se empaquetan de a 6 y se miran en `keyStrBase64`. Al final se rellena con `=` hasta un múltiplo de 4.
4. En UTF-16, se empaquetan de a 15, se les suma 32 y se agrega un espacio al final.
5. Descomprimir es el camino inverso. Un índice que no está en el diccionario y no es el código que se está por crear devuelve `null`.

Licencia, verificada el 2026-10-21:

- El `lib/lz-string.js` del juego no trae copyright. Lo comparamos contra el 1.4.4 publicado: misma salida en cadena vacía, en el JSON mínimo, en texto con `ñ` y en un JSON de varios miles de caracteres, tanto en Base64 como en UTF-16.
- El `package.json` del 1.4.4 dice `"license": "WTFPL"`. El [LICENSE.txt](https://github.com/pieroxy/lz-string/blob/1.4.4/LICENSE.txt) es la Do What The Fuck You Want To Public License, versión 2, copyright 2013 Pieroxy. El encabezado del fuente lo repite.
- El repo actual (1.5.0) publica MIT en `LICENSE.md`. En las mismas muestras, el 1.5.0 escribió el mismo Base64 y el mismo UTF-16 que el 1.4.4. No hace falta la reescritura en TypeScript: con el 1.4.4 el navegador abre lo que escribe el juego.

La WET PAWS del juego no cubre esta librería. El port atribuye a Pieroxy y se queda con el texto del 1.4.4, que es el que está en el juego.

## Versiones

`game.saveVersion` es `15`. Es un entero del esquema, no el `1.6.1.6` del changelog. El export no guarda la versión del juego ni el `buildRevision`. `telemetry.save` solo escribe `guid`.

`load` llama a `migrateSave` si `saveVersion` falta o no es 15. La migración muta el objeto, de a un escalón. Un export de este commit ya viene en 15: se puede mostrar sin migrar. Uno más viejo, no.

| Escalón | Qué cambia |
| --- | --- |
| ausente | Pasa a ser 1. |
| 1 → 2 | `moonOutpost` y `moonBase` salen de `space.programs` y entran a los buildings del planeta `moon`. |
| 2 → 3 | `spaceElevator`, `sattelite` y `spaceStation` salen de `programs` y arman un planeta `cath`. El id del satélite va con una sola t. |
| 3 → 4 | Cada building gana `on`, copiado de `val`. |
| 4 → 5 | En `religion.ru`, si `researched` y `val` es 0 o `null`, `val` pasa a 1. `on` se copia de `val`. En programas de espacio, `researched` pone `on` y `val` en 1. Los buildings de cada planeta copian `on` desde `val`. |
| 5 → 6 | `time.energy` se copia al recurso `temporalFlux`. Si no estaba, se agrega. |
| 6 → 8 | `on = val` en `religion.zu`, `religion.tu`, `time.usedCryochambers`, `time.cfu` y `time.vsu`. No hay escalón 7. |
| 7 | `migrateSave` no lo nombra. Si apareciera, se queda en 7. No vimos un save así. |
| 8 → 9 | Si no hay `challenges`, queda `[]`. `currentChallenge` pasa a `null`. |
| 9 → 10 | En buildings, `unlockable` copia a `unlocked` y `unlocked` pasa a `false`. Si `rorschachMission` tiene `on == 1`, se agrega `centaurusSystemMission`. |
| 10 → 11 | Todos los recursos quedan con `unlocked: false`. |
| 11 → 12 | Si el upgrade de religión `transcendence` tiene `on == 1`, se agrega el desafío `atheism` con `unlocked: true`. |
| 12 → 13 | Los transcendence upgrades se desbloquean según el tier y `religion.tcratio`. Este paso llama a `getUnlimitedDR` y a `religion.getTU` del juego en marcha. No es una función pura del JSON. |
| 13 → 14 | El desafío `atheism` queda con `unlocked: false`, salvo que la tech `voidSpace` esté `researched`. |
| 14 → 15 | En los buildings de cada planeta, `unlockable` copia a `unlocked`, o queda `false` si `unlocked` no estaba. |

Del 15 en adelante, en este commit, no hay otro escalón. Un `saveVersion` mayor a 15 no lo migra nadie: `load` llama igual a `migrateSave`, la función no entra a ningún `if` y el objeto sigue en ese número. Un lector avisa y muestra los campos que ya conoce.

## El objeto

`save` arma el objeto en este orden. El orden no es contrato: un lector busca por clave.

| Clave | Quién la escribe |
| --- | --- |
| `saveVersion` | `game.save`. Entero. Hoy 15. |
| `server` | `Server.save`. |
| `resources`, `res` | `ResourceManager`. |
| `village` | `VillageManager`. |
| `calendar` | `Calendar`. |
| `console` | `Console.save` en `core.js`. |
| `telemetry` | `Telemetry.save`. |
| `challenges` | `ChallengesManager`. Va primero entre los managers. |
| `workshop` | `WorkshopManager`. |
| `diplomacy` | `DiplomacyManager`. |
| `buildings`, `bldData`, `cathPollution` | `BuildingsManager`. `cathPollution` es clave de raíz, no de `buildings`. |
| `science` | `ScienceManager`. |
| `achievements`, `ach` | `Achievements`. |
| `religion` | `ReligionManager`. |
| `space` | `SpaceManager`. |
| `time` | `TimeManager`. |
| `prestige` | `PrestigeManager`. |
| `stats`, `statsCurrent` | `StatsManager`. |
| `void` | `VoidManager`. |
| `game` | El propio `game.save`, después de los managers. |

`SettingsManager.save` está vacío. Las opciones van en `game.opts`.

`filterMetadata` (`core.js`) recorre un catálogo y se queda con los campos pedidos. Si el valor es `undefined`, el campo no entra. El orden del array es el del catálogo del juego, no el de «solo lo que compraste»: un building en cero igual ocupa un puesto. `loadMetadata` copia los campos sobre el catálogo vivo, buscando por `name`. Un `name` que el juego ya no tiene se saltea.

Los ids están escritos como el juego los guarda, faltas de ortografía incluidas (`concrate`, `compedium`, `engeneering`, `sattelite`, `apocripha`, `ressourceRetrieval`, `authocracy`). Corregirlos rompería el cruce con el catálogo.

Los números son `Number` de JS. Un valor enorme pierde precisión pasado el entero seguro. Se muestra el float del archivo, con la notación que ya tiene el núcleo.

### `game`

Lo escribe `game.save` y lo lee el bloque de `load` que mira `saveData.game`.

| Campo | Qué es |
| --- | --- |
| `isCMBREnabled` | Bonus viejo de radiación de fondo. Al cargar, si falta, queda `true`. |
| `colorScheme` | Id de tema. `null` si no hay. Los ids de fábrica están en `config.js`: `default` más `dark`, `grassy`, `sleek`, `black`, `wood`, `bluish`, `grayish`, `greenish`, `tombstone`, `spooky`. Un tema desbloqueado después puede ser otro string. |
| `unlockedSchemes` | Array de ids de tema. |
| `karmaKittens` | Contador de karma. Número. |
| `karmaZebras` | Igual, para cebras. |
| `ironWill` | Bool. `true` si la partida sigue en Iron Will. Al cargar, si falta, queda `true`. |
| `deadKittens` | Número. |
| `cheatMode` | Bool. El logro del «climax» lo mira. |
| `startedWithoutChronospheres` | Bool. Al cargar, si falta, queda `false`. |
| `opts` | Objeto de opciones. Ver abajo. |
| `lastBackup` | Milisegundos desde epoch, la última subida a KGNet. Si falta, `load` pone la hora actual. |

`opts` mezcla dos familias. Los booleanos los registra `js/settings.js` (el default entre paréntesis): `useWorkers` (true en el registro; el comentario del archivo manda al default de cada entrada), `forceHighPrecision`, `usePerSecondValues`, `usePercentageResourceValues`, `showNonApplicableButtons`, `usePercentageConsumptionValues`, `highlightUnavailable`, `hideSell`, `hideDowngrade`, `hideBGImage`, `tooltipsInRightColumn`, `noConfirm`, `IWSmelter`, `disableTelemetry`, `enableRedshift`, `disablePollution`, `enableRedshiftGflops`, `useLegacyTwoInRowLayout`, `useSwipeNavigation`, `ksEnabled`, `forceLZ` (false), `compressSaveFile` (false), `hodl` (true en el registro; un save viejo sin la clave queda en false al cargar), `disableCMBR`.

Los que no son booleanos nacen en `game.js`: `notation` (string, default `"si"`) y `batchSize` (número, default 10). `load` también puede escribir `opts.fontSize` en 14 si el save no lo trae. No hace falta mostrar las opciones en un panel: no cambian la lectura de la partida, salvo `notation` si más adelante queremos imitar el formato de números del juego. Hoy el núcleo ya tiene la suya.

`systemShockMode` se resetea en memoria y no entra a `saveData.game`. No está en el archivo.

### `server` y `telemetry`

`server.motdContent` es el texto del mensaje del día que había al guardar. Puede traer HTML del servidor. Se muestra como texto, escapado, igual que el resto de los paneles. `server.bcoinPrice` es el último precio de bitcoin en dólares que el modo hodl consiguió de CoinGecko. Si no es un número, `load` no lo toca.

`telemetry.guid` es un UUID v4 del jugador. No es un secreto de sesión, pero identifica la partida en KGNet. Mostrarlo en un panel no aporta a la lectura. Queda en los datos por si hace falta cruzar.

### `resources` y `res`

`resources` es un array. Cada entrada sale de `resourceData` con los campos `name`, `value`, `unlocked`, `isHidden` e `isHiddenFromCrafting`. El último solo existe en la madera: `resetState` se lo asigna a `wood`. En el resto, `filterMetadata` no lo escribe.

`value` es el stock. Puede ser fraccionario. `0` se guarda, porque 0 no es `undefined`.

En este commit el catálogo, de `catnip` a `megalith`, tiene 60 ids: catnip, wood, minerals, coal, iron, titanium, gold, oil, uranium, unobtainium, antimatter, manpower, science, culture, faith, kittens, zebras, starchart, temporalFlux, gflops, hashrates, furs, ivory, spice, unicorns, alicorn, necrocorn, tears, karma, paragon, burnedParagon, timeCrystal, sorrow, relic, void, elderBox, wrappingPaper, blackcoin, bloodstone, tMythril, beam, slab, plate, steel, concrate, gear, alloy, eludium, scaffold, ship, tanker, kerosene, plastic, microchip, parchment, manuscript, compedium, blueprint, thorium, megalith.

`kittens` acá es el contador de población. La lista de cada gatito está en `village.kittens`. `karma` y `paragon` también están acá, además de `game.karmaKittens` (ese es el contador de reinicios, no el recurso del banco).

Tres recursos de la interfaz no entran al array: `worship` (es `religion.faith`), `epiphany` (es `religion.faithRatio`) y `necrocornDeficit` (es `religion.necrocornDeficit`). Están en `getPseudoResources`.

`res` guarda el estado de la tabla: `isLocked` (bool), `showHiddenResources` (solo si es verdadero; si no, la clave no está) y `hiddenPseudoResources` (array de nombres, solo con los que el jugador ocultó).

### `village` y los gatitos

```text
village: {
  kittens, maxKittens, jobs, biomes, currentBiome, lastBiome,
  hadKittenHunters, nextKittenProgress, map, loadouts
}
```

`jobs` es el catálogo con `name`, `unlocked` y `value` (cuántos están asignados). En este commit, en este orden, que es el de `jobNames`: woodcutter, farmer, scholar, hunter, miner, priest, geologist, engineer, ambassador. El índice del oficio de un gatito comprimido apunta a esta lista. El comentario del fuente pide agregar nombres al final. Si un release mete un oficio en el medio, los índices viejos se corren. No confirmamos que eso no haya pasado antes de este commit.

`maxKittens` es la capacidad. `hadKittenHunters` es un bool del simulador. `nextKittenProgress` es el progreso hacia el próximo gatito (0 a 1, número). Si falta al cargar, queda 0.

`biomes` guarda `name`, `unlocked`, `val`, `on` y `cp`. Los ids de este commit: village, plains, hills, forest, boneForest, rainForest, mountain, volcano, desert, bloodDesert, swamp, cath, redmoon. `currentBiome` y `lastBiome` son el id en curso y el anterior. `map` es chico: `hqLevel`, `energy`, `explorersLevel`. Las casillas del mapa no se guardan. El flag `VILLAGE_MAP` está prendido en beta y apagado en main; los campos se escriben igual.

`loadouts` es la lista de esquemas de trabajo. Cada uno trae `title`, `jobs` (solo oficios con `value > 0`), `engineerJobs` (igual), `leaderTrait`, `leaderJob`, `pinned`, `isDefault`, `lastSelected`.

#### Cada gatito

`village.save` llama a `kitten.save(true, jobNames)`. El `true` está fijo en el fuente, con el comentario del viejo `opts.compressSaveFile`. En este commit la aldea siempre escribe la forma comprimida. La opción `compressSaveFile` (default false) solo la usan los gatitos de la reserva de desafíos.

`load` elige así: si hay `seed`, `loadSeeded`; si hay `ssn`, `loadCompressed`; si no, `loadUncompressed`.

Forma comprimida. Los valores falsy no se escriben.

| Campo | Qué es |
| --- | --- |
| `ssn` | Entero. Siete números de 0 a 99 empaquetados con offset 100. Ver abajo. |
| `skills` | Un número, si todos los oficios tienen la misma habilidad, o un array en el orden de `jobNames`. Cada valor va redondeado a un decimal y no pasa de 20001. |
| `exp` | Experiencia, un decimal. Se omite si es 0. |
| `job` | Índice en `jobNames`. Se omite si no tiene oficio. |
| `engineerSpeciality` | Id de oficio de ingeniero, o ausente. |
| `rank` | Número, omitido si es 0. |
| `combatExp` | Número, omitido si es 0. |
| `isLeader` | `true`, o ausente. |
| `isAdopted` | `true`, o ausente. |
| `favorite` | `true`, o ausente. |
| `seed` | Entero de 0 a 999999, si el gatito nació con semilla. |
| `name`, `surname` | Solo si el nombre no está en la lista de fábrica. |

El `ssn` se arma de atrás para adelante: `resultado = resultado * 100 + valor`. Al abrir, el primer resto es el primer campo. Los siete, en orden: índice de nombre, índice de apellido, edad, índice de rasgo, color, variedad, rareza. El comentario del fuente avisa el techo: con offset 100, siete enteros de 0 a 99 entran en un entero seguro de JS (2^53). Un octavo ya no. El test empaqueta y abre un `ssn`.

Nombres, en orden, para el índice: Angel, Charlie, Mittens, Oreo, Lily, Ellie, Amber, Molly, Jasper, Oscar, Theo, Maddie, Cassie, Timber, Meeko, Micha, Tami, Plato, Bea, Cedar, Cleo, Dali, Fiona, Hazel, Iggi, Jasmine, Kali, Luna, Reilly, Reo, Rikka, Ruby, Tammy, Amy, Henry. Son 35. El tope que comenta el fuente es 100, y hay que agregar al final.

Apellidos: Smoke, Dust, Chalk, Fur, Clay, Paws, Tails, Sand, Scratch, Berry, Shadow, Ash, Bark, Bowl, Brass, Dusk, Gaze, Gleam, Grass, Moss, Plaid, Puff, Rain, Silk, Silver, Speck, Stripes, Tingle, Wool, Yarn, Snail, Rabbit. Son 32. Amber es el 6 y Silk es el 23.

Rasgos, en orden: scientist, manager, engineer, merchant, wise, metallurgist, chemist, none.

Color, variedad y rareza son enteros. En la generación, 0 es el caso común. Color 1 a 6 es uno de los seis colores primarios del comentario; el array `colors` del fuente tiene 7 entradas, así que el mapeo fino de cada índice al hex queda en ese array y no lo reescribimos acá. Variedad 0 es ninguna; el array `varieties` es dual, tabby, torbie, calico, spots. Rareza 0 es ninguna. El generador sube a 1, 2 o 3.

Si hay `seed`, el nombre, el apellido, la edad, el rasgo, el color, la variedad y la rareza se regeneran con un LCG (`state = state * 16807 % 2147483647`, semilla normalizada a 0..999999). El `ssn` se escribe igual, para que un cliente viejo pueda abrir el archivo. `load` prefiere la semilla.

Forma sin comprimir, la de un save viejo o la de una reserva con `compressSaveFile` en false: `skills` es un objeto por nombre de oficio (solo habilidades mayores a 0, un decimal), `job` es el string del oficio, y o bien hay `seed`, o bien hay `name`, `surname`, `age`, `color`, `variety`, `rarity` y `trait: { name }`. El resto de los flags coincide.

`isSenator` se carga en false y no se guarda. El fuente lo marca obsoleto.

### `calendar`

| Campo | Qué es |
| --- | --- |
| `year` | Año. Entero. |
| `day` | Día dentro de la estación. Avanza en fracciones: cada tick suma `(1 + aceleración) / ticksPerDay`. `ticksPerDay` es 10. |
| `season` | Índice. 0 primavera, 1 verano, 2 otoño, 3 invierno. `seasonsPerYear` es 4. `daysPerSeason` es 100. |
| `weather` | `null`, `"warm"` o `"cold"`. |
| `festivalDays` | Días de festival que quedan. |
| `cycle` | Índice del ciclo astronómico. |
| `cycleYear` | Año dentro del ciclo. |
| `futureSeasonTemporalParadox` | El fuente dice que ya no se usa y que queda por compatibilidad. |
| `cryptoPrice` | Precio interno del blackcoin. Default 1000 al cargar si falta. Con `opts.hodl`, la UI muestra `server.bcoinPrice` en vez de este número. |

Los ciclos, en orden: charon, umbra, yarn, helios, cath, redmoon, dune, piscine, terminus, kairo. `ticksPerSecond` del juego es 5. Un año de calendario son 4 × 100 × 10 = 4000 ticks, 800 segundos de juego si no hay aceleración. El tiempo real de la pared es `time.timestamp`, no el calendario.

### `console`

`console.filters` es un objeto. La clave es el id del filtro y el valor es `{ unlocked, enabled }`. Los ids de este commit: astronomicalEvent, hunt, trade, craft, workshopAutomation, meteor, ivoryMeteor, unicornRift, unicornSacrifice, alicornRift, alicornSacrifice, alicornCorruption, tcShatter, tcRefine, faith, elders, blackcoin, festival, undo, explore, combat. No hace falta un panel: son preferencias del log, y el log en sí no se guarda (el máximo en memoria es 40 mensajes y no entra al save).

### `buildings`

`buildings` es un array. Campos pedidos: `name`, `unlocked`, `val`, `on`, `stage`, `jammed`, `isAutomationEnabled`. El filtro tira `val` y `on` cuando son 0, y `unlocked` y `jammed` cuando son `false`. Un puesto que solo trae `name` es un edificio en cero, cerrado y sin trabar. Al leer, lo que falta es 0 o false.

`val` es la cantidad construida. `on` es la cantidad encendida. `stage` es el índice de etapa (pastura, acueducto, anfiteatro y otros tienen `stages` en el catálogo). `jammed` es el trabado de las steamworks. `isAutomationEnabled` queda si no es `undefined`; `null` se serializa.

En este commit hay 40 edificios, en el orden del array `buildingsData`: field, pasture, aqueduct, hut, logHouse, mansion, library, academy, observatory, biolab, barn, warehouse, harbor, mine, quarry, smelter, calciner, steamworks, magneto, lumberMill, oilWell, workshop, factory, reactor, accelerator, tradepost, mint, brewery, amphitheatre, chapel, temple, unicornPasture, ziggurat, chronosphere, aiCore, zebraOutpost, zebraWorkshop, zebraForge, stasisPod, ivoryTemple.

Los grupos de la interfaz (`food`, `population`, `science` y el resto) no se guardan.

`bldData.groupBuildings` y `bldData.twoRows` son booleanos de presentación. `cathPollution` es el número de polución, en la raíz del save. Al cargar, si falta, queda 0.

### `science`

`hideResearched`, `policyToggleResearched` y `policyToggleBlocked` son booleanos de la interfaz.

`techs` guarda `name`, `unlocked`, `researched` de cada tecnología. `policies` guarda `name`, `unlocked`, `blocked`, `researched`. En este commit el primer nivel de `techs` tiene 60 entradas y el de `policies`, 37. El id es el `name` de cada objeto. No copiamos la lista larga: el día que se escriba el lector se lee de ese array, y un release nuevo la alarga.

### `workshop`

`hideResearched`. `upgrades` y `zebraUpgrades` guardan `name`, `unlocked`, `researched`. `crafts` guarda `name`, `unlocked`, `value` (cuántos se fabricaron por el botón, no el stock: el stock es el recurso) y `progress`. En este commit hay 132 upgrades de primer nivel y 8 de cebra: darkRevolution, darkBrew, zebraTrappers, reforgedOutposts, whispers, minerologyDepartment, bloodstoneInstitute, rangefinders. Las recetas de `crafts` coinciden con los recursos fabricables (wood, beam, slab, y el resto hasta tMythril).

### `diplomacy`

`races` guarda `name`, `embassyLevel`, `unlocked`, `collapsed`, `energy`, `duration`, `pinned`. Los ids: lizards, sharks, griffins, nagas, zebras, spiders, dragons, leviathans. `embassyLevel` es el nivel de la embajada. `energy` y `duration` son el comercio en curso (leviatanes y similares). `autoPinLeviathans` es `true` solo si el jugador dejó a los leviatanes fijados; si no, la clave no está.

`nonRandomTrades` no se guarda. `load` lo pone en 0.

### `religion`

| Campo | Qué es |
| --- | --- |
| `faith` | Fe acumulada para adorar. El pseudo-recurso `worship`. |
| `corruption` | Progreso hacia el próximo necrocorn, en general entre 0 y 1. |
| `faithRatio` | Fe convertida al resetear. El pseudo-recurso `epiphany`. |
| `transcendenceTier` | Nivel de trascendencia. Entero. |
| `activeHolyGenocide` | Cuántos holy genocide quedaron activos. |
| `necrocornDeficit` | Deuda de necrocorn de los pactos. |
| `tcratio` | Duplicado del precio total de trascendencia, «for older versions like mobile». El comentario es del fuente. `load` lo usa solo si `transcendenceTier` es 0 y `tcratio` es mayor a 0. |
| `zu` | Ziggurat. `name`, `val`, `on`, `unlocked`. |
| `ru` | Religión. `name`, `val`, `on`. |
| `tu` | Trascendencia. `name`, `val`, `on`, `unlocked`. |
| `pact` | Pactos. `name`, `val`, `on`, `unlocked`. La clave es `pact`, en singular. |

Ziggurat, en orden: unicornTomb, ivoryTower, ivoryCitadel, skyPalace, unicornUtopia, sunspire, marker, unicornGraveyard, unicornNecropolis, blackPyramid.

Religión: solarchant, scholasticism, goldenSpire, sunAltar, stainedGlass, solarRevolution, basilica, templars, apocripha, transcendence, frescoes.

Trascendencia: blackObelisk, blackNexus, blackCore, singularity, blackLibrary, blackRadiance, blazar, darkNova, mausoleum, holyGenocide, darkParacosm. Son 11. `darkParacosm` está en el array, después de holyGenocide.

Pactos: pactOfCleansing, pactOfDestruction, pactOfExtermination, pactOfPurity, pactOfArcane, pactOfChronicler.

### `space`

`hideResearched`. `programs` guarda `name`, `val`, `on`, `unlocked`. En este commit: orbitalLaunch, moonMission, duneMission, piscineMission, heliosMission, terminusMission, kairoMission, rorschachMission, yarnMission, umbraMission, charonMission, centaurusSystemMission, furthestRingMission.

`planets` guarda `name`, `buildings`, `reached`, `unlocked`, `routeDays`. `routeDays` es lo que falta para llegar. `reached` dice si la nave ya llegó. Los planetas: cath, moon, dune, piscine, helios, terminus, kairo, yarn, umbra, charon, centaurusSystem, furthestRing.

Cada `buildings` del planeta se vuelve a filtrar a `name`, `val`, `on`, `unlocked`. A diferencia de los edificios de la hoguera, acá un 0 sí se escribe: el filtro de espacio no tira los ceros.

### `time`

| Campo | Qué es |
| --- | --- |
| `timestamp` | `pauseTimestamp` si el juego está en pausa, si no `Date.now()` al guardar. Milisegundos. Al cargar, el juego calcula el flujo temporal offline con la diferencia contra ahora. Para un lector es la marca del save, o la de la pausa. |
| `flux` | Años salteados por los saltos del chrono furnace. |
| `heat` | Calor del chrono furnace. |
| `testShatter` | Entero. El comentario dice que es temporal: 0 la función actual, 1 `shatterInGroupCycles`, 2 `shatterInCycles` (deprecado). |
| `isAccelerated` | Bool. |
| `cfu` | Upgrades del chrono furnace. Campos: `name`, `val`, `on`, `heat`, `delayTicks`, `unlocked`, `isAutomationEnabled`. |
| `vsu` | Void space. `name`, `val`, `on`. |
| `queueItems` | La cola de construcción, tal cual está en memoria. |
| `queueSources` | Objeto de bool por fuente. |

Después de armar `cfu`, el save apaga la automatización de `blastFurnace` (`isAutomationEnabled: false`). Un horno que el jugador tenía en auto queda apagado en el archivo. Es lo que escribe el juego, no un error de lectura.

Los cfu de este commit: temporalBattery, blastFurnace, timeBoiler, controlledDelay, temporalAccelerator, temporalImpedance, ressourceRetrieval, temporalPress.

Los vsu: cryochambers, usedCryochambers, voidHoover, voidRift, chronocontrol, voidResonator.

`usedCryochambers` también puede aparecer como clave propia de `time` en un save recién reseteado (`_resetInternal` la escribe aparte). `load` la aplica si está. Un export normal de `TimeManager.save` no la pone: va dentro de `vsu`.

Cada ítem de `queueItems` es `{ name, type, label, value }`. `value` es el tamaño del grupo. `label` puede ser un id de i18n con forma `$nombre$`. `queueSources` arranca con las claves buildings, tech, upgrades, policies, embassies, religion, zebraUpgrades, spaceMission, spaceBuilding, zigguratUpgrades, transcendenceUpgrades, chronoforge, voidSpace. `true` significa que la fuente ya se puede encolar. `load` también lee `queueAlphabeticalSort` si está; `save` de este commit no lo escribe. Si aparece, es un save de otra revisión, o un script.

### `challenges`

`challenges` (el array, adentro de la clave homónima) guarda `name`, `researched` (el fuente lo marca deprecado), `on` (veces completado), `unlocked` y `active`. Los ids: ironWill, winterIsComing, anarchy, energy, atheism, 1000Years, blackSky, pacifism, unicornTears, postApocalypse. `ironWill` activo en el desafío y `game.ironWill` son dos flags. La UI, en `update`, copia el del juego sobre el desafío. En el archivo pueden no coincidir si el save se armó a mano.

Un save anterior al escalón 9 puede traer `currentChallenge` con el nombre. `load` lo trata como el desafío activo. En 15 ese campo se escribe `null` solo si pasó por la migración 8. Un save nacido en 15 no lo agrega en `ChallengesManager.save`.

`reserves` es la bóveda de un desafío pendiente:

| Campo | Qué es |
| --- | --- |
| `reserveKittens` | Gatitos, con `save(compressSaveFile)`. Con la opción en false, van sin comprimir. |
| `reserveResources` | Objeto. La clave es el id del recurso y el valor es el stock apartado. |
| `ironWillClaim` | El campo está en `getSaveData`. El significado fino, más allá de «se guarda y se vuelve a cargar», no lo seguimos en el flujo de reclamar. Queda el nombre. |
| `reserveCryochambers` | Número. Al cargar, si falta, se usa el largo de `reserveKittens`. |

`ChallengesManager.save` arma un array de gatitos y no lo usa: el que entra al archivo es el de `reserves.getSaveData`. Hay que leer ese.

### `prestige`

`perks`: `name`, `unlocked`, `researched`. `hideResearched`. En este commit hay 40 perks, de `engeneering` a `ascoh`, con las diez sefirot en el medio (`malkuth`, `yesod`, `hod`, `netzach`, `tiferet`, `gevurah`, `chesed`, `binah`, `chokhmah`, `keter`). `anachronomancy` y `adjustmentBureau` son los que el reset y la pestaña de desafíos consultan por nombre.

### `achievements` y `ach`

`achievements` es un array con `name`, `unlocked`, `starUnlocked`. En este commit hay 31, de `theElderLegacy` a `betterSafeThanSorry`. `starUnlocked` es la estrella, un bool.

`ach.badgesUnlocked` es el bool de «ya se mostró el panel de insignias». `ach.badges` guarda `name` y `unlocked`. Las insignias de este commit: lotus, ivoryTower, useless, beta, silentHill, evergreen, deadSpace, reginaNoctis, ghostInTheMachine, abOwo, cleanPaws, sequenceBreak, fantasticFurColor, whatYearIsIt, tardis, wheredThisComeFrom, lostDates, buffet, newHome, betterSafeThanSorry. Son 20. `lostDates` cambia el título en memoria al azar; el save guarda el `name`, no ese título.

### `stats` y `statsCurrent`

Las dos son arrays de `{ name, val }`. No se guarda `unlocked`.

`stats`: totalKittens, kittensDead, totalYears, totalResets, totalParagon, eventsObserved, unicornsSacrificed, buildingsConstructed, totalClicks, totalTrades, totalCrafts, averageKittens, transcendenceTier, totalChallengesCompleted.

`statsCurrent`: totalTrades, totalCrafts, averageKittens, timePlayed.

`averageKittens` y `timePlayed` en el juego se recalculan al mostrarlos (`calculate`). El archivo trae el `val` del momento de guardar, que para esos puede estar en 0. Un lector que quiera el número de la UI lo recalcula: gatitos del recurso dividido por siglos del calendario, y el año verdadero pasado a segundos con 5 ticks por segundo. Si no, muestra el `val` y lo dice. `transcendenceTier` de las estadísticas es otro campo que el de `religion.transcendenceTier`. Los dos se guardan. No confirmamos que siempre coincidan.

### `void`

`void.vu` es el filtro de `voidUpgrades` (`name`, `val`, `on`, `unlocked`). En este commit el único es `spaceCathedral`. `void.faction` es un string o `null`.

`load` de este commit lee `faction` y no aplica `vu`. El campo igual viaja en el archivo. Un lector lo puede mostrar. Si el upgrade no tiene efecto en la carga, es una limitación del juego en este commit, no un dato que falte.

## Qué vale la pena mostrar

El JSON entero es largo y repetido: cada catálogo guarda también lo que está en cero. Los paneles muestran la partida, no el volcado.

- Resumen. `saveVersion`. Año, estación (0 a 3) y día. Clima, si no es `null`. Iron Will. Gatitos (`resources` donde `name` es `kittens`, y el largo de `village.kittens` al lado: si no coinciden, se avisa). Karma, paragon y burned paragon del array de recursos. Desafío con `active: true`. Marca de `time.timestamp`.
- Recursos. Tabla de `name` y `value`. En la pantalla, los que tienen valor o están `unlocked`. En la descarga, el array completo, con el float exacto.
- Edificios. `name`, `val`, `on`. Lo que falta es 0. Los de cantidad 0 se pueden plegar. `stage` cuando no es 0. `cathPollution` en el mismo panel, como número.
- Aldea. `maxKittens`, los oficios con `value` mayor a 0, y el líder (`isLeader`). No se dibujan miles de gatitos: el núcleo de Cookie Clicker ya corta las listas largas, y acá el mismo criterio alcanza. El conteo es el largo del array. Un detalle por gatito (nombre reconstruido del `ssn`, edad, rasgo, oficio, exp) entra en la descarga, no en el primer pantallazo.
- Ciencia y taller. Cantidad investigada sobre el total, y la lista de `name` con `researched`. Las políticas igual, con `blocked` a la vista.
- Religión. `faith`, `faithRatio`, `transcendenceTier`, `corruption`, `necrocornDeficit`. De `ru`, `zu`, `tu` y `pact`, los que tienen `on` o `val` mayor a 0.
- Espacio. Programas con `on` o `val`. Planetas con `reached` o `unlocked`, y el `routeDays` de los que todavía viajan. Edificios del planeta con `val` mayor a 0.
- Tiempo. `flux`, `heat`, cryochambers (`val` y `on` del vsu `cryochambers` y de `usedCryochambers`). La cola, si `queueItems` no está vacía: `name`, `type`, `value`.
- Desafíos. `name`, `on`, `active`. Si hay reserva, cuántos gatitos y qué recursos tiene. No hace falta abrir cada gatito de la reserva en el panel.
- Prestigio. Perks con `researched`.
- Logros. Barra de `unlocked` sobre el total, y la lista de nombres. `starUnlocked` al lado del que la tenga. Insignias desbloqueadas en una lista chica.
- Diplomacia. Razas con `unlocked`, el `embassyLevel`, y `energy` si no es 0.
- Estadísticas. La tabla `name` / `val`.

`server.motdContent` no se renderiza como HTML. `telemetry.guid` no va al panel. Las opciones, los filtros de la consola y `bldData` tampoco: son presentación.

Los títulos en español están en `res/i18n/es.json` del juego, bajo la licencia WET PAWS. No se copian. Hasta que aparezca una lista con licencia compatible, el panel muestra el `name`.

## Viabilidad

Se puede leer en el navegador, en la página estática que ya tenemos, sin dependencias. El gesto es el mismo que Cookie Clicker: pegar un texto. No hace falta el camino de bytes de Terraria.

El port de LZString 1.4.4 es vanilla. El test redondea un JSON mínimo contra la cadena que produce el 1.4.4, abre un Base64 con saltos, distingue el UTF-16, distingue un Trimps mínimo y empaqueta un `ssn`. Doscientos gatitos sintéticos vuelven idénticos y el Base64 queda debajo del tope de 4 millones de caracteres de la página.

Tamaños, medidos el 2026-10-21 con ese mismo port, sobre un JSON armado con los catálogos de este commit y valores en cero. No es un save de una persona.

| Qué | JSON | Base64 del export | UTF-16 |
| --- | --- | --- | --- |
| Catálogos, sin gatitos | 22.181 | 6.504 | 2.603 |
| 200 gatitos comprimidos | 37.382 | 10.136 | 4.055 |
| 2.000 | 174.183 | 19.444 | 7.779 |
| 10.000 | 782.184 | 48.568 | 19.428 |
| 40.000 | 3.062.184 | 142.392 | 56.957 |

El grueso es la aldea. El changelog viejo habla de partidas de más de 5 MB que no entraban en `localStorage`, y de una compresión de gatitos para eso. Con la forma comprimida de este commit, 40.000 gatitos del ensayo quedan en 3,1 MB de JSON y 142 KB de Base64. Entran en el tope de la página. Un save real suma stocks y flags, que pesan poco al lado de la lista. No medimos una partida real: no hay una con licencia para commitearla.

El umbral de 5.000.000 es el largo del `JSON.stringify`, antes de comprimir. Por encima, `localStorage` pasa a UTF-16. El export del portapapeles sigue siendo Base64, aunque el JSON sea enorme. Un Base64 de un JSON de 5 MB no lo medimos; el de 3 MB ya bajó a 142 KB, así que el cuello es parsear el JSON, no la cadena pegada.

Riesgos:

- `JSON.parse` de unos pocos MB en una notebook modesta puede trabar un instante. El tope de 4 millones de caracteres de la página corta antes un pegado absurdo. Conviene un tope aparte para la cantidad de gatitos que se dibujan, como ya hace la lista de logros.
- El Base64 no se abre con `atob`. Quien lo haga va a ver basura y va a creer que el save está cifrado. No lo está.
- El Base64 se abre después de sacar los blancos. El UTF-16 se prueba sobre el texto original: un blanco de adentro es un símbolo, y sacarlo puede dejar el JSON o puede romperlo, según si ese blanco era el cierre o un dato. El lector prueba en este orden: primero el `{` pelado, después Base64 sin blancos, después UTF-16 con los blancos en su lugar.
- Un `saveVersion` distinto de 15 se avisa. Migrar el 12 exige la tabla de tiers de trascendencia del juego, porque el paso llama a `getTU`. Para mostrar un 15 no hace falta. Para un save viejo, o se porta `migrateSave` (sin copiar el resto del juego) o se muestran los campos crudos y se dice que la migración no se corrió.
- No hay escalón 7. Un 7 se queda en 7.
- Un `saveVersion` futuro se lee con las reglas de ahora y se avisa, igual que una Cookie Clicker más nueva que la conocida.
- Los `name` no se traducen. La licencia del juego no deja copiar `es.json`.
- Los números son floats. Un stock pasado del entero seguro se muestra como el float del archivo.
- `game/beforesave` y los scripts de la comunidad pueden agregar claves. Se conservan y no se interpretan.
- `motdContent` puede traer HTML. Va escapado.
- El mapa de la aldea no guarda casillas. `hqLevel`, `energy` y `explorersLevel` son lo que hay.
- No confirmamos el binario de las tiendas. Este commit usa el mismo `save` para web, mobile y steam, y deja `tcratio` «for older versions like mobile».
- Cookie Clicker no se queda con estos sobres: el test lo mide. Trimps comparte el Base64. La diferencia, después de descomprimir, es `global` contra `saveVersion`.

## Qué falta para el lector

El formato alcanza para escribirlo. Falta el lector, no otra investigación del sobre.

- `js/lectores/kittens-game/` con `detectar` y `decodificar`, registrado en `js/lectores/indice.js`. `detectar` sigue las reglas de arriba y tiene que ganar solo cuando el JSON es de Kittens, para no pisar a Cookie Clicker ni a un Trimps futuro.
- Mover el port de `tests/kittens-lz.js` a un módulo que la página cargue. El test ya traba la cadena de oro contra el 1.4.4.
- Paneles con los bloques de la sección anterior. La descarga la hereda el núcleo si los paneles están. `armarExportacion` hace falta el día que se quieran los catálogos en cero, que el panel va a plegar.
- Listas de `name` copiadas del catálogo de este commit, o leídas de una tabla propia. Sin los títulos de `es.json`.
- Un aviso si `saveVersion` no es 15. La migración completa, sobre todo el escalón 12, puede esperar: un export de ahora ya viene migrado.
- Tope de gatitos dibujados. El conteo sigue siendo el total.
- No hace falta un save real para la primera versión. El sintético del test cubre el sobre. Un save de una partida larga, el día que haya uno con licencia, serviría para ver un `ssn` con nombre custom y una cola de construcción llena. Esta corrida no lo consiguió.
