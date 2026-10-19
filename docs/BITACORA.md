# Bitácora

Entradas nuevas arriba. Cada una dice la fecha, quién la hizo, qué cambió, el PR y qué sigue.

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
