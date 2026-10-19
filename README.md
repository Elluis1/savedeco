# Savedeco

[![Tests](https://github.com/Elluis1/savedeco/actions/workflows/tests.yml/badge.svg)](https://github.com/Elluis1/savedeco/actions/workflows/tests.yml)

Savedeco lee códigos de exportación de partidas y te muestra paneles con lo que había guardado. Es solo lectura: no edita ni genera saves.

Hoy entiende **Cookie Clicker**. El código que pegás se decodifica en el navegador y no sale de tu máquina.

El sitio es estático (HTML, CSS y JavaScript con módulos). No hay paso de build ni dependencias para correrlo.

## Correrlo en tu máquina

Hace falta un servidor estático, porque el navegador no carga módulos ES desde `file://`. En Windows, desde PowerShell, parate en la carpeta del repo:

```powershell
python -m http.server 8000
```

Abrí http://localhost:8000

Si no tenés Python y sí tenés Node:

```powershell
npx --yes serve
```

`serve` te dice en qué puerto quedó.

## Tests

Hace falta Node 20 o más nuevo. No se instala nada:

```powershell
node --test
```

También podés usar `npm test`. El workflow de GitHub Actions corre lo mismo en cada pull request y en cada push a `main`.

## Cómo está armado

El núcleo no conoce juegos. Cada juego es un lector en `js/lectores/`. Para sumar uno, mirá [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

- [Formato de Cookie Clicker](docs/FORMATOS/cookie-clicker.md)
- [Próximos juegos](docs/ROADMAP.md)
- [Bitácora](docs/BITACORA.md)

## Publicar

`netlify.toml` publica la raíz del repo y no corre ningún comando de build. En Netlify alcanza con conectar el repo.
