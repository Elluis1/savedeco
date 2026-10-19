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
};
```

Los `tipo` que el núcleo ya dibuja son `tarjetas`, `barras`, `progreso`, `lista` y `tabla`. Cada ítem puede traer `texto`, `numero` o `fecha`. Los números los formatea la página, así el cambio de notación no exige otro parseo.

Lo que no puedas confirmar del formato, dejalo como desconocido y anotalo en `docs/FORMATOS/`. Mejor un hueco honesto que un campo inventado.

## La página

`index.html` carga `js/app.js` como módulo. No hay empaquetador. Por eso hace falta un servidor estático: el navegador bloquea los módulos si abrís el archivo directo.

El flujo es pegar o subir, apretar Decodificar, y reemplazar el área de resultado. Un error se muestra en un aviso y listo.
