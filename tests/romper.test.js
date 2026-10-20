// Casos hostiles para los lectores. Todo se genera acá: no hay fixtures de varios MB.
// Los márgenes de tiempo son holgados a propósito, para que un CI lento no falle en falso.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { LIMITE_CODIGO, MENSAJE_DESCONOCIDO, MENSAJE_LARGO, decodificarAutomatico, presentar } from '../js/nucleo/decodificar.js';
import { renderizarAdvertencias, renderizarAlerta, renderizarPaneles } from '../js/nucleo/paneles.js';
import { registrar } from '../js/nucleo/registro.js';
import { MENSAJE_DANADO, MENSAJE_ENORME } from '../js/lectores/cookie-clicker/formato.js';
import '../js/lectores/indice.js';

const fixture = fs.readFileSync(new URL('./fixtures/luigi-cookieclicker.txt', import.meta.url), 'utf8');

// Un segundo formato, para ver que la detección no se queda con Cookie Clicker por descarte.
registrar({
  id: 'gatitos',
  nombre: 'Gatitos',
  detectar(texto) {
    return String(texto ?? '').includes('GATITOS-SAVE') ? 0.97 : 0.2;
  },
  decodificar() {
    return { ok: true, version: '1', nombreJuego: 'Gatitos', datos: { marca: 'gatitos' }, paneles: [], advertencias: [] };
  },
});

function envolver(plano) {
  return `${Buffer.from(plano, 'utf8').toString('base64')}!END!`;
}

function partida(parcial = {}) {
  const misc = parcial.misc || ['10', '20'];
  const plano = [
    parcial.version || '2.053',
    '',
    parcial.carrera || '111;222;333;Horno;seed;0,1,0,0,0,0,0',
    '1',
    Array.isArray(misc) ? misc.join(';') : misc,
    parcial.edificios ?? '4,5,6,1;',
    parcial.mejoras ?? '11',
    parcial.logros ?? '1',
    parcial.efectos ?? '',
    parcial.mods ?? '',
  ].join('|');
  return envolver(plano);
}

function exigirError(entrada) {
  let resultado;
  assert.doesNotThrow(() => {
    resultado = decodificarAutomatico(entrada);
  });
  assert.equal(resultado.ok, false);
  assert.equal(typeof resultado.error, 'string');
  assert.ok(resultado.error.length > 20, resultado.error);
  assert.equal(resultado.error.includes('\n'), false);
  assert.equal(resultado.error.includes('TypeError'), false);
  assert.equal(resultado.error.includes('RangeError'), false);
  assert.equal(resultado.error.includes('SyntaxError'), false);
  return resultado;
}

function medir(fn) {
  const inicio = performance.now();
  const valor = fn();
  return { valor, ms: performance.now() - inicio };
}

function escapeComoElJuego(texto) {
  return texto.replace(/[^A-Za-z0-9@*_+\-./]/g, (caracter) => {
    const codigo = caracter.charCodeAt(0);
    if (codigo < 256) return `%${codigo.toString(16).toUpperCase().padStart(2, '0')}`;
    return `%u${codigo.toString(16).toUpperCase().padStart(4, '0')}`;
  });
}

test('lo vacío, lo truncado y el base64 inválido avisan sin tirar', () => {
  const mitad = fixture.slice(0, Math.floor(fixture.length / 2));
  const entradas = [
    '',
    '   \n\t',
    null,
    undefined,
    'texto random que no es un save ni de casualidad',
    '****base64-roto****!END!',
    '!!!!%%%%',
    '!END!',
    '%',
    '%21END%21',
    fixture.slice(0, 40),
    mitad,
    `${mitad}!END!`,
    `====!END!`,
    Buffer.from([0, 1, 2, 3, 255, 254]).toString('latin1'),
  ];
  for (const entrada of entradas) {
    const resultado = exigirError(entrada);
    assert.ok(resultado.error === MENSAJE_LARGO || resultado.error.length > 20);
  }
});

