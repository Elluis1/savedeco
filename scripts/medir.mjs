// Mide peso, decodificación, memoria y (si hay Chrome) el primer render,
// la parcela, la apertura de las listas y la exportación. No instala nada.
// Los saves grandes se arman en memoria: no quedan archivos en el repo.
//
//   node --expose-gc scripts/medir.mjs
//
// Sin --expose-gc igual corre; la memoria retenida queda menos limpia.

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXTENSIONES_IMAGEN = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico']);

function mediana(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);
  return ordenados[Math.floor(ordenados.length / 2)];
}

function redondear(numero, decimales = 2) {
  const factor = 10 ** decimales;
  return Math.round(numero * factor) / factor;
}

function listar(directorio, predicado) {
  const archivos = [];
  if (!fs.existsSync(directorio)) return archivos;
  const pila = [directorio];
  while (pila.length) {
    const actual = pila.pop();
    for (const entrada of fs.readdirSync(actual, { withFileTypes: true })) {
      const completo = path.join(actual, entrada.name);
      if (entrada.isDirectory()) pila.push(completo);
      else if (predicado(completo)) archivos.push(completo);
    }
  }
  return archivos.sort();
}

function pesoDe(archivos) {
  let bytes = 0;
  let gzip = 0;
  const detalle = [];
  for (const archivo of archivos) {
    const contenido = fs.readFileSync(archivo);
    bytes += contenido.length;
    const comprimido = gzipSync(contenido).length;
    gzip += comprimido;
    detalle.push({
      archivo: path.relative(raiz, archivo),
      bytes: contenido.length,
      gzip: comprimido,
    });
  }
  return { bytes, gzip, detalle };
}

function planoSintetico(bytes) {
  const edificios = Array.from({ length: 20 }, () => '100,100,1.5e6,1,0,0,100').join(';');
  const cabeza = [
    '2.053',
    '',
    '1700000000000;1600000000000;1700000001000;Bench;seed;0,1,0,0,0,0,0',
    '1'.repeat(20),
    ['1e6', '2e6', '10', '4', '5', '1', '0', '0', '9', '0', '0', '0', '0', '0', '1'].join(';'),
    edificios,
    '1'.repeat(400),
    '1'.repeat(200),
    '0,300,150,7',
    '',
  ].join('|');
  const falta = Math.max(0, bytes - cabeza.length - 4);
  return `${cabeza}MOD:${'a'.repeat(falta)}`;
}

function envolver(plano) {
  return Buffer.from(plano, 'utf8').toString('base64') + '!END!';
}

// Igual que escape() del export de Cookie Clicker: + y el alfabeto quedan,
// / = ! y el resto salen como %XX.
function escaparComoElJuego(texto) {
  return texto.replace(/[^A-Za-z0-9@*_+\-./]/g, (caracter) => {
    const codigo = caracter.charCodeAt(0);
    return `%${codigo.toString(16).toUpperCase().padStart(2, '0')}`;
  });
}

function medirTiempos(fn, veces) {
  for (let i = 0; i < 2; i += 1) fn();
  const tiempos = [];
  let ultimo;
  for (let i = 0; i < veces; i += 1) {
    const inicio = performance.now();
    ultimo = fn();
    tiempos.push(performance.now() - inicio);
  }
  return { mediana: mediana(tiempos), min: Math.min(...tiempos), max: Math.max(...tiempos), ultimo };
}

function medirRetenido(fn) {
  if (global.gc) global.gc();
  const antes = process.memoryUsage().heapUsed;
  const resultado = fn();
  const justoDespues = process.memoryUsage().heapUsed;
  if (global.gc) global.gc();
  const despues = process.memoryUsage().heapUsed;
  return {
    resultado,
    justoDespues,
    retenido: despues - antes,
  };
}

function importEnProcesoNuevo(relativo) {
  const absoluto = path.join(raiz, relativo);
  const codigo = `
    const { performance } = await import('node:perf_hooks');
    const { pathToFileURL } = await import('node:url');
    const inicio = performance.now();
    await import(pathToFileURL(${JSON.stringify(absoluto)}).href);
    console.log(performance.now() - inicio);
  `;
  const corrida = spawnSync(process.execPath, ['--input-type=module', '-e', codigo], { encoding: 'utf8' });
  if (corrida.status !== 0) throw new Error(corrida.stderr || 'no pude importar');
  return Number(corrida.stdout.trim());
}

