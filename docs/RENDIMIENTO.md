# Rendimiento

Medición del 2026-10-19. La página ya era chica y la decodificación del fixture, rápida. Lo que valía la pena en esta pasada era abrir la lista de logros: con dos columnas, en un CPU lento, tardaba unas tres veces más que ahora.

## Cómo reproducirlo

Hace falta Node 22 o más nuevo. No se instala nada. Desde la raíz del repo:

```powershell
node --expose-gc scripts/medir.mjs
```

También está `npm run medir`, que es lo mismo. Sin `--expose-gc` los tiempos salen igual; la memoria retenida queda más sucia porque no se fuerza el recolector.

El script arma los saves grandes en memoria. No escribe archivos. Si hay Chrome o Chromium en el `PATH`, además abre la página en headless (cache desactivada, contra un servidor local) y mide el primer render, el click en Decodificar y la apertura de las listas. Si no hay navegador, esa parte se saltea y el resto igual corre.

## En qué máquina

Los números de abajo salieron de la VM de este agente, no de una notebook física:

- Linux 6.12.94+, Node v22.14.0
- CPU que el hipervisor reporta como Intel Xeon, 4 núcleos, 16 GB de RAM
- Google Chrome 154.0.8037.92, headless, ventana 1366×768

Para imitar un CPU más lento, el script repite la parte del navegador con la limitación de Chrome a 4× (`Emulation.setCPUThrottlingRate`). No es una notebook medida aparte: es esta misma máquina, frenada.

Cada tiempo de decodificación es la mediana de varias corridas, con dos de calentamiento que no cuentan. Las aperturas de lista son tres pestañas nuevas (la primera vez que se abre, sin layout reciclado).

## Peso de la página

No hay imágenes. El total es HTML + CSS + JS. El gzip es la suma de comprimir cada archivo por separado, que es lo que viaja si el servidor comprime.

| | Antes | Después |
| --- | ---: | ---: |
| HTML | 2 414 B | 2 414 B |
| CSS | 5 400 B | 5 533 B |
| JS | 88 884 B | 88 884 B |
| Imágenes | 0 | 0 |
| Total | 96 698 B | 96 831 B |
| Gzip | 34 457 B | 34 564 B |

El CSS creció 133 bytes por el comentario que explica por qué la lista va en una columna. El archivo más pesado sigue siendo el catálogo de nombres (`js/lectores/cookie-clicker/catalogo.js`, 37 998 B, 14 822 B gzip).

Importar el lector en un proceso de Node nuevo tarda unos 6–7 ms (mediana 6,0 ms antes, 7,2 ms después).

## Primer render y memoria

En Chrome, localhost, sin cache:

| | Antes | Después |
| --- | ---: | ---: |
| First Contentful Paint (mediana de 5) | 32 ms | 32 ms |
| `DOMContentLoaded` | 26 ms | 26 ms |
| Heap de JS al terminar de cargar | 1,02 MB | 1,02 MB |
| Heap después de mostrar la partida de Elluis | 1,13 MB | 1,16 MB |

El HTML ya trae el texto de la página. El módulo es diferido, así que el primer pintado no espera al catálogo. De pegar el fixture a ver los paneles en el siguiente frame: unos 23–26 ms a velocidad normal y unos 90–95 ms con el CPU a 4×. Eso no cambió con esta pasada: el trabajo era el mismo.

En Node, después de forzar el recolector, decodificar el fixture retiene unos 32 KB encima de los módulos ya cargados. Una basura de 2 MB que se rechaza no deja nada (menos de 1 KB). El heap del proceso anda por los 8 MB con el catálogo cargado; el número que importa en el navegador es el de la tabla de arriba.

## Decodificación

`decodificarAutomatico` es lo que corre el botón. Los saves sintéticos tienen forma de Cookie Clicker (versión, edificios, bits) y un bloque de mod de relleno. El de 400 KB va escapado como el `escape()` del juego. La basura de 2 MB es base64 válido que no es una partida: se abre y se rechaza.

| Caso | Caracteres | Antes | Después |
| --- | ---: | ---: | ---: |
| Fixture de Elluis | 8 126 | 0,48 ms | 0,54 ms |
| Sintético, 100 KB de plano | 136 541 | 1,87 ms | 2,01 ms |
| Sintético, 400 KB de plano, escapado | 546 149 | 9,82 ms | 10,2 ms |
| Basura de 2 MB, rechazada | 2 796 209 | 37,7 ms | 36,1 ms |

La diferencia está en el ruido de la medición. Esta pasada no tocó el decodificador. En el fixture, abrir el base64 son 0,07 ms, `decodificar` directo 0,16–0,19 ms, y armar el HTML de los paneles 0,7–0,8 ms (52 642 bytes).

## Qué se cambió

La lista de nombres de logros y mejoras usaba `columns: 2`. El navegador balancea la altura de las dos columnas. En la partida de Elluis hay 523 logros, y uno (el de Adolphus W. Green) es un párrafo de 688 caracteres en el puesto 216. Con el CPU a 4×, abrir esa lista tardaba **172 ms** de mediana (muestras 231, 172 y 155). La de mejoras, 717 nombres y ninguno tan largo, tardaba **34 ms**.

Quedó en una sola columna, con el mismo alto máximo y el mismo filtro. Abrir los logros pasó a **61 ms** de mediana (muestras 104, 60 y 61). Las mejoras quedaron en **21 ms**. A velocidad normal de esta VM las dos listas ya estaban en ~32 ms, pegadas a un par de frames, y siguen ahí: el costo solo se ve cuando el CPU es más lento.

El filtro sigue andando: buscar «mañanera» deja 1 de 523 ítems visibles.

## Qué miré y no toqué

- El base64 ya se pasa a UTF-8 con `TextDecoder`. Eso lo hizo la pasada de casos hostiles: el arreglo de `%xx` por byte era el cuello de los saves enormes, y ya no está.
- Un Web Worker no conviene. El fixture tarda menos de 1 ms y un save de 400 KB, unos 10 ms. El arranque del worker se comería el ahorro.
- Cargar el lector recién al decodificar no mueve el primer render: el HTML pinta antes que los módulos, y hace falta el catálogo para mostrar los nombres.
- Una cache larga en `netlify.toml` tampoco. La página son 35 KB gzip, y sin nombres con hash un `max-age` largo dejaría JS viejo después de un deploy.
- `detectar` y `decodificar` abren el base64 cada uno. En el camino del botón eso es el tiempo de la tabla (el de 400 KB, 10 ms). Partirlo a la mitad sería el siguiente candidato si aparece un save real que se note. Hoy no se nota al lado de la lista.