test('espacios, saltos, ancho cero y el cierre partido siguen siendo la misma partida', () => {
  const cortado = fixture.replace('%21END%21', '%21\nEND%21');
  const medio = Math.floor(fixture.length / 2);
  const conAnchoCero = `${fixture.slice(0, medio)}\u200b${fixture.slice(medio)}`;
  const conEspaciosRaros = fixture.replace('%21END%21', ' \u00a0%21END%21\n');
  for (const entrada of [cortado, conAnchoCero, conEspaciosRaros]) {
    const resultado = decodificarAutomatico(entrada);
    assert.equal(resultado.ok, true, resultado.error);
    assert.equal(resultado.datos.nombre, 'Elluis');
    assert.equal(resultado.juego, 'cookie-clicker');
    assert.equal(resultado.advertencias.some((aviso) => aviso.includes('no traía el cierre')), false);
  }
});

test('el escape del juego, con saltos y una panadería con tilde, vuelve a entrar', () => {
  const plano = '2.053||111;222;333;Panadería;seed;0|1|10;20|1,1,1,1|11|1||';
  const escapado = escapeComoElJuego(`${Buffer.from(plano, 'utf8').toString('base64')}!END!`);
  const conSaltos = escapado.replace(/(.{24})/g, '$1 \n');
  const resultado = decodificarAutomatico(conSaltos);
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(resultado.datos.nombre, 'Panadería');
});

test('un !end! en minúscula también cierra', () => {
  const codigo = partida().replace('!END!', '!end!');
  const resultado = decodificarAutomatico(codigo);
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(resultado.datos.nombre, 'Horno');
});

test('la detección no confunde otro formato con Cookie Clicker', () => {
  const jsonKittens = Buffer.from('{"resources":{"catnip":3},"version":"1.12"}', 'utf8').toString('base64');
  const terraria = Buffer.concat([
    Buffer.from('relogic'),
    Buffer.from([0x00, 0x1a, 0xff, 0xfe, 0x00, 0x00]),
    Buffer.alloc(64, 7),
  ]).toString('latin1');
  const utf16 = Buffer.from(fixture, 'utf16le').toString('latin1');
  const otroConPipes = envolver('1.0|a|b|c|hola|mundo');
  const casos = [
    ['json pelado', '{"version":"2.0","resources":{}}'],
    ['json en base64, estilo export descomprimido', jsonKittens],
    ['cabecera binaria de otro juego', terraria],
    ['el mismo export leído como UTF-16', utf16],
    ['base64 con barras pero sin forma de partida', otroConPipes.replace('!END!', '')],
    ['bytes al azar', Buffer.alloc(300, 0x9c).toString('latin1')],
    ['BOM suelto y basura', `\uFEFF${Buffer.alloc(40, 0x00).toString('latin1')}`],
  ];
  for (const [nombre, entrada] of casos) {
    const resultado = exigirError(entrada);
    assert.equal(resultado.juego, undefined, nombre);
    assert.equal(resultado.error, MENSAJE_DESCONOCIDO, nombre);
  }

  const marcado = decodificarAutomatico('GATITOS-SAVE y un montón de |||| que no es cookie');
  assert.equal(marcado.ok, true);
  assert.equal(marcado.juego, 'gatitos');

  const cookie = decodificarAutomatico(partida());
  assert.equal(cookie.ok, true, cookie.error);
  assert.equal(cookie.juego, 'cookie-clicker');
});

test('un BOM delante de un export de verdad no estorba', () => {
  const resultado = decodificarAutomatico(`\uFEFF${fixture}`);
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(resultado.datos.nombre, 'Elluis');
  assert.equal(resultado.advertencias.some((aviso) => aviso.includes('más nueva')), false);
});

