import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { MENSAJE_LARGO, decodificarAutomatico } from '../js/nucleo/decodificar.js';
import { renderizarPaneles } from '../js/nucleo/paneles.js';
import { logros } from '../js/lectores/cookie-clicker/catalogo.js';
import { lector } from '../js/lectores/cookie-clicker/index.js';
import { armarExportacion } from '../js/lectores/cookie-clicker/formato.js';
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

  const jardin = datos.minijuegos.jardin;
  assert.equal(jardin.suelo.nombre, 'Barro');
  assert.equal(jardin.suelo.id, 0);
  assert.equal(jardin.congelado, false);
  assert.equal(jardin.cosechas, 0);
  assert.equal(jardin.cosechasTotales, 19);
  assert.equal(jardin.sacrificios, 0);
  assert.equal(jardin.abierto, false);
  assert.equal(jardin.semillas.length, 34);
  assert.deepEqual(
    jardin.semillas.filter((semilla) => semilla.desbloqueada).map((semilla) => semilla.nombre),
    ['Trigo de panadero', 'Maíz de pulgar', 'Hierbainsolente'],
  );
  assert.equal(jardin.casilleros.length, 36);
  const hierba = jardin.casilleros.find((casilla) => casilla.x === 3 && casilla.y === 0);
  assert.equal(hierba.nombre, 'Hierbainsolente');
  assert.equal(hierba.edad, 23);
  assert.equal(hierba.etapa, 'Brote');
  assert.equal(hierba.abierto, true);
  const madura = jardin.casilleros.find((casilla) => casilla.x === 5 && casilla.y === 0);
  assert.equal(madura.edad, 51);
  assert.equal(madura.etapa, 'Madurez');
  const cogollo = jardin.casilleros.find((casilla) => casilla.x === 1 && casilla.y === 1);
  assert.equal(cogollo.edad, 0);
  assert.equal(cogollo.etapa, 'Cogollo');

  const panteon = datos.minijuegos.panteon;
  assert.equal(panteon.ranuras[0].espiritu, 'vacía');
  assert.equal(panteon.ranuras[1].espiritu, 'Vomitrax, espíritu de la decadencia');
  assert.equal(panteon.ranuras[1].espirituId, 1);
  assert.equal(panteon.ranuras[2].espiritu, 'Godzamok, espíritu de la ruina');
  assert.equal(panteon.cambios, 0);
  assert.equal(panteon.ultimoCambio, 1792380656643);

  const grimorio = datos.minijuegos.grimorio;
  assert.equal(grimorio.magia, 3.8853020766158295);
  assert.equal(grimorio.hechizos, 12);
  assert.equal(grimorio.hechizosTotales, 137);
  assert.equal(grimorio.abierto, false);

  const bolsa = datos.minijuegos.bolsa;
  assert.equal(bolsa.oficina.nombre, 'Compañía de préstamos');
  assert.equal(bolsa.oficina.id, 2);
  assert.equal(bolsa.brokers, 93);
  assert.equal(bolsa.beneficios, 0);
  assert.equal(bolsa.estilo.nombre, 'líneas');
  assert.equal(bolsa.bienes.length, 18);
  assert.equal(bolsa.bienes[0].nombre, 'Cereales');
  assert.equal(bolsa.bienes[0].valorCentesimas, 2970);
  assert.equal(bolsa.bienes[0].valor, 29.7);
  assert.equal(bolsa.bienes[0].modo.nombre, 'subida lenta');
  assert.equal(bolsa.bienes[0].stock, 0);
  assert.equal(bolsa.bienes[4].nombre, 'Frutos secos');
  assert.equal(bolsa.bienes[4].valorCentesimas, 1582);
  assert.equal(bolsa.bienes[4].deriva, -0.26);
  assert.equal(bolsa.bienes[4].modo.id, 2);
  assert.equal(bolsa.bienes[17].nombre, 'Elluis');
  assert.equal(bolsa.bienes[17].empresa, 'Panadería de Elluis');
  assert.equal(bolsa.bienes[17].simbolo, 'TÚ');
  assert.equal(bolsa.bienes[17].valorCentesimas, 15676);
  assert.equal(bolsa.bienes[17].modo.nombre, 'caótico');
  assert.equal(bolsa.bienes[17].ticks, 496);

  const panelJardin = resultado.paneles.find((panel) => panel.id === 'jardin');
  assert.equal(panelJardin.tipo, 'mosaico');
  assert.equal(panelJardin.columnas, 6);
  assert.equal(panelJardin.celdas.length, 36);
  const celdaHierba = panelJardin.celdas.find((celda) => celda.marca === '1·4');
  assert.equal(celdaHierba.titulo, 'Hierbainsolente');
  assert.equal(celdaHierba.tono, 'medio');
  assert.match(celdaHierba.linea, /^Brote · 23$/);
  assert.match(celdaHierba.etiqueta, /Fila 1, columna 4/);
  assert.equal(panelJardin.celdas.some((celda) => celda.titulo === 'Hoyo vacío'), true);
  assert.equal(panelJardin.celdas.some((celda) => celda.titulo === 'Cerrado'), false);
  const html = renderizarPaneles(resultado.paneles, (valor) => String(valor));
  assert.equal((html.match(/celda-mosaico/g) || []).length, 36);
  assert.ok(html.includes('Hierbainsolente'));
  assert.ok(html.includes('Hoyo vacío'));
  assert.ok(html.includes('Ver las 16 plantas'));
  assert.ok(html.includes('Vomitrax, espíritu de la decadencia'));
  assert.ok(html.includes('Cereales'));

  const documento = armarExportacion(datos);
  const semillas = documento.secciones.find((seccion) => seccion.id === 'semillas');
  assert.equal(semillas.tabla.filas.length, 34);
  assert.equal(semillas.tabla.filas[0].desbloqueada, 'sí');
  assert.equal(semillas.tabla.filas[2].desbloqueada, 'no');
  const parcela = documento.secciones.find((seccion) => seccion.id === 'jardin');
  assert.equal(parcela.tabla.filas.length, 36);
  assert.equal(parcela.tabla.filas[0].planta, 'Hoyo vacío');
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

