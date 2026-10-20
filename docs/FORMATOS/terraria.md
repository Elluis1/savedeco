# Formato de Terraria

Terraria guarda al personaje en un `.plr` y al mundo en un `.wld`. Los dos son binarios little-endian. El personaje va cifrado. El mundo va en claro.

Esta nota no implementa el lector. Describe lo que se pudo confirmar para leer en el navegador, solo lectura. Donde las fuentes no llegan, el campo queda como desconocido.

Fuentes usadas el 2026-10-20:

- Parche público de tModLoader 1.4.4 sobre `Player.Save` / `Player.Load`: la clave, el cifrado al guardar y el orden de las ranuras de esa versión. El parche mezcla código de tModLoader (MIT) con el fuente del juego, que es de Re-Logic. Acá se describe el comportamiento. No se copia el código. [Player.cs.patch, rama 1.4.4](https://github.com/shikozz/tModLoader_exampleMod/blob/1.4.4/patches/tModLoader/Terraria/Player.cs.patch).
- [terra-plr 0.3.0](https://gitlab.com/terra-conv/terra-plr) (AGPL-3.0-or-later), publicado el 2026-02-14. Lee personajes de release 0 a 318 (`SUPPORTED_VERSIONS` en [`player.rs`](https://docs.rs/terra-plr/latest/src/terra_plr/player.rs.html)). Es el que tiene los `if version >= N`, y la clave está hardcodeada ahí. También tiene errores de ida y vuelta; están marcados abajo. No copiamos ese código al repo. El orden de escritura está en [`write.rs`](https://docs.rs/terra-plr/latest/src/terra_plr/player/write.rs.html) y el de lectura en [`read.rs`](https://docs.rs/terra-plr/latest/src/terra_plr/player/read.rs.html).
- [TerraFirma, formato de mundo](https://seancode.com/terrafirma/world.html). Cabecera del `.wld` campo por campo, con el release mínimo de cada uno. La tabla corta cerca del release 227.
- [Documentación del `.wld` 1.3](http://ludwig.schafer.free.fr/) de Ludwig Schäfer. Magic, tipo de archivo y punteros de esa época.
- [terraria-world 1.0.8](https://crates.io/crates/terraria-world/1.0.8) / [osbm.dev](https://osbm.dev/terraria-world-rs/terraria-world-file.html). Once punteros en un mundo 1.4.4.9 y un ejemplo de RLE. El byte de tipo de archivo que publican (0) no coincide con las otras fuentes. Quedó anotado.
- [versions.json de TEdit](https://github.com/TEdit/Terraria-Map-Editor/blob/main/src/TEdit.Terraria/Data/versions.json) y [`World.FileV2.cs`](https://github.com/TEdit/Terraria-Map-Editor/blob/main/src/TEdit.Terraria/World.FileV2.cs). El JSON mapea el release hasta 1.4.5.8 = 326. El loader es el que abre el `.wld` y termina la cabecera en el puntero de los tiles. TEdit es GPL-3.0. Citamos el orden, no el código. El enum de tipo está en [`FileType.cs`](https://github.com/TEdit/Terraria-Map-Editor/blob/main/src/TEdit.Terraria/FileType.cs): 0 ninguno, 1 mapa, 2 mundo, 3 personaje.
- Wiki oficial: [personaje](https://terraria.wiki.gg/wiki/Player), [mundo](https://terraria.wiki.gg/wiki/World), [tamaño](https://terraria.wiki.gg/wiki/World_size), [historial de PC](https://terraria.wiki.gg/wiki/Desktop_version_history). El texto de la wiki es [CC BY-NC-SA 3.0](https://terraria.wiki.gg/wiki/Terraria_Wiki:Copyrights). Sirve para citar tamaños y límites. No sirve para copiar la lista de ítems al repo.
- [TagIO de tModLoader 1.3](https://docs.tmodloader.net/docs/1.3/class_terraria_1_1_mod_loader_1_1_i_o_1_1_tag_i_o.html) y la [wiki de TagCompound](https://github.com/tModLoader/tModLoader/wiki/Saving-and-loading-using-TagCompound). Archivos `.tplr` y `.twld`.
- [RijndaelManaged](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.rijndaelmanaged.padding) (padding PKCS7, modo CBC y bloque de 128 por defecto) y [AES-CBC en Web Crypto](https://www.w3.org/TR/WebCryptoAPI/#aes-cbc-operations).
- [Kaitai del `.plr` para el release 234](https://gist.github.com/iconmaster5326/3c723eba0b0ebfc41f85f6b1cc00df91). Después del release lee 8 bytes de un saque (se come el magic) y dice "sin padding". Sirve para las cantidades de ranuras de esa versión. No para los offsets.
- Wiki de cofres, historial de la 1.4.0.1: el tope de cofres colocados pasó de 1000 a 8000. [Chests, fandom](https://terraria.fandom.com/wiki/Chests). TEdit deja el mismo 8000 en `DefaultMaxChests` de [`WorldConfiguration.cs`](https://github.com/TEdit/Terraria-Map-Editor/blob/main/src/TEdit.Terraria/WorldConfiguration.cs).
- El test `tests/terraria-cifrado.test.js` cifra y descifra un `.plr` mínimo con `globalThis.crypto.subtle`. No hay un save real con licencia libre en el repo.

El número que viaja en el archivo no es `1.4.4.9`. Es un entero, el release. En el fuente es `Main.curRelease`. TEdit lo llama save version. Abajo, "release" es ese entero.

## Dónde están los archivos

La wiki los ubica así en la versión de escritorio:

- Personaje: `%USERPROFILE%\Documents\My Games\Terraria\Players\Nombre.plr` en Windows. El nombre del archivo se fija al crear al personaje. El nombre de adentro puede cambiar después.
- Mundo: `%USERPROFILE%\Documents\My Games\Terraria\Worlds\Nombre.wld`.

Al lado suele haber un `.bak` del mismo formato. Es la copia anterior. Se puede leer igual.

tModLoader guarda en otra carpeta (`tModLoader`, `tModLoader-1.4.3` o `ModLoader`, según la versión) y agrega `.tplr` al lado del `.plr`, y `.twld` al lado del `.wld`. El `.plr` y el `.wld` siguen siendo el formato vanilla. Los datos de mods van en el archivo que empieza con `t`.

La carpeta del personaje también tiene minimapas `.map`. Es otro formato. No está documentado acá.

No confirmamos si consola o móvil envuelven el mismo binario. TEdit lee mundos de PlayStation con el mismo esquema de punteros, pero no lo tomamos como formato de escritorio.

## Tipos comunes

Todo entero es little-endian.

| Tipo | Qué es |
| --- | --- |
| Bool | Un byte. `BinaryWriter.Write(bool)` escribe 0 o 1. |
| Byte | 0 a 255. |
| Int16 / Int32 / Int64 | Con signo, salvo donde una fuente dice uint. |
| Single | Float de 32 bits. |
| String | El string de `BinaryWriter`: un entero de 7 bits con la cantidad de bytes, y después UTF-8. Si el texto mide menos de 128 bytes, el largo entra en un solo byte. La wiki de TerraFirma lo describe así, y alcanza para nombres. Una semilla larga, o un nombre interno de investigación, puede pasar los 127 bytes y ocupar más de un byte de largo. |
| Color | Tres bytes, R, G, B. Sin alfa. |

El tope del nombre del personaje es 20 caracteres. Lo cita la wiki desde `Click_Naming` de la 1.4.4.9. El nombre del mundo, 27. La semilla, 40 en la caja, y se puede pegar una más larga. Esos topes son de la interfaz. El archivo guarda el string que haya quedado.

## El release

TEdit publica el mapa. A partir de 1.2 el número sube con el juego. En 1.0 y 1.1 la tabla no es monótona (`1.0` figura como 38 y `1.0.1` como 2). Para detectar, usamos el entero del archivo. No ordenamos esas versiones viejas por el número.

| Juego | Release |
| --- | --- |
| 1.2 | 67 |
| 1.2.1.2 | 73 |
| 1.2.2 | 77 |
| 1.2.3 | 93 |
| 1.2.4.1 | 102 |
| 1.3.0.1 | 146 |
| 1.3.1 | 168 |
| 1.3.5.3 | 194 |
| 1.4.0.1 | 225 |
| 1.4.0.5 | 230 |
| 1.4.1.2 | 234 |
| 1.4.3 | 242 |
| 1.4.3.6 | 248 |
| 1.4.4 | 269 |
| 1.4.4.9 | 279 |
| 1.4.5.0, 1.4.5.1 y 1.4.5.2 | 315 |
| 1.4.5.5 | 318 |
| 1.4.5.6 | 319 |
| 1.4.5.8 | 326 |

La tabla completa, con cada hotfix, está en el `versions.json` de TEdit. La wiki, al 2026-10-20, llega a 1.4.5.8 (23 de agosto de 2026). terra-plr 0.3.0 lee hasta el 318. Del 319 al 326 no hay un lector de personaje publicado en las fuentes de esta nota: si aparecen campos nuevos, son desconocidos.

Entre 279 (1.4.4.9) y 315 (1.4.5.0) TEdit no asigna un juego público. terra-plr igual tiene compuertas en 280, 281, 282, 283, 300 y 310. Un archivo 1.4.4.9 no las cruza. Uno 1.4.5.0 sí, si esas compuertas son ciertas. No abrimos un `.plr` real de 1.4.5 para comprobarlo.

## Cifrado del .plr

La pista era AES/Rijndael CBC, clave `"h3y_gUyZ"` en UTF-16LE, usada también como IV. Cierra.

El parche de tModLoader 1.4.4 deja la clave del juego a la vista:

`ENCRYPTION_KEY = new UnicodeEncoding().GetBytes("h3y_gUyZ")`

`UnicodeEncoding` de .NET, sin argumentos, es UTF-16 little-endian. Ocho caracteres son 16 bytes:

```text
68 00 33 00 79 00 5F 00 67 00 55 00 79 00 5A 00
```

terra-plr hardcodea ese mismo arreglo de 16 bytes como `PLAYER_ENCRYPTION_KEY`. Al guardar, el parche llama a `CreateEncryptor(ENCRYPTION_KEY, ENCRYPTION_KEY)`: la clave y el IV son el mismo arreglo.

`RijndaelManaged` recién construido usa, por documentación de Microsoft, modo CBC, bloque de 128 bits y padding PKCS7. Con bloque de 128 y clave de 16 bytes, ese Rijndael es AES-128. Web Crypto solo implementa el bloque de 128, así que esta combinación entra.

Al cargar, el mismo parche hace `rijndaelManaged.Padding = PaddingMode.None` antes de descifrar. El juego no le saca el relleno: lee los campos y el resto del bloque le sobra. En disco, el archivo que escribió el guardado sí trae PKCS7, porque el guardado no cambia el padding.

El Kaitai del release 234 dice "sin padding". Describe la carga, no los bytes del archivo. Si se cifra de nuevo sin padding, el juego lo abre (la carga no revisa el relleno) y Web Crypto lo rechaza.

### Web Crypto

`crypto.subtle.decrypt` con `AES-CBC` exige PKCS#7 y lo saca solo. No hay parámetro para elegir otro padding. Con esta clave, este IV y un archivo que haya cifrado el juego, se usa tal cual:

1. La clave cruda son los 16 bytes de arriba. `importKey('raw', clave, { name: 'AES-CBC' }, false, ['decrypt'])`.
2. El algoritmo es `{ name: 'AES-CBC', iv: clave }`. El IV es la clave, no un IV de ceros.
3. El resultado es el binario del personaje, sin el relleno.

No hay que pasar la clave por UTF-8: son 8 bytes y `importKey` la rechaza. Tampoco UTF-16BE: el orden de los bytes cambia.

El texto cifrado tiene que medir un múltiplo de 16. Si el PKCS7 está roto, `decrypt` tira `OperationError`. Eso cubre un archivo cortado o uno regrabado sin padding.

El test del repo arma un plano mínimo (release 279, magic `relogic`, tipo 3, nombre `Ada`), lo cifra con `subtle.encrypt` y lo abre con `subtle.decrypt`. El plano vuelve igual. Eso demuestra que la API acepta la clave y el IV. No demuestra un `.plr` bajado del juego: no conseguimos uno con licencia para commitearlo.

Un personaje es chico al lado de un mundo. Las ranuras son fijas. Lo variable son el nombre, los spawns y la investigación. Una cota holgada de 2 MB rechaza basura sin cortar un personaje real. No medimos un `.plr` de una partida larga: la cota sale de contar ranuras, no de un archivo.

## Cabecera común, después de descifrar

El primer Int32 es el release.

Si el release pasa el corte, siguen 7 bytes de magic, un byte de tipo, 4 bytes de revisión y 8 de favorito. TEdit lee la revisión como UInt32 y el favorito como UInt64 de bitflags; hoy solo usa el bit bajo. terra-plr, en el personaje, escribe los dos como enteros con signo (`Int32` en cero, que comenta como "times saved" sin usar, e `Int64` de favorito). En disco son los mismos anchos, y el favorito que escriben las dos fuentes es 0 o 1. El magic de escritorio es `relogic`. TEdit, en un mundo, también acepta `xindong` (`ChineseHeader` en `WorldConfiguration`): es la cabecera china, y la detecta si el primer carácter es `x`. Los dos miden 7 bytes. No vimos un `.plr` chino, así que en el personaje el único magic confirmado es `relogic`.

El corte no es el mismo en las dos fuentes. terra-plr lee el bloque del personaje desde el release 135. TEdit lo lee en el mundo desde el 140, y el comentario del código dice `// 135`. 135 y 140 caen entre 1.2.4.1 (102) y 1.3.0.1 (146). No hay un juego público en el medio. Un 1.2 no trae este bloque. Un 1.3 o un 1.4 sí.

El tipo, en el enum de TEdit y en terra-plr: 1 mapa, 2 mundo, 3 personaje. Ludwig, para el `.wld` de 1.3, también dice tipo 2. El crate terraria-world dice 0 para el mundo. Nos quedamos con 2 y 3.

La revisión en el mundo, según Ludwig, sube en cada guardado. TEdit la incrementa al guardar. En el personaje el campo está, y terra-plr lo lee y no lo usa.

El `.wld` no se descifra. Empieza igual, en claro: release, y si corresponde el magic.

## El .plr descifrado

Después de la cabecera, el orden es el de terra-plr 0.3.0. Donde el parche de 1.4.4 (release 279) muestra el mismo `for`, lo digo. Las compuertas son del release del archivo, no del número `1.4.x`, salvo cuando TEdit los empareja.

Un ítem de ranura completa es Int32 id, Int32 cantidad, byte de prefijo. El prefijo existe desde el release 36. Antes, el ítem no trae ese byte. Desde el release 38 el id es el entero. Antes, el id es un string con el nombre viejo. El 0 es ranura vacía para los lectores: no arman un ítem. Una cantidad que no sea positiva, tampoco.

Una ranura de equipo (armadura, vanidad, tinte, mascota) es Int32 id y byte de prefijo, sin cantidad.

El favorito de la mochila, desde el release 114, es un byte pegado al prefijo de esa ranura. Inventario, monedas y munición lo llevan cada uno. No hay una lista de favoritos al final del bloque.

### Identidad

| Campo | Desde | Notas |
| --- | --- | --- |
| Nombre | siempre | String. |
| Dificultad | 18 como byte | 0 clásico (el enum lo llama softcore; la wiki de 1.4 dice Classic), 1 mediumcore, 2 hardcore, 3 journey. Del 11 al 17 es un bool: verdadero es hardcore, falso es clásico. Hasta el 10 no hay campo y se toma clásico. Fuente: terra-plr. |
| Tiempo jugado | 138 | Int64. Son ticks de `TimeSpan`, 10 000 000 por segundo. 138 cae antes del 1.3.0.1 público (146): un 1.3 lo trae, un 1.2 no. El parche de 1.4.4 escribe `GetPlayTime().Ticks`. |
| Pelo | siempre | Int32, id de peinado. |
| Tinte de pelo | 83 | Byte. |
| Equipo de PvP | 283 | Byte. terra-plr mapea 1 rojo, 2 azul, 3 verde, 4 amarillo, 5 rosa. 283 está en el hueco entre 279 y 315: no está en un 1.4.4.9. Sin un `.plr` de 1.4.5, el mapa de colores queda en una sola fuente. |
| Visibilidad de accesorios | 83 | Un byte si el release es menor a 124, un UInt16 si no. Los 3 bits bajos no se usan. Después, un bit por accesorio. El orden fino de los bits no lo contrastamos con un save. |
| Visibilidad de mascota y luz | 119 | Un byte. |
| Estilo del cuerpo | 18 | Del 18 al 107 es un bool (masculino / femenino). Desde el 108 es un byte. Hasta el 17 se infiere del peinado. Los nombres de cada estilo quedan pendientes, igual que los ítems. |

### Vida, maná y mejoras

| Campo | Desde | Notas |
| --- | --- | --- |
| Vida actual y máxima | siempre | Dos Int32. |
| Maná actual y máximo | siempre | Dos Int32. |
| Corazón de demonio | 125 | Bool. Abre la ranura extra de accesorio. |
| Antorchas de bioma desbloqueadas | 229 | Bool. |
| Antorchas de bioma en uso | 229 | Bool. terra-plr lo marca como bug: el valor que el juego usa de verdad está más abajo, en los toggles del constructor (release 230). |
| Pan del artesano | 256 | Bool. Mejora permanente de 1.4.4. |
| Cristal aegis, fruta aegis, cristal arcano, perla de la galaxia, gummy worm, ambrosía | 260 | Seis bools, en ese orden. |
| Ejército del Viejo derrotado | 182 | Bool. `downedDD2EventAnyDifficulty` en el parche. Es de los pocos hitos de jefe que guarda el personaje. |
| Dinero del recaudador | 128 | Int32, en monedas de cobre. |
| Muertes | 254 | Dos Int32. terra-plr los llama "no causadas por otro jugador" y "causadas por otro jugador", en ese orden. 254 cae entre 1.4.3.6 (248) y 1.4.4 (269). |

Después vienen siete colores, siempre, en este orden: pelo, piel, ojos, remera, debajo de la remera, pantalones, zapatos.

### Equipo, mochila y baúles

El bloque de arriba es el equipo puesto. Desde el release 262, después de la vagoneta suprema, va un Int32 con el índice elegido y después los tres loadouts de 1.4.4. En un 1.4.4.9 (release 279) eso cierra el archivo. Desde el 280 siguen la voz y el resto de la tabla de abajo. terra-plr intercambia el elegido con el bloque de arriba.

Equipo puesto, cada pieza id + prefijo:

| Pieza | Cantidad |
| --- | --- |
| Casco, pechera, pantalones | 3, siempre |
| Accesorios | 5 hasta el release 123, 7 desde el 124. El corazón de demonio no agrega un campo: habilita el último de los 7. |
| Vanidad de armadura | 3, desde el release 6 |
| Vanidad de accesorios | Ninguno hasta el 80. 5 del 81 al 123. 7 desde el 124. |
| Tintes de armadura | 3, desde el 47 |
| Tintes de accesorios | Igual que la vanidad de accesorios |

En 1.4.4 el parche escribe `armor` (id y prefijo por pieza) y después `dye`. Veinte piezas de equipo y diez tintes es lo que también cuenta el Kaitai armado para el release 234. Ese Kaitai se saltea el magic `relogic`, así que no usamos sus offsets. Las cantidades de ranuras sí coinciden.

Mochila:

| Bloque | Desde | Ranuras |
| --- | --- | --- |
| Inventario | siempre | 4 filas de 10 hasta el release 57, 5 filas de 10 desde el 58. Con monedas y munición, el 1.4.4 escribe 58. |
| Monedas | siempre | 4 |
| Munición | 15 | 4 |
| Favorito | 114 | Un byte después del prefijo de cada ranura de inventario, de monedas y de munición. |

Entre la munición y el chanchito van las ranuras sueltas. Cada pieza es id y prefijo, y el tinte va enseguida, en el mismo par. El parche de 1.4.4 las escribe en el loop de `miscEquips` y `miscDyes`. Las compuertas son de terra-plr:

| Pieza | Desde |
| --- | --- |
| Mascota y su tinte | 136 |
| Luz, vagoneta, montura y gancho, cada una con su tinte, en ese orden | 117 |

Si el release es 136 o más, la mascota va primera. Entre 117 y 135 esas cuatro están y la mascota no. En 1.4.4 son cinco pares. El Kaitai del 234 también cuenta `5 * 2` ranuras acá, después de las 58 de la mochila.

Baúles portátiles. Cada ranura es id, cantidad y prefijo, sin favorito, salvo la bóveda:

| Baúl | Campo del juego | Desde | Forma |
| --- | --- | --- | --- |
| Chanchito | `bank` | siempre | 4 filas. 5 columnas hasta el release 57, 10 desde el 58. En 1.4.4 son 40. |
| Caja fuerte | `bank2` | 20 | Igual |
| Forja del Defensor | `bank3` | 182 | Igual. 182 cae justo antes del 1.3.4 público (184), que es cuando salió la forja. |
| Bóveda del vacío | `bank4` | 198 las ranuras, 199 el byte de info | 40 ranuras. Desde el 255, el favorito va pegado al prefijo de cada una, igual que en la mochila. Después de las 40 va un byte, `voidVaultInfo`. terra-plr lo lee como "desbloqueada" si no es cero y, al escribir, manda 0 o 1. El campo del juego puede ser un BitsByte: el significado de cada bit queda sin abrir. |

198 y 199 caen antes del 1.4.0.1 público (225). Un personaje 1.4 ya trae la bóveda.

### Buffs, spawn y el resto

Buffs: no hay antes del release 11. Diez hasta el 73, 22 del 74 al 251, 44 desde el 252. Cada uno es Int32 de tipo e Int32 de tiempo. El tiempo está en ticks del juego, 60 por segundo, según la conversión de terra-plr. El parche de 1.4.4 recorre 44, que es la rama `>= 252`. tModLoader escribe ceros en ese loop para no guardar buffs en el `.plr` vanilla: un `.plr` de tModLoader puede mostrar la mochila y traer los buffs vacíos. Los buffs de mods van al `.tplr`.

Spawns: se repite Int32 x. Si es -1, se acaba la lista. Si no, siguen Int32 y, Int32 id de mundo y el nombre del mundo. terra-plr no lee más de 200. El tope del juego no lo vimos escrito aparte.

| Campo | Desde | Notas |
| --- | --- | --- |
| Barra de acceso bloqueada | 16 | Bool. |
| Info en pantalla | 115 | 13 bools. El noveno lo descarta terra-plr ("sin uso"). El sentido de cada bool está invertido en ese lector (`true` en el archivo significa oculto). Después, Int32 de misiones del pescador. |
| Atajos de la cruceta | 164 | Cuatro Int32: arriba, derecha, abajo, izquierda. -1 es vacío. |
| Toggles del constructor | 164, y más en 167, 197 y 230 | Int32, en el orden de `read.rs` de terra-plr. En los que son un sí o un no, 0 es prendido. Desde el 164: regla, regla mecánica, pintura automática, otra vez pintura automática (pisa el mismo flag; el de colocar actuadores queda sin llenar), y la visibilidad del cable rojo, azul, verde y amarillo. Esa visibilidad no es un sí o un no: 0 brillante, 1 tenue, 2 clásico (`Visibility`). Desde el 167: mostrar cables y actuadores siempre, y la visibilidad de los actuadores. Desde el 197: reemplazo de bloques. Desde el 230: antorchas de bioma, que es el valor que el juego usa. No hay un `.plr` real en el repo para contrastar este orden. No vale un panel de "regla prendida" todavía. |
| Habló con el tabernero | 181 | Int32, 1 es sí. |
| Muerto, y timer de respawn | 200 | Un bool. Si está muerto, un Int32 de ticks a 60 por segundo. |
| Fecha del último guardado | 202 | Int64 de `DateTime.ToBinary` de .NET. No es un unix. La conversión está en la documentación de .NET. |
| Puntaje de golf | 206 | Int32. |
| Bool sin uso | 282 | terra-plr escribe falso y al leer lo tira. |
| Investigación de viaje | 218 | Int32 cantidad, y por cada una un string con el nombre interno del ítem (no el id numérico) y un Int32 con el conteo. |
| Ítems temporales | 214 | Un byte de flags. Bit 0 mouse, bit 1 investigación, bit 2 guía, bit 3 duende de reforge. Cada bit prendido va seguido de una ranura completa. |
| Poderes de viaje | 220 | Mientras un bool sea verdadero: Int16 de clave y un payload que depende de la clave. terra-plr solo conoce tres. 5 es un bool de modo dios. 11 es un bool de colocar lejos. 14 es un float del factor de aparición. Cualquier otra clave desincroniza, porque el payload desconocido no se saltea. Un lector tiene que parar ahí y avisar. Lo de antes (mochila, vida, spawns) ya está leído. |
| Vagoneta suprema | 253 | Un byte. El crate no se da ida y vuelta: escribe 2 para "apagada" y al leer trata como ausente todo valor con el bit 0 en cero. El significado queda sin confirmar. |
| Loadouts | 262 | Int32 del índice, y tres conjuntos. Cada conjunto trae ranuras con cantidad (no solo id y prefijo), en este orden: tres de armadura, siete accesorios, tres de vanidad, siete de vanidad, tres tintes, siete tintes, tres bools que se tiran, siete bools de accesorio oculto. |
| Voz | 280 | Un byte. La wiki dice que la voz se elige desde la 1.4.5.0. El `from_id` de terra-plr no coincide con su propio enum, así que el número de cada voz queda desconocido. |
| Tono de la voz | 281 | Float. |
| Reembolsos | 300 | Int32 cantidad y una ranura completa por ítem. Es territorio 1.4.5. |
| Diálogos de una vez | 310 | Int32 cantidad y un string por cada uno. También 1.4.5. |

Del release 319 en adelante (1.4.5.6 y siguientes, hasta el 326 de la 1.4.5.8) no hay compuertas publicadas. Si el juego solo agregó campos al final, el prefijo de arriba se puede leer y el resto se avisa como desconocido. Si metió un campo en el medio, el parseo se corre. Sin un `.plr` de esa versión no se puede saber cuál de las dos es.

## El .wld

No está cifrado. Se puede mirar el principio sin tocar AES.

### Cabecera de archivo y punteros

| Campo | Desde | Notas |
| --- | --- | --- |
| Release | siempre | Int32. |
| `relogic`, tipo, revisión, favorito | 135 | Igual que el personaje. Tipo 2 para un mundo. |
| Cantidad de secciones | 88 | Int16. 88 cae entre 1.2.2 (77) y 1.2.3 (93). Un mundo 1.2.0 a 1.2.2 no trae punteros. TEdit escribe 11 desde el release 220, y 10 antes. 220 cae antes del 1.4.0.1 público (225): un 1.4 trae 11. |
| Punteros | 88 | Un Int32 por sección, offset absoluto desde el byte 0. |
| Máscara de tiles con frame | 88 | Int16 con la cantidad de bits, y después esos bits redondeados a byte. Dicen qué tile guarda coordenadas de textura. Hace falta para leer bloques. No hace falta para saltearlos. |

Ludwig, para 1.3, cuenta 10 punteros y marca los últimos como sin uso. terraria-world, para 1.4.4.9, cuenta 11. TEdit hace lo mismo: 10 antes del release 220, 11 desde ahí. El número sale del archivo. No se hardcodea.

Con los once punteros de un 1.4 (release 220 o más), el orden de TEdit es este. terraria-world lista las mismas secciones: el encabezado de archivo es su sección 1 y el pie es la 12.

| Índice | Sección |
| --- | --- |
| 0 | Cabecera del mundo |
| 1 | Tiles |
| 2 | Cofres |
| 3 | Carteles |
| 4 | NPCs |
| 5 | Entidades (maniquí, marco, sensor) |
| 6 | Placas de presión |
| 7 | Casas del town |
| 8 | Bestiario |
| 9 | Poderes de viaje |
| 10 | Pie |

Ese orden es el de `SaveV2` en el `World.FileV2` que hoy lee la 1.4.5.8. 1.4.5 no agregó un puntero: sigue en 11, y el índice 1 sigue siendo tiles. Lo nuevo de esa versión entró en la cabecera. Si un release posterior mete una sección en el medio, los índices se corren. El salto seguro sigue siendo el puntero: el tamaño de cada sección, menos la última, es `puntero[i + 1] - puntero[i]`. El pie (índice 10) no tiene puntero siguiente y termina en el fin del archivo. Los poderes de viaje son el índice 9.

El pie no es un duodécimo puntero. En un archivo de 11, el puntero 10 apunta al byte donde empieza. TEdit lo lee así: un bool que tiene que ser verdadero, el nombre del mundo otra vez, y el Int32 del id. Si el nombre o el id no coinciden con la cabecera, el archivo está cortado o mal leído. Ludwig decía que el pie existía y no lo describía. terraria-world decía nombre e id, sin el bool.

### Cabecera del mundo

Es la sección 0. El orden es el de `LoadHeaderFlags` en TEdit: lee en secuencia y al final tiene que haber caído en el puntero de los tiles. Si sobran bytes antes de ese puntero, TEdit los guarda como cabecera desconocida y no los interpreta. Un lector de Savedeco tiene que hacer lo mismo. Si se pasa del puntero, leyó mal y corta.

TerraFirma lista casi los mismos campos hasta el release 227, con el release mínimo de cada uno. En tres puntos no coincide con TEdit, y seguimos a TEdit porque es el que comprueba la posición:

- La semilla del release 179 es un Int32, no un string. Desde el 180 es el string de siempre.
- El modo de juego, desde el 209, es un Int32: 0 normal, 1 experto, 2 maestro, 3 viaje. No es un byte. Reemplaza a los bools viejos. No se leen además. En el 208 el archivo trae un bool de maestro. Del 112 al 207, un bool de experto. Antes, no hay campo y el modo es normal. En la interfaz de 1.4, "normal" se llama Classic.
- El recaudador, los marcianos y el tiempo acelerado: TerraFirma dice 129, 131 y 128. TEdit los lee desde el 140. Un 1.3.0.1 es el 146, así que un mundo público de 1.3 los trae igual. No hay un juego público entre 128 y 140.

Para un 1.2 o más nuevo, TEdit lee sin volver a preguntar la versión: luna, árboles, cuevas, spawn, hora, día, fase, luna de sangre, eclipse, mazmorra, carmesí, los jefes clásicos, el pueblo, la invasión, la lluvia y los minerales. TerraFirma pone el eclipse en el 70 y la abeja reina en el 66. El 1.2.0 es el 67, así que la abeja entra y el eclipse queda justo en el borde. No abrimos un mundo 1.2.0 para separar esos dos.

| Campo | Desde | Notas |
| --- | --- | --- |
| Nombre | 0 | String. |
| Semilla | 179 | Int32 si el release es 179. String desde el 180. |
| Versión del generador | 179 | UInt64. |
| GUID | 181 | 16 bytes. |
| Id del mundo | 0 | Int32. |
| Límites | 0 | Cuatro Int32: izquierda, derecha, arriba, abajo. |
| Alto y ancho en tiles | 0 | Dos Int32, alto primero. |
| Modo | 112 / 208 / 209 | Ver arriba. Desde el 209 es Int32. |
| Semillas secretas | 222 en adelante | Bools, en este orden, cada uno desde su release: borracho 222, For the Worthy 227, aniversario 238, Don't Starve 239, Not the Bees 241, Remix 249, sin trampas 266. Zenith: TEdit lo escribe desde el 266 y al leer, si el release es menor a 267, lo calcula como Remix y borracho a la vez. Desde el 267 es un bool propio. Skyblock 302. |
| Creación | 141 | Int64 de `DateTime.ToBinary`. |
| Última vez jugado | 284 | Otro Int64. 284 cae en 1.4.5, después del 279. |
| Luna, árboles, cuevas, hielo, jungla, infierno | 1.2 en adelante | Byte de luna, tres X y cuatro estilos de árbol, tres X y cuatro estilos de cueva, tres Int32 de fondos. |
| Spawn, superficie, roca, hora, día, fase, luna de sangre, eclipse, mazmorra | 1.2 en adelante | Spawn y mazmorra son dos Int32. Superficie, roca y hora son Double. Día, luna de sangre y eclipse son bool. La fase es Int32. |
| Carmesí y jefes clásicos | 1.2 en adelante | Bools: carmesí, Ojo, Devorador o Cerebro, Esqueletrón, Abeja reina, Destructor, Gemelos, Esqueletrón mayor, cualquier mecánico, Plantera, Golem. |
| Rey slime | 118 | Bool. |
| Pueblo e invasiones tempranas | 1.2 en adelante | Duende y mago rescatados, mecánica, invasión duende, payaso, legión de escarcha, piratas. |
| Orbes, meteorito, altares, hardmode | 1.2 en adelante | Dos bools, un byte de orbes, Int32 de altares, bool de hardmode. |
| `PartyOfDoom` | 257 | Bool, justo después de hardmode. Es 1.4.4. El nombre visible en español no está en las fuentes. |
| Invasión | 0 | Int32 demora, Int32 tamaño, Int32 tipo, Double X. |
| Lluvia de slimes | 118 | Double. |
| Reloj de sol | 113 | Byte. |
| Lluvia y minerales | 1.2 en adelante | Bool, Int32 de tiempo, Single de intensidad, tres Int32 de mineral. |
| Estilos de fondo y viento | 1.2 en adelante | Ocho bytes de estilo, Int32 de nubes de fondo, Int16 de cantidad, Single de viento. |
| Pescadores del día | 95 | Int32 de cantidad y un string por cada uno. TEdit corta la cabecera acá si el release es menor. |
| Pescador rescatado | 99 | Bool. |
| Misión del pescador | 101 | Int32. |
| Estilista | 104 | Bool. |
| Recaudador | 140 en TEdit | Bool. TerraFirma dice 129. |
| Golfista | 201 | Bool. |
| Tamaño inicial de la invasión | 107 | Int32. |
| Demora del cultista | 108 | Int32. |
| Muertes | 109 | Int16 de cantidad y un Int32 por cada una. Desde el 289, otro Int16 y un UInt16 por estandarte reclamable. 289 es 1.4.5: si no se lee, el resto de la cabecera se corre. |
| Tiempo acelerado | 140 en TEdit | Bool. TerraFirma dice 128. |
| Fishron | 131 | Bool. |
| Marcianos, cultista lunático, Señor de la Luna | 140 en TEdit | Tres bools. TerraFirma los pone en 131, junto con Fishron. |
| Halloween y Navidad | 131 | Cinco bools: rey calabaza, árbol de luto, reina de hielo, Papá-NK1, árbol de Navidad. |
| Pilares | 140 | Ocho bools de pilar derribado y de barrera, y el bool del apocalipsis lunar. |
| Fiesta | 170 | Dos bools, Int32 de cooldown, Int32 de cantidad y un Int32 por NPC. |
| Tormenta de arena | 174 | Bool, Int32, dos Single. |
| Tabernero y Ejército del Viejo | 178 | Cuatro bools. |
| Fondos de 1.4 | mayor a 194, 215, 195 | Un byte de hongos si el release es mayor a 194. Un byte de inframundo desde el 215. Tres bytes más de árbol desde el 195. TerraFirma pone esos tres en el 196; seguimos a TEdit, que los lee desde el 195. |
| Libro de combate | 204 | Bool. |
| Noche de faroles | 207 | Int32 y tres bools. |
| Copas de los árboles | 211 | Int32 de cantidad y un Int32 por cada una. TEdit espera al menos 13 al guardar, pero lee la cantidad que diga el archivo. |
| Halloween y Navidad forzados | 212 | Dos bools. |
| Cobre, hierro, plata, oro | 216 | Cuatro Int32. |
| Gato, perro, conejo | 217 | Tres bools. |
| Emperatriz de la Luz, Reina slime | 223 | Dos bools. |
| Deerclops | 240 | Bool. 240 cae en el 1.4.3 público (242). |
| Slime azul desbloqueado | 250 | Bool. |
| NPCs desbloqueados | 251 | Ocho bools: mercader, demoledor, chica de la fiesta, tintorero, trufa, traficante de armas, enfermera, princesa. |
| Segundo libro de combate | 259 | Bool. |
| Alforja del vendedor ambulante | 260 | Bool. |
| Slimes de pueblo | 261 | Siete bools: verde, viejo, púrpura, arcoíris, rojo, amarillo, cobre. |
| Atardecer forzado y reloj lunar | 264 | Bool y un byte de cooldown. |
| Halloween y Navidad para siempre | 287 | Dos bools. 1.4.5. |
| Semilla vampiro | 288 | Bool. |
| Semilla infectada | 296 | Bool. |
| Lluvia de meteoritos y de monedas | 291 | Dos Int32. En el archivo van después de la semilla infectada, aunque el número sea menor. |
| Semilla de equipos | 297 | Un bool, y siempre después un byte de cantidad y por cada spawn dos Int16 (x, y). La cantidad no depende del bool. |
| Mazmorras dobles | 304 | Bool. |
| Más rayos, sin rayos | 323 | Dos bools. 323 es 1.4.5, después del 318. |
| Entero tirado | 299 a 312 | Un UInt32 que TEdit descarta. En el 313 ya no está. |
| Manifest | 299 | String, al final de la cabecera. |

Lo que venga entre el manifest y el puntero de los tiles es cabecera que este loader no nombra. Se conserva el largo y no se parsea.

El ancho y el alto alcanzan para decir si el mundo es chico, mediano o grande, sin leer un solo tile.

### Lo que conviene no decodificar

Tiles. Van por columnas, de arriba abajo, con RLE vertical. Ludwig dice que un tile de 1.3 ocupa entre 1 y 13 bytes. osbm muestra una columna de aire de 1200 tiles en 3 bytes (`80 AF 04`: el bit de RLE largo y un largo de 1199, más el tile actual). Un mundo jugado no es una columna de aire.

Tamaños del mapa, de la wiki. Un tile son dos pies. El área jugable deja 40 tiles de margen por lado.

| Mundo | Tiles | Área |
| --- | --- | --- |
| Chico | 4200 × 1200 | 5 040 000 |
| Mediano | 6400 × 1800 | 11 520 000 |
| Grande | 8400 × 2400 | 20 160 000 |

Un mediano creado por el servidor con `autocreate` mide 6300 de ancho, no 6400. Lo dice la wiki.

No medimos `.wld` reales en esta corrida. La cota de arriba, si cada tile costara 13 bytes, es del orden de 65 MB en un chico y 260 MB en un grande. Con RLE baja mucho. Un hilo público describe un mundo jugado de unos 10 MB, y el zip de ese archivo en unos 4 MB. Es un caso, no una tabla chico/mediano/grande. El puntero de la sección de tiles da el tamaño real sin parsearla.

Cofres, carteles, NPCs, bestiario y casas son chicos al lado de los tiles. Igual llevan tope: en la 1.4.0.1 el juego subió el límite de cofres colocados de 1000 a 8000, y `DefaultMaxChests` de TEdit quedó en 8000. Un Int16 de cantidad disparatado se rechaza. Los poderes de viaje del mundo los carga TEdit en `CreativePowers.Load`. El formato de esa clase no lo abrimos campo por campo. Se saltean con el puntero.

Para una notebook, el camino barato es leer hasta el fin de la cabecera del mundo (el offset del primer puntero de tiles) y reportar el tamaño de las otras secciones. No hace falta cargar el archivo entero: con el principio alcanza para leer los punteros, y después se pide solo el rango de la cabecera. El `FileReader.readAsText` de la página de hoy no sirve. Un `.wld` pasado por `String()` se rompe, y el tope de 4 millones de caracteres rechaza un mundo mediano. El lector futuro tiene que entrar por `ArrayBuffer` y por rangos.

## Qué se puede mostrar, y a qué costo

Personaje, después de un AES de un archivo chico. En el navegador es un descifrado y un recorrido lineal. No es un problema de notebook.

| Panel | Datos | Costo |
| --- | --- | --- |
| Resumen | Nombre, dificultad, tiempo, vida y maná, release | El principio del archivo |
| Equipo | Armadura, accesorios, vanidad, tintes, mascota, luz, vagoneta, montura, gancho. Ids y prefijos | Fijo |
| Mochila | 50 ranuras, monedas, munición, favoritos | Fijo |
| Baúles | Chanchito, caja fuerte, forja, vacío | Fijo, 160 ranuras en 1.4 |
| Lugar | Spawn por mundo | Corto, con tope 200 |
| Hitos | Corazón de demonio, Ejército del Viejo, mejoras permanentes, pescador, recaudador, muertes, golf | Unos bools y enteros |
| Viaje | Cuántos ítems investigó, y los nombres internos si se quieren listar | Crece con la investigación. Sigue siendo chico |
| Buffs | Id y segundos | 44 enteros |

Los loadouts extra son otro panel, solo desde el release 262. Los toggles del constructor y la voz no van a un panel hasta contrastarlos con un save.

Mundo, sin tiles:

| Panel | Datos | Costo |
| --- | --- | --- |
| Resumen | Nombre, semilla, ancho, alto, modo, carmesí o corrupción, hardmode, hora | Cabecera |
| Jefes y eventos | Los bools de la cabecera, Deerclops incluido, y las semillas secretas | Cabecera |
| Pueblo | NPCs rescatados, fiesta, faroles | Cabecera |
| Secciones | El tamaño de cada puntero, para mostrar "los bloques ocupan N MB y no los leímos" | Unas decenas de bytes |
| Cofres | Posición, nombre y contenido | Sección aparte, con tope |
| Bestiario | Muertes y vistos, por nombre interno de NPC | Sección aparte |

Carteles y tiles quedan afuera de la primera lectura. Un cartel es texto libre y puede ser largo. Los tiles son el archivo.

Los nombres de ítems, prefijos, buffs y NPCs salen como número, o como el string interno cuando el archivo ya lo trae (investigación, bestiario, NPC viejo). El nombre visible en español es el pendiente de abajo.

## Cómo detectarlo

La página de hoy le pasa un string a `detectar`. Estos archivos son binarios. La detección tiene que ver los bytes, y el nombre del archivo si el usuario lo subió.

`.wld`, en claro:

1. Int32 de release entre 1 y 400, para dejar afuera un texto cualquiera. 326 es el 1.4.5.8. Un margen hasta 400 cubre un hotfix próximo sin aceptar basura.
2. Si el release es 140 o más, los 7 bytes siguientes son `relogic` o `xindong`, y el tipo es 2. Confianza alta. Entre 135 y 139 no hay un juego público: terra-plr ya esperaría magic y TEdit todavía no.
3. Si el release es de un 1.2 conocido (67 a 102) y no hay magic, confianza baja: un binario cualquiera puede empezar con ese entero. Recién sube si el string del nombre parsea.

`.plr`:

1. El largo es múltiplo de 16, y está bajo la cota (2 MB).
2. Se descifra con la clave de arriba. Si el PKCS7 falla, no es un personaje, o alguien lo regrabó sin padding.
3. El plano se detecta igual que el mundo, con tipo 3. Un 1.2 descifrado no trae magic: el release conocido y un nombre corto alcanzan, porque el cifrado ya filtró el ruido.

`.tplr` y `.twld`:

Si el nombre termina así, se rechaza con un mensaje claro, aunque el personaje vanilla esté en el `.plr` de al lado. En 1.3, `PlayerIO` trata el archivo como gzip si arranca con `1F 8B`, y si no, lo manda a un loader viejo. `TagIO.ToStream` comprime con gzip por defecto. En 1.4 el guardado sigue pasando por `TagIO`. No abrimos un `.tplr` de 1.4.5 byte a byte: alcanza la extensión.

El magic gzip solo, sin la extensión, no alcanza para acusar a tModLoader. Cualquier gzip empieza igual.

`.bak`: mismo formato que el archivo sin el sufijo. Se puede ofrecer como "copia anterior".

`.map`: no es un personaje ni un mundo. Mensaje de que es el minimapa y que no lo leemos.

Mensaje para un `.tplr` o `.twld`: es un archivo de tModLoader con los datos de los mods. Para ver el personaje o el mundo hace falta el `.plr` o el `.wld`. Los ítems de mods, en ese `.plr`, van a verse vacíos: tModLoader escribe el id vanilla en cero cuando el ítem es de un mod.

Mensaje para un 1.2, si el lector todavía no implementa esas compuertas: reconocemos un save de Terraria 1.2. Esta versión del lector no lo abre.

Un release mayor que 318 se lee con las reglas conocidas y se avisa. Es el mismo criterio que Cookie Clicker con una versión más nueva. Si al leer la cabecera del mundo nos pasamos del puntero de tiles, se corta y se avisa, en vez de mostrar jefes corridos.

## Nombres de ítems, jefes y buffs

En el archivo casi todo es un id. Los jefes del mundo son la excepción: son bools con nombre en la tabla de TerraFirma, y esos nombres sí se pueden mostrar.

Los ids numéricos no traen el texto. De dónde sacarlo:

| Fuente | Licencia | Sirve |
| --- | --- | --- |
| Wiki oficial, páginas de ids | CC BY-NC-SA 3.0, y el contenido del juego es de Re-Logic | Para mirar. No para copiar la tabla al repo: el NC no entra en un proyecto que no controle el uso, y el texto de la wiki obliga a compartir igual. |
| `ItemID` / `BuffID` dentro de tModLoader | El loader es MIT. Esas constantes son nombres del juego, decompilados | No las copiamos. |
| `items.json` y compañía en TEdit | GPL-3.0 | Citar un id suelto está bien. Copiar el JSON al repo nos dejaría el lector bajo GPL. No va. |
| Nombres internos en el propio save | Los escribe el juego en la investigación y en el bestiario | Se pueden mostrar crudos, como "IronPickaxe", sin traducir. |

Pendiente: un catálogo chico, escrito a mano, de los ids que más se ven (minerales, armas de progresión, buffs de poción), o mostrar el número y listo. Los nombres en español salen de la localización del juego, que también es de Re-Logic. Mismo pendiente.

## Qué falta antes de escribir el lector

- Aceptar `ArrayBuffer` en la página. Hoy el archivo entra por `readAsText` y hay un tope de 4 millones de caracteres pensado para un export de texto.
- Probar el parseo contra un `.plr` y un `.wld` reales de 1.4.4.9 y de 1.4.5, que esta corrida no pudo guardar en el repo. El orden de secciones de la 1.4.5.8, en el TEdit de hoy, sigue siendo el de 11 punteros con los tiles en el índice 1.
- Decidir si un 1.3 se lee con las mismas compuertas o se rechaza con el mensaje amable. El formato da para leerlo. Es más código.
- Dejar los tiles sin parsear. Mostrar el tamaño.
- No prometar nombres de ítems en la primera versión.
