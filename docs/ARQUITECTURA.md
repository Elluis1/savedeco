# Arquitectura

Savedeco separa un núcleo chico de los lectores, uno por juego. La página pide “decodificá esto” y el núcleo elige quién sabe leerlo. Nada de eso toca la partida: no hay un camino para escribir un save nuevo.

## Qué hace el núcleo

Vive en `js/nucleo/` y no importa ningún juego.

- `registro.js` anota lectores. Cada uno trae `id`, `nombre`, `detectar(texto)`, `decodificar(texto)` y la lista de paneles que piensa mostrar.
- `decodificar.js` recorre los lectores, se queda con el de más confianza y, si ninguno pasa de 0,5, devuelve un error en castellano. Si el lector tira una excepción, también: la página no se cae.
- `numeros.js` escribe los números enormes en notación corta (la escala del juego, con coma decimal) o científica.
- `paneles.js` dibuja componentes genéricos: tarjetas, barras, tablas, listas y barras de logros. Escapa el texto para que un nombre de panadería no se vuelva HTML.

`detectar` devuelve un número de 0 a 1. `decodificar` no debería lanzar. Cuando sale bien, responde así:

```js
{
  ok: true,
  juego: 'cookie-clicker',
  version: '2.053',
  advertencias: [],
  datos: { /* campos normalizados */ },
  paneles: [ /* los mismos tipos que sabe dibujar el núcleo */ ]
}
```

Cuando no puede:

```js
{ ok: false, error: 'Un mensaje para la persona, sin stack.', advertencias: [] }
```

Si el lector expone `armarPaneles(datos, formatear)`, la página lo usa para rehacer los paneles al cambiar la notación, sin volver a parsear.

## Exportar

Después de leer, la página puede bajar la partida. Se arma en el navegador, con `Blob` y `URL.createObjectURL`. No hay un request afuera y no se toca el save.

El armado vive en `js/nucleo/exportar.js`. El núcleo no conoce juegos. Le pide al lector `armarExportacion(datos)` si el método existe. Si no existe, o si tira, arma el documento con los paneles. Por eso un lector nuevo hereda el texto, el CSV y el JSON: le alcanza con devolver paneles. Si quiere conseguidos y faltantes, o campos que la pantalla no muestra, implementa `armarExportacion` y devuelve el mismo documento.

El documento tiene `titulo` (entra en el nombre del archivo), `juego`, `version`, `notas` y `secciones`. Cada sección trae `campos` (texto, entero, número o fecha, con una nota de qué es) y, si hace falta, una `tabla`. El núcleo escribe tres archivos:

- Un `.txt` en Markdown, para pegarlo o adjuntarlo a una IA. Los números grandes van legibles y también exactos.
- Un `.csv` con BOM UTF-8, separador `;` y salto de línea de Windows, para el Excel en español. Cada sección es un bloque con su encabezado. Un texto que arranca con `=`, `+`, `-` o `@` lleva un apóstrofo para que Excel no lo ejecute, también si antes hay espacios (de cualquier ancho), separadores de línea o caracteres invisibles.
- Un `.json` con los mismos datos. Un número o una fecha es `{ valor, legible, exacto }`.

El nombre del archivo usa el título del lector y el día UTC, sin los caracteres que Windows rechaza (`\ / : * ? " < > |` y los de control) y sin los invisibles que disfrazan la extensión o parten el nombre (ancho cero, marcas de dirección, separadores de línea unicode). En Cookie Clicker el título es la panadería.

Un número que no entra en un entero seguro se escribe en notación científica con punto decimal. Es el float del save: el juego no guarda más precisión. El tope de cada archivo es el mismo que el del código de entrada, 4 millones de caracteres. Si se pasa, el archivo se corta y lo dice.

## Cómo sumar un juego

1. Creá `js/lectores/<juego>/` con un `index.js` que exporte `lector`.
2. En `js/lectores/indice.js` agregá el import y un `registrar(lector)`.

Esa línea del índice es el único contacto con el resto. El núcleo no se toca.

El lector tiene esta forma:

```js
export const lector = {
  id: 'mi-juego',
  nombre: 'Mi juego',
  paneles: [
    { id: 'resumen', titulo: 'Resumen', tipo: 'tarjetas' },
  ],
  detectar(texto) {
    return 0;
  },
  decodificar(texto) {
    return { ok: false, error: 'Todavía no.', advertencias: [] };
  },
  // Opcional. Si no está, la descarga sale de los paneles.
  armarExportacion(datos) {
    return {
      titulo: 'partida',
      juego: 'Mi juego',
      version: '1',
      notas: ['Qué no se pudo nombrar.'],
      secciones: [],
    };
  },
};
```

Los `tipo` que el núcleo ya dibuja son `tarjetas`, `barras`, `progreso`, `lista`, `tabla` y `mosaico`. Cada ítem puede traer `texto`, `numero` o `fecha`. Los números los formatea la página, así el cambio de notación no exige otro parseo.

El mosaico es una grilla de casilleros. No sabe de ningún juego: recibe columnas, un tono de una lista corta (`apagado`, `hueco`, `inicio`, `medio`, `alto`, `listo`, `neutro`) y, en cada celda, título, línea, marca y una etiqueta para el lector de pantalla. Un tono que no esté en esa lista se dibuja como `neutro`. El jardín de Cookie Clicker lo usa para la parcela. Si el panel trae `detalle`, debajo se puede plegar una tabla. Más de 256 casilleros no se dibujan ni se bajan: se avisa que la grilla es demasiado grande. Una grilla vacía también avisa, sin inventar casilleros.

Lo que no puedas confirmar del formato, dejalo como desconocido y anotalo en `docs/FORMATOS/`. Mejor un hueco honesto que un campo inventado.

## La página

`index.html` carga `js/app.js` como módulo. No hay empaquetador. Por eso hace falta un servidor estático: el navegador bloquea los módulos si abrís el archivo directo.

El flujo es pegar o subir, apretar Decodificar, y reemplazar el área de resultado. Un error se muestra en un aviso y listo.