test('el nombre de la panadería en la bolsa queda literal y no se vuelve HTML', () => {
  const nombre = "$&$'$$<img src=x onerror=alert(1)>";
  const bienes = Array.from({ length: 18 }, () => '100:1:-26:9:4:0:1:250').join('!');
  const minijuego = `2:3:1:0:0: ${bienes}! 0`;
  const vacio = '1,1,1,1,,0,1';
  const plano = [
    '2.053',
    '',
    `1;2;3;${nombre};seed;0`,
    '1',
    '10;20',
    [vacio, vacio, vacio, vacio, vacio, `1,1,1,4,${minijuego},0,1`].join(';'),
    '11',
    '1',
    '',
    '',
  ].join('|');
  const resultado = lector.decodificar(envolver(plano));
  assert.equal(resultado.ok, true, resultado.error);
  const propio = resultado.datos.minijuegos.bolsa.bienes[17];
  assert.equal(propio.nombre, nombre);
  assert.equal(propio.empresa, `Panadería de ${nombre}`);
  assert.equal(resultado.datos.minijuegos.bolsa.bienes[0].nombre, 'Cereales');
  const html = renderizarPaneles(resultado.paneles, (valor) => String(valor));
  assert.equal(html.includes('<img'), false);
  assert.ok(html.includes('$&amp;$&#39;$$&lt;img src=x onerror=alert(1)&gt;'));
  const tabla = armarExportacion(resultado.datos).secciones.find((seccion) => seccion.id === 'bolsa');
  assert.equal(tabla.tabla.filas[17].nombre, nombre);
  assert.equal(tabla.tabla.filas[17].empresa, `Panadería de ${nombre}`);
});

test('un minijuego con forma rara avisa y uno vacío no inventa datos', () => {
  const jardin = [
    '1000:9:2000:1:3:4:1:2:3000:',
    '10',
    '1:10:0:0:',
  ].join(' ');
  const vacio = '1,1,1,1,,0,1';
  const plano = [
    '2.053',
    '',
    '111;222;333;Horno;abc;0',
    '1',
    '10;20',
    [vacio, vacio, `1,1,1,1,${jardin},0,1`, vacio, vacio, '1,1,1,1,no-es-bolsa,0,1'].join(';'),
    '11',
    '1',
    '',
    '',
  ].join('|');
  const resultado = lector.decodificar(envolver(plano));
  assert.equal(resultado.ok, true, resultado.error);
  const datos = resultado.datos;
  assert.equal(datos.minijuegos.jardin.suelo.nombre, 'desconocido (9)');
  assert.equal(datos.minijuegos.jardin.congelado, true);
  assert.equal(datos.minijuegos.jardin.cosechas, 3);
  assert.equal(datos.minijuegos.jardin.cosechasTotales, 4);
  assert.equal(datos.minijuegos.jardin.sacrificios, 2);
  assert.equal(datos.minijuegos.jardin.casilleros[0].nombre, 'Trigo de panadero');
  assert.equal(datos.minijuegos.jardin.casilleros[0].etapa, 'Cogollo');
  assert.equal(datos.minijuegos.jardin.casilleros[0].abierto, false);
  const panelJardin = resultado.paneles.find((panel) => panel.id === 'jardin');
  assert.equal(panelJardin.celdas.length, 2);
  assert.equal(panelJardin.celdas[0].titulo, 'Trigo de panadero');
  assert.equal(panelJardin.celdas[0].tono, 'inicio');
  assert.match(panelJardin.celdas[0].linea, /Cogollo · 10 · cerrado/);
  assert.equal(panelJardin.celdas[1].titulo, 'Cerrado');
  assert.equal(panelJardin.celdas[1].tono, 'apagado');
  const htmlJardin = renderizarPaneles([panelJardin], (valor) => String(valor));
  assert.ok(htmlJardin.includes('tono-apagado'));
  assert.ok(htmlJardin.includes('Cerrado'));
  assert.equal(datos.minijuegos.bolsa.presente, true);
  assert.equal(datos.minijuegos.bolsa.ok, false);
  assert.equal(datos.minijuegos.panteon.presente, false);
  assert.ok(resultado.advertencias.some((aviso) => aviso.includes('suelo')));
  assert.ok(resultado.advertencias.some((aviso) => aviso.includes('La bolsa')));
  assert.equal(resultado.advertencias.some((aviso) => aviso.includes('panteón')), false);
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