function buscarChrome() {
  for (const candidato of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    const encontrado = spawnSync('bash', ['-lc', `command -v ${candidato}`], { encoding: 'utf8' });
    if (encontrado.status === 0 && encontrado.stdout.trim()) return encontrado.stdout.trim();
  }
  return null;
}

function servir() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const relativo = decodeURIComponent(url.pathname);
    const archivo = path.normalize(relativo === '/' ? path.join(raiz, 'index.html') : path.join(raiz, relativo));
    if (!archivo.startsWith(raiz)) {
      res.writeHead(403);
      res.end();
      return;
    }
    fs.readFile(archivo, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end();
        return;
      }
      const tipos = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
      res.writeHead(200, {
        'Content-Type': tipos[path.extname(archivo)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function medirNavegador(puerto, fixture) {
  const binario = buscarChrome();
  if (!binario) {
    console.log('\nChrome no está en el PATH. El primer render no se midió en un navegador.');
    return null;
  }
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'savedeco-medir-'));
  const chrome = spawn(binario, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-precise-memory-info',
    '--window-size=1366,768',
    '--remote-debugging-port=0',
    `--user-data-dir=${perfil}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  let debugPort = null;
  chrome.stderr.setEncoding('utf8');
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome no abrió el puerto de depuración')), 8000);
    chrome.stderr.on('data', (chunk) => {
      const match = chunk.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/);
      if (!match) return;
      debugPort = Number(match[1]);
      clearTimeout(timer);
      resolve();
    });
  });

  function conectar(creado) {
    const ws = new WebSocket(creado.webSocketDebuggerUrl);
    let id = 0;
    const pendientes = new Map();
    const esperas = [];
    ws.addEventListener('message', (evento) => {
      const data = JSON.parse(evento.data);
      if (data.id && pendientes.has(data.id)) {
        const pendiente = pendientes.get(data.id);
        pendientes.delete(data.id);
        if (data.error) pendiente.reject(new Error(JSON.stringify(data.error)));
        else pendiente.resolve(data.result);
      } else if (data.method) {
        for (let i = esperas.length - 1; i >= 0; i -= 1) {
          if (esperas[i].method !== data.method) continue;
          esperas.splice(i, 1)[0].resolve(data.params);
        }
      }
    });
    const listo = new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });
    function enviar(method, params = {}) {
      const mensajeId = ++id;
      return new Promise((resolve, reject) => {
        pendientes.set(mensajeId, { resolve, reject });
        ws.send(JSON.stringify({ id: mensajeId, method, params }));
      });
    }
    function esperar(method, timeout = 8000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timeout ${method}`)), timeout);
        esperas.push({
          method,
          resolve: (params) => {
            clearTimeout(timer);
            resolve(params);
          },
        });
      });
    }
    return { ws, enviar, esperar, listo, id: creado.id };
  }

  async function nuevaPagina() {
    const creado = await (await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' })).json();
    const pagina = conectar(creado);
    await pagina.listo;
    return pagina;
  }

  async function cerrar(pagina) {
    await fetch(`http://127.0.0.1:${debugPort}/json/close/${pagina.id}`).catch(() => {});
    pagina.ws.close();
  }

  const cargas = [];
  try {
    for (let i = 0; i < 5; i += 1) {
      const pagina = await nuevaPagina();
      await pagina.enviar('Page.enable');
      await pagina.enviar('Network.enable');
      await pagina.enviar('Network.setCacheDisabled', { cacheDisabled: true });
      const carga = pagina.esperar('Page.loadEventFired');
      await pagina.enviar('Page.navigate', { url: `http://127.0.0.1:${puerto}/` });
      await carga;
      await pagina.enviar('Runtime.evaluate', {
        expression: 'new Promise((resolver) => requestAnimationFrame(() => requestAnimationFrame(resolver)))',
        awaitPromise: true,
      });
      const metricas = await pagina.enviar('Runtime.evaluate', {
        expression: `JSON.stringify({
          fcp: performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint')?.startTime ?? null,
          dcl: performance.getEntriesByType('navigation')[0].domContentLoadedEventEnd,
          load: performance.getEntriesByType('navigation')[0].loadEventEnd,
          heap: performance.memory ? performance.memory.usedJSHeapSize : null,
          juegos: document.querySelector('#juegos').textContent
        })`,
        returnByValue: true,
      });
      cargas.push(JSON.parse(metricas.result.value));
      await cerrar(pagina);
    }

    async function flujo(throttle) {
      const corridas = [];
      const expresion = `
        (async () => {
          const fixture = ${JSON.stringify(fixture)};
          document.querySelector('#codigo').value = fixture;
          const inicio = performance.now();
          document.querySelector('#formulario').requestSubmit();
          const hastaSync = performance.now() - inicio;
          await new Promise((resolver) => requestAnimationFrame(() => requestAnimationFrame(resolver)));
          const hastaFrame = performance.now() - inicio;
          const resultado = document.querySelector('#resultado');
          const texto = resultado.innerText;
          const mosaico = resultado.querySelector('.mosaico');
          const tLayout = performance.now();
          const altoMosaico = mosaico ? mosaico.getBoundingClientRect().height : 0;
          const layoutMosaico = performance.now() - tLayout;
          const aperturas = [];
          for (const details of resultado.querySelectorAll('details')) {
            const t0 = performance.now();
            details.open = true;
            await new Promise((resolver) => requestAnimationFrame(() => requestAnimationFrame(resolver)));
            const items = details.querySelectorAll('li').length;
            const filas = details.querySelectorAll('tbody tr').length;
            aperturas.push({
              ms: performance.now() - t0,
              items,
              filas,
              titulo: (details.querySelector('summary')?.textContent || '').trim(),
              clase: details.className,
            });
            details.open = false;
            await new Promise((resolver) => requestAnimationFrame(resolver));
          }
          const filtro = resultado.querySelector('[data-filtro]');
          const detailsFiltro = filtro ? filtro.closest('details') : null;
          let visibles = null;
          let total = null;
          if (filtro && detailsFiltro) {
            detailsFiltro.open = true;
            filtro.value = 'mañanera';
            filtro.dispatchEvent(new Event('input'));
            const lista = detailsFiltro.querySelector('[data-lista]');
            visibles = [...lista.querySelectorAll('li')].filter((item) => !item.hidden).length;
            total = lista.querySelectorAll('li').length;
            filtro.value = '';
            filtro.dispatchEvent(new Event('input'));
          }
          const clickOriginal = HTMLAnchorElement.prototype.click;
          HTMLAnchorElement.prototype.click = function () {
            if (this.download) return;
            return clickOriginal.call(this);
          };
          const exportaciones = [];
          for (const tipo of ['texto', 'csv', 'json']) {
            const boton = resultado.querySelector('[data-exportar="' + tipo + '"]');
            const estado = resultado.querySelector('[data-exportar-estado]');
            if (estado) estado.textContent = '';
            const t0 = performance.now();
            boton.click();
            exportaciones.push({
              tipo,
              ms: performance.now() - t0,
              aviso: estado ? estado.textContent : '',
            });
          }
          HTMLAnchorElement.prototype.click = clickOriginal;
          return JSON.stringify({
            hastaSync,
            hastaFrame,
            nodos: resultado.querySelectorAll('*').length,
            html: resultado.innerHTML.length,
            heap: performance.memory ? performance.memory.usedJSHeapSize : null,
            esElluis: texto.includes('Elluis'),
            celdas: resultado.querySelectorAll('.celda-mosaico').length,
            altoMosaico,
            layoutMosaico,
            paneles: [...resultado.querySelectorAll('[data-panel]')].map((nodo) => nodo.dataset.panel),
            aperturas,
            exportaciones,
            visiblesFiltro: visibles,
            totalFiltro: total
          });
        })()
      `;
      // Cada muestra es una pestaña nueva: la primera apertura no reutiliza layout.
      for (let i = 0; i < 3; i += 1) {
        const pagina = await nuevaPagina();
        await pagina.enviar('Page.enable');
        await pagina.enviar('Runtime.enable');
        await pagina.enviar('Emulation.setCPUThrottlingRate', { rate: throttle });
        const carga = pagina.esperar('Page.loadEventFired');
        await pagina.enviar('Page.navigate', { url: `http://127.0.0.1:${puerto}/` });
        await carga;
        const evaluado = await pagina.enviar('Runtime.evaluate', {
          expression: expresion,
          returnByValue: true,
          awaitPromise: true,
        });
        if (evaluado.exceptionDetails) throw new Error(JSON.stringify(evaluado.exceptionDetails));
        corridas.push(JSON.parse(evaluado.result.value));
        await cerrar(pagina);
      }
      return corridas;
    }

    const a1 = await flujo(1);
    const a4 = await flujo(4);
    return { cargas, a1, a4 };
  } finally {
    chrome.kill();
    await new Promise((resolve) => {
      if (chrome.exitCode != null || chrome.signalCode != null) resolve();
      else {
        chrome.once('exit', resolve);
        setTimeout(resolve, 1500);
      }
    });
    try {
      fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
    } catch {
      // El perfil temporal de Chrome a veces queda tomado. No cambia la medición.
    }
  }
}