test('el tope de 4 millones se respeta justo debajo y justo encima', { timeout: 40_000 }, () => {
  const justoDebajo = `${'A'.repeat(LIMITE_CODIGO - 5)}!END!`;
  assert.equal(justoDebajo.length, LIMITE_CODIGO);
  const debajo = medir(() => decodificarAutomatico(justoDebajo));
  assert.ok(debajo.ms < 20_000, `tardó ${debajo.ms.toFixed(0)} ms`);
  assert.equal(debajo.valor.ok, false);
  assert.equal(debajo.valor.error, MENSAJE_DANADO);

  const justoEncima = `${'B'.repeat(LIMITE_CODIGO - 4)}!END!`;
  assert.equal(justoEncima.length, LIMITE_CODIGO + 1);
  const encima = medir(() => decodificarAutomatico(justoEncima));
  assert.ok(encima.ms < 2_000, `tardó ${encima.ms.toFixed(0)} ms`);
  assert.equal(encima.valor.error, MENSAJE_LARGO);

  const espacios = medir(() => decodificarAutomatico(' '.repeat(LIMITE_CODIGO + 1)));
  assert.ok(espacios.ms < 2_000, `tardó ${espacios.ms.toFixed(0)} ms`);
  assert.equal(espacios.valor.error, MENSAJE_LARGO);
});

test('una sección enorme no se expande ni cuelga', { timeout: 30_000 }, () => {
  const casos = [
    ['bitfield', partida({ mejoras: '1'.repeat(200_000), logros: '1'.repeat(80_000) })],
    ['edificios', partida({ edificios: '1,2,3,4;'.repeat(5_000) })],
    ['efectos', partida({ efectos: '0,10,10,7;'.repeat(400) })],
    ['lista vieja', partida({ version: '1.030', mejoras: '1,1;'.repeat(30_000), logros: '1;' })],
    ['empaquetado viejo', partida({ version: '2.000', mejoras: 'A'.repeat(20_000), logros: 'A' })],
    ['pipes', envolver(`2.053${'|'.repeat(200)}`)],
  ];
  for (const [nombre, entrada] of casos) {
    const { valor, ms } = medir(() => decodificarAutomatico(entrada));
    assert.ok(ms < 10_000, `${nombre} tardó ${ms.toFixed(0)} ms`);
    assert.equal(valor.ok, false, nombre);
    const esperado = nombre === 'pipes' ? MENSAJE_DANADO : MENSAJE_ENORME;
    assert.equal(valor.error, esperado, nombre);
    assert.equal(valor.datos, undefined, nombre);
  }
});

test('un futuro cercano con pocos edificios de más sigue leyéndose', () => {
  const resultado = decodificarAutomatico(partida({
    version: '2.060',
    edificios: '3,4,5,1;'.repeat(30),
  }));
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(resultado.datos.edificios.length, 30);
  assert.ok(resultado.advertencias.some((aviso) => aviso.includes('más nueva') && aviso.includes('2.053')));
});

test('la 1.040 y la 1.0501 abren el empaquetado de esa época', () => {
  function comprimirBin(bits) {
    const arr = bits.split('');
    arr.unshift('1');
    arr.push('1');
    arr.reverse();
    return String(Number.parseInt(arr.join(''), 2));
  }
  function empacarBytes(bytes) {
    let salida = '';
    for (let i = 0; i < bytes.length; i += 2) {
      const alto = bytes[i] & 0xff;
      const bajo = (bytes[i + 1] ?? 0) & 0xff;
      salida += String.fromCharCode((alto << 8) | bajo);
    }
    return salida;
  }
  const bits = '110011';
  const grande = decodificarAutomatico(partida({ version: '1.040', mejoras: comprimirBin(bits), logros: comprimirBin('101') }));
  assert.equal(grande.ok, true, grande.error);
  assert.deepEqual(grande.datos.mejoras.nombresCompradas, ['Dedo índice reforzado', 'Ambidextro']);
  assert.deepEqual(grande.datos.logros.nombres, ['Galleta mañanera', 'Muy horneado']);

  const bytes = [1, 1, 0, 0, 1, 1];
  const logros = [1, 0, 1];
  const viejo = decodificarAutomatico(partida({
    version: '1.0501',
    mejoras: empacarBytes(bytes),
    logros: empacarBytes(logros),
  }));
  assert.equal(viejo.ok, true, viejo.error);
  assert.deepEqual(viejo.datos.mejoras.nombresCompradas, ['Dedo índice reforzado', 'Ambidextro']);
  assert.deepEqual(viejo.datos.logros.nombres, ['Galleta mañanera', 'Muy horneado']);
});

