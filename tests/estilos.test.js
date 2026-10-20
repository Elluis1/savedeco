import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

test('la lista de nombres queda en una sola columna', () => {
  const css = fs.readFileSync(new URL('../css/estilos.css', import.meta.url), 'utf8');
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const bloques = [...sinComentarios.matchAll(/\.lista-nombres ul \{([^}]*)\}/g)];
  assert.ok(bloques.length >= 1);
  for (const bloque of bloques) {
    assert.doesNotMatch(bloque[1], /columns\s*:/);
    assert.doesNotMatch(bloque[1], /column-count\s*:/);
    assert.doesNotMatch(bloque[1], /column-width\s*:/);
  }
  assert.match(bloques[0][1], /max-height:\s*16rem/);
  assert.match(bloques[0][1], /overflow:\s*auto/);
});

test('la parcela es una grilla de columnas fijas', () => {
  const css = fs.readFileSync(new URL('../css/estilos.css', import.meta.url), 'utf8');
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const bloque = sinComentarios.match(/\.mosaico \{([^}]*)\}/);
  assert.ok(bloque);
  assert.match(bloque[1], /display:\s*grid/);
  assert.match(bloque[1], /grid-template-columns:\s*repeat\(var\(--columnas\)/);
  assert.doesNotMatch(bloque[1], /column-count\s*:/);
  assert.match(sinComentarios, /\.linea-celda[\s\S]*?overflow-wrap:\s*anywhere/);
  assert.match(sinComentarios, /\.mosaico > li::marker[\s\S]*?content:\s*none/);
});
