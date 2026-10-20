import assert from 'node:assert/strict';
import test from 'node:test';

// "h3y_gUyZ" en UTF-16LE. Es la clave y también el IV del .plr.
// El plano se arma acá: no hay un save real con licencia libre para commitear.
const CLAVE = new Uint8Array([
  0x68, 0x00, 0x33, 0x00, 0x79, 0x00, 0x5f, 0x00,
  0x67, 0x00, 0x55, 0x00, 0x79, 0x00, 0x5a, 0x00,
]);

function utf16le(texto) {
  const out = new Uint8Array(texto.length * 2);
  for (let i = 0; i < texto.length; i += 1) {
    const code = texto.charCodeAt(i);
    out[i * 2] = code & 0xff;
    out[i * 2 + 1] = code >> 8;
  }
  return out;
}

function planoMinimo() {
  const nombre = new TextEncoder().encode('Ada');
  const buf = new Uint8Array(4 + 7 + 1 + 4 + 8 + 1 + nombre.length + 1);
  const view = new DataView(buf.buffer);
  view.setInt32(0, 279, true);
  buf.set(new TextEncoder().encode('relogic'), 4);
  buf[11] = 3;
  view.setUint32(12, 1, true);
  view.setBigUint64(16, 0n, true);
  buf[24] = nombre.length;
  buf.set(nombre, 25);
  buf[25 + nombre.length] = 0;
  return buf;
}

function claveAes(bytes, usos) {
  return globalThis.crypto.subtle.importKey('raw', bytes, { name: 'AES-CBC' }, false, usos);
}

test('la clave del .plr es h3y_gUyZ en UTF-16LE y mide 16 bytes', () => {
  const bytes = utf16le('h3y_gUyZ');
  assert.equal(bytes.byteLength, 16);
  assert.deepEqual(bytes, CLAVE);
});

test('Web Crypto abre un .plr sintético con AES-CBC y PKCS#7', async () => {
  const plano = planoMinimo();
  const clave = await claveAes(CLAVE, ['encrypt', 'decrypt']);
  const cifrado = new Uint8Array(await globalThis.crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: CLAVE },
    clave,
    plano,
  ));

  // 29 bytes de plano: 13 mod 16, así que PKCS#7 suma 3 y el cifrado mide 32.
  assert.equal(plano.byteLength, 29);
  assert.equal(plano.byteLength % 16, 13);
  assert.equal(cifrado.byteLength, 32);

  const abierto = new Uint8Array(await globalThis.crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: CLAVE },
    clave,
    cifrado,
  ));

  assert.deepEqual(abierto, plano);
  const view = new DataView(abierto.buffer, abierto.byteOffset, abierto.byteLength);
  assert.equal(view.getInt32(0, true), 279);
  assert.equal(new TextDecoder().decode(abierto.subarray(4, 11)), 'relogic');
  assert.equal(abierto[11], 3);
  assert.equal(view.getUint32(12, true), 1);
  assert.equal(view.getBigUint64(16, true), 0n);
  assert.equal(abierto[24], 3);
  assert.equal(new TextDecoder().decode(abierto.subarray(25, 28)), 'Ada');
});

test('UTF-8 de la frase no es una clave AES', async () => {
  const utf8 = new TextEncoder().encode('h3y_gUyZ');
  assert.equal(utf8.byteLength, 8);
  await assert.rejects(() => claveAes(utf8, ['decrypt']));
});

test('UTF-16BE y un IV de ceros no abren el .plr', async () => {
  const plano = planoMinimo();
  const clave = await claveAes(CLAVE, ['encrypt', 'decrypt']);
  const cifrado = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: CLAVE },
    clave,
    plano,
  );

  const be = new Uint8Array(CLAVE.byteLength);
  for (let i = 0; i < CLAVE.byteLength; i += 2) {
    be[i] = CLAVE[i + 1];
    be[i + 1] = CLAVE[i];
  }
  const claveBe = await claveAes(be, ['decrypt']);
  await assert.rejects(() => globalThis.crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: be },
    claveBe,
    cifrado,
  ));

  // Un IV equivocado a veces deja un relleno que parece válido. Igual no devuelve el plano.
  const ivCero = new Uint8Array(16);
  const conIvCero = new Uint8Array(await globalThis.crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: ivCero },
    clave,
    cifrado,
  ));
  assert.notDeepEqual(conIvCero, plano);
  assert.notEqual(new TextDecoder().decode(conIvCero.subarray(4, 11)), 'relogic');
});

test('un cifrado que no es múltiplo de 16 no abre', async () => {
  const plano = planoMinimo();
  const clave = await claveAes(CLAVE, ['encrypt', 'decrypt']);
  const cifrado = new Uint8Array(await globalThis.crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: CLAVE },
    clave,
    plano,
  ));
  await assert.rejects(() => globalThis.crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: CLAVE },
    clave,
    cifrado.subarray(0, 15),
  ));
});

test('una clave distinta no abre el .plr', async () => {
  const plano = planoMinimo();
  const clave = await claveAes(CLAVE, ['encrypt']);
  const cifrado = await globalThis.crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: CLAVE },
    clave,
    plano,
  );

  const otra = new Uint8Array(CLAVE);
  otra[0] ^= 0xff;
  const claveMala = await claveAes(otra, ['decrypt']);
  await assert.rejects(() => globalThis.crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: otra },
    claveMala,
    cifrado,
  ));
});
