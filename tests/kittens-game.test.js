// Save sintético de Kittens Game. No hay una partida real con licencia libre
// para commitear: el juego es WET PAWS y no permite obras derivadas.
// El JSON sigue la forma de game.save() en el commit 781e379. La compresión
// es el LZString 1.4.4 que el juego trae en lib/lz-string.js.

import assert from 'node:assert/strict';
import test from 'node:test';
import { detectar } from '../js/lectores/cookie-clicker/formato.js';
import { MENSAJE_DESCONOCIDO, decodificarAutomatico } from '../js/nucleo/decodificar.js';
import '../js/lectores/indice.js';
import {
  compressToBase64,
  compressToUTF16,
  decompressFromBase64,
  decompressFromUTF16,
} from './kittens-lz.js';

const MINI = {
  saveVersion: 15,
  resources: [{ name: 'catnip', value: 3.5, unlocked: true }],
  village: { kittens: [{ ssn: 12345, exp: 1.5, job: 0 }] },
  game: { ironWill: true, karmaKittens: 0 },
};

const MINI_JSON = JSON.stringify(MINI);

// Salida de lz-string 1.4.4 (y del lib/lz-string.js del juego) para MINI_JSON.
const MINI_B64 = 'N4IgzghgbgpgajATmAlgewHYgFwEYCsANCIjGGgK6IDGZOA2qBhALYw4jUQAuGKADiGJQIAGwrtsAZgB0REBQyi01ANYwAJjm6IJAXwC6wlKNEQA5pNCqU3bjAxgGoMGCx4ATFIAs8mAA9BPDliACs0ACMcAAZDPWJzVisQFERMAHUTUW1dGGJVCEQWCABpW3tHGL09IA===';

const TRIMPS = {
  global: { version: 5, stringVersion: '5.10.0' },
  resources: { food: { owned: 1 } },
  buildings: { Hut: { owned: 1 } },
};

function esKittens(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  if (typeof obj.saveVersion === 'number') return true;
  return Array.isArray(obj.resources) && (obj.village != null || obj.buildings != null || obj.science != null);
}

function esTrimps(obj) {
  return Boolean(
    obj && obj.global && typeof obj.global === 'object'
    && (typeof obj.global.version === 'number' || typeof obj.global.stringVersion === 'string')
    && typeof obj.saveVersion !== 'number',
  );
}