const html = [path.join(raiz, 'index.html')];
const css = listar(path.join(raiz, 'css'), (archivo) => archivo.endsWith('.css'));
const js = listar(path.join(raiz, 'js'), (archivo) => archivo.endsWith('.js'));
const imagenes = listar(raiz, (archivo) => {
  if (archivo.includes(`${path.sep}.git${path.sep}`) || archivo.includes(`${path.sep}node_modules${path.sep}`)) return false;
  return EXTENSIONES_IMAGEN.has(path.extname(archivo).toLowerCase());
});
const pesoHtml = pesoDe(html);
const pesoCss = pesoDe(css);
const pesoJs = pesoDe(js);
const pesoImg = pesoDe(imagenes);
const pesoTotal = pesoHtml.bytes + pesoCss.bytes + pesoJs.bytes + pesoImg.bytes;
const gzipTotal = pesoHtml.gzip + pesoCss.gzip + pesoJs.gzip + pesoImg.gzip;

console.log('Savedeco — medición');
console.log(JSON.stringify({
  fecha: new Date().toISOString(),
  node: process.version,
  plataforma: `${os.platform()} ${os.release()}`,
  cpu: os.cpus()[0]?.model,
  nucleos: os.cpus().length,
  ramMB: Math.round(os.totalmem() / (1024 * 1024)),
  gc: typeof global.gc === 'function',
}, null, 2));

