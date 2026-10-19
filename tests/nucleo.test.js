import assert from 'node:assert/strict';
import test from 'node:test';
import { LIMITE_CODIGO, MENSAJE_LARGO, decodificarAutomatico } from '../js/nucleo/decodificar.js';
import { escaparHtml, renderizarPanel } from '../js/nucleo/paneles.js';
import { registrar } from '../js/nucleo/registro.js';
import '../js/lectores/indice.js';

test('un texto cualquiera no rompe y avisa', () => {
  for (const entrada of ['', '   \n', null, undefined, 'hola, esto no es una partida', '@@@@', 123]) {
    const resultado = decodificarAutomatico(entrada);
    assert.equal(resultado.ok, false);
    assert.equal(typeof resultado.error, 'string');
    assert.ok(resultado.error.length > 10);
    assert.equal(resultado.error.includes('\n'), false);
  }
});

test('el núcleo elige al lector con más confianza', () => {
  registrar({
    id: 'falso',
    nombre: 'Falso',
    detectar: (texto) => (String(texto).includes('JUEGO-FALSO') ? 0.99 : 0),
    decodificar: () => ({ ok: true, version: '0', datos: { marca: 'falso' }, paneles: [] }),
  });
  const resultado = decodificarAutomatico('JUEGO-FALSO y nada más');
  assert.equal(resultado.ok, true);
  assert.equal(resultado.juego, 'falso');
  assert.equal(resultado.datos.marca, 'falso');
});

test('los paneles escapan el texto que viene de la partida', () => {
  const html = renderizarPanel({
    id: 'x',
    tipo: 'tarjetas',
    titulo: '<b>titulo</b>',
    items: [{ etiqueta: '<x>', texto: '<script>alert(1)</script>' }],
  }, (valor) => String(valor));
  assert.equal(html.includes('<script>'), false);
  assert.ok(html.includes('&lt;script&gt;'));
});

test('la tabla muestra texto plano y lo escapa', () => {
  const html = renderizarPanel({
    id: 't',
    tipo: 'tabla',
    titulo: 'Tabla',
    columnas: [{ id: 'a', etiqueta: 'A' }, { id: 'b', etiqueta: 'B' }],
    filas: [{ a: '<b>hola</b>', b: { numero: 2 } }],
  }, (valor) => `n${valor}`);
  assert.ok(html.includes('&lt;b&gt;hola&lt;/b&gt;'));
  assert.equal(html.includes('<b>'), false);
  assert.ok(html.includes('n2'));
});

test('escaparHtml cierra comillas para atributos', () => {
  assert.equal(escaparHtml(`<a href='x' class="y">`), '&lt;a href=&#39;x&#39; class=&quot;y&quot;&gt;');
});

test('un código enorme no se procesa', () => {
  const resultado = decodificarAutomatico(`${'A'.repeat(LIMITE_CODIGO + 1)}!END!`);
  assert.equal(resultado.ok, false);
  assert.equal(resultado.error, MENSAJE_LARGO);
});
