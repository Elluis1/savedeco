// Lector del export de Cookie Clicker.
// El armado del string está en Game.WriteSave / Game.LoadSave (main.js del juego)
// y el mapa de campos, en https://cookieclicker.wiki.gg/wiki/Save (revisado para 2.052).
// pack3() hoy devuelve el bitfield tal cual; las versiones viejas usan unpack2 o unpack.

import { edificios, logros, mejoras } from './catalogo.js';
import { formatearFotogramas } from '../../nucleo/numeros.js';

export const MENSAJE_DANADO = 'Este código parece de Cookie Clicker, pero está dañado. Volvé a copiarlo entero, con el !END! del final.';
export const MENSAJE_TRUNCADO = 'El código está truncado: falta una parte de la partida. Exportala de nuevo y pegala completa.';

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
  let binario;
  if (typeof atob === 'function') {
    binario = atob(b64);
  } else {
    binario = Buffer.from(b64, 'base64').toString('latin1');
  }
  const porcentajes = Array.prototype.map
    .call(binario, (caracter) => `%${caracter.charCodeAt(0).toString(16).padStart(2, '0')}`)
    .join('');
  return decodeURIComponent(porcentajes);
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
  if (original.trim() === '') return { vacio: true, teniaFin: false, plano: null };
  let s = original.trim();
  const teniaFinCodificado = /%21end%21/i.test(s);
  if (s.includes('%')) {
    s = s.replace(/%u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
    try {
      s = decodeURIComponent(s);
    } catch {
      // Si el % no es un escape válido, seguimos con el texto crudo.
    }
  }
  const teniaFin = teniaFinCodificado || /!END!/i.test(s);
  s = s.replace(/\s+/g, '');
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
  let valores = '';
  for (let i = 0; i < empacado.length; i += 1) {
    valores += empacado.charCodeAt(i).toString(2).slice(1);
  }
  return valores;
}

function desempaquetar(empacado) {
  const bytes = [];
  for (let i = 0; i < empacado.length; i += 1) {
    const codigo = empacado.charCodeAt(i);
    bytes.push((codigo >>> 8) & 0xff, codigo & 0xff);
  }
  return bytes;
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
    const numero = Number.parseInt(parte, 10);
    if (!Number.isFinite(numero)) continue;
    bits.push(...descomprimirBin(numero));
  }
  return bits;
}

function bitsDesde(texto, version, pares) {
  if (!texto) return [];
  if (version < 1.035) {
    const salida = [];
    for (const parte of texto.split(';')) {
      if (!parte) continue;
      const campos = parte.split(',');
      salida.push(Number.parseInt(campos[0], 10) ? '1' : '0');
      if (pares) salida.push(Number.parseInt(campos[1], 10) ? '1' : '0');
    }
    return salida;
  }
  if (version < 1.05) return descomprimirBinGrande(texto).map(String);
  if (version < 1.0502) return desempaquetar(texto).map(String);
  if (version < 2.0046) return desempaquetar2(texto).split('');
  return texto.split('');
}

function bitsPreferencias(texto, version) {
  if (!texto) return [];
  if (version < 1.0503) return texto.split('');
  if (version < 2.0046) return desempaquetar2(texto).split('');
  return texto.split('');
}

function numero(texto, entero = false) {
  if (texto == null || texto === '') return 0;
  const valor = entero ? Number.parseInt(texto, 10) : Number.parseFloat(texto);
  return Number.isFinite(valor) ? valor : 0;
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
    const marcado = bits[i * paso + desplazado] === '1';
    if (!marcado) continue;
    activos += 1;
    nombres.push(catalogo[i] || (paso === 2 ? `Mejora desconocida #${i}` : `Logro desconocido #${i}`));
  }
  return { activos, total, nombres };
}

function leerMods(seccion) {
  const lista = [];
  const datos = [];
  if (!seccion) return { lista, datos };
  for (const parte of seccion.split(';')) {
    if (!parte) continue;
    const corte = parte.indexOf(':');
    if (corte < 0) continue;
    const id = parte.slice(0, corte);
    const cuerpo = parte.slice(corte + 1).replaceAll('[P]', '|').replaceAll('[S]', ';');
    if (id === 'META') {
      for (const crudo of cuerpo.split(',')) {
        if (!crudo) continue;
        const asterisco = crudo.startsWith('*');
        lista.push({
          nombre: asterisco ? crudo.slice(1) : crudo,
          asterisco,
        });
      }
      continue;
    }
    let versionMod = null;
    try {
      const json = JSON.parse(cuerpo);
      if (json && typeof json.lastVersion === 'string') versionMod = json.lastVersion;
    } catch {
      versionMod = null;
    }
    datos.push({ id, caracteres: cuerpo.length, version: versionMod });
  }
  return { lista, datos };
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
  return texto.split(',').map((valor, indice) => ({
    id: GENES[indice] || `gen desconocido #${indice}`,
    indice: numero(valor, true),
  }));
}

