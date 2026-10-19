import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { MENSAJE_LARGO, decodificarAutomatico } from '../js/nucleo/decodificar.js';
import { renderizarPaneles } from '../js/nucleo/paneles.js';
import { logros } from '../js/lectores/cookie-clicker/catalogo.js';
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

test('un save anterior a 1.035 no corre los ids cuando hay un hueco', () => {
  const plano = [
    '1.030',
    '',
    '111;222;333;Vieja;abc;',
    '101',
    '10;20;3;4;5',
    '4,5,6,0;;7,8,9,0;',
    '1,1;;0,1;',
    '1;;1;',
    '',
    '',
  ].join('|');
  const resultado = lector.decodificar(envolver(plano));
  assert.equal(resultado.ok, true, resultado.error);
  assert.deepEqual(resultado.datos.mejoras.nombresCompradas, ['Dedo índice reforzado', 'Ambidextro']);
  assert.equal(resultado.datos.mejoras.desbloqueadas, 1);
  assert.equal(resultado.datos.mejoras.total, 3);
  assert.deepEqual(resultado.datos.logros.nombres, ['Galleta mañanera', 'Muy horneado']);
  assert.equal(resultado.datos.edificios.find((edificio) => edificio.indice === 0).nombre, 'Cursor');
  assert.equal(resultado.datos.edificios.find((edificio) => edificio.indice === 2).nombre, 'Granja');
  assert.equal(resultado.datos.edificios.find((edificio) => edificio.indice === 2).cantidad, 7);
  assert.equal(resultado.datos.edificios.find((edificio) => edificio.indice === 1), undefined);
  assert.equal(resultado.datos.edificios.find((edificio) => edificio.nombre === 'Abuela'), undefined);
  assert.ok(resultado.advertencias.some((aviso) => aviso.includes('punto y coma')));
});

test('la 2.000 sigue abriendo el bitfield empaquetado', () => {
  function pack2(values) {
    const chunks = values.match(/.{1,14}/g);
    let packed = '';
    for (const chunk of chunks) packed += String.fromCharCode(Number.parseInt(`1${chunk}`, 2));
    return packed;
  }
  const plano = [
    '2.000',
    '',
    '111;222;333;Horno;abc;0,0,0,0,0,0,0',
    pack2('101010'),
    '10;20;3;4;5;6;7;8;9;0;0;0;0;0;1;2;3;4;5;6;7;8;christmas',
    '4,5,6,1,,0,9;',
    pack2('110011'),
    pack2('101'),
    '',
    '',
  ].join('|');
  const resultado = lector.decodificar(envolver(plano));
  assert.equal(resultado.ok, true, resultado.error);
  assert.deepEqual(resultado.datos.mejoras.nombresCompradas, ['Dedo índice reforzado', 'Ambidextro']);
  assert.deepEqual(resultado.datos.logros.nombres, ['Galleta mañanera', 'Muy horneado']);
  assert.equal(resultado.datos.temporada.nombre, 'Navidad');
  assert.ok(resultado.advertencias.some((aviso) => aviso.includes('empaquetados')));
});

test('el nombre de la panadería, la temporada y los mods no se vuelven HTML', () => {
  const plano = [
    '2.053',
    '',
    '1;2;3;<img src=x onerror=alert(1)>;seed;0,0,0,0,0,0,0',
    '1',
    '1;2;3;4;5;6;7;8;9;0;0;0;0;0;1;2;3;4;5;6;7;8;<script>alert(1)</script>',
    '1,1,1,1,,0,1;',
    '11',
    '1',
    '',
    'META:*<img src=x onerror=alert(2)>," onclick=alert(3);Maloso:{"lastVersion":"<img src=x onerror=alert(5)>"}',
  ].join('|');
  const resultado = lector.decodificar(envolver(plano));
  assert.equal(resultado.ok, true, resultado.error);
  const html = renderizarPaneles(resultado.paneles, (valor) => String(valor));
  assert.equal(html.includes('<script'), false);
  assert.equal(html.includes('<img'), false);
  assert.equal(html.includes('<strong>"'), false);
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('<strong>&quot; onclick=alert(3)</strong>'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(5)&gt;'));
  assert.equal(lector.decodificar('x'.repeat(4_000_001)).error, MENSAJE_LARGO);
});

test('el logro largo usa el ampersand de la loc, no la entidad', () => {
  const nombre = logros.find((logro) => logro.includes('Southmayd'));
  assert.ok(nombre.includes('Southmayd & Choate'));
  assert.equal(nombre.includes('&amp;'), false);
  const html = renderizarPaneles([{
    id: 'progreso',
    tipo: 'progreso',
    titulo: 'Logros',
    grupos: [{ etiqueta: 'Logros', obtenidos: 1, total: 1, nombres: [nombre] }],
  }], (valor) => String(valor));
  assert.ok(html.includes('Southmayd &amp; Choate'));
  assert.equal(html.includes('&amp;amp;'), false);
});