console.log('\nPeso (bytes en disco / gzip de cada archivo)');
console.log(JSON.stringify({
  html: pesoHtml.bytes,
  css: pesoCss.bytes,
  js: pesoJs.bytes,
  imagenes: pesoImg.bytes,
  total: pesoTotal,
  gzip: gzipTotal,
  archivos: [...pesoHtml.detalle, ...pesoCss.detalle, ...pesoJs.detalle, ...pesoImg.detalle],
}, null, 2));

const imports = [];
for (let i = 0; i < 3; i += 1) imports.push(importEnProcesoNuevo('js/lectores/indice.js'));
console.log('\nImport del lector en un proceso nuevo (ms)', imports.map((n) => redondear(n)));
console.log('mediana', redondear(mediana(imports)));

const { decodificar, detectar, abrirCodigo } = await import(pathToFileURL(path.join(raiz, 'js/lectores/cookie-clicker/formato.js')).href);
const { decodificarAutomatico, presentar } = await import(pathToFileURL(path.join(raiz, 'js/nucleo/decodificar.js')).href);
await import(pathToFileURL(path.join(raiz, 'js/lectores/indice.js')).href);
const { renderizarPanel, renderizarPaneles } = await import(pathToFileURL(path.join(raiz, 'js/nucleo/paneles.js')).href);
const { NOTACION_CORTA, formatearNumero } = await import(pathToFileURL(path.join(raiz, 'js/nucleo/numeros.js')).href);
const { armarArchivo, armarCsv, armarJson, armarTexto, documentoDe } = await import(pathToFileURL(path.join(raiz, 'js/nucleo/exportar.js')).href);

const fixture = fs.readFileSync(path.join(raiz, 'tests/fixtures/luigi-cookieclicker.txt'), 'utf8');
const sintetico100 = envolver(planoSintetico(100 * 1024));
const sintetico400 = escaparComoElJuego(envolver(planoSintetico(400 * 1024)));
const basura2mb = envolver('X'.repeat(2 * 1024 * 1024));