function jsonSiAbre(texto) {
  if (typeof texto !== 'string' || !texto.startsWith('{')) return null;
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

// El mismo orden que game.decompressLZData, después del recorte de espacios
// que hace el import del juego sobre el textarea.
function abrirComoImport(texto) {
  const data = String(texto).replace(/\s/g, '');
  const porBase64 = decompressFromBase64(data);
  if (porBase64 && porBase64[0] === '{') return porBase64;
  return decompressFromUTF16(data);
}

function reconocer(texto) {
  const limpio = String(texto).replace(/^\uFEFF/, '').trim();
  if (/!END!/i.test(limpio) || /%21END%21/i.test(limpio)) return 'cookie-clicker';
  if (limpio.startsWith('{')) {
    const obj = jsonSiAbre(limpio);
    if (esKittens(obj)) return 'kittens-json';
  }
  const porBase64 = jsonSiAbre(decompressFromBase64(limpio.replace(/\s/g, '')));
  if (esTrimps(porBase64)) return 'trimps';
  if (esKittens(porBase64)) return 'kittens-base64';
  // El UTF-16 guarda espacios adentro. No se los puede sacar.
  const porUtf16 = jsonSiAbre(decompressFromUTF16(limpio));
  if (esKittens(porUtf16)) return 'kittens-utf16';
  if (esTrimps(porUtf16)) return 'trimps-utf16';
  return null;
}

// _mergeSSN / _splitSSN de Kitten, offset 100, siete enteros.
function empaquetarSsn(valores) {
  let result = 0;
  for (let i = valores.length - 1; i >= 0; i -= 1) {
    result = result * 100 + valores[i];
  }
  return result;
}

function desempaquetarSsn(merged, cantidad) {
  const valores = [];
  let resto = merged;
  for (let i = 0; i < cantidad; i += 1) {
    const valor = resto % 100;
    resto = (resto - valor) / 100;
    valores.push(valor);
  }
  return valores;
}

test('compressToBase64 del JSON mínimo coincide con LZString 1.4.4', () => {
  assert.equal(compressToBase64(MINI_JSON), MINI_B64);
  assert.equal(decompressFromBase64(MINI_B64), MINI_JSON);
  assert.equal(MINI_B64.includes('!'), false);
  assert.equal(MINI_B64.includes('%'), false);
});

test('el Base64 del export sobrevive un pegado con saltos, como el import del juego', () => {
  const cortado = MINI_B64.replace(/(.{40})/g, '$1\n');
  assert.equal(abrirComoImport(cortado), MINI_JSON);
  assert.equal(reconocer(cortado), 'kittens-base64');
});

test('localStorage grande va en UTF-16 y el atajo de Base64 no lo abre', () => {
  const utf = compressToUTF16(MINI_JSON);
  assert.equal(utf.endsWith(' '), true);
  assert.equal(decompressFromUTF16(utf), MINI_JSON);
  assert.equal(String(decompressFromBase64(utf) || '').startsWith('{'), false);
  assert.equal(reconocer(utf), 'kittens-utf16');
});

test('el import recorta los blancos y parte un UTF-16 que los usa como símbolo', () => {
  // compressToUTF16 siempre cierra con un espacio. En un blob corto ese
  // cierre es el único blanco, y sacarlo igual deja un JSON. Cuando un
  // símbolo de dato cae en un blanco que el import recorta (acá U+2009), el
  // replace del textarea corre el flujo. localStorage no recorta.
  const alfabeto = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let cuerpo = '';
  for (let i = 0; i < 246; i += 1) cuerpo += alfabeto[(i * 17 + 246) % alfabeto.length];
  const json = JSON.stringify({
    saveVersion: 15,
    resources: [{ name: 'catnip', value: 1 }],
    nota: cuerpo,
  });
  const utf = compressToUTF16(json);
  assert.equal(decompressFromUTF16(utf), json);
  assert.equal(utf.slice(0, -1).includes('\u2009'), true);
  assert.notEqual(abrirComoImport(utf), json);
  assert.equal(reconocer(utf), 'kittens-utf16');
});

test('el JSON crudo de localStorage se reconoce sin descomprimir', () => {
  // El import del juego siempre llama a decompressLZData. Un JSON pelado
  // no abre por ahí: Base64 devuelve null y UTF-16 no arranca con "{".
  // localStorage sí lo toma, porque _parseLSSaveData mira el primer carácter.
  assert.equal(decompressFromBase64(MINI_JSON), null);
  assert.equal(String(decompressFromUTF16(MINI_JSON) || '').startsWith('{'), false);
  assert.equal(reconocer(MINI_JSON), 'kittens-json');
  const leido = JSON.parse(MINI_JSON);
  assert.equal(leido.saveVersion, 15);
  assert.equal(leido.resources[0].name, 'catnip');
  assert.equal(leido.resources[0].value, 3.5);
  assert.equal(leido.village.kittens[0].job, 0);
});

test('Trimps usa el mismo Base64 y se distingue por global, no por saveVersion', () => {
  const exportTrimps = compressToBase64(JSON.stringify(TRIMPS));
  assert.equal(reconocer(exportTrimps), 'trimps');
  assert.equal(reconocer(MINI_B64), 'kittens-base64');
});

test('un export de Cookie Clicker no entra por el alfabeto de Kittens', () => {
  const cookie = 'Mi4wNTN8fHwxMjM7RWxsfDF8fDEwMDs%21END%21';
  assert.equal(reconocer(cookie), 'cookie-clicker');
  assert.equal(reconocer('2.053||100;Ell!END!'), 'cookie-clicker');
});

test('el lector de Cookie Clicker no se queda con un export de Kittens', () => {
  assert.ok(detectar(MINI_B64) < 0.5);
  assert.ok(detectar(MINI_JSON) < 0.5);
  assert.ok(detectar(compressToUTF16(MINI_JSON)) < 0.5);
  const automatico = decodificarAutomatico(MINI_B64);
  assert.equal(automatico.ok, false);
  assert.equal(automatico.error, MENSAJE_DESCONOCIDO);
});

test('el ssn de un gatito empaqueta siete enteros con offset 100', () => {
  // Amber es el índice 6, Silk el 23, edad 30, rasgo manager (1).
  const valores = [6, 23, 30, 1, 0, 0, 0];
  const ssn = empaquetarSsn(valores);
  assert.deepEqual(desempaquetarSsn(ssn, 7), valores);
  assert.ok(ssn <= Number.MAX_SAFE_INTEGER);
});

test('doscientos gatitos comprimidos vuelven iguales y entran en el tope de la página', () => {
  const gatitos = [];
  for (let i = 0; i < 200; i += 1) {
    gatitos.push({
      ssn: empaquetarSsn([i % 35, i % 32, 5 + (i % 40), i % 8, 0, 0, 0]),
      skills: [1.1, 0, 2.2, 0, 4.4, 0, 8.8, 0, 3.3],
      exp: 12.4,
      job: i % 9,
    });
  }
  const json = JSON.stringify({ ...MINI, village: { kittens: gatitos, maxKittens: 200 } });
  const b64 = compressToBase64(json);
  assert.equal(decompressFromBase64(b64), json);
  assert.ok(b64.length < json.length);
  assert.ok(b64.length < 4_000_000);
  const abiertos = JSON.parse(decompressFromBase64(b64));
  assert.equal(abiertos.village.kittens.length, 200);
  assert.equal(abiertos.saveVersion, 15);
});
