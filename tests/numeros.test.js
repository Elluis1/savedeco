import assert from 'node:assert/strict';
import test from 'node:test';
import { formatearFotogramas, formatearNumero } from '../js/nucleo/numeros.js';

test('la notación corta usa la escala del juego, en español', () => {
  assert.equal(formatearNumero(1e6), '1 millón');
  assert.equal(formatearNumero(2e6), '2 millones');
  assert.equal(formatearNumero(1.5e6), '1,5 millones');
  assert.equal(formatearNumero(1706), '1.706');
  assert.equal(formatearNumero(4.615326035923986e56), '461,533 septendecillones');
  assert.equal(formatearNumero(470647246012985), '470,647 trillones');
});

test('la notación científica se puede elegir', () => {
  assert.equal(formatearNumero(4.615326035923986e56, 'cientifica'), '4,615e+56');
  assert.equal(formatearNumero(0), '0');
  assert.equal(formatearNumero(Number.POSITIVE_INFINITY), '∞');
});

test('los fotogramas se leen a 30 por segundo', () => {
  assert.equal(formatearFotogramas(291577), '2 h 41 min');
  assert.equal(formatearFotogramas(-1), 'sin límite');
});
