# Roadmap

Savedeco arranca con Cookie Clicker porque el export está documentado y el fuente es público. Terraria es la segunda prioridad: el formato ya está investigado y el lector todavía no. Estos son los candidatos, y lo que todavía falta en el lector actual.

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

Viable. El juego es de código abierto ([nuclearunicorn/kittensgame](https://github.com/nuclearunicorn/kittensgame)). `game.save()` junta un JSON con el estado de cada manager y lo comprime con `LZString.compressToBase64`. En el navegador queda en `localStorage` bajo `com.nuclearunicorn.kittengame.savedata`. El export que se copia es esa misma cadena. Para leerlo hay que invertir `LZString.decompressFromBase64` y después pasar por las migraciones de versión, que el juego aplica en `migrateSave`. Conviene portar el descompresor a vanilla, sin sumar una dependencia.

Fuente: el módulo de guardado del repo y la descripción del flujo en la wiki del proyecto (JSON, después LZString a Base64).

### Trimps

Viable y parecido al anterior. El export es `LZString.compressToBase64` de un JSON con el jugador. Lo confirman el propio juego (el fuente está publicado) y el uso habitual de `LZString.decompressFromBase64` sobre el string exportado. El JSON es grande pero plano, así que los paneles de recursos, helium y perk salen bastante directos una vez descomprimido.

### Antimatter Dimensions

Viable, con una salvedad. Desde el Reality Update el save se comprime con LZString, y el fuente es público. El sobre cambia según la plataforma: la versión de escritorio, Android e iOS no envuelven el payload igual. Antes de escribir el lector hay que leer la función de export de la versión que queramos soportar y no adivinar el prefijo. Los editores de la comunidad lo desencriptan a JSON, así que el contenido, una vez abierto, es legible.

### Los que dejamos para más adelante

Universal Paperclips y A Dark Room guardan en `localStorage` y no tienen un código de exportación estándar. Se podrían leer si alguien pega el JSON a mano, pero no es el mismo gesto que un export. IdleOn y otros idle en línea cifran el save: sin el esquema no vale la pena prometer un lector.

## Mejoras del lector de Cookie Clicker

- Los minijuegos (jardín, bolsa, panteón, grimorio) ya se leen, con el formato del fuente.
- Sigue sin extraerse el resto de la tabla de estadísticas: pactos, devoradores, Papá Noel, renos, bóveda, volúmenes y lo demás que el formato ya nombra.
- El fondo, el tipo de leche y las auras del dragón quedan como id numérico. No mapeamos el nombre de cada sprite.
- El nivel del dragón es el índice de etapa, sin el título.
- La apariencia de Tú son siete índices de genes. No tenemos el nombre visual de cada opción.
- Hay un test sintético del bitfield empaquetado (versión 2.000) y de la lista con huecos (1.030). Sigue faltando un fixture real de una partida vieja.
- Una notación en escala larga (billón = 10^12) para quien lea los nombres en español de toda la vida. Hoy la corta sigue al juego a propósito.
- Si más adelante dos lectores empatan, un selector manual.

## Próxima investigación de formato

Cookie Clicker ya tiene lector. Terraria ya tiene el formato documentado. La próxima corrida de este bot puede investigar un juego nuevo.

El que sigue es **Kittens Game**. El fuente es público, el export es un JSON comprimido con LZString y entra por el mismo gesto de pegar un texto. No pide el camino de bytes que Terraria va a necesitar para implementarse. Trimps queda como alternativa parecida si Kittens ya estuviera escrito.