test('una fecha imposible no tira y el resto de la partida se ve', () => {
  const resultado = decodificarAutomatico(partida({
    carrera: '100000000000000000;222;333;<b>Horno</b>;seed;0',
  }));
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(resultado.datos.fechas.inicioAscension, 0);
  assert.equal(resultado.datos.fechas.inicioPartida, 222);
  assert.ok(resultado.advertencias.some((aviso) => aviso.includes('desconocida')));
  let html = '';
  assert.doesNotThrow(() => {
    html = renderizarPaneles(presentar(resultado, (valor) => String(valor)), (valor) => String(valor));
  });
  assert.ok(html.includes('desconocida'));
  assert.ok(html.includes('&lt;b&gt;Horno&lt;/b&gt;'));
  assert.equal(html.includes('<b>'), false);
  const suelta = renderizarPaneles([{
    id: 'fechas',
    tipo: 'tarjetas',
    titulo: 'Fechas',
    items: [{ etiqueta: 'Cuando', fecha: 8.64e15 + 10_000 }],
  }], (valor) => String(valor));
  assert.ok(suelta.includes('desconocida'));
});

test('los textos hostiles quedan escapados en paneles, avisos y el error', () => {
  const veneno = '<script>alert(1)</script>';
  const img = '<img src=x onerror=alert(1)>';
  const resultado = decodificarAutomatico(partida({
    carrera: `1;2;3;${img};seed;0`,
    misc: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '0', '0', '0', '0', '1', '2', '3', '4', '5', '6', '7', '8', veneno],
    mods: `META:*${img}," onclick=alert(2);Maloso:{"lastVersion":"${img}"}`,
  }));
  assert.equal(resultado.ok, true, resultado.error);
  const html = renderizarPaneles(resultado.paneles, (valor) => String(valor));
  const avisos = renderizarAdvertencias(resultado.advertencias);
  const alerta = renderizarAlerta(`${veneno}${img}`);
  for (const bloque of [html, avisos, alerta]) {
    assert.equal(bloque.includes('<script'), false);
    assert.equal(bloque.includes('<img'), false);
  }
  assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(avisos.includes('&lt;script&gt;'));
  assert.ok(alerta.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(alerta.includes('&lt;img'));

  const paneles = renderizarPaneles([
    {
      id: 'x',
      tipo: 'lista',
      titulo: veneno,
      nota: img,
      vacio: veneno,
      items: [{ titulo: img, marca: '" onclick=alert(3)', detalle: veneno }],
    },
    {
      id: 'b',
      tipo: 'barras',
      titulo: 'Barras',
      items: [{ etiqueta: img, valor: 2, detalle: veneno }],
    },
    {
      id: 'p',
      tipo: 'progreso',
      titulo: 'Progreso',
      grupos: [{ etiqueta: img, obtenidos: 1, total: 1, detalle: veneno, nombres: [veneno] }],
    },
    {
      id: 't',
      tipo: 'tabla',
      titulo: 'Tabla',
      columnas: [{ id: 'a', etiqueta: img }],
      filas: [{ a: veneno }],
    },
  ], (valor) => String(valor));
  assert.equal(paneles.includes('<script'), false);
  assert.equal(paneles.includes('<img'), false);
  assert.ok(paneles.includes('&quot; onclick=alert(3)'));
});