function informar(nombre, muestra, veces = 7) {
  const tiempos = medirTiempos(() => decodificarAutomatico(muestra), veces);
  const memoria = medirRetenido(() => decodificarAutomatico(muestra));
  console.log(`\n${nombre}`);
  console.log(JSON.stringify({
    caracteres: muestra.length,
    medianaMs: redondear(tiempos.mediana, 3),
    minMs: redondear(tiempos.min, 3),
    maxMs: redondear(tiempos.max, 3),
    ok: tiempos.ultimo?.ok,
    error: tiempos.ultimo?.ok ? undefined : tiempos.ultimo?.error,
    heapJustoDespues: memoria.justoDespues,
    heapRetenido: memoria.retenido,
  }, null, 2));
  return tiempos.ultimo;
}

console.log('\nDecodificación (decodificarAutomatico, lo que aprieta el botón)');
const resultadoFixture = informar('Fixture Elluis', fixture);
informar('Sintético 100 KB de plano, base64', sintetico100);
informar('Sintético 400 KB de plano, escapado como el juego', sintetico400, 5);
informar('Basura de 2 MB que no es una partida', basura2mb, 4);

const directo = medirTiempos(() => decodificar(fixture), 7);
const abierto = medirTiempos(() => abrirCodigo(fixture), 7);
const paneles = medirTiempos(() => renderizarPaneles(resultadoFixture.paneles, (valor) => String(valor)), 7);
console.log('\nDesglose del fixture');
console.log(JSON.stringify({
  abrirCodigoMs: redondear(abierto.mediana, 3),
  decodificarDirectoMs: redondear(directo.mediana, 3),
  htmlPanelesMs: redondear(paneles.mediana, 3),
  htmlPanelesBytes: paneles.ultimo.length,
}, null, 2));

function desglosar(nombre, muestra, veces = 5) {
  const abrir = medirTiempos(() => abrirCodigo(muestra), veces);
  const deteccion = medirTiempos(() => detectar(muestra), veces);
  const directoSave = medirTiempos(() => decodificar(muestra), veces);
  const automatico = medirTiempos(() => decodificarAutomatico(muestra), veces);
  console.log(`\nCorte ${nombre}`);
  console.log(JSON.stringify({
    caracteres: muestra.length,
    abrirMs: redondear(abrir.mediana, 3),
    detectarMs: redondear(deteccion.mediana, 3),
    decodificarMs: redondear(directoSave.mediana, 3),
    automaticoMs: redondear(automatico.mediana, 3),
    confianza: deteccion.ultimo,
    ok: directoSave.ultimo?.ok === true,
  }, null, 2));
}

console.log('\nAbrir el base64 (por separado, y junto en el botón)');
desglosar('Fixture Elluis', fixture, 7);
desglosar('Sintético 100 KB', sintetico100, 5);
desglosar('Sintético 400 KB escapado', sintetico400, 5);
desglosar('Basura de 2 MB', basura2mb, 3);

const formatear = (valor) => formatearNumero(valor, NOTACION_CORTA);
const panelesFixture = presentar(resultadoFixture, formatear);
console.log('\nRender de paneles (HTML en Node, sin layout)');
const htmlTodos = medirTiempos(() => renderizarPaneles(panelesFixture, formatear), 7);
const porPanel = panelesFixture.map((panel) => {
  const muestra = medirTiempos(() => renderizarPanel(panel, formatear), 7);
  return {
    id: panel.id,
    tipo: panel.tipo,
    medianaMs: redondear(muestra.mediana, 3),
    bytes: muestra.ultimo.length,
  };
});
console.log(JSON.stringify({
  paneles: panelesFixture.length,
  htmlTodosMs: redondear(htmlTodos.mediana, 3),
  htmlTodosBytes: htmlTodos.ultimo.length,
  porPanel,
}, null, 2));

