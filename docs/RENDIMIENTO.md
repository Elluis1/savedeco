# Rendimiento

Medición del 2026-10-20. Desde la del 19 se sumaron los minijuegos, la parcela y la exportación. La página sigue pintando antes que el JavaScript. Lo que valía la pena en esta pasada era el botón: `detectar` y `decodificar` abrían el base64 cada uno, y en un save grande eso era casi la mitad del tiempo.

## Cómo reproducirlo

Hace falta Node 22 o más nuevo. No se instala nada. Desde la raíz del repo:

```powershell
node --expose-gc scripts/medir.mjs
```

También está `npm run medir`, que es lo mismo. Sin `--expose-gc` los tiempos salen igual; la memoria retenida queda más sucia porque no se fuerza el recolector.

El script arma los saves grandes en memoria. No escribe archivos. Mide el peso, la decodificación, el corte entre abrir el código y el botón, el HTML de cada panel (incluido el mosaico), y la exportación a texto, CSV y JSON. Si hay Chrome o Chromium en el `PATH`, además abre la página en headless (cache desactivada, contra un servidor local) y mide el primer render, el click en Decodificar, la parcela, la apertura de las listas y los tres botones de descarga. Si no hay navegador, esa parte se saltea y el resto igual corre.

## En qué máquina

Los números de abajo salieron de la VM de este agente, no de una notebook física:

- Linux 6.12.94+, Node v22.23.3
- CPU que el hipervisor reporta como Intel Xeon, 4 núcleos, 16 GB de RAM
- Google Chrome 154.0.8037.92, headless, ventana 1366×768

Para imitar un CPU más lento, el script repite la parte del navegador con la limitación de Chrome a 4× (`Emulation.setCPUThrottlingRate`). No es una notebook medida aparte: es esta misma máquina, frenada.

Cada tiempo de decodificación es la mediana de varias corridas, con dos de calentamiento que no cuentan. Las aperturas de lista y las descargas son tres pestañas nuevas.

El «antes» de las tablas de decodificación es el código de hoy, con minijuegos y parcela, medido con este mismo script justo antes del cambio. El «después» es la misma corrida, con el plano reusado.

## Peso de la página

No hay imágenes. El total es HTML + CSS + JS. El gzip es la suma de comprimir cada archivo por separado, que es lo que viaja si el servidor comprime.

La página creció desde el 19 por los minijuegos, `exportar.js` y el CSS de la parcela. Esta pasada suma el reuso del plano, unos 900 bytes.

| | 19 oct | Antes | Después |
| --- | ---: | ---: | ---: |
| HTML | 2 414 B | 2 414 B | 2 414 B |
| CSS | 5 533 B | 8 821 B | 8 821 B |
| JS | 88 884 B | 171 168 B | 172 053 B |
| Imágenes | 0 | 0 | 0 |
| Total | 96 831 B | 182 403 B | 183 288 B |
| Gzip | 34 564 B | 57 487 B | 57 779 B |

El archivo más pesado sigue siendo el catálogo de nombres (`js/lectores/cookie-clicker/catalogo.js`, 37 998 B, 14 822 B gzip). Después van el lector (`formato.js`, 51 654 B) y los minijuegos (`minijuegos.js`, 32 515 B).

Importar el lector en un proceso de Node nuevo tarda unos 5 ms (mediana 4,8 ms).

## Primer render y memoria

En Chrome, localhost, sin cache. El primer pintado no cambió con el reuso: el HTML ya trae el texto y el módulo es diferido.

| | 19 oct | Después |
| --- | ---: | ---: |
| First Contentful Paint (mediana de 5) | 32 ms | 40 ms |
| `DOMContentLoaded` | 26 ms | 39 ms |
| Heap de JS al terminar de cargar | 1,02 MB | 1,16 MB |
| Heap después de mostrar la partida de Elluis | 1,16 MB | 4,3 MB |

Las muestras de FCP fueron 64, 40, 40, 40 y 40 ms. La primera queda fría. De pegar el fixture a ver los paneles, en el frame siguiente: 36 ms a velocidad normal y 127 ms con el CPU a 4×. El trabajo sincrónico (decodificar y meter el HTML) es 21 ms y 70 ms. Son 2 068 nodos y 73 KB de HTML. En el 19, sin minijuegos ni parcela, eran unos 23–26 ms y 90–95 ms.

