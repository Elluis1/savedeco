# Bitácora

Entradas nuevas arriba. Cada una dice la fecha, quién la hizo, qué cambió, el PR y qué sigue.

## 2026-10-21 — Revisión del PR 10

Revisión independiente del formato de Kittens Game. El test sintético sigue verde y la rama no tiene conflictos con main. En la misma rama corregí citas que no coincidían con el commit `781e379`:

- `version.json` sí está en el árbol y trae `1.6.1.6`. El `1.6.1.0` de `index.html` es la reserva.
- Conteos del catálogo: 62 tecnologías, 64 políticas (dos están comentadas y no cuentan), 143 mejoras del taller, 21 insignias (faltaba `soLongAndThanksForAllTheHay`) y los pactos `payDebt` y `fractured`.
- El nombre largo del archivo también recibe el día. El LCG de la semilla arranca en `(seed + 1) % 2147483647`. Si el nombre o el apellido no están en la lista, se guardan los dos.
- Los temas de fábrica son `defaultSchemes` más el resto de `schemes` en `config.js`, no solo los diez primeros.
- El port lleva el encabezado WTFPL-2.0 del 1.4.4. El tag 1.5.0 es MIT en el archivo `LICENSE`. El repo actual es 2.0.0-rc.3.

PR: https://github.com/Elluis1/savedeco/pull/10

Próximos pasos: los mismos de la entrada de abajo.

## 2026-10-21 — Investigador de formatos

