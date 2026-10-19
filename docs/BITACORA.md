# Bitácora

Entradas nuevas arriba. Cada una dice la fecha, quién la hizo, qué cambió, el PR y qué sigue.

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
