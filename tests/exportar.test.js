import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { logros, mejoras } from '../js/lectores/cookie-clicker/catalogo.js';
import { lector } from '../js/lectores/cookie-clicker/index.js';
import {
  armarArchivo,
  armarCsv,
  armarJson,
  armarTexto,
  documentoDe,
  escaparCsv,
  nombreArchivo,
} from '../js/nucleo/exportar.js';
import { formatearNumero } from '../js/nucleo/numeros.js';
import { registrar } from '../js/nucleo/registro.js';
import '../js/lectores/indice.js';

const fixture = fs.readFileSync(new URL('./fixtures/luigi-cookieclicker.txt', import.meta.url), 'utf8');
const AHORA = new Date('2026-10-19T22:24:00.000Z');

function envolver(plano) {
  return Buffer.from(plano, 'utf8').toString('base64') + '!END!';
}

function parsearCsv(texto) {
  assert.equal(texto.charCodeAt(0), 0xfeff);
  const crudo = texto.slice(1);
  const filas = [];
  let fila = [];
  let celda = '';
  let enComillas = false;
  for (let i = 0; i < crudo.length; i += 1) {
    const c = crudo[i];
    if (enComillas) {
      if (c === '"') {
        if (crudo[i + 1] === '"') {
          celda += '"';
          i += 1;
        } else {
          enComillas = false;
        }
      } else {
        celda += c;
      }
      continue;
    }
    if (c === '"') {
      enComillas = true;
      continue;
    }
    if (c === ';') {
      fila.push(celda);
      celda = '';
      continue;
    }
    if (c === '\r') continue;
    if (c === '\n') {
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = '';
      continue;
    }
    celda += c;
  }
  if (celda.length || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas;
}

function seccion(documento, id) {
  return documento.secciones.find((item) => item.id === id);
}

test('escaparCsv cubre punto y coma, comillas, saltos y fórmulas', () => {
  assert.equal(escaparCsv('Ñandú'), 'Ñandú');
  assert.equal(escaparCsv('Fábrica'), 'Fábrica');
  assert.equal(escaparCsv('a;b'), '"a;b"');
  assert.equal(escaparCsv('dice "hola"'), '"dice ""hola"""');
  assert.equal(escaparCsv('uno\ndos'), '"uno\ndos"');
  assert.equal(escaparCsv('uno\r\ndos'), '"uno\r\ndos"');
  assert.equal(escaparCsv('=1+1'), "'=1+1");
  assert.equal(escaparCsv('+cmd'), "'+cmd");
  assert.equal(escaparCsv('-1'), "'-1");
  assert.equal(escaparCsv('@suma'), "'@suma");
  assert.equal(escaparCsv('=1;2'), `"'=1;2"`);
  assert.equal(escaparCsv('Ñoño; "cita"'), '"Ñoño; ""cita"""');
});

test('el nombre de archivo usa la partida y la fecha, y saca lo que Windows rechaza', () => {
  assert.equal(nombreArchivo('Elluis', 'txt', AHORA), 'Savedeco-Elluis-2026-10-19.txt');
  assert.equal(nombreArchivo('Horno de prueba', 'csv', AHORA), 'Savedeco-Horno de prueba-2026-10-19.csv');
  const sucio = nombreArchivo('a:b*c?d"e<f>g|h\\i/j Ñandú.', 'json', AHORA);
  assert.equal(/[<>:"/\\|?*]/.test(sucio), false);
  assert.ok(sucio.includes('Ñandú'));
  assert.ok(sucio.endsWith('-2026-10-19.json'));
  assert.equal(nombreArchivo('...', 'txt', AHORA), 'Savedeco-partida-2026-10-19.txt');
  assert.equal(nombreArchivo('   ', 'txt', AHORA), 'Savedeco-partida-2026-10-19.txt');
  const largo = nombreArchivo('x'.repeat(200), 'txt', AHORA);
  assert.ok(largo.length < 120);
  assert.equal(/[<>:"/\\|?*\u0000-\u001f]/.test(largo), false);
});

test('la partida de Elluis arma texto, CSV y JSON', () => {
  const resultado = lector.decodificar(fixture);
  assert.equal(resultado.ok, true, resultado.error);
  const opciones = { ahora: AHORA };
  const inicio = performance.now();
  const texto = armarArchivo(resultado, 'texto', opciones);
  const csv = armarArchivo(resultado, 'csv', opciones);
  const json = armarArchivo(resultado, 'json', opciones);
  assert.ok(performance.now() - inicio < 1000, performance.now() - inicio);

  assert.equal(texto.nombre, 'Savedeco-Elluis-2026-10-19.txt');
  assert.equal(csv.nombre, 'Savedeco-Elluis-2026-10-19.csv');
  assert.equal(json.nombre, 'Savedeco-Elluis-2026-10-19.json');
  assert.match(texto.mime, /text\/plain/);
  assert.match(csv.mime, /text\/csv/);
  assert.match(json.mime, /application\/json/);

  const cuerpo = texto.contenido;
  assert.match(cuerpo, /^# Savedeco — Cookie Clicker/);
  assert.ok(cuerpo.includes('Cookie Clicker'));
  assert.ok(cuerpo.includes('2.053'));
  assert.ok(cuerpo.includes('Elluis'));
  assert.ok(cuerpo.includes('2026-10-19T22:24:00.000Z'));
  assert.ok(cuerpo.includes('19 de octubre de 2026'));
  assert.ok(cuerpo.includes('UTC'));
  assert.ok(cuerpo.includes('Cómo leer este archivo'));
  assert.ok(cuerpo.includes('billón es 10^9'));
  assert.ok(cuerpo.includes('ids numéricos'));
  assert.ok(cuerpo.includes('bóveda'));
  assert.ok(cuerpo.includes('minijuego'));
  assert.ok(cuerpo.includes(formatearNumero(resultado.datos.galletas)));
  assert.ok(cuerpo.includes(resultado.datos.galletas.toExponential()));
  assert.ok(cuerpo.includes(formatearNumero(resultado.datos.prestigio)));
  assert.ok(cuerpo.includes('470647246012985'));
  assert.ok(cuerpo.includes('qdlfx'));
  assert.ok(cuerpo.includes('Cursor'));
  assert.ok(cuerpo.includes('Tú'));
  assert.ok(cuerpo.includes('Fábrica'));
  assert.ok(cuerpo.includes('Galleta mañanera'));
  assert.ok(cuerpo.includes('conseguido'));
  assert.ok(cuerpo.includes('faltante'));
  assert.ok(cuerpo.includes('Dedo índice reforzado'));
  assert.ok(cuerpo.includes('comprada'));
  assert.ok(cuerpo.includes('desbloqueada'));
  assert.ok(cuerpo.includes('Ratón omnipresente'));
  assert.ok(cuerpo.includes('The Best Autoclicker'));
  assert.ok(cuerpo.includes('cookieassistant2'));
  assert.ok(cuerpo.includes('Frenesí'));
  assert.ok(cuerpo.includes('Southmayd & Choate'));
  assert.equal(cuerpo.includes('&amp;'), false);
  assert.ok(cuerpo.includes('Halloween'));

  const indiceFaltante = resultado.datos.logros.bits.indexOf('0');
  assert.ok(indiceFaltante >= 0);
  assert.ok(cuerpo.includes(logros[indiceFaltante]));

  assert.equal(csv.contenido.charCodeAt(0), 0xfeff);
  assert.ok(csv.contenido.includes('\r\n'));
  assert.equal(csv.contenido.includes('\uFEFF'), true);
  const filas = parsearCsv(csv.contenido);
  const juntas = filas.map((fila) => fila.join('\t'));
  assert.ok(juntas.some((fila) => fila.includes('Elluis')));
  assert.ok(juntas.some((fila) => fila.includes('Fábrica')));
  assert.ok(juntas.some((fila) => fila.includes('mañanera')));
  const adolphus = filas.find((fila) => fila.includes(logros[240]));
  assert.ok(adolphus, 'el logro con punto y coma tiene que quedar en una sola celda');
  assert.equal(adolphus.includes(logros[240]), true);
  assert.ok(logros[240].includes(';'));
  assert.ok(logros[240].includes('&'));
  const huevo = filas.find((fila) => fila.includes(mejoras[229]));
  assert.ok(huevo);
  assert.equal(huevo.some((celda) => celda === mejoras[229]), true);
  const galletas = filas.find((fila) => fila[0] === 'Galletas en el banco');
  assert.ok(galletas);
  assert.equal(galletas[1], formatearNumero(resultado.datos.galletas));
  assert.equal(galletas[2], `'${resultado.datos.galletas.toExponential()}`);
  const banco = filas.find((fila) => fila.includes('Cursor') && fila.includes('893'));
  assert.ok(banco);

  const datos = JSON.parse(json.contenido);
  assert.equal(datos.juego, 'Cookie Clicker');
  assert.equal(datos.idJuego, 'cookie-clicker');
  assert.equal(datos.version, '2.053');
  assert.equal(datos.titulo, 'Elluis');
  assert.equal(datos.exportado, '2026-10-19T22:24:00.000Z');
  assert.ok(datos.notas.some((nota) => nota.includes('bóveda')));
  assert.equal(datos.advertencias.length, 0);

  const logrosJson = seccion(datos, 'logros');
  assert.equal(logrosJson.tabla.filas.length, 643);
  assert.equal(logrosJson.tabla.filas.filter((fila) => fila.estado === 'conseguido').length, 523);
  assert.equal(logrosJson.tabla.filas.filter((fila) => fila.estado === 'faltante').length, 120);
  const maniana = logrosJson.tabla.filas.find((fila) => fila.nombre === 'Galleta mañanera');
  assert.equal(maniana.estado, 'conseguido');
  assert.equal(maniana.id.exacto, '0');
  const faltante = logrosJson.tabla.filas.find((fila) => fila.id.valor === indiceFaltante);
  assert.equal(faltante.estado, 'faltante');
  assert.equal(faltante.nombre, logros[indiceFaltante]);

  const mejorasJson = seccion(datos, 'mejoras');
  assert.equal(mejorasJson.tabla.filas.length, 875);
  assert.equal(mejorasJson.tabla.filas.filter((fila) => fila.estado === 'comprada').length, 717);
  assert.equal(mejorasJson.tabla.filas.filter((fila) => fila.estado === 'desbloqueada').length, 25);
  assert.equal(mejorasJson.tabla.filas.filter((fila) => fila.estado === 'faltante').length, 133);
  const dedo = mejorasJson.tabla.filas.find((fila) => fila.nombre === 'Dedo índice reforzado');
  assert.equal(dedo.estado, 'comprada');
  assert.equal(dedo.comprada, 'sí');

  const edificios = seccion(datos, 'edificios');
  const cursor = edificios.tabla.filas.find((fila) => fila.nombre === 'Cursor');
  assert.equal(cursor.cantidad.valor, 893);
  assert.equal(cursor.cantidad.exacto, '893');
  const tu = edificios.tabla.filas.find((fila) => fila.nombre === 'Tú');
  assert.equal(tu.cantidad.valor, 452);
  const fabrica = edificios.tabla.filas.find((fila) => fila.nombre === 'Fábrica');
  assert.equal(fabrica.ingles, 'Factory');

  const resumen = seccion(datos, 'resumen');
  const enBanco = resumen.campos.find((campo) => campo.etiqueta === 'Galletas en el banco');
  assert.equal(enBanco.exacto, resultado.datos.galletas.toExponential());
  assert.equal(enBanco.legible, formatearNumero(resultado.datos.galletas));
  const prestigio = seccion(datos, 'prestigio').campos.find((campo) => campo.etiqueta === 'Prestigio');
  assert.equal(prestigio.exacto, '470647246012985');
  const permanentes = seccion(datos, 'prestigio').tabla.filas;
  assert.equal(permanentes.find((fila) => fila.ranura.valor === 4).nombre, 'Ratón omnipresente');

  const mods = seccion(datos, 'mods');
  const autoclicker = mods.tabla.filas.find((fila) => fila.nombre === 'The Best Autoclicker');
  assert.equal(autoclicker.marca, 'en la lista');
  const asistente = mods.tabla.filas.find((fila) => fila.nombre === 'Cookie Assistant 2 0');
  assert.equal(asistente.version, '0.9.33');

  const sinNombre = seccion(datos, 'sin-nombre');
  assert.equal(sinNombre.campos.find((campo) => campo.etiqueta === 'Fondo').valor, 14);
  assert.equal(sinNombre.campos.find((campo) => campo.etiqueta === 'Leche').valor, 15);
  assert.ok(sinNombre.nota.includes('id'));
  assert.equal(sinNombre.tabla.filas.find((fila) => fila.gen === 'color de pelo').indice.valor, 1);

  assert.equal(seccion(datos, 'efectos').tabla.filas[0].nombre, 'Frenesí');
  assert.ok(json.contenido.length < 4_000_000);
  assert.ok(texto.contenido.length < 4_000_000);
  assert.ok(csv.contenido.length < 4_000_000);
});

test('un nombre con acentos, comillas, fórmula y HTML sale crudo y el CSV lo escapa', () => {
  const nombre = '=Ñandú "horno" & <script>';
  const misc = [
    '10', '20', '3', '4', '5', '6', '7', '8', '9',
    '0', '0', '0', '0', '0', '1', '2', '3', '4', '5', '6', '7', '8', 'christmas',
  ];
  const plano = [
    '2.052',
    '',
    `111;222;333;${nombre};abcde;1,2,3`,
    '101010',
    misc.join(';'),
    '4,5,6,1,,0,4;',
    '110011',
    '101',
    '',
    'META:*sample mod;',
  ].join('|');
  const resultado = lector.decodificar(envolver(plano));
  assert.equal(resultado.ok, true, resultado.error);
  assert.equal(resultado.datos.nombre, nombre);
  const texto = armarArchivo(resultado, 'texto', { ahora: AHORA });
  const csv = armarArchivo(resultado, 'csv', { ahora: AHORA });
  assert.ok(texto.contenido.includes(nombre));
  assert.equal(texto.contenido.includes('&amp;'), false);
  assert.equal(texto.contenido.includes('&lt;'), false);
  assert.equal(/[<>:"/\\|?*]/.test(texto.nombre), false);
  assert.ok(texto.nombre.includes('Ñandú'));
  assert.ok(texto.nombre.startsWith('Savedeco-'));
  const filas = parsearCsv(csv.contenido);
  const partida = filas.find((fila) => fila[0] === 'Partida');
  assert.ok(partida);
  assert.equal(partida[1], `'${nombre}`);
  assert.equal(partida[2], `'${nombre}`);
});

test('un lector sin exportación propia hereda los archivos desde los paneles', () => {
  const resultado = {
    ok: true,
    juego: 'terraria',
    nombreJuego: 'Terraria',
    version: '1.4.4',
    advertencias: ['El mundo vino sin semilla.'],
    datos: { nombre: 'Mundo Ñandú' },
    paneles: [
      {
        id: 'resumen',
        tipo: 'tarjetas',
        titulo: 'Resumen',
        nota: 'Datos del mundo.',
        items: [
          { etiqueta: 'Mundo', texto: 'Ñandú; "cita"\nsegunda' },
          { etiqueta: 'Trampa', texto: '=1+1' },
          { etiqueta: 'Vida', numero: 400 },
        ],
      },
      {
        id: 'items',
        tipo: 'tabla',
        titulo: 'Ítems',
        columnas: [
          { id: 'nombre', etiqueta: 'Nombre' },
          { id: 'cantidad', etiqueta: 'Cantidad' },
        ],
        filas: [{ nombre: 'Gel', cantidad: { numero: 2 } }],
      },
    ],
  };
  const documento = documentoDe(resultado, { ahora: AHORA });
  assert.equal(documento.juego, 'Terraria');
  assert.equal(documento.titulo, 'Mundo Ñandú');
  assert.ok(documento.notas.some((nota) => nota.includes('paneles')));
  const texto = armarTexto(documento);
  assert.ok(texto.includes('Terraria'));
  assert.ok(texto.includes('1.4.4'));
  assert.ok(texto.includes('Ñandú; "cita" segunda') || texto.includes('Ñandú; "cita"'));
  assert.ok(texto.includes('Gel'));
  assert.ok(texto.includes('El mundo vino sin semilla.'));
  const filas = parsearCsv(armarCsv(documento));
  const mundo = filas.find((fila) => fila[0] === 'Mundo');
  assert.equal(mundo[1], 'Ñandú; "cita"\nsegunda');
  const trampa = filas.find((fila) => fila[0] === 'Trampa');
  assert.equal(trampa[1], "'=1+1");
  const gel = filas.find((fila) => fila.includes('Gel'));
  assert.ok(gel);
  assert.ok(gel.includes('2'));
  const json = JSON.parse(armarJson(documento));
  assert.equal(json.idJuego, 'terraria');
  assert.equal(json.version, '1.4.4');
  assert.equal(json.advertencias[0], 'El mundo vino sin semilla.');
});

test('si el lector arma su documento, el núcleo usa eso y no los paneles', () => {
  registrar({
    id: 'propio',
    nombre: 'Propio',
    detectar: () => 0,
    decodificar: () => ({ ok: false, error: 'no', advertencias: [] }),
    armarExportacion: () => ({
      titulo: 'Planilla',
      juego: 'Propio',
      version: '9',
      notas: ['Nota del lector.'],
      secciones: [{
        id: 'unico',
        titulo: 'Único',
        nota: 'Viene del lector.',
        campos: [{ etiqueta: 'Marca', valor: 'desde-el-lector', tipo: 'texto' }],
      }],
    }),
  });
  const documento = documentoDe({
    ok: true,
    juego: 'propio',
    version: '0',
    datos: {},
    paneles: [{ id: 'x', tipo: 'tarjetas', titulo: 'Panel', items: [{ etiqueta: 'Otro', texto: 'solo-en-el-panel' }] }],
  }, { ahora: AHORA });
  assert.equal(documento.titulo, 'Planilla');
  assert.equal(documento.version, '9');
  assert.ok(documento.notas.some((nota) => nota === 'Nota del lector.'));
  const texto = armarTexto(documento);
  assert.ok(texto.includes('desde-el-lector'));
  assert.equal(texto.includes('solo-en-el-panel'), false);
});

test('si armar la exportación tira, igual se bajan los paneles', () => {
  registrar({
    id: 'se-cae',
    nombre: 'Se cae',
    detectar: () => 0,
    decodificar: () => ({ ok: false, error: 'no', advertencias: [] }),
    armarExportacion: () => {
      throw new Error('boom');
    },
  });
  const documento = documentoDe({
    ok: true,
    juego: 'se-cae',
    nombreJuego: 'Se cae',
    version: '1',
    datos: { nombre: 'Mundo' },
    paneles: [{ id: 'r', tipo: 'tarjetas', titulo: 'Resumen', items: [{ etiqueta: 'Dato', texto: 'desde-los-paneles' }] }],
  }, { ahora: AHORA });
  const texto = armarTexto(documento);
  assert.ok(texto.includes('desde-los-paneles'));
  assert.ok(texto.includes('detalle propio'));
  assert.equal(texto.includes('boom'), false);
});

test('sin una partida leída no hay archivo', () => {
  assert.equal(armarArchivo({ ok: false, error: 'no' }, 'texto'), null);
  assert.equal(armarArchivo(null, 'csv'), null);
  assert.equal(armarArchivo({ ok: true, juego: 'x', paneles: [] }, 'pdf'), null);
});

test('un documento enorme se corta en los tres formatos', () => {
  const documento = {
    juego: 'X',
    idJuego: 'x',
    version: '1',
    titulo: 'T',
    exportado: AHORA.toISOString(),
    notas: ['Nota corta.'],
    advertencias: [],
    secciones: [{
      id: 'muchos',
      titulo: 'Muchos',
      nota: 'Filas de más.',
      tabla: {
        columnas: [{ id: 'nombre', etiqueta: 'Nombre', tipo: 'texto' }],
        filas: Array.from({ length: 80 }, (_, i) => ({ nombre: `fila-${i}-${'x'.repeat(40)}` })),
      },
    }],
  };
  for (const armar of [armarTexto, armarCsv, armarJson]) {
    const salida = armar(documento, { limite: 1800 });
    assert.ok(salida.includes('fila-0'), armar.name);
    assert.equal(salida.includes('fila-79'), false, armar.name);
    assert.ok(salida.includes('se cortó al llegar al tope'), armar.name);
    assert.ok(salida.length < 1800 + 400, `${armar.name} ${salida.length}`);
  }
});

test('el núcleo no importa juegos y la página baja con Blob', () => {
  const nucleo = fs.readFileSync(new URL('../js/nucleo/exportar.js', import.meta.url), 'utf8');
  assert.equal(nucleo.includes('lectores'), false);
  assert.equal(nucleo.includes('cookie'), false);
  const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.ok(app.includes('URL.createObjectURL'));
  assert.ok(app.includes('new Blob'));
  assert.equal(/https?:\/\//.test(app), false);
  const csp = fs.readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
  assert.ok(csp.includes("script-src 'self'"));
  assert.equal(csp.includes('http://'), false);
  assert.equal(csp.includes('https://'), false);
});
