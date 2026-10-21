# Roadmap

Savedeco arranca con Cookie Clicker porque el export está documentado y el fuente es público. Terraria y Kittens Game ya tienen el formato investigado y el lector todavía no. Estos son los candidatos, y lo que todavía falta en el lector actual.

## Exportar la partida

Ya está en el núcleo, no es un pendiente por juego. Después de leer se bajan un texto (para una IA), un CSV (Excel en español) y un JSON. Si el lector no implementa `armarExportacion`, los archivos salen de los paneles. Cookie Clicker sí la implementa: logros y mejoras van conseguidos y faltantes, con nombre, y también lo que el panel no muestra. El detalle está en [la arquitectura](ARQUITECTURA.md).

## Próximos juegos

En todos los casos el lector sería solo lectura, igual que ahora: abrir el archivo en el navegador y mostrar paneles. Ninguno de estos formatos está implementado todavía.

### Terraria

Viable para el personaje y para la cabecera del mundo. El lector no está escrito. El detalle, con las fuentes, está en [el formato](FORMATOS/terraria.md).

Qué se puede leer:

- El `.plr` se descifra en el navegador con Web Crypto, AES-CBC de 128 bits y PKCS#7. La clave es `"h3y_gUyZ"` en UTF-16LE, y el IV es la misma clave. El test sintético ya lo hace con `crypto.subtle`.
- Después del descifrado salen nombre, dificultad, tiempo, vida, maná, equipo, mochila, chanchito, caja fuerte, forja, vacío, spawns y los hitos que el personaje sí guarda.
- El `.wld` no está cifrado. Con la tabla de punteros se lee la cabecera (nombre, semilla, tamaño, modo, jefes, NPCs rescatados) y se saltea la sección de tiles, que es la pesada.

Riesgos:

- La página hoy lee el archivo como texto y corta a los 4 millones de caracteres. Un `.wld` no sobrevive ese camino. Hay que entrar por bytes y leer solo el rango de la cabecera.
- Los campos cambian con el release. 1.4.4.9 es el 279. 1.4.5.8 es el 326, y el lector público de personajes que usamos de referencia llega al 318. Un release más nuevo se puede intentar y hay que avisarlo.
- En el `World.FileV2` actual, 1.4.5.8 sigue con 11 punteros y los tiles en el índice 1. Lo nuevo entró en la cabecera. Si un release posterior mete una sección en el medio, hay que volver a mirar ese archivo.
- Los nombres de ítems, buffs y prefijos son ids. No hay un catálogo con licencia compatible. La primera versión los muestra como número.
- Un `.plr` de tModLoader se abre como vanilla y los ítems de mods quedan vacíos. El `.tplr` y el `.twld` son otro formato: se reconocen y se rechazan con un mensaje.

Qué falta para el lector: el camino de bytes en la página, y un `.plr` y un `.wld` reales para probar (esta corrida no consiguió saves con licencia libre). El orden de secciones de la 1.4.5.8 ya está en el formato: 11 punteros, tiles en el índice 1. Los tiles no se parsean.

### Kittens Game

