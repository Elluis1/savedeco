// Lector del export de Cookie Clicker.
// El armado del string está en Game.WriteSave / Game.LoadSave (main.js del juego)
// y el mapa de campos, en https://cookieclicker.wiki.gg/wiki/Save (revisado para 2.052).
// pack3() hoy devuelve el bitfield tal cual; las versiones viejas usan unpack2 o unpack.

import { edificios, logros, mejoras } from './catalogo.js';
import { LIMITE_CODIGO, MENSAJE_LARGO } from '../../nucleo/decodificar.js';
import { formatearFotogramas } from '../../nucleo/numeros.js';

export const MENSAJE_DANADO = 'Este código parece de Cookie Clicker, pero está dañado. Volvé a copiarlo entero, con el !END! del final.';
export const MENSAJE_TRUNCADO = 'El código está truncado: falta una parte de la partida. Exportala de nuevo y pegala completa.';
export const MENSAJE_ENORME = 'Este código parece de Cookie Clicker, pero una sección es demasiado grande para leerla sin trabar el navegador. Un export pesa unos pocos kilobytes; si pegaste otra cosa, no la vamos a procesar.';

// La 2.053 es la que está mapeada en el catálogo. Una más nueva se lee igual, con aviso.
const VERSION_CONOCIDA = 2.053;

// Tope holgado contra una partida real (20 edificios, ~900 mejoras, unos pocos efectos).
// Por encima de esto no armamos listas: el HTML de cientos de miles de filas cuelga la pestaña.
const MAX_BITS = 20_000;
const MAX_ENTRADA_EMPAQUETADA = 4_000;
const MAX_ENTRADA_LISTA_VIEJA = 80_000;
const MAX_EDIFICIOS = 80;
const MAX_EFECTOS = 80;
const MAX_MODS = 200;
const MAX_CAMPOS_STATS = 120;
const MAX_LARGO_SECCION = 80_000;
const MAX_LARGO_MODS = 500_000;
const MAX_JSON_MOD = 100_000;
const MAX_PROFUNDIDAD_JSON = 40;
const MAX_NOMBRES_LISTA = 1_500;
const MAX_PIPES = 30;
const MAX_DIGITOS = 100;
const FECHA_MAXIMA = 8.64e15;

// Copiar desde la web a veces mete espacios de ancho cero que no son \s.
const INVISIBLES = /[\s\u200B\u200C\u200D\u2060]+/g;

const TEMPORADAS = {
  halloween: 'Halloween',
  christmas: 'Navidad',
  valentines: 'San Valentín',
  easter: 'Pascua',
  fools: 'Día laborable',
};

const MODOS_ASCENSION = {
  0: 'Ninguno',
  1: 'Renacido',
};

const TIPOS_TERRON = {
  0: 'normal',
  1: 'bifurcado',
  2: 'dorado',
  3: 'carnoso',
  4: 'caramelizado',
};

// Orden de Game.buffType en main.js. El nombre en español solo cuando está en la loc oficial.
const EFECTOS = [
  'Frenesí',
  'Frenesí de ancianas',
  'Grumo',
  'Cosecha de dragones',
  'Liquidación',
  'Dedo maldito',
  'Frenesí de clics',
  'Vuelo de dragón',
  'Tormenta de galletas',
  'building buff',
  'building debuff',
  'Bendición de azúcar',
  'haggler luck',
  'haggler misery',
  'pixie luck',
  'pixie misery',
  'Experto en magia',
  'magic inept',
  'Devastación',
  'Frenesí de azúcar',
  'loan 1',
  'loan 1 interest',
  'loan 2',
  'loan 2 interest',
  'loan 3',
  'loan 3 interest',
  'gifted out',
];

const GENES = ['pelo', 'color de pelo', 'color de piel', 'cabeza', 'cara', 'accesorio 1', 'accesorio 2'];

function decodificarBase64Utf8(b64) {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64) || b64.length % 4 !== 0) {
    throw new Error('base64');
  }
  const binario = typeof atob === 'function'
    ? atob(b64)
    : Buffer.from(b64, 'base64').toString('latin1');
  // TextDecoder evita el arreglo de millones de "%xx" que armaba el camino de decodeURIComponent.
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i) & 0xff;
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

function sinInvisibles(valor) {
  return valor.replace(INVISIBLES, '');
}

// Corta apenas pasa el tope: un save hostil de varios MB no se recorre entero.
function demasiadosSeparadores(texto, codigo, maximo) {
  let vistos = 0;
  for (let i = 0; i < texto.length; i += 1) {
    if (texto.charCodeAt(i) !== codigo) continue;
    vistos += 1;
    if (vistos > maximo) return true;
  }
  return false;
}