La parcela de 6 por 6 entra en ese número. Son 36 casilleros, 14 631 bytes de HTML y 0,1 ms de layout una vez armada (573 px de alto). El panel de minijuegos sale en 0,01 ms y el de la bolsa en 0,06 ms. No son el costo.

En Node, después de forzar el recolector, decodificar el fixture retiene unos 83 KB encima de los módulos ya cargados (antes del reuso, 81 KB). Una basura de 2 MB que se rechaza no deja nada (984 B; antes, 416 B). El plano reusado se suelta al terminar el botón.

## Decodificación

`decodificarAutomatico` es lo que corre el botón. Los saves sintéticos tienen forma de Cookie Clicker (versión, edificios, bits) y un bloque de mod de relleno. El de 400 KB va escapado como el `escape()` del juego. La basura de 2 MB es base64 válido que no es una partida: se abre y se rechaza.

| Caso | Caracteres | Antes | Después |
| --- | ---: | ---: | ---: |
| Fixture de Elluis | 8 126 | 0,77 ms | 0,65 ms |
| Sintético, 100 KB de plano | 136 541 | 1,80 ms | 1,19 ms |
| Sintético, 400 KB de plano, escapado | 546 149 | 9,92 ms | 6,48 ms |
| Basura de 2 MB, rechazada | 2 796 209 | 32,8 ms | 22,2 ms |

En el fixture la diferencia está en el ruido: abrir el código son 0,07 ms. En el de 400 KB, abrirlo una vez son 3,9 ms. Medidos por separado, detectar tarda 4,4 ms y decodificar 5,3 ms. El botón, que antes hacía los dos y tardaba 9,7 ms, queda en 6,3 ms. En la basura de 2 MB el botón pasó de 33,0 ms a 21,3 ms: se fue la segunda apertura (unos 13 ms) y no queda el string retenido.

El HTML de los ocho paneles del fixture se arma en 1,0 ms y pesa 71 998 bytes. El mosaico es una parte chica de eso.

## Exportación

Medido en Node sobre la partida de Elluis, con el documento ya armado (armarlo son 0,3 ms). Los tres botones, cada uno volviendo a armar el documento, tardan 11 ms en total.

| Archivo | Bytes | Armado |
| --- | ---: | ---: |
| Texto | 97 330 B | 4,7 ms |
| CSV | 88 746 B | 4,1 ms |
| JSON | 508 073 B | 2,8 ms |

En el navegador, apretar los tres: 14, 7 y 10 ms a velocidad normal, y 35, 25 y 37 ms con el CPU a 4×. El JSON creció desde el 19 (197 KB) porque ahora entran jardín, bolsa, panteón y grimorio, además de logros y mejoras. Generarlo no es el costo.

## Qué se cambió

`detectar` abre el código y deja el plano para la `decodificar` que el botón llama enseguida, con el mismo texto. Si esa lectura no llega, el microturno siguiente lo suelta. La tarea que lo suelta no guarda el string: si no, una basura de 2 MB quedaba retenida hasta el recolector.

Una llamada suelta a `decodificar` (los tests, o cambiar la notación, que no vuelve a parsear) sigue abriendo el código ella misma. No se reusa un plano de otro turno.

## Qué miré y no toqué

- El mosaico. Dibujarlo y medirle el alto sale en una fracción de milisegundo. Abaratar la grilla no mueve el frame.
- Sacar los nombres del HTML hasta abrir la lista. El panel de progreso son 38 KB de los 72 KB, y 1 240 ítems de los 2 068 nodos. Sin esos `<li>`, el frame a 4× bajó de 143 ms a 119 ms. Abrir la lista, con o sin ítems, ya está en el piso de dos frames (unos 33 ms): el medidor espera dos `requestAnimationFrame`. El ahorro es real y chico, y cambia el HTML que ve quien no ejecuta el relleno. No alcanzó para esta corrida.
- Un Web Worker. El fixture sigue debajo de 1 ms. El de 400 KB, en 6,5 ms. El arranque del worker se come el ahorro.
- Cargar el lector recién al decodificar. El primer pintado no espera a los módulos, y hace falta el catálogo para los nombres.
- Una cache larga en `netlify.toml`. Sin nombres con hash, un `max-age` largo serviría JS viejo después de un deploy. La página son 58 KB gzip.
- Reescribir la exportación. Los tres archivos salen en unos 30 ms en el navegador. El JSON es grande para leerlo, no para armarlo.