export function detectar(texto) {
  const abierto = abrirCodigo(texto);
  if (abierto.vacio) return 0;
  if (!abierto.plano) return abierto.teniaFin ? 0.62 : 0.08;
  const secciones = abierto.plano.split('|');
  const cruda = secciones[0] || '';
  const version = Number.parseFloat(cruda);
  const versionOk = /^\d+(\.\d+)?$/.test(cruda) && version >= 0.1 && version < 100;
  if (!versionOk) return abierto.teniaFin ? 0.55 : 0.1;
  if (secciones.length >= 5) return abierto.teniaFin ? 0.98 : 0.9;
  return abierto.teniaFin ? 0.72 : 0.6;
}

export function decodificar(texto) {
  const abierto = abrirCodigo(texto);
  if (abierto.vacio) {
    return { ok: false, error: 'Pegá un código de exportación o subí el archivo de la partida.', advertencias: [] };
  }
  if (!abierto.plano) {
    return { ok: false, error: abierto.teniaFin ? MENSAJE_DANADO : MENSAJE_TRUNCADO, advertencias: [] };
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
  if (version < 2.0046) {
    advertencias.push(`La versión ${versionTexto} guarda las mejoras y los logros empaquetados. Los abrí con el método de esa época.`);
  }

  const carrera = secciones[2].split(';');
  const misc = secciones[4].split(';');
  if (misc.length < 2 || Number.isNaN(Number.parseFloat(misc[0]))) {
    return { ok: false, error: MENSAJE_TRUNCADO, advertencias };
  }

  const galletas = numero(misc[0]);
  const galletasHorneadasAscension = numero(misc[1]);
  const galletasEntregadas = numero(misc[8]);
  const temporadaId = misc[22] || '';
  let temporada = 'Ninguna';
  if (temporadaId) {
    temporada = TEMPORADAS[temporadaId] || null;
    if (!temporada) {
      temporada = temporadaId;
      advertencias.push(`La temporada "${temporadaId}" no está en la lista que conocemos. La dejo con el nombre crudo.`);
    }
  }

  const modoId = numero(misc[29], true);
  const modo = MODOS_ASCENSION[modoId] || `desconocido (${modoId})`;
  if (!(modoId in MODOS_ASCENSION)) {
    advertencias.push(`El modo de ascensión ${modoId} no está documentado en el fuente que leí.`);
  }

  const tipoTerronId = numero(misc[46], true);
  const tipoTerron = TIPOS_TERRON[tipoTerronId] || `desconocido (${tipoTerronId})`;

  const entradasEdificios = (secciones[5] || '').split(';').filter((entrada) => entrada.length > 0);
  const edificiosLeidos = [];
  entradasEdificios.forEach((entrada, indice) => {
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
  if ((secciones[5] || '') !== '' && entradasEdificios.length > 0) {
    const ultima = entradasEdificios[entradasEdificios.length - 1];
    if (ultima.split(',').length < 4) {
      return { ok: false, error: MENSAJE_TRUNCADO, advertencias };
    }
  }
  if (secciones.length < 8) {
    return { ok: false, error: MENSAJE_TRUNCADO, advertencias };
  }

  const bitsMejoras = bitsDesde(secciones[6] || '', version, true);
  const bitsLogros = bitsDesde(secciones[7] || '', version, false);
  if (bitsMejoras.some((bit) => bit !== '0' && bit !== '1') || bitsLogros.some((bit) => bit !== '0' && bit !== '1')) {
    return { ok: false, error: MENSAJE_DANADO, advertencias };
  }
  if (bitsMejoras.length % 2 !== 0) {
    advertencias.push('El bitfield de mejoras tiene una longitud impar. Puede que el código esté cortado al final.');
  }

  const compradas = nombresActivos(bitsMejoras, mejoras, 2, 1);
  const desbloqueadas = nombresActivos(bitsMejoras, mejoras, 2, 0);
  const logrosLeidos = nombresActivos(bitsLogros, logros, 1, 0);

  const permanentes = [30, 31, 32, 33, 34].map((indice, ranura) => {
    const id = misc[indice] === undefined || misc[indice] === '' ? -1 : numero(misc[indice], true);
    return {
      ranura: ranura + 1,
      id,
      nombre: id < 0 ? 'vacía' : (mejoras[id] || `Mejora desconocida #${id}`),
    };
  });

  const mods = leerMods(secciones[9] || '');
  const efectos = leerEfectos(secciones[8] || '');
  const apariencia = leerApariencia(carrera[5] || '');

  if (misc.length > 56) {
    advertencias.push('Hay campos de más al final de las estadísticas. Esta versión del lector no les pone nombre: quedan como desconocidos.');
  }

  const datos = {
    version: versionTexto,
    versionNumero: version,
    nombre: carrera[3] || 'sin nombre',
    semilla: carrera[4] || '',
    fechas: {
      inicioAscension: numero(carrera[0], true),
      inicioPartida: numero(carrera[1], true),
      ultimoGuardado: numero(carrera[2], true),
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