function conRelleno(b64) {
  if (!b64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null;
  const resto = b64.length % 4;
  if (resto === 1) return null;
  if (resto === 2) return `${b64}==`;
  if (resto === 3) return `${b64}=`;
  return b64;
}

export function abrirCodigo(texto) {
  const original = String(texto ?? '');
  if (original.length > LIMITE_CODIGO) {
    return { vacio: false, teniaFin: false, plano: null, demasiadoGrande: true };
  }
  if (original.trim() === '') return { vacio: true, teniaFin: false, plano: null };
  let s = original.trim();
  // El cierre se busca después de sacar saltos y espacios de ancho cero.
  // Si no, un "!END!" cortado al pegar (`!\nEND!` o `%21\nEND%21`) parece que no estuviera.
  const finCodificado = /%21end%21/i.test(sinInvisibles(s));
  if (s.includes('%')) {
    s = s.replace(/%u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
    try {
      s = decodeURIComponent(s);
    } catch {
      // Si el % no es un escape válido, seguimos con lo que haya quedado.
    }
  }
  s = sinInvisibles(s);
  const teniaFin = finCodificado || /!END!/i.test(s);
  s = s.replace(/!END!.*$/i, '');
  const relleno = conRelleno(s);
  if (!relleno) return { vacio: false, teniaFin, plano: null, base64Invalido: true };
  try {
    const plano = decodificarBase64Utf8(relleno);
    if (!plano) return { vacio: false, teniaFin, plano: null, base64Invalido: true };
    return { vacio: false, teniaFin, plano, base64Invalido: false };
  } catch {
    return { vacio: false, teniaFin, plano: null, base64Invalido: true };
  }
}

function desempaquetar2(empacado) {
  const partes = new Array(empacado.length);
  for (let i = 0; i < empacado.length; i += 1) {
    partes[i] = empacado.charCodeAt(i).toString(2).slice(1);
  }
  return partes.join('');
}

function descomprimirBin(numero) {
  const bits = numero.toString(2).split('');
  bits.reverse();
  bits.shift();
  bits.pop();
  return bits;
}

function descomprimirBinGrande(texto) {
  const bits = [];
  for (const parte of String(texto).split(';')) {
    if (!parte) continue;
    const numero = Number.parseInt(parte.length > MAX_DIGITOS ? parte.slice(0, MAX_DIGITOS) : parte, 10);
    if (!Number.isFinite(numero)) continue;
    const pieza = descomprimirBin(numero);
    for (let i = 0; i < pieza.length; i += 1) bits.push(pieza[i]);
    if (bits.length > MAX_BITS) return null;
  }
  return bits;
}

// Devuelve el bitfield como string. null = demasiado grande para abrirlo.
// Un '2' u otro carácter que no sea 0/1 lo rechaza el llamador como dañado.
function bitsDesde(texto, version, pares) {
  if (!texto) return '';
  if (version < 1.035) {
    if (texto.length > MAX_ENTRADA_LISTA_VIEJA) return null;
    // LoadSave indexa el split, así que un hueco vacío cuenta. El `;` final
    // de WriteSave deja un segmento vacío que no es una mejora.
    const partes = texto.split(';');
    if (partes.length > 0 && partes[partes.length - 1] === '') partes.pop();
    if (partes.length > MAX_BITS) return null;
    const salida = [];
    for (const parte of partes) {
      const campos = parte.split(',');
      salida.push(Number.parseInt(campos[0], 10) ? '1' : '0');
      if (pares) salida.push(Number.parseInt(campos[1], 10) ? '1' : '0');
    }
    if (salida.length > MAX_BITS) return null;
    return salida.join('');
  }
  if (version < 1.05) {
    if (texto.length > MAX_ENTRADA_EMPAQUETADA) return null;
    const bits = descomprimirBinGrande(texto);
    if (bits == null) return null;
    return bits.join('');
  }
  if (version < 1.0502) {
    if (texto.length > MAX_ENTRADA_EMPAQUETADA) return null;
    const salida = [];
    for (let i = 0; i < texto.length; i += 1) {
      const codigo = texto.charCodeAt(i);
      const alto = (codigo >>> 8) & 0xff;
      const bajo = codigo & 0xff;
      // unpack del juego devuelve bytes. Si no son 0 o 1, el bitfield está roto.
      if ((alto !== 0 && alto !== 1) || (bajo !== 0 && bajo !== 1)) return '2';
      salida.push(alto === 1 ? '1' : '0', bajo === 1 ? '1' : '0');
    }
    if (salida.length > MAX_BITS) return null;
    return salida.join('');
  }
  if (version < 2.0046) {
    if (texto.length > MAX_ENTRADA_EMPAQUETADA) return null;
    const bits = desempaquetar2(texto);
    if (bits.length > MAX_BITS) return null;
    return bits;
  }
  if (texto.length > MAX_BITS) return null;
  return texto;
}

function soloBits(texto) {
  for (let i = 0; i < texto.length; i += 1) {
    const codigo = texto.charCodeAt(i);
    if (codigo !== 48 && codigo !== 49) return false;
  }
  return true;
}

function bitsPreferencias(texto, version) {
  if (!texto) return [];
  if (version < 1.0503) return texto.split('');
  if (version < 2.0046) return desempaquetar2(texto).split('');
  return texto.split('');
}

function numero(texto, entero = false) {
  if (texto == null || texto === '') return 0;
  // Un campo numérico real entra en notación científica corta. Miles de dígitos
  // no son un valor del juego y parseFloat los recorre al pedo.
  if (texto.length > MAX_DIGITOS) return 0;
  const valor = entero ? Number.parseInt(texto, 10) : Number.parseFloat(texto);
  return Number.isFinite(valor) ? valor : 0;
}

function leerFecha(texto, advertencias, etiqueta) {
  if (texto == null || texto === '') return 0;
  const valor = numero(texto, true);
  if (valor <= 0 || valor > FECHA_MAXIMA || Number.isNaN(new Date(valor).getTime())) {
    advertencias.push(`La fecha de ${etiqueta} no entra en un calendario. La muestro como desconocida.`);
    return 0;
  }
  return valor;
}

function leerEdificio(entrada, version) {
  const partes = entrada.split(',');
  if (partes.length < 4 || partes[0] === '' || Number.isNaN(Number.parseInt(partes[0], 10))) return null;
  const cantidad = numero(partes[0], true);
  const comprados = numero(partes[1], true);
  const galletasProducidas = numero(partes[2]);
  let nivel = numero(partes[3], true);
  if (version < 2.003) nivel = 0;
  let silenciado = 0;
  let maximo = cantidad;
  if (version >= 2.024 && partes.length >= 7) {
    maximo = numero(partes[partes.length - 1], true);
    silenciado = numero(partes[partes.length - 2], true) ? 1 : 0;
  } else if (partes.length >= 6) {
    silenciado = numero(partes[5], true) ? 1 : 0;
  }
  return { cantidad, comprados, galletasProducidas, nivel, silenciado, maximo };
}

function nombreEdificio(indice) {
  return edificios[indice]?.nombre || `Edificio desconocido #${indice}`;
}

function nombresActivos(bits, catalogo, paso, desplazado) {
  const nombres = [];
  const total = Math.floor(bits.length / paso);
  let activos = 0;
  for (let i = 0; i < total; i += 1) {
    if (bits[i * paso + desplazado] !== '1') continue;
    activos += 1;
    if (nombres.length >= MAX_NOMBRES_LISTA) continue;
    nombres.push(catalogo[i] || (paso === 2 ? `Mejora desconocida #${i}` : `Logro desconocido #${i}`));
  }
  return { activos, total, nombres, recortado: activos > nombres.length };
}

function profundidadExcesiva(texto) {
  let profundidad = 0;
  for (let i = 0; i < texto.length; i += 1) {
    const codigo = texto.charCodeAt(i);
    if (codigo !== 123 && codigo !== 91) {
      if (codigo === 125 || codigo === 93) profundidad -= 1;
      continue;
    }
    profundidad += 1;
    if (profundidad > MAX_PROFUNDIDAD_JSON) return true;
  }
  return false;
}

function acortar(texto, maximo) {
  const valor = texto || '';
  if (valor.length <= maximo) return { texto: valor, recortado: false };
  return { texto: valor.slice(0, maximo), recortado: true };
}

function leerMods(seccion) {
  const lista = [];
  const datos = [];
  let omitioJson = false;
  let listaEnorme = false;
  if (!seccion) return { lista, datos, omitioJson, listaEnorme };
  for (const parte of seccion.split(';')) {
    if (!parte) continue;
    const corte = parte.indexOf(':');
    if (corte < 0) continue;
    const id = parte.slice(0, corte);
    const cuerpo = parte.slice(corte + 1).replaceAll('[P]', '|').replaceAll('[S]', ';');
    if (id === 'META') {
      if (demasiadosSeparadores(cuerpo, 44, 300)) {
        listaEnorme = true;
        continue;
      }
      for (const crudo of cuerpo.split(',')) {
        if (!crudo) continue;
        const asterisco = crudo.startsWith('*');
        const nombre = acortar(asterisco ? crudo.slice(1) : crudo, 200);
        lista.push({
          nombre: nombre.texto,
          asterisco,
        });
      }
      continue;
    }
    let versionMod = null;
    let jsonOmitido = false;
    if (cuerpo.length > MAX_JSON_MOD || profundidadExcesiva(cuerpo)) {
      // JSON.parse de un árbol enorme o muy anidado se come la pestaña. Ni lo intentamos.
      jsonOmitido = true;
    } else {
      try {
        const json = JSON.parse(cuerpo);
        if (json && typeof json === 'object' && Object.prototype.hasOwnProperty.call(json, 'lastVersion') && typeof json.lastVersion === 'string') {
          versionMod = json.lastVersion;
        }
      } catch {
        versionMod = null;
      }
    }
    if (jsonOmitido) omitioJson = true;
    datos.push({ id: id.slice(0, 200), caracteres: cuerpo.length, version: versionMod ? versionMod.slice(0, 80) : null, jsonOmitido });
  }
  return { lista, datos, omitioJson, listaEnorme };
}

function leerEfectos(seccion) {
  if (!seccion) return [];
  const efectos = [];
  for (const parte of seccion.split(';')) {
    if (!parte) continue;
    const campos = parte.split(',');
    const id = numero(campos[0], true);
    const duracionMaxima = numero(campos[1], true);
    const restante = numero(campos[2], true);
    const argumento = campos[3] === undefined || campos[3] === '' ? null : numero(campos[3]);
    const nombre = EFECTOS[id] || `efecto #${id}`;
    const potencia = argumento != null && Number.isFinite(argumento) ? ` ×${argumento}` : '';
    efectos.push({
      id,
      nombre,
      fotogramas: restante,
      fotogramasMaximos: duracionMaxima,
      argumento,
      texto: `${nombre}${potencia}, quedaban ${formatearFotogramas(restante)}`,
    });
  }
  return efectos;
}

function leerApariencia(texto) {
  if (!texto) return [];
  const partes = texto.split(',');
  const tope = Math.min(partes.length, 32);
  const salida = [];
  for (let indice = 0; indice < tope; indice += 1) {
    salida.push({
      id: GENES[indice] || `gen desconocido #${indice}`,
      indice: numero(partes[indice], true),
    });
  }
  return salida;
}

function seccionExcesiva(texto, largo, maxSeparadores) {
  if (!texto) return false;
  if (texto.length > largo) return true;
  if (maxSeparadores == null) return false;
  return demasiadosSeparadores(texto, 59, maxSeparadores);
}

export function detectar(texto) {
  const abierto = abrirCodigo(texto);
  if (abierto.demasiadoGrande) return 0.99;
  if (abierto.vacio) return 0;
  if (!abierto.plano) return abierto.teniaFin ? 0.62 : 0.08;
  // Muchos "|" no es un export: partirlos armaría un arreglo gigante.
  if (demasiadosSeparadores(abierto.plano, 124, MAX_PIPES)) return abierto.teniaFin ? 0.55 : 0.12;
  const secciones = abierto.plano.split('|');
  const cruda = secciones[0] || '';
  const version = Number.parseFloat(cruda);
  const versionOk = /^\d+\.\d+$/.test(cruda) && version >= 1 && version < 100;
  if (!versionOk) return abierto.teniaFin ? 0.55 : 0.12;
  const stats = secciones[4] || '';
  const corte = stats.indexOf(';');
  const primer = (corte === -1 ? stats : stats.slice(0, corte)).slice(0, MAX_DIGITOS);
  const statsOk = primer.length > 0 && Number.isFinite(Number.parseFloat(primer));
  const edificiosOk = /\d+,\d+,\d+/.test((secciones[5] || '').slice(0, 240));
  if (statsOk && edificiosOk && secciones.length >= 6) return abierto.teniaFin ? 0.98 : 0.9;
  if (statsOk && secciones.length >= 5) return abierto.teniaFin ? 0.84 : 0.66;
  return abierto.teniaFin ? 0.7 : 0.4;
}

export function decodificar(texto) {
  try {
    return decodificarPlano(texto);
  } catch {
    return { ok: false, error: MENSAJE_DANADO, advertencias: [] };
  }
}

function decodificarPlano(texto) {
  const abierto = abrirCodigo(texto);
  if (abierto.demasiadoGrande) {
    return { ok: false, error: MENSAJE_LARGO, advertencias: [] };
  }
  if (abierto.vacio) {
    return { ok: false, error: 'Pegá un código de exportación o subí el archivo de la partida.', advertencias: [] };
  }
  if (!abierto.plano) {
    return { ok: false, error: abierto.teniaFin ? MENSAJE_DANADO : MENSAJE_TRUNCADO, advertencias: [] };
  }
  if (demasiadosSeparadores(abierto.plano, 124, MAX_PIPES)) {
    return { ok: false, error: MENSAJE_DANADO, advertencias: [] };
  }

  const secciones = abierto.plano.split('|');
  const versionTexto = secciones[0] || '';
  const version = Number.parseFloat(versionTexto);
  if (!/^\d+(\.\d+)?$/.test(versionTexto) || !Number.isFinite(version)) {
    return { ok: false, error: MENSAJE_DANADO, advertencias: [] };
  }
  if (secciones.length < 5 || secciones[2] == null || secciones[4] == null) {
    return { ok: false, error: MENSAJE_TRUNCADO, advertencias: [] };
  }

  const advertencias = [];
  if (!abierto.teniaFin) {
    advertencias.push('El código no traía el cierre !END!. Igual lo leí, pero si ves datos raros puede estar cortado.');
  }
  if (version < 1.035) {
    advertencias.push(`La versión ${versionTexto} guarda las mejoras y los logros en una lista separada por punto y coma. Los leí con el método de esa época.`);
  } else if (version < 2.0046) {
    advertencias.push(`La versión ${versionTexto} guarda las mejoras y los logros empaquetados. Los abrí con el método de esa época.`);
  }
  if (version > VERSION_CONOCIDA) {
    advertencias.push(`La versión ${versionTexto} es más nueva que la ${VERSION_CONOCIDA} que conoce este lector. La leí igual; si algún número no cierra, puede haber cambiado el formato.`);
  }
  if (seccionExcesiva(secciones[2], MAX_LARGO_SECCION, 40) || seccionExcesiva(secciones[4], MAX_LARGO_SECCION, MAX_CAMPOS_STATS)) {
    return { ok: false, error: MENSAJE_ENORME, advertencias };
  }

  const carrera = secciones[2].split(';');
  const misc = secciones[4].split(';');
  const muestraGalletas = (misc[0] || '').slice(0, MAX_DIGITOS);
  if (misc.length < 2 || muestraGalletas === '' || Number.isNaN(Number.parseFloat(muestraGalletas))) {
    return { ok: false, error: MENSAJE_TRUNCADO, advertencias };
  }
  if (misc.some((campo) => campo.length > MAX_DIGITOS)) {
    advertencias.push('Hay un número demasiado largo en las estadísticas. Lo dejé en cero: no entra en un valor que se pueda mostrar.');
  }

  const galletas = numero(misc[0]);
  const galletasHorneadasAscension = numero(misc[1]);
  const galletasEntregadas = numero(misc[8]);
  const temporadaCruda = misc[22] || '';
  const temporadaCorta = acortar(temporadaCruda, 80);
  const temporadaId = temporadaCorta.texto;
  let temporada = 'Ninguna';
  if (temporadaCruda) {
    temporada = TEMPORADAS[temporadaCruda] || null;
    if (!temporada) {
      temporada = temporadaId;
      advertencias.push(temporadaCorta.recortado
        ? 'La temporada trae un nombre larguísimo y no está en la lista que conocemos. Muestro solo el principio.'
        : `La temporada "${temporadaId}" no está en la lista que conocemos. La dejo con el nombre crudo.`);
    }
  }

  const modoId = numero(misc[29], true);
  const modo = MODOS_ASCENSION[modoId] || `desconocido (${modoId})`;
  if (!(modoId in MODOS_ASCENSION)) {
    advertencias.push(`El modo de ascensión ${modoId} no está documentado en el fuente que leí.`);
  }

  const tipoTerronId = numero(misc[46], true);
  const tipoTerron = TIPOS_TERRON[tipoTerronId] || `desconocido (${tipoTerronId})`;

  const seccionEdificios = secciones[5] || '';
  if (seccionExcesiva(seccionEdificios, MAX_LARGO_SECCION, MAX_EDIFICIOS)) {
    return { ok: false, error: MENSAJE_ENORME, advertencias };
  }
  const trozosEdificios = seccionEdificios.split(';');
  if (trozosEdificios.length > 0 && trozosEdificios[trozosEdificios.length - 1] === '') trozosEdificios.pop();
  if (trozosEdificios.length > MAX_EDIFICIOS) {
    return { ok: false, error: MENSAJE_ENORME, advertencias };
  }
  const edificiosLeidos = [];
  trozosEdificios.forEach((entrada, indice) => {
    if (entrada === '') {
      advertencias.push(`No pude leer el edificio #${indice}. Lo salteo.`);
      return;
    }
    const edificio = leerEdificio(entrada, version);
    if (!edificio) {
      advertencias.push(`No pude leer el edificio #${indice}. Lo salteo.`);
      return;
    }
    edificiosLeidos.push({
      indice,
      nombre: nombreEdificio(indice),
      nombreIngles: edificios[indice]?.ingles || null,
      ...edificio,
    });
  });
  if (trozosEdificios.length > 0) {
    const ultima = trozosEdificios[trozosEdificios.length - 1];
    if (ultima !== '' && ultima.split(',').length < 4) {
      return { ok: false, error: MENSAJE_TRUNCADO, advertencias };
    }
  }
  if (secciones.length < 8) {
    return { ok: false, error: MENSAJE_TRUNCADO, advertencias };
  }

  const seccionEfectos = secciones[8] || '';
  const seccionMods = secciones[9] || '';
  if (seccionExcesiva(seccionEfectos, MAX_LARGO_SECCION, MAX_EFECTOS) || seccionExcesiva(seccionMods, MAX_LARGO_MODS, MAX_MODS)) {
    return { ok: false, error: MENSAJE_ENORME, advertencias };
  }

  const bitsMejoras = bitsDesde(secciones[6] || '', version, true);
  const bitsLogros = bitsDesde(secciones[7] || '', version, false);
  if (bitsMejoras == null || bitsLogros == null) {
    return { ok: false, error: MENSAJE_ENORME, advertencias };
  }
  if (!soloBits(bitsMejoras) || !soloBits(bitsLogros)) {
    return { ok: false, error: MENSAJE_DANADO, advertencias };
  }
  if (bitsMejoras.length % 2 !== 0) {
    advertencias.push('El bitfield de mejoras tiene una longitud impar. Puede que el código esté cortado al final.');
  }

  const compradas = nombresActivos(bitsMejoras, mejoras, 2, 1);
  const desbloqueadas = nombresActivos(bitsMejoras, mejoras, 2, 0);
  const logrosLeidos = nombresActivos(bitsLogros, logros, 1, 0);
  if (compradas.recortado || desbloqueadas.recortado) {
    advertencias.push(`Hay demasiadas mejoras para listarlas todas. Muestro los primeros ${MAX_NOMBRES_LISTA} nombres; el conteo sigue siendo el total.`);
  }
  if (logrosLeidos.recortado) {
    advertencias.push(`Hay demasiados logros para listarles el nombre. Muestro los primeros ${MAX_NOMBRES_LISTA}; el conteo sigue siendo el total.`);
  }

  const permanentes = [30, 31, 32, 33, 34].map((indice, ranura) => {
    const id = misc[indice] === undefined || misc[indice] === '' ? -1 : numero(misc[indice], true);
    return {
      ranura: ranura + 1,
      id,
      nombre: id < 0 ? 'vacía' : (mejoras[id] || `Mejora desconocida #${id}`),
    };
  });

  const mods = leerMods(seccionMods);
  if (mods.omitioJson) {
    advertencias.push('Un mod trae un bloque de datos demasiado grande o demasiado anidado. Lo cuento, pero no lo interpreté.');
  }
  if (mods.listaEnorme) {
    advertencias.push('La lista META de mods es demasiado larga. No la desplegué.');
  }
  const efectos = leerEfectos(seccionEfectos);
  const apariencia = leerApariencia(carrera[5] || '');
  const nombreCrudo = acortar(carrera[3] || '', 300);
  if (nombreCrudo.recortado) {
    advertencias.push('El nombre de la panadería es demasiado largo. Muestro solo el principio.');
  }

  if (misc.length > 56) {
    advertencias.push('Hay campos de más al final de las estadísticas. Esta versión del lector no les pone nombre: quedan como desconocidos.');
  }

  const datos = {
    version: versionTexto,
    versionNumero: version,
    nombre: nombreCrudo.texto || 'sin nombre',
    semilla: carrera[4] || '',
    fechas: {
      inicioAscension: leerFecha(carrera[0], advertencias, 'arranque de esta ascensión'),
      inicioPartida: leerFecha(carrera[1], advertencias, 'arranque de la partida'),
      ultimoGuardado: leerFecha(carrera[2], advertencias, 'último guardado'),
    },
    galletas,
    galletasHorneadasAscension,
    galletasEntregadas,
    galletasHorneadasTotal: galletasHorneadasAscension + galletasEntregadas,
    clics: numero(misc[2], true),
    galletasHechasAMano: numero(misc[4]),
    galletasDoradas: numero(misc[3], true),
    galletasDoradasAscension: numero(misc[15], true),
    galletasDoradasPerdidas: numero(misc[5], true),
    prestigio: numero(misc[25]),
    chipsCelestiales: numero(misc[26]),
    chipsCelestialesGastados: numero(misc[27]),
    galletasCelestiales: numero(misc[28]),
    ascensiones: numero(misc[14], true),
    modoAscension: { id: modoId, nombre: modo },
    temporada: { id: temporadaId, nombre: temporada, fotogramas: numero(misc[20], true), usos: numero(misc[21], true) },
    terrones: numero(misc[42], true),
    terronesTotales: numero(misc[43], true),
    tipoTerron: { id: tipoTerronId, nombre: tipoTerron },
    edificios: edificiosLeidos,
    edificiosTotal: edificiosLeidos.reduce((suma, edificio) => suma + edificio.cantidad, 0),
    mejoras: {
      compradas: compradas.activos,
      desbloqueadas: desbloqueadas.activos,
      total: compradas.total,
      nombresCompradas: compradas.nombres,
    },
    logros: {
      obtenidos: logrosLeidos.activos,
      total: logrosLeidos.total,
      nombres: logrosLeidos.nombres,
    },
    mejorasPermanentes: permanentes,
    nivelDragon: numero(misc[35], true),
    auraDragon: numero(misc[36], true),
    auraDragon2: numero(misc[37], true),
    heraldos: numero(misc[48], true),
    fondoId: numero(misc[6], true),
    lecheId: numero(misc[7], true),
    iraAnciana: numero(misc[9], true),
    cpsMaximo: numero(misc[51]),
    apariencia,
    efectos,
    mods,
    camposDesconocidos: misc.slice(55).filter((campo) => campo !== ''),
  };

  return {
    ok: true,
    juego: 'cookie-clicker',
    nombreJuego: 'Cookie Clicker',
    version: versionTexto,
    advertencias,
    datos,
    paneles: armarPaneles(datos),
  };
}

export function armarPaneles(datos, formatear = (valor) => String(valor)) {
  const temporadaDetalle = datos.temporada.id
    ? `Quedaban ${formatearFotogramas(datos.temporada.fotogramas)} cuando se guardó. La cambiaste ${formatear(datos.temporada.usos)} ${datos.temporada.usos === 1 ? 'vez' : 'veces'} con el cambiador.`
    : 'No había una temporada forzada.';

  const efecto = datos.efectos[0];
  const resumen = {
    id: 'resumen',
    tipo: 'tarjetas',
    titulo: 'Resumen de la partida',
    nota: 'Los números salen del código tal como se guardó. Nada de esto se vuelve a calcular contra el juego.',
    items: [
      { etiqueta: 'Panadería', texto: datos.nombre },
      { etiqueta: 'Versión', texto: datos.version },
      { etiqueta: 'Arranque de la partida', fecha: datos.fechas.inicioPartida },
      { etiqueta: 'Arranque de esta ascensión', fecha: datos.fechas.inicioAscension },
      { etiqueta: 'Último guardado', fecha: datos.fechas.ultimoGuardado },
      { etiqueta: 'Galletas en el banco', numero: datos.galletas },
      { etiqueta: 'Horneadas esta ascensión', numero: datos.galletasHorneadasAscension },
      { etiqueta: 'Horneadas en total', numero: datos.galletasHorneadasTotal, detalle: 'Esta ascensión más las que entregaste al ascender.' },
      { etiqueta: 'Clics en la galleta', numero: datos.clics, detalle: 'En esta ascensión.' },
      { etiqueta: 'Galletas hechas a mano', numero: datos.galletasHechasAMano },
      { etiqueta: 'Galletas doradas', numero: datos.galletasDoradas, detalle: `${formatear(datos.galletasDoradasAscension)} en esta ascensión.` },
      { etiqueta: 'Temporada', texto: datos.temporada.nombre, detalle: temporadaDetalle },
      { etiqueta: 'Terrones de azúcar', numero: datos.terrones, detalle: `${formatear(datos.terronesTotales)} cosechados en total. El que está creciendo es ${datos.tipoTerron.nombre}.` },
      { etiqueta: 'Edificios en total', numero: datos.edificiosTotal },
    ],
  };
  if (efecto) resumen.items.push({ etiqueta: 'Efecto al guardar', texto: efecto.texto });

  const maxNivel = datos.edificios.reduce((max, edificio) => Math.max(max, edificio.nivel), 0);
  const panelEdificios = {
    id: 'edificios',
    tipo: 'barras',
    titulo: 'Edificios',
    nota: maxNivel > 0
      ? 'La barra compara cuántos tenés de cada uno. El detalle trae el nivel y cuántos compraste en esta ascensión, vendidos incluidos.'
      : 'La barra compara cuántos tenés de cada uno.',
    items: datos.edificios.map((edificio) => ({
      etiqueta: edificio.nombre,
      valor: edificio.cantidad,
      detalle: `nivel ${formatear(edificio.nivel)} · comprados ${formatear(edificio.comprados)}`,
    })),
  };

  const panelProgreso = {
    id: 'progreso',
    tipo: 'progreso',
    titulo: 'Logros y mejoras',
    nota: 'Los nombres salen de la traducción oficial al español. Si un id no está en esa lista, lo marcamos como desconocido.',
    grupos: [
      {
        etiqueta: 'Logros',
        obtenidos: datos.logros.obtenidos,
        total: datos.logros.total,
        detalle: 'Los que esta versión del juego cuenta en el bitfield.',
        nombres: datos.logros.nombres,
      },
      {
        etiqueta: 'Mejoras compradas',
        obtenidos: datos.mejoras.compradas,
        total: datos.mejoras.total,
        detalle: `${formatear(datos.mejoras.desbloqueadas)} desbloqueadas, compres o no.`,
        nombres: datos.mejoras.nombresCompradas,
      },
    ],
  };

  const permanentes = datos.mejorasPermanentes
    .map((ranura) => `${ranura.ranura}. ${ranura.nombre}`)
    .join(' · ');

  const panelPrestigio = {
    id: 'prestigio',
    tipo: 'tarjetas',
    titulo: 'Prestigio y ascensión',
    nota: 'Prestigio y pepitas son los valores guardados. Al importar, el juego vuelve a calcular el prestigio a partir de las galletas entregadas.',
    items: [
      { etiqueta: 'Prestigio', numero: datos.prestigio },
      { etiqueta: 'Pepitas celestiales', numero: datos.chipsCelestiales, detalle: 'Las que tenés sin gastar.' },
      { etiqueta: 'Pepitas gastadas', numero: datos.chipsCelestialesGastados },
      { etiqueta: 'Ascensiones', numero: datos.ascensiones },
      { etiqueta: 'Modo de la ascensión', texto: datos.modoAscension.nombre },
      { etiqueta: 'Nivel del dragón', numero: datos.nivelDragon, detalle: 'Es el índice de etapa. El nombre de cada etapa no lo mostramos.' },
      { etiqueta: 'Heraldos al guardar', numero: datos.heraldos },
      { etiqueta: 'Mejoras permanentes', texto: permanentes },
    ],
  };

  const itemsMods = [
    ...datos.mods.lista.map((mod) => ({
      titulo: mod.nombre,
      marca: mod.asterisco ? 'con asterisco' : 'en la lista',
      detalle: mod.asterisco
        ? 'Figura con * en META. Los tres mods de ejemplo oficiales, que el juego trae desactivados, se guardan así.'
        : 'Figura en META, sin asterisco.',
    })),
    ...datos.mods.datos.map((mod) => ({
      titulo: mod.id,
      marca: 'datos propios',
      detalle: mod.version
        ? `Trae ${formatear(mod.caracteres)} caracteres de datos. El JSON dice versión ${mod.version}. El resto no lo interpretamos.`
        : `Trae ${formatear(mod.caracteres)} caracteres de datos propios. No los interpretamos.`,
    })),
  ];

  const panelMods = {
    id: 'mods',
    tipo: 'lista',
    titulo: 'Mods detectados',
    nota: 'META es la lista que agrega la versión de Steam. El asterisco no está explicado en el main.js público de la web: lo leemos como la marca de los mods de ejemplo que vienen apagados.',
    vacio: 'Esta partida no trae mods.',
    items: itemsMods,
  };

  return [resumen, panelEdificios, panelProgreso, panelPrestigio, panelMods];
}