test('un mod con JSON enorme o muy anidado no se interpreta y no tira', () => {
  const profundo = `${'['.repeat(80)}1${']'.repeat(80)}`;
  const enorme = `{"lastVersion":"${'x'.repeat(120_000)}"}`;
  const resultado = decodificarAutomatico(partida({
    mods: `Profundo:${profundo};Enorme:${enorme};META:uno`,
  }));
  assert.equal(resultado.ok, true, resultado.error);
  assert.ok(resultado.advertencias.some((aviso) => aviso.includes('no lo interpreté')));
  assert.equal(resultado.datos.mods.datos.find((mod) => mod.id === 'Profundo').version, null);
  assert.equal(resultado.datos.mods.lista[0].nombre, 'uno');
  const html = renderizarPaneles(resultado.paneles, (valor) => String(valor));
  assert.ok(html.length < 500_000);
});

test('una lista META kilométrica no se despliega entera', () => {
  const resultado = decodificarAutomatico(partida({
    mods: `META:${'mod,'.repeat(5_000)}fin`,
  }));
  assert.equal(resultado.ok, true, resultado.error);
  assert.ok(resultado.advertencias.some((aviso) => aviso.includes('META')));
  assert.equal(resultado.datos.mods.lista.length, 0);
});

test('el JSON de un mod no pisa Object.prototype', () => {
  const antes = Object.prototype.polluted;
  const resultado = decodificarAutomatico(partida({
    mods: 'Mal:{"__proto__":{"lastVersion":"pwn","polluted":true},"lastVersion":"1.2"}',
  }));
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(Object.prototype.polluted, antes);
  assert.equal(resultado.datos.mods.datos[0].version, '1.2');
});

test('si hay más nombres que los que entran en la lista, el conteo queda y el HTML no', () => {
  const resultado = decodificarAutomatico(partida({
    mejoras: '1'.repeat(4_000),
    logros: '1'.repeat(2_000),
  }));
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(resultado.datos.mejoras.compradas, 2_000);
  assert.equal(resultado.datos.mejoras.nombresCompradas.length, 1_500);
  assert.equal(resultado.datos.logros.obtenidos, 2_000);
  assert.equal(resultado.datos.logros.nombres.length, 1_500);
  const html = renderizarPaneles(resultado.paneles, (valor) => String(valor));
  assert.ok(html.length < 1_500_000);
  assert.ok(resultado.advertencias.some((aviso) => aviso.includes('primeros')));
});

test('un número de estadísticas interminable avisa y queda en cero', () => {
  const resultado = decodificarAutomatico(partida({ misc: ['9'.repeat(120), '20'] }));
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(resultado.datos.galletas, 0);
  assert.ok(resultado.advertencias.some((aviso) => aviso.includes('demasiado largo')));
});

test('la bóveda, aunque liste todas las mejoras, no se lee como número roto', () => {
  // La loc tiene 876 mejoras (ids 0 a 875). WriteSave las junta con coma.
  const boveda = Array.from({ length: 876 }, (_, id) => String(id)).join(',');
  assert.ok(boveda.length > 3_000, boveda.length);
  const misc = Array.from({ length: 55 }, () => '1');
  misc[0] = '4.615326035923986e+56';
  misc[1] = '20';
  misc[8] = '10';
  misc[22] = 'halloween';
  misc[29] = '0';
  misc[46] = '0';
  misc[47] = boveda;
  const resultado = decodificarAutomatico(partida({ misc }));
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(resultado.datos.galletas, 4.615326035923986e+56);
  assert.equal(resultado.datos.temporada.nombre, 'Halloween');
  assert.equal(resultado.datos.modoAscension.nombre, 'Ninguno');
  assert.equal(resultado.advertencias.some((aviso) => aviso.includes('demasiado largo')), false);
});

test('un %XX partido por salto o ancho cero sigue siendo la partida', () => {
  const plano = '2.053||111;222;333;Panadería;seed;0|1|10;20|1,1,1,1|11|1||';
  const escapado = escapeComoElJuego(`${Buffer.from(plano, 'utf8').toString('base64')}!END!`);
  const indice = escapado.indexOf('%');
  assert.ok(indice >= 0);
  const partido = [
    `${escapado.slice(0, indice + 2)}\u200b${escapado.slice(indice + 2)}`,
    `${escapado.slice(0, indice + 1)}\n${escapado.slice(indice + 1)}`,
    escapado.replace('%', '%E2%80%8B%'),
  ];
  for (const entrada of partido) {
    const resultado = decodificarAutomatico(entrada);
    assert.equal(resultado.ok, true, resultado.error);
    assert.equal(resultado.datos.nombre, 'Panadería');
    assert.equal(resultado.advertencias.some((aviso) => aviso.includes('no traía el cierre')), false);
  }
});

