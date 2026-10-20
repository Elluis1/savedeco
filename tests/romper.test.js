// Casos hostiles para los lectores. Todo se genera acá: no hay fixtures de varios MB.
// Los márgenes de tiempo son holgados a propósito, para que un CI lento no falle en falso.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { leerMinijuego } from '../js/lectores/cookie-clicker/minijuegos.js';
import { MENSAJE_DANADO, MENSAJE_ENORME, MENSAJE_TRUNCADO, aperturasDelCodigo, decodificar, detectar } from '../js/lectores/cookie-clicker/formato.js';
import { LIMITE_CODIGO, MENSAJE_DESCONOCIDO, MENSAJE_LARGO, decodificarAutomatico, presentar } from '../js/nucleo/decodificar.js';
import { armarArchivo, documentoDe, escaparCsv, nombreArchivo } from '../js/nucleo/exportar.js';
import { formatearNumero } from '../js/nucleo/numeros.js';
import { renderizarAdvertencias, renderizarAlerta, renderizarPanel, renderizarPaneles } from '../js/nucleo/paneles.js';
import { registrar } from '../js/nucleo/registro.js';
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

test('el botón abre el base64 una sola vez', async () => {
  // Cuenta aperturas: un umbral de milisegundos falla en un CI cargado
  // aunque el reuso esté bien, o pasa aunque se haya abierto dos veces.
  const horno = partida();
  const otra = partida({ carrera: '111;222;333;Otra;seed;0,1,0,0,0,0,0' });

  const antesBoton = aperturasDelCodigo();
  const junto = decodificarAutomatico(horno);
  assert.equal(aperturasDelCodigo() - antesBoton, 1);
  assert.equal(junto.ok, true, junto.error);
  assert.equal(junto.datos.nombre, 'Horno');

  // Otro texto, en el mismo turno, no hereda el plano ni la panadería.
  detectar(horno);
  const antesCruce = aperturasDelCodigo();
  const cruce = decodificar(otra);
  assert.equal(aperturasDelCodigo() - antesCruce, 1);
  assert.equal(cruce.ok, true, cruce.error);
  assert.equal(cruce.datos.nombre, 'Otra');

  // El mismo texto, enseguida, no se abre de nuevo.
  const antesMismo = aperturasDelCodigo();
  detectar(horno);
  const reusado = decodificar(horno);
  assert.equal(aperturasDelCodigo() - antesMismo, 1);
  assert.equal(reusado.ok, true, reusado.error);
  assert.equal(reusado.datos.nombre, 'Horno');

  // Ya se consumió: la siguiente lectura suelta abre ella misma.
  const antesSuelta = aperturasDelCodigo();
  const suelta = decodificar(horno);
  assert.equal(aperturasDelCodigo() - antesSuelta, 1);
  assert.equal(suelta.datos.nombre, 'Horno');

  // El microturno suelta lo que nadie pidió: el mismo texto hay que abrirlo de nuevo.
  detectar(horno);
  await Promise.resolve();
  const antesMicro = aperturasDelCodigo();
  const trasMicro = decodificar(horno);
  assert.equal(aperturasDelCodigo() - antesMicro, 1);
  assert.equal(trasMicro.ok, true, trasMicro.error);
  assert.equal(trasMicro.datos.nombre, 'Horno');

  // Y una partida distinta no sale con el nombre de la que quedó en el turno anterior.
  const antesOtra = aperturasDelCodigo();
  const elluis = decodificar(fixture);
  assert.equal(aperturasDelCodigo() - antesOtra, 1);
  assert.equal(elluis.ok, true, elluis.error);
  assert.equal(elluis.datos.nombre, 'Elluis');
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

const AHORA_HOSTIL = new Date('2026-10-20T12:00:00.000Z');

function edificiosCon(indice, mini, nivel = 9) {
  const vacio = '1,1,1,1,,0,1';
  const lista = Array.from({ length: Math.max(indice + 1, 8) }, () => vacio);
  lista[indice] = `10,20,30,${nivel},${mini},0,10`;
  return lista.join(';');
}

function jardinCrudo({ suelo = '0', cosechas = '3', semillas = '0'.repeat(34), celdas = '0:0:'.repeat(36) } = {}) {
  return `1000:${suelo}:2000:0:${cosechas}:4:1:0:3000: ${semillas} ${celdas}`;
}

function bienesBolsa(filas) {
  return `2:3:1:0:0: ${filas.join('!')}! 0`;
}

function filaBien(sobre = {}) {
  const base = { valor: '100', modo: '1', deriva: '-26', ticks: '9', stock: '4', oculto: '0', op: '1', previo: '250', ...sobre };
  return [base.valor, base.modo, base.deriva, base.ticks, base.stock, base.oculto, base.op, base.previo].join(':');
}

test('el jardín avisa si la parcela, la planta o la edad no cierran, y no tira', () => {
  const raro = Array.from({ length: 36 }, (_, i) => {
    if (i === 0) return '35:500';
    if (i === 1) return '1:-1';
    return '0:0';
  }).join(':') + ':';
  const resultado = decodificarAutomatico(partida({
    edificios: edificiosCon(2, jardinCrudo({ celdas: raro }), -5),
  }));
  assert.equal(resultado.ok, true, resultado.error);
  const jardin = resultado.datos.minijuegos.jardin;
  assert.equal(jardin.ok, true);
  assert.equal(jardin.casilleros.length, 36);
  assert.equal(jardin.casilleros[0].nombre, 'Planta desconocida #34');
  assert.equal(jardin.casilleros[0].edad, 500);
  assert.equal(jardin.casilleros[1].nombre, 'Trigo de panadero');
  assert.equal(jardin.casilleros[1].edad, -1);
  for (const casilla of jardin.casilleros) {
    assert.ok(casilla.x >= 0 && casilla.x <= 5, casilla.x);
    assert.ok(casilla.y >= 0 && casilla.y <= 5, casilla.y);
  }
  assert.equal(jardin.casilleros.filter((casilla) => casilla.abierto).length, 4);
  const avisos = resultado.advertencias.join(' ');
  assert.match(avisos, /planta del jardín/);
  assert.match(avisos, /edad del jardín fuera de 0 a 100/);
  assert.match(avisos, /nivel de la granja es negativo/);
  assert.equal(avisos.includes('demasiado largo'), false);
  assert.equal(avisos.includes('cantidad de semillas'), false);

  const chica = decodificarAutomatico(partida({
    edificios: edificiosCon(2, jardinCrudo({ celdas: '1:10:'.repeat(5) })),
  }));
  assert.equal(chica.ok, true, chica.error);
  assert.equal(chica.datos.minijuegos.jardin.casilleros.length, 5);
  assert.ok(chica.advertencias.some((aviso) => aviso.includes('cantidad de semillas o de casilleros')));
  const htmlChica = renderizarPaneles(presentar(chica, (valor) => String(valor)), (valor) => String(valor));
  assert.equal((htmlChica.match(/celda-mosaico/g) || []).length, 5);

  const deMas = decodificarAutomatico(partida({
    edificios: edificiosCon(2, jardinCrudo({ celdas: '0:0:'.repeat(37) })),
  }));
  assert.equal(deMas.ok, true, deMas.error);
  assert.equal(deMas.datos.minijuegos.jardin.ok, false);
  assert.equal(deMas.datos.minijuegos.jardin.casilleros, undefined);
  assert.match(deMas.datos.minijuegos.jardin.aviso, /más casilleros que la parcela de 6 por 6/);
  const htmlDeMas = renderizarPaneles(presentar(deMas, (valor) => String(valor)), (valor) => String(valor));
  assert.equal(htmlDeMas.includes('celda-mosaico'), false);
  assert.match(htmlDeMas, /6 por 6/);
  assert.match(htmlDeMas, /No dibujo la parcela/);
  assert.equal(htmlDeMas.includes('no trae casilleros'), false);

  const conDecimal = leerMinijuego(2, jardinCrudo(), 2.2, 'Horno');
  const nivelEntero = leerMinijuego(2, jardinCrudo(), 2, 'Horno');
  assert.equal(conDecimal.ok, true, conDecimal.aviso);
  assert.equal(conDecimal.casilleros.length, 36);
  assert.deepEqual(
    conDecimal.casilleros.map((casilla) => casilla.abierto),
    nivelEntero.casilleros.map((casilla) => casilla.abierto),
  );

  const formas = [
    jardinCrudo().replace(' ', '  '),
    jardinCrudo().split(' ').slice(0, 2).join(' '),
    `${jardinCrudo()} sobra`,
    jardinCrudo({ semillas: '012' }),
    jardinCrudo({ celdas: '1:2:3' }),
    jardinCrudo({ suelo: 'NaN' }),
    jardinCrudo({ cosechas: 'Infinity' }),
    jardinCrudo({ cosechas: '1e309' }),
  ];
  for (const crudo of formas) {
    const leido = leerMinijuego(2, crudo, 9, 'Horno');
    assert.equal(leido.ok, false, crudo);
    assert.equal(typeof leido.aviso, 'string');
    assert.ok(leido.aviso.length > 20);
  }
});

test('el panteón, el grimorio y la bolsa avisan ids y cantidades que no cierran', () => {
  const panteon = leerMinijuego(6, '99/-2/11 9 1000 1', 1, 'Horno');
  assert.equal(panteon.ok, true);
  assert.equal(panteon.ranuras[1].espiritu, 'espíritu #-2');
  assert.notEqual(panteon.ranuras[1].espiritu, 'vacía');
  assert.match(panteon.aviso, /espíritu 99/);
  assert.match(panteon.aviso, /espíritu -2/);
  assert.match(panteon.aviso, /espíritu 11/);
  assert.match(panteon.aviso, /cambios de culto/);
  const vacio = leerMinijuego(6, '-1/-1/-1 3 1000 1', 1, 'Horno');
  assert.equal(vacio.ok, true);
  assert.equal(vacio.aviso, null);
  assert.deepEqual(vacio.ranuras.map((ranura) => ranura.espiritu), ['vacía', 'vacía', 'vacía']);
  assert.equal(leerMinijuego(6, '-1/1 3 1000 1', 1, 'H').ok, false);
  assert.equal(leerMinijuego(6, 'NaN/1/2 0 1 1', 1, 'H').ok, false);
  assert.equal(leerMinijuego(6, '1/2/3 Infinity 1 1', 1, 'H').ok, false);

  const grimorio = leerMinijuego(7, '-4 -1 9007199254740991 1', 1, 'H');
  assert.equal(grimorio.ok, true);
  assert.equal(grimorio.magia, -4);
  assert.equal(grimorio.hechizos, -1);
  assert.match(grimorio.aviso, /negativa o desmedida/);
  assert.equal(leerMinijuego(7, 'NaN 1 2 1', 1, 'H').ok, false);
  assert.equal(leerMinijuego(7, 'Infinity 1 2 0', 1, 'H').ok, false);
  assert.equal(leerMinijuego(7, '1 2 3', 1, 'H').ok, false);
  const sano = leerMinijuego(7, '3.8853020766158295 12 137 1', 1, 'H');
  assert.equal(sano.ok, true);
  assert.equal(sano.aviso, null);

  const filas = Array.from({ length: 18 }, (_, i) => (
    i === 0 ? filaBien({ modo: '99', stock: '-9', op: '8', valor: '-100' }) : filaBien()
  ));
  const bolsa = leerMinijuego(5, bienesBolsa(filas), 1, "Horno $&$'");
  assert.equal(bolsa.ok, true);
  assert.equal(bolsa.bienes.length, 18);
  assert.equal(bolsa.bienes[0].stock, -9);
  assert.equal(bolsa.bienes[0].modo.nombre, 'modo #99');
  assert.equal(bolsa.bienes[0].operacion.nombre, 'operación #8');
  assert.equal(bolsa.bienes[17].nombre, "Horno $&$'");
  assert.match(bolsa.aviso, /cantidad negativa o desmedida/);
  assert.match(bolsa.aviso, /modo, una operación o un estilo/);
  const perdida = leerMinijuego(5, bienesBolsa(Array.from({ length: 18 }, () => filaBien())).replace(':0:0: ', ':-3.5:0: '), 1, 'Horno');
  assert.equal(perdida.ok, true, perdida.aviso);
  assert.equal(perdida.beneficios, -3.5);
  assert.equal(perdida.aviso, null);

  const muchosCortos = leerMinijuego(5, bienesBolsa(Array.from({ length: 41 }, () => filaBien())), 1, 'H');
  assert.equal(muchosCortos.ok, false);
  assert.match(muchosCortos.aviso, /demasiados bienes/);
  assert.equal(muchosCortos.bienes, undefined);
});

test('una bolsa de cientos de miles de bienes no se parte ni tarda', { timeout: 20_000 }, () => {
  const texto = `1:0:0:0:0: ${'1:0:0:0:0:0:0:0!'.repeat(200_000)} 0`;
  assert.ok(texto.length > 1_000_000);
  const { valor, ms } = medir(() => leerMinijuego(5, texto, 1, 'Horno'));
  assert.ok(ms < 500, `tardó ${ms.toFixed(0)} ms`);
  assert.equal(valor.ok, false);
  assert.match(valor.aviso, /demasiado largo/);
  assert.equal(valor.bienes, undefined);
});

test('un nombre de panadería hostil no rompe Markdown, CSV, JSON, HTML ni el archivo', () => {
  const nombre = '\u2028=HYPERLINK("http://evil")\u3000<script>\u0085@suma\n## Inyectado';
  const resultado = decodificarAutomatico(partida({
    carrera: `111;222;333;${nombre};seed;0`,
    edificios: edificiosCon(5, bienesBolsa(Array.from({ length: 18 }, () => filaBien()))),
  }));
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(resultado.datos.nombre, nombre);
  assert.equal(resultado.datos.minijuegos.bolsa.bienes[17].nombre, nombre);

  const html = renderizarPaneles(presentar(resultado, (valor) => String(valor)), (valor) => String(valor));
  assert.equal(html.includes('<script'), false);
  assert.equal(html.includes('<img'), false);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('HYPERLINK'));

  const opciones = { ahora: AHORA_HOSTIL };
  const texto = armarArchivo(resultado, 'texto', opciones);
  const csv = armarArchivo(resultado, 'csv', opciones);
  const json = armarArchivo(resultado, 'json', opciones);
  for (const archivo of [texto, csv, json]) {
    assert.equal(archivo.nombre.includes('\u2028'), false, archivo.nombre);
    assert.equal(archivo.nombre.includes('\u0085'), false, archivo.nombre);
    assert.equal(archivo.nombre.includes('<'), false, archivo.nombre);
    assert.equal(/[<>:"/\\|?*\u0000-\u001f]/.test(archivo.nombre), false, archivo.nombre);
  }
  assert.ok(texto.nombre.endsWith('.txt'));
  assert.equal(texto.contenido.includes('\u2028'), false);
  assert.equal(texto.contenido.includes('\u0085'), false);
  const lineaPartida = texto.contenido.split('\n').find((linea) => linea.startsWith('- Partida:'));
  assert.ok(lineaPartida.includes('## Inyectado'));
  assert.equal(texto.contenido.split('\n').some((linea) => linea.startsWith('## Inyectado')), false);

  assert.equal(csv.contenido.includes('\u2028'), true);
  const celda = csv.contenido.split('\r\n').find((fila) => fila.includes('HYPERLINK'));
  assert.ok(celda, csv.contenido.slice(0, 500));
  assert.ok(celda.includes('"\'\u2028=HYPERLINK'), celda);
  const datos = JSON.parse(json.contenido);
  const panaderia = datos.secciones.flatMap((seccion) => seccion.campos || []).find((campo) => campo.etiqueta === 'Panadería');
  assert.equal(panaderia.valor, nombre);

  assert.equal(escaparCsv('\u2028=1+1'), '"\'\u2028=1+1"');
  assert.equal(escaparCsv('\u3000=1+1'), "'\u3000=1+1");
  assert.equal(escaparCsv('\u2003=1+1'), "'\u2003=1+1");
  assert.equal(escaparCsv('\u2029@suma'), '"\'\u2029@suma"');
  assert.equal(escaparCsv('\u0085+cmd'), '"\'\u0085+cmd"');
  assert.equal(escaparCsv('\u1680-1'), "'\u1680-1");
  assert.equal(nombreArchivo('pan\u0085ader\u2028ia', 'txt', AHORA_HOSTIL), 'Savedeco-panaderia-2026-10-20.txt');
});

test('un mosaico vacío avisa y uno gigante no se dibuja ni se baja', () => {
  const vacio = renderizarPanel({
    id: 'vacio',
    tipo: 'mosaico',
    titulo: 'Nada',
    celdas: [],
    vacio: 'No vino la parcela.',
  }, (valor) => String(valor));
  assert.ok(vacio.includes('No vino la parcela.'));
  assert.equal(vacio.includes('celda-mosaico'), false);

  const celdas = Array.from({ length: 8_000 }, (_, i) => ({
    titulo: `<b>${i}</b>`,
    tono: 'inicio',
    etiqueta: `casilla ${i}`,
    linea: 'x'.repeat(40),
  }));
  const { valor: html, ms } = medir(() => renderizarPanel({
    id: 'grande',
    tipo: 'mosaico',
    titulo: 'Gigante',
    columnas: 6,
    celdas,
    detalle: {
      resumen: 'Ver',
      columnas: [{ id: 'a', etiqueta: 'A' }],
      filas: celdas,
    },
  }, (valor) => String(valor)));
  assert.ok(ms < 200, `tardó ${ms.toFixed(0)} ms`);
  assert.equal(html.includes('celda-mosaico'), false);
  assert.equal(html.includes('<b>'), false);
  assert.match(html, /8000 casilleros/);
  assert.ok(html.length < 2_000, html.length);

  const resultado = {
    ok: true,
    juego: 'sin-lector-hostil',
    nombreJuego: 'Hostil',
    version: '1',
    advertencias: [],
    datos: { nombre: 'Parcela' },
    paneles: [{ id: 'grande', tipo: 'mosaico', titulo: 'Gigante', celdas }],
  };
  const { valor: documento, ms: msDoc } = medir(() => documentoDe(resultado, { ahora: AHORA_HOSTIL }));
  assert.ok(msDoc < 200, `el documento tardó ${msDoc.toFixed(0)} ms`);
  const seccion = documento.secciones.find((item) => item.id === 'grande');
  assert.equal(seccion.tabla.filas.length, 0);
  assert.match(seccion.campos[0].valor, /8000 casilleros/);
  const bajada = armarArchivo(resultado, 'texto', { ahora: AHORA_HOSTIL, documento });
  assert.ok(bajada.contenido.length < 20_000, bajada.contenido.length);
  assert.ok(bajada.contenido.includes('8000 casilleros'));
});

test('un temporizador enorme, una versión rara y un nombre con separadores no tiran', () => {
  const misc = Array.from({ length: 23 }, () => '1');
  misc[20] = '9'.repeat(20);
  misc[22] = 'halloween';
  const enorme = decodificarAutomatico(partida({ misc }));
  assert.equal(enorme.ok, true, enorme.error);
  const html = renderizarPaneles(presentar(enorme, formatearNumero), formatearNumero);
  assert.ok(html.includes('un tiempo desmedido'));
  assert.equal(html.includes('e+'), false);

  const futura = decodificarAutomatico(partida({ version: '99.001' }));
  assert.equal(futura.ok, true, futura.error);
  assert.ok(futura.advertencias.some((aviso) => aviso.includes('más nueva')));
  const lejana = exigirError(partida({ version: '100.1', edificios: 'no' }));
  assert.ok(lejana.error === MENSAJE_DANADO || lejana.error === MENSAJE_TRUNCADO || lejana.error === MENSAJE_DESCONOCIDO);

  const conPipe = exigirError(partida({ carrera: '111;222;333;Ho|rno;seed;0' }));
  assert.equal(conPipe.error, MENSAJE_TRUNCADO);
  const conPuntoYComa = decodificarAutomatico(partida({ carrera: '111;222;333;Ho;rno;seed;0' }));
  assert.equal(conPuntoYComa.ok, true, conPuntoYComa.error);
  assert.equal(conPuntoYComa.datos.nombre, 'Ho');

  const suma = decodificarAutomatico(partida({
    misc: ['1e308', '1e308', '0', '0', '0', '0', '0', '0', '1e308'],
  }));
  assert.equal(suma.ok, true, suma.error);
  let paneles = '';
  assert.doesNotThrow(() => {
    paneles = renderizarPaneles(presentar(suma, formatearNumero), formatearNumero);
  });
  assert.equal(paneles.includes('TypeError'), false);
  assert.equal(paneles.includes('Infinity'), false);
  assert.ok(paneles.includes('∞'));
  const json = armarArchivo(suma, 'json', { ahora: AHORA_HOSTIL });
  assert.doesNotThrow(() => JSON.parse(json.contenido));
});