Viable. El formato está documentado en [el formato](FORMATOS/kittens-game.md). El lector no está escrito. El repo público es [nuclear-unicorn/kittensgame](https://github.com/nuclear-unicorn/kittensgame) (el enlace sin guión responde 404), commit `781e379` del 31 de agosto de 2026. La licencia del juego es WET PAWS: se describe el comportamiento y no se copia código ni `res/i18n/`.

Qué se puede leer:

- El export del portapapeles y el archivo `Kittens Game.txt` son `LZString.compressToBase64` del JSON de `game.save()`. No es el Base64 de Cookie Clicker: `atob` no devuelve el JSON. El alfabeto es `A–Z`, `a–z`, `0–9`, `+`, `/` y `=`.
- `localStorage["com.nuclearunicorn.kittengame.savedata"]` guarda el JSON pelado si el `stringify` no pasa de 5.000.000 de caracteres y `opts.forceLZ` está apagado. Si no, guarda `LZString.compressToUTF16`. La nube (KGNet) manda esa misma variante UTF-16.
- El port de LZString 1.4.4 entra en vanilla, sin dependencia. La licencia de esa versión es WTFPL-2.0 y el port lleva ese encabezado. El tag 1.5.0 declara MIT y, en las muestras, escribió la misma cadena. El repo actual es el 2.0.0-rc.3, también MIT. El test `tests/kittens-game.test.js` hace la ida y vuelta de un JSON mínimo contra la salida del 1.4.4.
- El objeto trae `saveVersion` (hoy 15), recursos, aldea y gatitos, calendario, edificios, ciencia, taller, diplomacia, religión, espacio, tiempo, desafíos, prestigio, logros, estadísticas y void. El detalle, campo por campo, está en el formato.
- Un export de este commit ya viene en 15 y se muestra sin migrar. `migrateSave` cubre los escalones del 1 al 15, con un hueco en el 7. El escalón 12 llama a funciones del juego en marcha y no es una función pura del JSON.

Riesgos:

- Cookie Clicker se distingue por `!END!`. Trimps usa el mismo `compressToBase64` y, una vez abierto, se distingue por `global` contra `saveVersion`. El detector de Cookie Clicker que ya está en la página devuelve menos de 0,5 con los tres sobres de Kittens.
- El Base64 se abre sacando los blancos. El UTF-16 se prueba con los blancos adentro: un espacio o un U+2009 puede ser un símbolo del alfabeto. El import del textarea recorta `\s` y por eso un UTF-16 con un símbolo en blanco no entra por ahí. `localStorage` sí lo abre.
- Un JSON pelado no entra por el textarea del juego. Un lector de la página tiene que aceptarlo igual, porque es lo que hay en `localStorage` cuando la partida es chica.
- Tamaños medidos con catálogos en cero, no con una partida real: sin gatitos, 22 KB de JSON y 6,5 KB de Base64. Con 40.000 gatitos comprimidos, 3,1 MB de JSON y 142 KB de Base64. Entran en el tope de 4 millones de caracteres de la página. El grueso es la aldea.
- Un `saveVersion` distinto de 15 se avisa. Migrar un save viejo, sobre todo el escalón 12, puede esperar.
- Los `name` se muestran crudos: `es.json` es WET PAWS. `motdContent` puede traer HTML y va escapado. `telemetry.guid` no va a un panel.
- No confirmamos el binario de las tiendas. En este commit el `save` es el mismo para web, mobile y steam.

Qué falta para el lector: el módulo `js/lectores/kittens-game/`, registrarlo, mover el port de LZString a un módulo que cargue la página, y los paneles de la lista del formato. No hace falta un save real para la primera versión. El sintético cubre el sobre.

### Trimps

Viable y parecido al anterior. El export es `LZString.compressToBase64` de un JSON con el jugador. Lo confirman el propio juego (el fuente está publicado) y el uso habitual de `LZString.decompressFromBase64` sobre el string exportado. El JSON es grande pero plano, así que los paneles de recursos, helium y perk salen bastante directos una vez descomprimido.

### Antimatter Dimensions

Viable, con una salvedad. Desde el Reality Update el save se comprime con LZString, y el fuente es público. El sobre cambia según la plataforma: la versión de escritorio, Android e iOS no envuelven el payload igual. Antes de escribir el lector hay que leer la función de export de la versión que queramos soportar y no adivinar el prefijo. Los editores de la comunidad lo desencriptan a JSON, así que el contenido, una vez abierto, es legible.

### Los que dejamos para más adelante

Universal Paperclips y A Dark Room guardan en `localStorage` y no tienen un código de exportación estándar. Se podrían leer si alguien pega el JSON a mano, pero no es el mismo gesto que un export. IdleOn y otros idle en línea cifran el save: sin el esquema no vale la pena prometer un lector.

## Mejoras del lector de Cookie Clicker

- Los minijuegos (jardín, bolsa, panteón, grimorio) ya se leen, con el formato del fuente. El jardín se muestra como parcela de 6 por 6.
- Sigue sin extraerse el resto de la tabla de estadísticas: pactos, devoradores, Papá Noel, renos, bóveda, volúmenes y lo demás que el formato ya nombra.
- El fondo, el tipo de leche y las auras del dragón quedan como id numérico. No mapeamos el nombre de cada sprite.
- El nivel del dragón es el índice de etapa, sin el título.
- La apariencia de Tú son siete índices de genes. No tenemos el nombre visual de cada opción.
- Hay un test sintético del bitfield empaquetado (versión 2.000) y de la lista con huecos (1.030). Sigue faltando un fixture real de una partida vieja.
- Una notación en escala larga (billón = 10^12) para quien lea los nombres en español de toda la vida. Hoy la corta sigue al juego a propósito.
- Si más adelante dos lectores empatan, un selector manual.

## Próxima investigación de formato

Cookie Clicker ya tiene lector. Terraria y Kittens Game ya tienen el formato documentado. La próxima corrida de este bot puede investigar un juego nuevo.

El que sigue es **Trimps**. El fuente está publicado, el export también es `LZString.compressToBase64` de un JSON, y después de abrirlo se distingue de Kittens por el objeto `global`. Antimatter Dimensions queda como alternativa si Trimps ya estuviera escrito: el sobre cambia según la plataforma, y hay que leer la función de export antes de prometer un prefijo.
