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

test('el mosaico escapa el texto y no deja pasar un tono inventado', () => {
  const html = renderizarPanel({
    id: 'parcela',
    tipo: 'mosaico',
    titulo: 'Parcela',
    etiqueta: 'Parcela <b>',
    columnas: 99,
    leyenda: [{ tono: 'inicio', texto: '<b>Cogollo</b>' }, { tono: 'inventado', texto: 'Raro' }],
    celdas: [
      {
        titulo: '<img src=x>',
        linea: '"onclick"',
        marca: '1·1',
        tono: 'no-existe',
        pasos: 9,
        pasosTotal: 40,
        etiqueta: 'Fila 1 "columna"',
      },
      null,
    ],
    detalle: {
      resumen: 'Ver <i>la</i> planta',
      columnas: [{ id: 'planta', etiqueta: 'Planta' }],
      filas: [{ planta: { texto: '<script>alert(1)</script>' } }],
    },
  }, (valor) => String(valor));
  assert.equal(html.includes('<img'), false);
  assert.equal(html.includes('<script'), false);
  assert.equal(html.includes('<b>'), false);
  assert.ok(html.includes('&lt;img src=x&gt;'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&quot;onclick&quot;'));
  assert.ok(html.includes('aria-label="Fila 1 &quot;columna&quot;"'));
  assert.ok(html.includes('aria-label="Parcela &lt;b&gt;"'));
  assert.ok(html.includes('role="list"'));
  assert.ok(html.includes('tono-neutro'));
  assert.ok(html.includes('tono-inicio'));
  assert.equal(html.includes('tono-no-existe'), false);
  assert.equal(html.includes('tono-inventado'), false);
  assert.ok(html.includes('style="--columnas:12"'));
  assert.equal((html.match(/class="paso activo"/g) || []).length, 8);
  assert.equal((html.match(/class="paso"/g) || []).length, 0);
});

test('un mosaico sin casilleros avisa y no inventa una grilla', () => {
  const html = renderizarPanel({
    id: 'vacio',
    tipo: 'mosaico',
    titulo: 'Nada',
    celdas: [],
    vacio: 'No vino la parcela.',
  }, (valor) => String(valor));
  assert.ok(html.includes('No vino la parcela.'));
  assert.equal(html.includes('celda-mosaico'), false);
});

test('escaparHtml cierra comillas para atributos', () => {
  assert.equal(escaparHtml(`<a href='x' class="y">`), '&lt;a href=&#39;x&#39; class=&quot;y&quot;&gt;');
});

test('un código enorme no se procesa', () => {
  const resultado = decodificarAutomatico(`${'A'.repeat(LIMITE_CODIGO + 1)}!END!`);
  assert.equal(resultado.ok, false);
  assert.equal(resultado.error, MENSAJE_LARGO);
});
