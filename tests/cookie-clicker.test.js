import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { decodificarAutomatico } from '../js/nucleo/decodificar.js';
import { lector } from '../js/lectores/cookie-clicker/index.js';
import '../js/lectores/indice.js';

const fixture = fs.readFileSync(new URL('./fixtures/luigi-cookieclicker.txt', import.meta.url), 'utf8');

function envolver(plano) {
  return Buffer.from(plano, 'utf8').toString('base64') + '!END!';
}

test('la partida de Elluis se lee con los valores confirmados', () => {
  const resultado = lector.decodificar(fixture);
  assert.equal(resultado.ok, true, resultado.error);
  const datos = resultado.datos;

  assert.equal(datos.version, '2.053');
  assert.equal(datos.nombre, 'Elluis');
  assert.equal(datos.semilla, 'qdlfx');
  assert.equal(datos.fechas.inicioPartida, 1686353674943);
  assert.equal(datos.fechas.inicioAscension, 1792211960953);
  assert.equal(datos.fechas.ultimoGuardado, 1792386084103);

  assert.equal(datos.galletas, 9.062424055290409e52);
  assert.equal(datos.galletasHorneadasAscension, 4.615326035923986e56);
  assert.equal(datos.galletasEntregadas, 1.0425252089159072e56);
  assert.equal(datos.galletasHorneadasTotal, datos.galletasHorneadasAscension + datos.galletasEntregadas);
  assert.equal(datos.clics, 3527791);
  assert.equal(datos.galletasHechasAMano, 4.545795928499163e56);
  assert.equal(datos.galletasDoradas, 1706);
  assert.equal(datos.galletasDoradasAscension, 192);

  assert.equal(datos.prestigio, 470647246012985);
  assert.equal(datos.chipsCelestiales, 98543542987114);
  assert.equal(datos.chipsCelestialesGastados, 372103703025871);
  assert.equal(datos.ascensiones, 10);
  assert.equal(datos.modoAscension.nombre, 'Ninguno');
  assert.equal(datos.terrones, 3);
  assert.equal(datos.terronesTotales, 1230);
  assert.equal(datos.tipoTerron.nombre, 'normal');
  assert.equal(datos.temporada.id, 'halloween');
  assert.equal(datos.temporada.nombre, 'Halloween');

  assert.equal(datos.edificios.length, 20);
  assert.equal(datos.edificios[0].nombre, 'Cursor');
  assert.equal(datos.edificios[0].cantidad, 893);
  assert.equal(datos.edificios[1].nombre, 'Abuela');
  assert.equal(datos.edificios[1].cantidad, 875);
  assert.equal(datos.edificios[5].nombre, 'Banca');
  assert.equal(datos.edificios[5].cantidad, 801);
  assert.equal(datos.edificios[19].nombre, 'Tú');
  assert.equal(datos.edificios[19].cantidad, 452);
  assert.equal(datos.edificiosTotal, 14023);

  assert.equal(datos.mejoras.compradas, 717);
  assert.equal(datos.mejoras.desbloqueadas, 742);
  assert.equal(datos.mejoras.total, 875);
  assert.equal(datos.logros.obtenidos, 523);
  assert.equal(datos.logros.total, 643);
  assert.equal(datos.mejorasPermanentes[3].id, 874);
  assert.equal(datos.mejorasPermanentes[3].nombre, 'Ratón omnipresente');
  assert.ok(datos.mejoras.nombresCompradas.includes('Dedo índice reforzado'));
  assert.ok(datos.logros.nombres.includes('Galleta mañanera'));

  const porNombre = Object.fromEntries(datos.mods.lista.map((mod) => [mod.nombre, mod]));
  assert.equal(porNombre['cooler sample mod'].asterisco, true);
  assert.equal(porNombre['lang sample mod'].asterisco, true);
  assert.equal(porNombre['sample mod'].asterisco, true);
  assert.equal(porNombre.gincookiwizord.asterisco, false);
  assert.equal(porNombre['The Best Autoclicker'].asterisco, false);
  assert.equal(porNombre.cookieassistant2.asterisco, false);
  assert.equal(datos.mods.datos[0].id, 'Cookie Assistant 2 0');
  assert.equal(datos.mods.datos[0].version, '0.9.33');

  assert.equal(datos.efectos[0].nombre, 'Frenesí');
  assert.equal(datos.efectos[0].argumento, 7);
  assert.deepEqual(resultado.paneles.map((panel) => panel.id), lector.paneles.map((panel) => panel.id));
});

test('tolera saltos de línea y el código ya decodificado de la URL', () => {
  const cortado = fixture.replace(/%3D%3D%21END%21/i, '').replace(/(.{60})/g, '$1\n');
  const conFin = `${cortado}!END!`;
  const resultado = decodificarAutomatico(conFin);
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(resultado.datos.nombre, 'Elluis');
  assert.equal(resultado.juego, 'cookie-clicker');
});

test('un save chico y moderno también entra por los mismos campos', () => {
  const misc = [
    '10', '20', '3', '4', '5', '6', '7', '8', '9',
    '0', '0', '0', '0', '0', '1', '2', '3', '4', '5', '6', '7', '8', 'christmas',
  ];
  const plano = [
    '2.052',
    '',
    '111;222;333;Horno de prueba;abcde;1,2,3',
    '101010',
    misc.join(';'),
    '4,5,6,1,,0,4;7,8,9,2,,0,7;',
    '110011',
    '101',
    '',
    'META:*sample mod,mi mod;',
  ].join('|');
  const resultado = lector.decodificar(envolver(plano));
  assert.equal(resultado.ok, true, resultado.error);
  const datos = resultado.datos;
  assert.equal(datos.nombre, 'Horno de prueba');
  assert.equal(datos.galletas, 10);
  assert.equal(datos.galletasHorneadasAscension, 20);
  assert.equal(datos.galletasHorneadasTotal, 29);
  assert.equal(datos.clics, 3);
  assert.equal(datos.galletasDoradas, 4);
  assert.equal(datos.galletasHechasAMano, 5);
  assert.equal(datos.temporada.nombre, 'Navidad');
  assert.equal(datos.edificios[0].cantidad, 4);
  assert.equal(datos.edificios[1].nombre, 'Abuela');
  assert.equal(datos.edificios[1].cantidad, 7);
  assert.deepEqual(datos.mejoras.nombresCompradas, ['Dedo índice reforzado', 'Ambidextro']);
  assert.deepEqual(datos.logros.nombres, ['Galleta mañanera', 'Muy horneado']);
  assert.equal(datos.mods.lista[0].asterisco, true);
  assert.equal(datos.mods.lista[1].nombre, 'mi mod');
});

test('los inputs inválidos avisan y no tiran excepción', () => {
  const entradas = [
    '',
    '   \n\n',
    'texto random que no es un save ni de casualidad',
    '****base64-roto****!END!',
    fixture.slice(0, 90),
    `${fixture.slice(0, Math.floor(fixture.length / 2))}`,
  ];
  for (const entrada of entradas) {
    const resultado = decodificarAutomatico(entrada);
    assert.equal(resultado.ok, false, entrada.slice(0, 40));
    assert.equal(typeof resultado.error, 'string');
    assert.ok(resultado.error.length > 10);
  }
});
