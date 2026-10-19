# Bitácora

Entradas nuevas arriba. Cada una dice la fecha, quién la hizo, qué cambió, el PR y qué sigue.

## 2026-10-19 — Savedeco: esqueleto + lector de Cookie Clicker

Primera versión de Savedeco. Repo vacío salvo el README inicial de `main`: este cambio arma el sitio estático, el núcleo de lectores y el lector de Cookie Clicker en solo lectura.

Qué quedó:

- Núcleo con registro, detección automática, errores amables y paneles genéricos.
- Lector de Cookie Clicker que acepta el export con `!END!`, el que viene URL-encoded y el que trae saltos de línea. Lee la panadería Elluis (v2.053) del fixture.
- Tests con `node --test`, workflow de Actions y `netlify.toml` sin build.
- Docs de arquitectura, formato, roadmap y esta bitácora.

PR: https://github.com/Elluis1/savedeco/pull/1

Próximos pasos: interpretar minijuegos, mapear auras y fondos, y un segundo lector (Kittens Game o Trimps, los dos con LZString).