test('una 2.053 cargada, con la bóveda llena, entra y el relleno de minijuego solo avisa la forma', () => {
  const minijuego = '1:2:3:'.repeat(120);
  const edificios = Array.from({ length: 20 }, () => `10,20,30,1,${minijuego},0,10`).join(';');
  const misc = Array.from({ length: 55 }, () => '0');
  misc[0] = '9.062424055290409e52';
  misc[1] = '4.615326035923986e56';
  misc[8] = '1.0425252089159072e56';
  misc[22] = 'halloween';
  misc[47] = Array.from({ length: 876 }, (_, id) => String(id)).join(',');
  const mods = `Cookie Assistant 2 0:${JSON.stringify({ lastVersion: '0.9.33', datos: 'x'.repeat(4_000) })};META:*sample mod,cookieassistant2`;
  const resultado = decodificarAutomatico(partida({
    carrera: '1700000000000;1686353674943;1792386084103;Horno Grande;qdlfx;0,1,2,3,4,5,6',
    misc,
    edificios,
    mejoras: '1'.repeat(875 * 2),
    logros: '1'.repeat(643),
    efectos: '0,300,150,7',
    mods,
  }));
  assert.equal(resultado.ok, true, resultado.error);
  // El relleno `1:2:3:` no es un jardín, una bolsa, un panteón ni un grimorio.
  // Avisa por eso, y no por la bóveda ni por un número demasiado largo.
  assert.deepEqual(resultado.advertencias, [
    'El jardín no tiene la forma que escribe el fuente. Lo dejo sin interpretar.',
    'La bolsa no tiene la forma que escribe el fuente. Lo dejo sin interpretar.',
    'El panteón no tiene la forma que escribe el fuente. Lo dejo sin interpretar.',
    'El grimorio no tiene la forma que escribe el fuente. Lo dejo sin interpretar.',
  ]);
  assert.equal(resultado.datos.edificios.length, 20);
  assert.equal(resultado.datos.edificios[19].nombre, 'Tú');
  assert.equal(resultado.datos.mejoras.compradas, 875);
  assert.equal(resultado.datos.mejoras.nombresCompradas.length, 875);
  assert.equal(resultado.datos.logros.obtenidos, 643);
  assert.equal(resultado.datos.logros.nombres.length, 643);
  assert.equal(resultado.datos.galletas, 9.062424055290409e52);
  assert.equal(resultado.datos.mods.datos[0].version, '0.9.33');
  assert.equal(resultado.datos.efectos[0].nombre, 'Frenesí');
  const html = renderizarPaneles(resultado.paneles, (valor) => String(valor));
  assert.ok(html.includes('Horno Grande'));
  assert.ok(html.includes('Dedo índice reforzado'));
});

test('un payload de más de un mega, todavía bajo el tope, se rechaza rápido', { timeout: 30_000 }, () => {
  const plano = [
    '2.053',
    '',
    '1;2;3;N;s;0',
    '1',
    '10;20',
    '1,1,1,1;',
    '1'.repeat(1_200_000),
    '1',
    '',
    '',
  ].join('|');
  const codigo = envolver(plano);
  assert.ok(codigo.length < LIMITE_CODIGO);
  assert.ok(codigo.length > 1_000_000);
  const { valor, ms } = medir(() => decodificarAutomatico(codigo));
  assert.ok(ms < 15_000, `tardó ${ms.toFixed(0)} ms`);
  assert.equal(valor.ok, false);
  assert.equal(valor.error, MENSAJE_ENORME);
});
