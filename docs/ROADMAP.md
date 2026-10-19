# Roadmap

Savedeco arranca con Cookie Clicker porque el export está documentado y el fuente es público. Estos son los siguientes candidatos que sí tienen un código de exportación conocido, y lo que todavía falta en el lector actual.

## Exportar la partida

Ya está en el núcleo, no es un pendiente por juego. Después de leer se bajan un texto (para una IA), un CSV (Excel en español) y un JSON. Si el lector no implementa `armarExportacion`, los archivos salen de los paneles. Cookie Clicker sí la implementa: logros y mejoras van conseguidos y faltantes, con nombre, y también lo que el panel no muestra. El detalle está en [la arquitectura](ARQUITECTURA.md).

## Próximos juegos

En todos los casos el lector sería solo lectura, igual que ahora: descomprimir en el navegador y mostrar paneles. Ninguno de estos formatos está implementado todavía.

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

- Los minijuegos (jardín, bolsa, panteón, grimorio) viajan dentro del edificio y no los interpretamos.
- El fondo, el tipo de leche y las auras del dragón quedan como id numérico. No mapeamos el nombre de cada sprite.
- El nivel del dragón es el índice de etapa, sin el título.
- La apariencia de Tú son siete índices de genes. No tenemos el nombre visual de cada opción.
- Hay un test sintético del bitfield empaquetado (versión 2.000) y de la lista con huecos (1.030). Sigue faltando un fixture real de una partida vieja.
- Una notación en escala larga (billón = 10^12) para quien lea los nombres en español de toda la vida. Hoy la corta sigue al juego a propósito.
- Si más adelante dos lectores empatan, un selector manual.