Investigué el export de Kittens Game en el fuente público, commit `781e379` de [nuclear-unicorn/kittensgame](https://github.com/nuclear-unicorn/kittensgame) (31 de agosto de 2026). El documento está en [docs/FORMATOS/kittens-game.md](FORMATOS/kittens-game.md). El lector no se escribió: esta corrida es la investigación.

Qué quedó:

- Tres sobres del mismo JSON. El portapapeles y el archivo son `LZString.compressToBase64`. `localStorage` guarda el JSON pelado, o `LZString.compressToUTF16` si el `stringify` pasa de 5 millones de caracteres o si `forceLZ` está prendido. La nube manda ese UTF-16.
- El objeto, manager por manager: recursos, aldea y gatitos (el `ssn` empaqueta nombre, apellido, edad, rasgo, color, variedad y rareza), calendario, edificios, ciencia, taller, diplomacia, religión, espacio, tiempo, desafíos, prestigio, logros, estadísticas y void. `migrateSave` lleva un save sin versión hasta el esquema 15, con un hueco en el 7. El `1.6.1.6` del changelog es la versión del juego y no viaja en el archivo.
- Cómo se separa de Cookie Clicker (cierra con `!END!`) y de Trimps (después de abrir, `global` contra `saveVersion`). El detector de Cookie Clicker que ya está devuelve menos de 0,5 con los tres sobres.
- Un port vanilla de LZString 1.4.4 para el test. La licencia de esa versión es WTFPL-2.0. El 1.5.0 publica MIT y en las muestras escribió la misma cadena. El juego es WET PAWS: no se copió código ni las traducciones.
- `tests/kittens-game.test.js` arma el JSON en memoria, hace la ida y vuelta de la compresión contra la cadena del 1.4.4 y distingue los sobres. No hay un save real con licencia libre.

Tamaños de un catálogo sintético en cero: 22 KB de JSON y 6,5 KB de Base64 sin gatitos. Con 40.000 gatitos comprimidos, 3,1 MB de JSON y 142 KB de Base64. Entran en el tope de la página.

PR: https://github.com/Elluis1/savedeco/pull/10

Próximos pasos: el lector de Kittens Game (detectar, el port en un módulo de la página, paneles con el `name` interno). La próxima investigación de formato es Trimps. El lector de Terraria sigue esperando el camino de bytes.

## 2026-10-20 — Revisión del PR 9

Revisión independiente del reuso del plano. El texto guardado se compara con el que pide `decodificar`: si es otro, se abre de nuevo y no se devuelve la panadería anterior. Una llamada suelta, sin un `detectar` en el mismo turno, abre el código ella misma. Si nadie pide el plano, el microturno siguiente lo suelta y no queda el string retenido.

El test nuevo cronometraba medianas y exigía que el botón quedara bajo el 80% de la suma. En un CI cargado eso falla en falso. Ahora cuenta las aperturas de `abrirCodigo`. También traje `main` a esta rama: la bitácora y los casos hostiles de la segunda pasada de Romper estaban en los dos lados.

PR: https://github.com/Elluis1/savedeco/pull/9

Próximos pasos: los mismos de la entrada de abajo.

## 2026-10-20 — Rendimiento

Medí de nuevo, con el script ampliado: además de peso, primer render y decodificación, ahora toma el HTML de cada panel (parcela, minijuegos, bolsa), la apertura de la lista de plantas y el armado de texto, CSV y JSON. La página pesa 183 KB (58 KB gzip). Creció desde el 19 por los minijuegos, la exportación y el CSS de la parcela, no por esta pasada. El primer pintado sigue en unos 40 ms. El fixture de Elluis se decodifica en 0,65 ms. La parcela son 36 casilleros y 0,1 ms de layout.

Lo que valía la pena: el botón abría el base64 dos veces, una en `detectar` y otra en `decodificar`. En el sintético de 400 KB escapado el botón pasó de 9,9 ms a 6,5 ms. En una basura de 2 MB, de 33 ms a 22 ms, y no retiene el string (menos de 1 KB). El fixture no se nota: abrir el código son 0,07 ms. El plano se guarda solo para esa lectura y se suelta en el microturno.

Miré y no toqué el mosaico (ya es barato) ni sacar los 1.240 nombres del HTML inicial: a CPU 4× el frame bajaría de 143 ms a 119 ms, y abrir la lista ya está en dos frames.

PR: https://github.com/Elluis1/savedeco/pull/9

Próximos pasos: si en una notebook de verdad el primer pintado de los paneles se siente, recién ahí conviene no meter los nombres en el DOM hasta abrir la lista. El JSON de Elluis pesa 508 KB; armarlo son 3 ms, así que el candidato sería achicar el pretty-print si alguien lo abre y le pesa. Con un segundo lector, cargarlo al decodificar.

## 2026-10-20 — Revisión del PR 8

Revisión independiente de la segunda pasada de Romper. Los tests que ya estaban seguían verdes. En la misma rama, dos correcciones chicas:

- Si el jardín no se interpreta, el mosaico ya no dice que la partida no trae casilleros. La nota explica el motivo y el hueco dice que no dibujo la parcela.
- Un nivel de granja con decimales ya no tira al calcular qué casilleros están abiertos. Se trunca, igual que al leer el edificio.

La partida de Elluis sigue sin avisos nuevos.

PR: https://github.com/Elluis1/savedeco/pull/8

## 2026-10-20 — Romper

Segunda pasada de casos hostiles. En main no hay lector de Terraria: el formato sigue documentado y el único lector es Cookie Clicker. Esta vez el foco fue lo que entró después de la primera pasada: la descarga, los minijuegos y el mosaico de la parcela. Los casos grandes se arman en memoria, en `tests/romper.test.js`. Los tests viejos siguen.

Qué se rompía:

- Un nombre de panadería que arranca con un espacio unicode (ideográfico, em, ogham) o con un separador de línea (`U+2028`, `U+2029`, `U+0085`) y después un `=` no llevaba el apóstrofo del CSV. Excel lo podía tomar como fórmula. El mismo separador partía una fila del CSV y, en el Markdown, metía un título nuevo en el medio de la partida.
- El `U+0085` quedaba en el nombre del archivo. No es un carácter de control ASCII, así que el filtro de Windows no lo veía.
- Una parcela de 37 casilleros se rechazaba con el aviso de "texto demasiado largo", que no es lo que pasaba. Una planta con id inexistente, una edad fuera de 0 a 100 o un nivel de granja negativo se mostraban como si cerraran.
- En el panteón, cualquier id negativo se veía como ranura vacía. `-2` no es el `-1` del fuente.
- El grimorio aceptaba magia y hechizos negativos sin avisar. La bolsa hacía lo mismo con un stock negativo, un modo que no existe o una operación que no existe. Cuarenta y un bienes también caían en el aviso de texto largo.
- Un mosaico de miles de casilleros se dibujaba entero. En la descarga, también. Vacío ya avisaba.
- Un temporizador de veinte dígitos se leía como "1e18 días".

Qué hace ahora:

- El CSV trata como invisibles los espacios unicode y los separadores de línea, y cita la celda si adentro hay un salto de esos. El Markdown los aplana a un espacio, así que no abren una línea nueva. El nombre del archivo también los saca.
- Más de 36 casilleros no se interpretan, con un aviso que nombra la parcela de 6 por 6. Una planta desconocida, una edad fuera de rango, un nivel negativo o una cantidad desmedida se muestran y se avisan. En el panteón solo `-1` es ranura vacía.
- Más de 40 bienes no se leen. Un texto de minijuego de más de 4.000 caracteres (una bolsa de cientos de miles de bienes) se rechaza antes de partirlo.
- Un mosaico de más de 256 casilleros no se dibuja ni se baja. Uno vacío sigue avisando.
- Un tiempo que pasa de 10^12 segundos dice "un tiempo desmedido".

Una partida de Elluis no gana avisos nuevos. `NaN` e `Infinity` en un minijuego siguen sin interpretarse. Un `|` en el nombre de la panadería parte el save como lo haría el juego y termina en el error de código truncado, sin excepción.

PR: https://github.com/Elluis1/savedeco/pull/8

Próximos pasos: el resto de la tabla de estadísticas de Cookie Clicker, y el lector de Terraria cuando haya un camino de bytes y fixtures. Sigue sin haber lector de Terraria en main.

## 2026-10-20 — Paneles: la parcela del jardín

Diseño de paneles. Antes de elegir miré la página con la partida de Elluis, incluidos los paneles nuevos de Minijuegos, Jardín y Bolsa. El jardín ya traía fila, columna, etapa y si el casillero está abierto, pero en la página era una tabla de las plantas solas. Los hoyos vacíos y los cerrados quedaban solo en la descarga, y no se veía la parcela.

Elegí esa grilla y no un modo claro, una portada ni un gráfico de la bolsa. La bolsa ya se lee en una tabla de 18 bienes. La parcela es el dato que la pantalla tiraba.

Qué quedó:

- Un mosaico genérico en el núcleo, dibujado con CSS. No suma librerías. El jardín lo usa como grilla de 6 por 6, en el orden del save.
- Cada casillero dice el lugar, la planta o si es hoyo vacío o cerrado, la etapa y la edad. El color acompaña la etapa; el nombre de la etapa también está escrito.
- La tabla de plantas sigue, plegada, para leer la edad sin recorrer la grilla.
- La descarga de Cookie Clicker no cambia. Si un lector no arma la suya, el mosaico se baja como tabla.

PR: https://github.com/Elluis1/savedeco/pull/7

Revisión: el corte de las etapas es el de `tileTooltip` y cerrado es el casillero que `isTileUnlocked` no abre. En la misma rama, la grilla angosta ya no se ensancha por el marcador de la lista, la etapa entra en el casillero, el puntito apagado se distingue del fondo, la muestra de hoyo y cerrado sigue punteada, y un mosaico vacío avisa en la descarga.

Próximos pasos: la bolsa se podría leer más rápido con una barra por bien, si en alguna partida los valores se pisan. Sigue pendiente el resto de la tabla de estadísticas de Cookie Clicker, y el lector de Terraria cuando haya fixtures.

## 2026-10-20 — Revisión del PR 6

Revisión independiente de los minijuegos. El string coincide con `M.save` / `M.load` y los nombres, con la loc ES. Una corrección chica en la misma rama:

- El bien de la panadería arma el nombre con `replaceAll`. Si ese nombre traía `$&` o `$'`, el texto del save se deformaba. El reemplazo ahora es literal. En el HTML sigue escapado.

PR: https://github.com/Elluis1/savedeco/pull/6

Próximos pasos: los mismos de la entrada de abajo. El resto de la tabla de estadísticas de Cookie Clicker, y después el lector de Terraria.

## 2026-10-20 — Lectores: minijuegos de Cookie Clicker

Elegí Cookie Clicker y no Terraria. El formato de Terraria ya está en main, pero el lector de Cookie Clicker todavía tenía un avance terminable y verificable: los minijuegos. El string vive en el quinto campo del edificio y `M.save` / `M.load` están en el fuente público (`minigameGarden.js`, `minigameMarket.js`, `minigamePantheon.js`, `minigameGrimoire.js`). La partida de Elluis trae los cuatro, así que los tests afirman valores concretos. Lo que queda de nombres (fondo, leche, auras, etapa del dragón, genes de Tú) y el resto de la tabla de estadísticas no entra en esta corrida: o no está mapeado, o es otro corte.

Qué quedó:

- El jardín (suelo, cosechas, sacrificios, semillas y la parcela con etapa), el panteón (ranuras y cambios de culto), el grimorio (magia y hechizos) y la bolsa (oficina, brókers, beneficios y cada bien).
- Los nombres salen de la loc oficial en español. El modo de cada bien usa la etiqueta que el fuente tiene comentada en el gráfico y no muestra en pantalla.
- Un texto que no tiene esa forma se deja sin interpretar y se avisa. Un campo vacío no avisa.
- La descarga suma esas secciones. Los paneles nuevos son Minijuegos, Jardín y Bolsa.
- Lo comprobé en el navegador con la partida de Elluis: 16 plantas en el jardín, 18 bienes en la bolsa, Vomitrax en el rubí y Godzamok en el jade.

PR: https://github.com/Elluis1/savedeco/pull/6

Próximos pasos: el resto de la tabla de estadísticas de Cookie Clicker que el formato ya nombra y todavía no se extrae (pactos, devoradores, Papá Noel, renos, bóveda, volúmenes). Después, el lector de Terraria, por bytes, con fixtures sintéticos hasta que aparezca un `.plr` y un `.wld` reales. Sigue pendiente el pedido a Luigi de un save real.

## 2026-10-20 — Revisión del PR 5

Revisión independiente del formato de Terraria. Correcciones chicas en la misma rama, contra TEdit, el parche de tModLoader 1.4.4, terra-plr 0.3.0 y la wiki:

- Entre la munición y el chanchito faltaban las ranuras sueltas (mascota, luz, vagoneta, montura y gancho, cada una con su tinte). Sin eso, un lector se desfasaba después de la mochila.
- El favorito de la mochila y el de la bóveda van pegados al prefijo de cada ranura. Quedó escrito así para que no se lean como una lista al final.
- Los toggles del constructor quedaron en el orden de `read.rs` de terra-plr. La visibilidad de los cables es 0 brillante, 1 tenue, 2 clásico.
- El release 315 también es el de la 1.4.5.1. Los tres bytes extra de árbol los lee TEdit desde el 195; TerraFirma dice 196.
- El pie es el puntero 10 y termina en el fin del archivo. terraria-world lo numera como sección 12.
- El tope de cofres lo subió el juego en la 1.4.0.1 (de 1000 a 8000). TEdit lo refleja en `DefaultMaxChests`.
- La clave y el Kaitai quedaron con link. El test ahora traba el PKCS#7 (29 bytes de plano, 32 cifrados), el UTF-16BE y un IV de ceros.

PR: https://github.com/Elluis1/savedeco/pull/5

## 2026-10-20 — Formato de Terraria

Investigador de formatos. No hay lector nuevo: esta corrida deja documentado el save de Terraria, que es la segunda prioridad y no estaba en el roadmap.

Qué quedó:

- `docs/FORMATOS/terraria.md`. El `.plr` se descifra con AES-128-CBC, PKCS#7, clave `"h3y_gUyZ"` en UTF-16LE usada también como IV. Web Crypto lo acepta tal cual. El `.wld` va en claro, con punteros para no leer los tiles. Los campos que no cierran contra una fuente quedan como desconocidos.
- `tests/terraria-cifrado.test.js`. Arma un `.plr` mínimo en memoria y lo abre con `globalThis.crypto.subtle`. No se commiteó un save real: no apareció uno con licencia libre.
- El roadmap suma la viabilidad de Terraria y deja Kittens Game como el próximo juego a investigar.

PR: https://github.com/Elluis1/savedeco/pull/5

Próximos pasos: el lector de Terraria, cuando se encare, entra por bytes y no por el `readAsText` de hoy. Antes hace falta un `.plr` y un `.wld` reales. La próxima investigación de formato es Kittens Game.

## 2026-10-19 — Revisión del PR 4

Revisión independiente de la descarga. Correcciones chicas en la misma rama:

- Un `|` en el nombre de un mod (el save lo guarda como `[P]`) se escapaba dos veces en la tabla de Markdown y la columna se partía.
- El CSV no neutralizaba una fórmula si delante tenía espacios, un nulo, un espacio de ancho cero o un salto. Ahora el apóstrofo también cubre ese caso.
- El nombre del archivo, además de lo que Windows rechaza, deja afuera el ancho cero y las marcas que invierten el texto. Si no, un nombre de panadería podía disfrazar la extensión.
- Una estadística de más, si venía después de un campo vacío, se numeraba mal. El #56 sigue siendo el #56. Un punto y coma de más, sin valor, no avisa.
- El JSON de un campo enorme podía pasar el tope de 4 millones. Ahora se achica hasta entrar, y lo avisa.
- La nota de las mejoras ya no usa "desbloqueada" para dos cosas distintas. El resumen cuenta el bit, compres o no. En la tabla, ese estado es la que está a la vista y sin comprar.
- Los encabezados del CSV que ve Excel quedaron en español (`valor legible`, `valor exacto`).
- Los pesos que se habían anotado (89 167 B, 81 171 B y 454 233 B) no coincidían con una medición nueva. La entrada de la exportación quedó con texto 75 257 B, CSV 66 699 B y JSON 197 022 B. Armar los tres tarda unos 28 ms. La página queda en 141 372 B (45 807 B gzip).

PR: https://github.com/Elluis1/savedeco/pull/4

## 2026-10-19 — Exportar la partida

Luigi pidió poder guardarse toda la estadística, en texto o en Excel, para tenerla o pasársela a una IA. La descarga se arma en el navegador. No se sube nada y no se toca el save.

Qué quedó:

- El núcleo (`js/nucleo/exportar.js`) arma tres archivos a partir de un documento genérico: un `.txt` en Markdown, un CSV con BOM y punto y coma (Excel en español, una tabla por sección) y un JSON con los mismos datos.
- Si el lector expone `armarExportacion`, se usa eso. Si no, salen los paneles. Un lector nuevo lo hereda sin escribir la descarga.
- Cookie Clicker llena el documento con el resumen, los edificios, los logros y las mejoras (conseguidos y faltantes, con nombre), el prestigio, los efectos, los mods y los ids que no tienen nombre (fondo, leche, auras, apariencia de Tú). Las notas dicen qué es cada cosa y qué queda desconocido.
- Los números grandes van legibles y también exactos. Si no entran en un entero seguro, el exacto es la notación científica del float del save.
- El nombre del archivo lleva la panadería y la fecha UTC, sin caracteres que Windows rechaza.
- El tope sigue en 4 millones de caracteres. Por encima, el archivo se corta y lo avisa.
- Los botones están debajo del aviso de partida leída: Texto para una IA, Excel (CSV) y JSON. La bajada usa `Blob` y `URL.createObjectURL`. La CSP no se tocó.

En la partida de Elluis el texto pesa 75 257 B, el CSV 66 699 B y el JSON 197 022 B (643 logros y 875 mejoras, con nombre). Armar los tres tarda unos 28 ms.

PR: https://github.com/Elluis1/savedeco/pull/4

Próximos pasos: los de antes (minijuegos, auras y fondos con nombre, un segundo lector). La exportación ya la hereda el que venga.

## 2026-10-19 — Revisión del PR 3

Revisión independiente de la medición y de la lista en una columna. Correcciones chicas en la misma rama:

- El párrafo de Adolphus está en el puesto 217 de los 523 logros. El índice de la lista es 216; la nota de rendimiento decía 216.
- Quedó un test que lee el CSS y no deja volver a poner `columns` en `.lista-nombres ul`. El alto máximo sigue en 16rem.
- `scripts/medir.mjs` resuelve la carpeta del repo con `fileURLToPath`. Con el `pathname` pelado, en Windows la ruta salía mal y la medición ni arrancaba.

PR: https://github.com/Elluis1/savedeco/pull/3

## 2026-10-19 — Rendimiento

Medí peso, primer render, memoria y decodificación. El script quedó en `scripts/medir.mjs` (`node --expose-gc scripts/medir.mjs`). Los saves grandes se arman ahí, en memoria.

En la VM de la medición (Xeon de 4 núcleos, 16 GB, Node 22, Chrome 154 headless) la página pesa 97 KB (34 KB gzip), el primer pintado anda en 32 ms y el fixture de Elluis se decodifica en 0,5 ms. Un sintético de 400 KB tarda unos 10 ms. Nada de eso pedía un cambio: el `TextDecoder` del base64 ya estaba desde la pasada de casos hostiles.

Lo que sí se disparaba era abrir la lista de logros. `columns: 2` balancea las columnas y el logro largo de Adolphus (688 caracteres) la llevaba a 172 ms de mediana con el CPU al 4× (muestras 231, 172 y 155). La lista de mejoras, sin ese texto, se quedaba en 34 ms. Saqué las columnas. La misma apertura quedó en 61 ms (104, 60 y 61). A velocidad normal de esta máquina las dos listas ya estaban en ~32 ms y siguen ahí. El peso pasó de 96 698 B a 96 831 B por el comentario del CSS. Los números están en `docs/RENDIMIENTO.md`.

PR: https://github.com/Elluis1/savedeco/pull/3

Próximos pasos: si un save real se nota, abrir el base64 una sola vez en el camino del botón (hoy `detectar` y `decodificar` lo hacen cada uno; en el de 400 KB son unos 10 ms). Con un segundo lector, cargarlo al decodificar.

## 2026-10-19 — Revisión del PR 2

Revisión independiente de los casos hostiles del lector de Cookie Clicker. Correcciones chicas en la misma rama:

- La bóveda (`Game.vault`, campo 47, ids separados por coma) no es un número. Con unas 26 mejoras de tres dígitos pasa los 100 caracteres y el lector avisaba que había dejado una estadística en cero, aunque las galletas se leían bien. El aviso ahora solo sale si un campo que de verdad leemos como número no entra. Una bóveda con las 876 mejoras de la loc sigue leyéndose.
- Un `%XX` del `escape` del juego partido por un salto o un espacio de ancho cero se limpia antes de `decodeURIComponent`. Antes eso tiraba y una partida válida se veía dañada.
- La nota del formato ahora dice los topes reales: 80 edificios, 20.000 bits, 80 efectos, 200 mods y 30 `|`.

Una 2.053 cargada entra: la de Elluis tiene 20 edificios, 1.750 bits de mejoras y 643 de logros, y un armado con minijuegos y la bóveda llena tampoco avisa. Una versión más nueva que 2.053 avisa y se lee con las reglas actuales.

PR: https://github.com/Elluis1/savedeco/pull/2

## 2026-10-19 — Romper

Pasada de casos hostiles sobre el lector de Cookie Clicker, que es el único que hay en main. Los tests nuevos están en `tests/romper.test.js` y corren con `node --test`. Los casos grandes y los binarios se arman en el test: no se commitean archivos pesados.

Qué se rompía:

- Una fecha fuera del rango de `Date` (por ejemplo un `1` seguido de 17 ceros) tiraba `RangeError` al dibujar el panel. El `catch` volvía a llamar a `toISOString`, que también tira, así que la página caía en el aviso genérico y no mostraba el resto.
- Un export válido con un espacio de ancho cero (típico de copiar desde la web) se leía como dañado.
- Un `!END!` cortado por un salto (`!\nEND!` o `%21\nEND%21`) se leía, pero avisaba que faltaba el cierre.
- Un bitfield, una lista de edificios o un JSON de mod de cientos de miles de ítems se materializaba entero. En el navegador eso es una pestaña colgada.
- Una versión futura (3.x, o 2.060) se mostraba como si la conociéramos, sin aviso.
- El base64 a UTF-8 armaba un arreglo de strings `%xx` por cada byte. Cerca del tope de 4 millones de caracteres, un texto que ni era una partida se iba a más de 150 MB de heap.

Qué hace ahora:

- La fecha imposible se ve como "desconocida" y hay un aviso. El resto de la partida se muestra.
- En el sobre se ignoran los espacios de ancho cero, y el cierre se reconoce aunque venga partido por un salto.
- Por encima de un tope holgado (muy por arriba de una partida real: 80 edificios, 20.000 bits, 200 mods) la sección se rechaza con un mensaje. El JSON de un mod demasiado grande o anidado se cuenta y no se parsea. La lista de nombres del panel se corta en 1.500; el conteo sigue siendo el total.
- La versión más nueva que 2.053 avisa y se lee con las reglas actuales.
- El base64 se decodifica con `TextDecoder`, sin el arreglo intermedio.
- Los textos de error, los avisos y los paneles escapan `<`, `>` y comillas. Eso ya pasaba: quedó trabado con tests.

No apareció otro lector en main. Un JSON al estilo Kittens, una cabecera binaria, UTF-16 y un base64 con barras que no tiene forma de partida siguen en "no reconocí este texto", sin que Cookie Clicker se los quede.

PR: https://github.com/Elluis1/savedeco/pull/2

Próximos pasos: los de antes (minijuegos, auras y fondos, un segundo lector). Esta pasada deja la red para maltratar al que ya está.

## 2026-10-19 — Revisión del PR 1

Revisión independiente del primer lector, comparando contra `Game.WriteSave` / `Game.LoadSave`. Correcciones chicas en la misma rama:

- Un save anterior a la 1.035 ya no corre los ids de mejoras, logros y edificios cuando hay un hueco vacío.
- El logro largo de Adolphus W. Green muestra `&`, no la entidad `&amp;`.
- Una celda de tabla con texto plano se ve, y se escapa igual que el resto.
- Un código o un archivo de más de 4 millones de caracteres se rechaza antes de parsearlo.
- El aviso de error usa el mismo escape que los paneles. El formulario no manda el código por GET si el JavaScript no llega a engancharse.
- La tabla de estadísticas del formato ya no dice que extraemos campos que esta versión deja pasar.

PR: https://github.com/Elluis1/savedeco/pull/1

## 2026-10-19 — Savedeco: esqueleto + lector de Cookie Clicker

Primera versión de Savedeco. Repo vacío salvo el README inicial de `main`: este cambio arma el sitio estático, el núcleo de lectores y el lector de Cookie Clicker en solo lectura.

Qué quedó:

- Núcleo con registro, detección automática, errores amables y paneles genéricos.
- Lector de Cookie Clicker que acepta el export con `!END!`, el que viene URL-encoded y el que trae saltos de línea. Lee la panadería Elluis (v2.053) del fixture.
- Tests con `node --test`, workflow de Actions y `netlify.toml` sin build.
- Docs de arquitectura, formato, roadmap y esta bitácora.

PR: https://github.com/Elluis1/savedeco/pull/1

Próximos pasos: interpretar minijuegos, mapear auras y fondos, y un segundo lector (Kittens Game o Trimps, los dos con LZString).