const fechaExport = new Date('2026-10-20T12:00:00Z');
const armadoDoc = medirTiempos(() => documentoDe(resultadoFixture, { ahora: fechaExport }), 5);
const documento = armadoDoc.ultimo;
const textoExport = medirTiempos(() => armarTexto(documento), 5);
const csvExport = medirTiempos(() => armarCsv(documento), 5);
const jsonExport = medirTiempos(() => armarJson(documento), 5);
const tresBotones = medirTiempos(() => {
  armarArchivo(resultadoFixture, 'texto', { ahora: fechaExport });
  armarArchivo(resultadoFixture, 'csv', { ahora: fechaExport });
  armarArchivo(resultadoFixture, 'json', { ahora: fechaExport });
}, 4);
console.log('\nExportación del fixture (lo que arman los tres botones)');
console.log(JSON.stringify({
  documentoMs: redondear(armadoDoc.mediana, 3),
  textoMs: redondear(textoExport.mediana, 3),
  textoBytes: Buffer.byteLength(textoExport.ultimo),
  csvMs: redondear(csvExport.mediana, 3),
  csvBytes: Buffer.byteLength(csvExport.ultimo),
  jsonMs: redondear(jsonExport.mediana, 3),
  jsonBytes: Buffer.byteLength(jsonExport.ultimo),
  tresBotonesMs: redondear(tresBotones.mediana, 3),
}, null, 2));

const server = await servir();
const puerto = server.address().port;
try {
  const navegador = await medirNavegador(puerto, fixture);
  if (!navegador) {
    // Ya se avisó arriba.
  } else {
    const fcps = navegador.cargas.map((carga) => carga.fcp).filter((valor) => Number.isFinite(valor));
    const dcls = navegador.cargas.map((carga) => carga.dcl);
    const heaps = navegador.cargas.map((carga) => carga.heap);
    function resumirFlujo(corridas) {
      return {
        hastaSyncMs: redondear(mediana(corridas.map((corrida) => corrida.hastaSync)), 1),
        hastaFrameMs: redondear(mediana(corridas.map((corrida) => corrida.hastaFrame)), 1),
        nodos: mediana(corridas.map((corrida) => corrida.nodos)),
        html: mediana(corridas.map((corrida) => corrida.html)),
        heap: mediana(corridas.map((corrida) => corrida.heap)),
        esElluis: corridas.every((corrida) => corrida.esElluis),
        celdas: mediana(corridas.map((corrida) => corrida.celdas)),
        altoMosaico: redondear(mediana(corridas.map((corrida) => corrida.altoMosaico)), 1),
        layoutMosaicoMs: redondear(mediana(corridas.map((corrida) => corrida.layoutMosaico)), 3),
        paneles: corridas[0].paneles,
        aperturas: corridas[0].aperturas.map((_, indice) => ({
          titulo: corridas[0].aperturas[indice].titulo,
          clase: corridas[0].aperturas[indice].clase,
          items: corridas[0].aperturas[indice].items,
          filas: corridas[0].aperturas[indice].filas,
          medianaMs: redondear(mediana(corridas.map((corrida) => corrida.aperturas[indice].ms)), 1),
          muestrasMs: corridas.map((corrida) => redondear(corrida.aperturas[indice].ms, 1)),
        })),
        exportaciones: corridas[0].exportaciones.map((_, indice) => ({
          tipo: corridas[0].exportaciones[indice].tipo,
          medianaMs: redondear(mediana(corridas.map((corrida) => corrida.exportaciones[indice].ms)), 1),
          muestrasMs: corridas.map((corrida) => redondear(corrida.exportaciones[indice].ms, 1)),
          aviso: corridas[0].exportaciones[indice].aviso,
        })),
        filtro: {
          visibles: mediana(corridas.map((corrida) => corrida.visiblesFiltro)),
          total: corridas[0].totalFiltro,
        },
      };
    }
    console.log('\nNavegador (cache desactivada, localhost)');
    console.log(JSON.stringify({
      fcpMs: fcps.length ? redondear(mediana(fcps), 1) : null,
      fcpMuestras: fcps.map((valor) => redondear(valor, 1)),
      dclMs: redondear(mediana(dcls), 1),
      heapAlCargar: mediana(heaps),
      juegos: navegador.cargas[0].juegos,
      cpu1: resumirFlujo(navegador.a1),
      cpu4: resumirFlujo(navegador.a4),
    }, null, 2));
    const roto = navegador.a1.some((corrida) => !corrida.esElluis || corrida.celdas !== 36 || corrida.visiblesFiltro !== 1);
    if (roto) {
      console.error('El humo del navegador falló: no aparece Elluis, la parcela no tiene 36 casilleros o el filtro no recorta.');
      process.exitCode = 1;
    }
  }
} finally {
  server.close();
}
