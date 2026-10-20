// Archivos de la partida leída. El núcleo no conoce juegos: el lector, si quiere,
// expone un documento con armarExportacion(datos). Si no, se arma con los paneles.
// Así un lector nuevo hereda texto, CSV y JSON sin escribir la descarga.
//
// Todo se genera en memoria. La página lo baja con Blob y URL.createObjectURL.

import { MAX_CELDAS_MOSAICO } from './paneles.js';
import { buscarLector } from './registro.js';
import { NOTACION_CORTA, formatearNumero } from './numeros.js';

export const LIMITE_EXPORTACION = 4_000_000;

const AVISO_CORTE = 'La exportación se cortó al llegar al tope de tamaño, para no trabar el navegador. Lo que sigue no entró en este archivo.';

const NOTAS_GENERICAS = [
  'Este archivo lo armó Savedeco en el navegador, para guardarlo o pasárselo a una IA. No se puede volver a cargar en el juego: es el resumen de lo que se leyó.',
  'Savedeco es solo lectura. La partida no se modifica y estos datos no salen de la máquina.',
  'Los números grandes van de dos maneras. Primero, legibles, en la notación corta del juego: un billón es 10^9. Después, el valor exacto. Si entra en un entero seguro, el exacto es el número completo, sin puntos ni comas. Si no, es notación científica con punto decimal. El save guarda un float: esa es toda la precisión que hay.',
  'Las fechas están en UTC. El exacto es la cantidad de milisegundos desde el 1 de enero de 1970. Si la fecha no entra en un calendario, dice desconocida.',
  'Un id o un campo desconocido es un valor que el save trae y este lector no sabe nombrar. El hueco queda a propósito.',
  'La fecha del nombre del archivo es el día UTC de la exportación.',
  'El CSV separa las columnas con punto y coma, usa el salto de línea de Windows y empieza con una marca BOM para que Excel en español abra los acentos. Cada sección es un bloque con su propio encabezado.',
  'En el CSV, la columna legible es para leerla y la exacta es el número fiel. Si el exacto no entra cómodo en Excel (notación científica, o un entero de más de 15 dígitos), la celda arranca con un apóstrofo para que no lo redondee: el número va después.',
  'Si un texto arranca con =, +, - o @, aunque antes haya espacios o caracteres invisibles, el CSV le pone un apóstrofo adelante para que Excel no lo tome como fórmula.',
  'El JSON repite los mismos datos. Un número o una fecha es un objeto con valor, legible y exacto. Un texto queda como texto.',
];

// Lo que Windows no acepta en un nombre, más el DEL.
const ILEGALES_WINDOWS = /[<>:"/\\|?*\u0000-\u001f\u007f]/g;
// Ancho cero, separadores de línea unicode y marcas que invierten el texto.
// No rompen el disco, pero disfrazan la extensión o parten el nombre. La
// panadería sale del save, así que se sacan.
const INVISIBLES_NOMBRE = /[\u0085\u180e\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u206f\ufeff]/g;
// Excel ejecuta la fórmula si el primer carácter que le importa es = + - @.
// Antes se salta espacios de cualquier ancho, separadores de línea y marcas
// invisibles. Si no, un nombre que arranca con un espacio ideográfico y un =
// pasa como fórmula.
const PREFIJO_IGNORABLE_CSV = /^[\u0000-\u0020\u007f\u0085\u00a0\u1680\u180e\u2000-\u200f\u2028-\u202f\u205f-\u206f\u3000\ufeff]*/;
// Un separador de línea unicode parte la fila del CSV igual que un \n, y
// algunos visores de Markdown lo tratan como salto.
const SALTO_RARO = /[\u0085\u2028\u2029]/;

function esNumerico(tipo) {
  return tipo === 'numero' || tipo === 'entero' || tipo === 'fecha';
}

export function describirValor(valor, tipo = 'texto') {
  if (tipo === 'fecha') {
    const numero = typeof valor === 'string' ? Number(valor) : Number(valor);
    if (!Number.isFinite(numero) || numero <= 0) {
      return { legible: 'desconocida', exacto: '', valor: null };
    }
    const fecha = new Date(numero);
    if (Number.isNaN(fecha.getTime())) {
      return { legible: 'desconocida', exacto: '', valor: null };
    }
    let legible = 'desconocida';
    try {
      legible = `${new Intl.DateTimeFormat('es-AR', {
        dateStyle: 'long',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(fecha)} UTC`;
    } catch {
      legible = 'desconocida';
    }
    return { legible, exacto: String(Math.trunc(numero)), valor: Math.trunc(numero) };
  }

  if (tipo === 'numero' || tipo === 'entero') {
    if (valor == null || valor === '') return { legible: '', exacto: '', valor: null };
    const numero = typeof valor === 'string' ? Number(valor) : valor;
    if (typeof numero !== 'number' || !Number.isFinite(numero)) {
      return { legible: 'desconocido', exacto: '', valor: null };
    }
    if (Object.is(numero, -0)) return { legible: '0', exacto: '0', valor: 0 };
    const exacto = Number.isSafeInteger(numero) ? String(numero) : numero.toExponential();
    return { legible: formatearNumero(numero, NOTACION_CORTA), exacto, valor: numero };
  }

  if (valor == null) return { legible: '', exacto: '', valor: '' };
  const texto = String(valor);
  return { legible: texto, exacto: texto, valor: texto };
}

function textoValor(descrito) {
  const legible = String(descrito.legible ?? '');
  const combinado = !descrito.exacto || descrito.exacto === descrito.legible
    ? legible
    : `${legible} (${descrito.exacto})`;
  return aplanar(combinado);
}

function aplanar(valor) {
  return String(valor ?? '')
    .replaceAll('\r\n', ' ')
    .replace(/[\u0000-\u001f\u007f\u0085\u2028\u2029]/g, ' ')
    .replaceAll('|', '\\|');
}

function fechaDocumento(documento) {
  const ms = Date.parse(documento?.exportado);
  if (!Number.isFinite(ms)) return { legible: 'desconocida', exacto: '', valor: null, iso: '' };
  return { ...describirValor(ms, 'fecha'), iso: new Date(ms).toISOString() };
}

export function nombreArchivo(titulo, extension, fecha) {
  const momento = fecha instanceof Date && !Number.isNaN(fecha.getTime()) ? fecha : new Date();
  const dia = momento.toISOString().slice(0, 10);
  let base = String(titulo ?? '')
    .replace(INVISIBLES_NOMBRE, '')
    .replace(ILEGALES_WINDOWS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  base = base.replace(/^[. ]+|[. ]+$/g, '');
  if (base.length > 80) base = base.slice(0, 80).replace(/^[. ]+|[. ]+$/g, '').trim();
  if (!base) base = 'partida';
  const limpia = String(extension || 'txt').replace(/[^a-z0-9]/gi, '') || 'txt';
  return `Savedeco-${base}-${dia}.${limpia}`;
}

export function escaparCsv(valor) {
  let texto = String(valor ?? '');
  const resto = texto.replace(PREFIJO_IGNORABLE_CSV, '');
  if (/^[=+\-@]/.test(resto)) texto = `'${texto}`;
  if (/[;"\r\n]/.test(texto) || SALTO_RARO.test(texto)) return `"${texto.replaceAll('"', '""')}"`;
  return texto;
}

function exactoParaExcel(exacto) {
  if (!exacto) return '';
  if (/^-?\d{1,15}$/.test(exacto)) return exacto;
  return `'${exacto}`;
}

function crearBuffer(limite, separador) {
  const tope = Math.max(0, limite - AVISO_CORTE.length - separador.length - 8);
  const partes = [];
  let usado = 0;
  let cortado = false;
  return {
    get cortado() {
      return cortado;
    },
    agregar(texto) {
      if (cortado) return false;
      const linea = String(texto);
      const costo = linea.length + (partes.length ? separador.length : 0);
      if (usado + costo > tope) {
        cortado = true;
        return false;
      }
      partes.push(linea);
      usado += costo;
      return true;
    },
    finalizar() {
      if (cortado) partes.push(AVISO_CORTE);
      return partes.join(separador);
    },
  };
}

function filaCsv(celdas) {
  return celdas.map((celda) => escaparCsv(celda)).join(';');
}

export function armarTexto(documento, opciones = {}) {
  const limite = opciones.limite ?? LIMITE_EXPORTACION;
  const buffer = crearBuffer(limite, '\n');
  const fecha = fechaDocumento(documento);
  const encabezado = [
    `# Savedeco — ${aplanar(documento.juego || 'partida')}`,
    '',
    'Este archivo describe una partida ya leída. Sirve para guardarlo o pasárselo a una IA.',
    'El formato es Markdown. No se puede volver a cargar en el juego: es el resumen de lo que Savedeco leyó en el navegador.',
    '',
    `- Juego: ${aplanar(documento.juego)}`,
    `- Versión del save: ${aplanar(documento.version)}`,
    `- Partida: ${aplanar(documento.titulo)}`,
    `- Fecha de exportación: ${fecha.iso ? `${fecha.legible} (${fecha.iso})` : 'desconocida'}`,
    '',
    '## Cómo leer este archivo',
    '',
  ];
  for (const linea of encabezado) buffer.agregar(linea);
  for (const nota of documento.notas || []) {
    if (!buffer.agregar(`- ${aplanar(nota)}`)) break;
  }

  if (!buffer.cortado && (documento.advertencias || []).length) {
    buffer.agregar('');
    buffer.agregar('## Advertencias de la lectura');
    buffer.agregar('');
    for (const aviso of documento.advertencias) {
      if (!buffer.agregar(`- ${aplanar(aviso)}`)) break;
    }
  }

  for (const seccion of documento.secciones || []) {
    if (buffer.cortado) break;
    if (!seccion || typeof seccion !== 'object') continue;
    buffer.agregar('');
    buffer.agregar(`## ${aplanar(seccion.titulo || seccion.id || 'Sección')}`);
    if (seccion.nota) {
      buffer.agregar('');
      buffer.agregar(aplanar(seccion.nota));
    }
    if (seccion.campos?.length) {
      buffer.agregar('');
      for (const campo of seccion.campos) {
        if (buffer.cortado) break;
        const descrito = describirValor(campo.valor, campo.tipo || 'texto');
        const etiqueta = campo.etiqueta ? `${aplanar(campo.etiqueta)}: ` : '';
        if (!buffer.agregar(`- ${etiqueta}${textoValor(descrito)}`)) break;
        if (campo.nota && !buffer.agregar(`  ${aplanar(campo.nota)}`)) break;
      }
    }
    if (seccion.tabla && !buffer.cortado) {
      const columnas = seccion.tabla.columnas || [];
      if (columnas.length) {
        buffer.agregar('');
        const cabezas = columnas.map((columna) => aplanar(columna.etiqueta || columna.id));
        if (!buffer.agregar(`| ${cabezas.join(' | ')} |`)) continue;
        if (!buffer.agregar(`| ${cabezas.map(() => '---').join(' | ')} |`)) continue;
        for (const fila of seccion.tabla.filas || []) {
          const celdas = columnas.map((columna) => {
            const descrito = describirValor(fila?.[columna.id], columna.tipo || 'texto');
            return textoValor(descrito);
          });
          if (!buffer.agregar(`| ${celdas.join(' | ')} |`)) break;
        }
      }
    }
  }

  const texto = buffer.finalizar();
  return texto.endsWith('\n') ? texto : `${texto}\n`;
}

function bloqueCampos(buffer, titulo, nota, campos) {
  if (!buffer.agregar(filaCsv([titulo, nota || '']))) return;
  if (!buffer.agregar(filaCsv(['campo', 'valor legible', 'valor exacto', 'nota']))) return;
  for (const campo of campos) {
    const descrito = describirValor(campo.valor, campo.tipo || 'texto');
    const exacto = esNumerico(campo.tipo) ? exactoParaExcel(descrito.exacto) : descrito.exacto;
    if (!buffer.agregar(filaCsv([campo.etiqueta || '', descrito.legible, exacto, campo.nota || '']))) return;
  }
}

export function armarCsv(documento, opciones = {}) {
  const limite = opciones.limite ?? LIMITE_EXPORTACION;
  const buffer = crearBuffer(Math.max(0, limite - 1), '\r\n');
  const fecha = fechaDocumento(documento);
  bloqueCampos(buffer, 'Archivo', 'Datos de esta exportación. La partida sigue en las secciones de abajo.', [
    { etiqueta: 'Juego', valor: documento.juego || '', tipo: 'texto' },
    { etiqueta: 'Versión del save', valor: documento.version || '', tipo: 'texto' },
    {
      etiqueta: 'Fecha de exportación',
      valor: fecha.valor,
      tipo: 'fecha',
      nota: 'Cuándo se generó este archivo, en UTC. No es la fecha del último guardado.',
    },
    {
      etiqueta: 'Partida',
      valor: documento.titulo || '',
      tipo: 'texto',
      nota: 'Nombre que usa el archivo. Lo elige el lector.',
    },
  ]);

  if (!buffer.cortado) {
    buffer.agregar('');
    if (buffer.agregar('Cómo leer este archivo')) {
      buffer.agregar(filaCsv(['nota']));
      for (const nota of documento.notas || []) {
        if (!buffer.agregar(filaCsv([nota]))) break;
      }
    }
  }

  if (!buffer.cortado && (documento.advertencias || []).length) {
    buffer.agregar('');
    if (buffer.agregar('Advertencias de la lectura')) {
      buffer.agregar(filaCsv(['advertencia']));
      for (const aviso of documento.advertencias) {
        if (!buffer.agregar(filaCsv([aviso]))) break;
      }
    }
  }

  for (const seccion of documento.secciones || []) {
    if (buffer.cortado) break;
    if (!seccion || typeof seccion !== 'object') continue;
    buffer.agregar('');
    if (seccion.campos?.length) {
      bloqueCampos(buffer, seccion.titulo || seccion.id || 'Sección', seccion.nota || '', seccion.campos);
    } else if (!buffer.agregar(filaCsv([seccion.titulo || seccion.id || 'Sección', seccion.nota || '']))) {
      break;
    }
    if (buffer.cortado || !seccion.tabla?.columnas?.length) continue;
    if (seccion.campos?.length) {
      buffer.agregar('');
      if (!buffer.agregar(filaCsv([`${seccion.titulo || 'Sección'} (tabla)`, '']))) continue;
    }
    const cabezas = [];
    for (const columna of seccion.tabla.columnas) {
      const etiqueta = columna.etiqueta || columna.id;
      if (esNumerico(columna.tipo)) cabezas.push(`${etiqueta} (legible)`, `${etiqueta} (exacto)`);
      else cabezas.push(etiqueta);
    }
    if (!buffer.agregar(filaCsv(cabezas))) continue;
    for (const fila of seccion.tabla.filas || []) {
      const celdas = [];
      for (const columna of seccion.tabla.columnas) {
        const descrito = describirValor(fila?.[columna.id], columna.tipo || 'texto');
        if (esNumerico(columna.tipo)) celdas.push(descrito.legible, exactoParaExcel(descrito.exacto));
        else celdas.push(descrito.legible);
      }
      if (!buffer.agregar(filaCsv(celdas))) break;
    }
  }

  const cuerpo = buffer.finalizar();
  return `\uFEFF${cuerpo}\r\n`;
}

function vistaSeccion(seccion) {
  const salida = {
    id: seccion.id || '',
    titulo: seccion.titulo || '',
    nota: seccion.nota || '',
  };
  if (seccion.campos) {
    salida.campos = seccion.campos.map((campo) => {
      const descrito = describirValor(campo.valor, campo.tipo || 'texto');
      const item = {
        etiqueta: campo.etiqueta || '',
        tipo: campo.tipo || 'texto',
        valor: descrito.valor,
        legible: descrito.legible,
        exacto: descrito.exacto,
      };
      if (campo.nota) item.nota = campo.nota;
      return item;
    });
  }
  if (seccion.tabla?.columnas) {
    salida.tabla = {
      columnas: seccion.tabla.columnas.map((columna) => ({
        id: columna.id,
        etiqueta: columna.etiqueta || columna.id,
        tipo: columna.tipo || 'texto',
      })),
      filas: (seccion.tabla.filas || []).map((fila) => {
        const salidaFila = {};
        for (const columna of seccion.tabla.columnas) {
          const tipo = columna.tipo || 'texto';
          const descrito = describirValor(fila?.[columna.id], tipo);
          salidaFila[columna.id] = tipo === 'texto'
            ? descrito.legible
            : { valor: descrito.valor, legible: descrito.legible, exacto: descrito.exacto };
        }
        return salidaFila;
      }),
    };
  }
  return salida;
}

function vistaJson(documento, recorte) {
  const fecha = fechaDocumento(documento);
  const salida = {
    juego: documento.juego || '',
    idJuego: documento.idJuego || '',
    version: documento.version || '',
    titulo: documento.titulo || '',
    exportado: fecha.iso,
    exportadoLegible: fecha.legible,
    notas: documento.notas || [],
    advertencias: documento.advertencias || [],
    secciones: (documento.secciones || [])
      .filter((seccion) => seccion && typeof seccion === 'object')
      .map(vistaSeccion),
  };
  if (recorte) salida.recorte = true;
  return salida;
}

function acotarTexto(valor, maximo) {
  if (typeof valor !== 'string' || valor.length <= maximo) return valor;
  return valor.slice(0, maximo);
}

function acotarCampo(campo) {
  return {
    ...campo,
    etiqueta: acotarTexto(campo.etiqueta, 80),
    valor: acotarTexto(campo.valor, 180),
    nota: acotarTexto(campo.nota, 180),
  };
}

function clonarParaRecorte(documento) {
  return {
    ...documento,
    notas: [...(documento.notas || [])],
    advertencias: [...(documento.advertencias || [])],
    secciones: (documento.secciones || []).map((seccion) => ({
      ...seccion,
      campos: seccion.campos ? seccion.campos.map((campo) => ({ ...campo })) : undefined,
      tabla: seccion.tabla ? {
        columnas: seccion.tabla.columnas,
        filas: [...(seccion.tabla.filas || [])],
      } : undefined,
    })),
  };
}

export function armarJson(documento, opciones = {}) {
  const limite = opciones.limite ?? LIMITE_EXPORTACION;
  let actual = documento;
  let recorte = false;
  let texto = `${JSON.stringify(vistaJson(actual, false), null, 2)}\n`;
  if (texto.length <= limite) return texto;

  recorte = true;
  actual = clonarParaRecorte(documento);
  actual.notas = [...actual.notas, AVISO_CORTE];
  const tablas = [];
  for (const seccion of actual.secciones || []) {
    if (seccion?.tabla?.filas) tablas.push(seccion.tabla);
  }
  texto = `${JSON.stringify(vistaJson(actual, true), null, 2)}\n`;
  let guard = 0;
  while (texto.length > limite && guard < 40) {
    guard += 1;
    let quito = false;
    for (const tabla of tablas) {
      if (!tabla.filas.length) continue;
      const n = Math.max(1, Math.ceil(tabla.filas.length / 2));
      tabla.filas.splice(-n, n);
      quito = true;
    }
    if (!quito) break;
    texto = `${JSON.stringify(vistaJson(actual, true), null, 2)}\n`;
  }
  if (texto.length > limite) {
    actual.notas = (actual.notas || []).map((nota) => acotarTexto(String(nota), 240));
    actual.titulo = acotarTexto(String(actual.titulo ?? ''), 80);
    for (const seccion of actual.secciones || []) {
      if (typeof seccion.titulo === 'string') seccion.titulo = acotarTexto(seccion.titulo, 80);
      if (typeof seccion.nota === 'string') seccion.nota = acotarTexto(seccion.nota, 180);
      if (seccion.campos?.length) seccion.campos = [acotarCampo(seccion.campos[0])];
      if (seccion.tabla) seccion.tabla.filas = [];
    }
    texto = `${JSON.stringify(vistaJson(actual, true), null, 2)}\n`;
  }
  if (texto.length > limite) {
    actual.secciones = [];
    actual.advertencias = [];
    actual.notas = [AVISO_CORTE];
    actual.titulo = acotarTexto(String(actual.titulo ?? ''), 40);
    actual.juego = acotarTexto(String(actual.juego ?? ''), 40);
    actual.version = acotarTexto(String(actual.version ?? ''), 40);
    texto = `${JSON.stringify(vistaJson(actual, true), null, 2)}\n`;
  }
  if (texto.length > limite) {
    const minimo = `${JSON.stringify({ recorte: true, nota: AVISO_CORTE })}\n`;
    return minimo.length <= limite ? minimo : minimo.slice(0, Math.max(0, limite));
  }
  return texto;
}

function valorPlano(celda) {
  if (celda == null) return { valor: '', tipo: 'texto' };
  if (typeof celda !== 'object') return { valor: celda, tipo: typeof celda === 'number' ? 'numero' : 'texto' };
  if (Object.prototype.hasOwnProperty.call(celda, 'numero')) return { valor: celda.numero, tipo: 'numero' };
  if (Object.prototype.hasOwnProperty.call(celda, 'fecha')) return { valor: celda.fecha, tipo: 'fecha' };
  if (Object.prototype.hasOwnProperty.call(celda, 'texto')) return { valor: celda.texto ?? '', tipo: 'texto' };
  return { valor: '', tipo: 'texto' };
}

function campoDesdeItem(item) {
  if (item == null || typeof item !== 'object') {
    return { etiqueta: '', valor: item == null ? '' : String(item), tipo: 'texto' };
  }
  const base = valorPlano(item);
  const campo = {
    etiqueta: item.etiqueta || item.titulo || '',
    valor: base.valor,
    tipo: base.tipo,
  };
  if (item.detalle) campo.nota = item.detalle;
  return campo;
}

function tablaDesde(columnas, filas) {
  const tipos = columnas.map(() => 'texto');
  const planas = filas.map((fila) => {
    const salida = {};
    columnas.forEach((columna, indice) => {
      const celda = valorPlano(fila?.[columna.id]);
      if (celda.tipo !== 'texto') tipos[indice] = celda.tipo;
      salida[columna.id] = celda.valor;
    });
    return salida;
  });
  return {
    columnas: columnas.map((columna, indice) => ({
      id: columna.id,
      etiqueta: columna.etiqueta || columna.id,
      tipo: tipos[indice],
    })),
    filas: planas,
  };
}

function documentoDesdePaneles(resultado) {
  const secciones = [];
  for (const panel of resultado.paneles || []) {
    if (!panel || typeof panel !== 'object') continue;
    const seccion = {
      id: panel.id || panel.tipo || 'panel',
      titulo: panel.titulo || 'Panel',
      nota: panel.nota || 'Datos que muestra el panel.',
    };
    if (panel.tipo === 'barras') {
      seccion.tabla = {
        columnas: [
          { id: 'nombre', etiqueta: 'Nombre', tipo: 'texto' },
          { id: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero' },
          { id: 'detalle', etiqueta: 'Detalle', tipo: 'texto' },
        ],
        filas: (panel.items || []).map((item) => ({
          nombre: item?.etiqueta ?? '',
          cantidad: item?.valor,
          detalle: item?.detalle ?? '',
        })),
      };
    } else if (panel.tipo === 'progreso') {
      seccion.campos = (panel.grupos || []).map((grupo) => ({
        etiqueta: grupo.etiqueta || 'Grupo',
        valor: grupo.obtenidos,
        tipo: 'entero',
        nota: `de ${grupo.total ?? 0}${grupo.detalle ? `. ${grupo.detalle}` : ''}`,
      }));
      const filas = [];
      for (const grupo of panel.grupos || []) {
        for (const nombre of grupo.nombres || []) {
          filas.push({ grupo: grupo.etiqueta || '', nombre, estado: 'en la lista' });
        }
      }
      seccion.tabla = {
        columnas: [
          { id: 'grupo', etiqueta: 'Grupo', tipo: 'texto' },
          { id: 'nombre', etiqueta: 'Nombre', tipo: 'texto' },
          { id: 'estado', etiqueta: 'Estado', tipo: 'texto' },
        ],
        filas,
      };
    } else if (panel.tipo === 'lista') {
      seccion.tabla = {
        columnas: [
          { id: 'titulo', etiqueta: 'Título', tipo: 'texto' },
          { id: 'marca', etiqueta: 'Marca', tipo: 'texto' },
          { id: 'detalle', etiqueta: 'Detalle', tipo: 'texto' },
        ],
        filas: (panel.items || []).map((item) => ({
          titulo: item?.titulo ?? '',
          marca: item?.marca ?? '',
          detalle: item?.detalle ?? '',
        })),
      };
      if ((panel.items || []).length === 0) {
        seccion.campos = [{ etiqueta: 'Lista', valor: panel.vacio || 'No hay nada para mostrar.', tipo: 'texto' }];
      }
    } else if (panel.tipo === 'tabla') {
      seccion.tabla = tablaDesde(panel.columnas || [], panel.filas || []);
    } else if (panel.tipo === 'mosaico') {
      const todas = Array.isArray(panel.celdas) ? panel.celdas : [];
      const enorme = todas.length > MAX_CELDAS_MOSAICO;
      const celdas = enorme ? [] : todas;
      if (todas.length === 0) {
        seccion.campos = [{
          etiqueta: 'Grilla',
          valor: panel.vacio || 'No hay nada para mostrar.',
          tipo: 'texto',
        }];
      } else if (enorme) {
        seccion.campos = [{
          etiqueta: 'Grilla',
          valor: `Esta grilla trae ${todas.length} casilleros. Es demasiado grande para bajarla.`,
          tipo: 'texto',
        }];
      }
      seccion.tabla = {
        columnas: [
          { id: 'marca', etiqueta: 'Marca', tipo: 'texto' },
          { id: 'titulo', etiqueta: 'Título', tipo: 'texto' },
          { id: 'linea', etiqueta: 'Detalle', tipo: 'texto' },
          { id: 'etiqueta', etiqueta: 'Descripción', tipo: 'texto' },
        ],
        filas: celdas.map((celda) => {
          if (celda == null || typeof celda !== 'object') {
            return { marca: '', titulo: 'Vacío', linea: '', etiqueta: 'Vacío' };
          }
          return {
            marca: celda.marca ?? '',
            titulo: celda.titulo ?? '',
            linea: celda.linea ?? '',
            etiqueta: celda.etiqueta ?? '',
          };
        }),
      };
    } else {
      seccion.campos = (panel.items || []).map((item) => campoDesdeItem(item));
    }
    secciones.push(seccion);
  }
  return {
    titulo: resultado.datos?.nombre || resultado.nombreJuego || resultado.juego || 'partida',
    juego: resultado.nombreJuego || resultado.juego || 'partida',
    version: resultado.version == null ? '' : String(resultado.version),
    notas: ['Este juego no armó una exportación propia. Los datos son los de los paneles.'],
    secciones,
  };
}

export function documentoDe(resultado, opciones = {}) {
  if (!resultado?.ok) return null;
  const ahora = opciones.ahora instanceof Date && !Number.isNaN(opciones.ahora.getTime())
    ? opciones.ahora
    : new Date();
  let base = null;
  let fallo = false;
  const lector = buscarLector(resultado.juego);
  if (lector && typeof lector.armarExportacion === 'function') {
    try {
      base = lector.armarExportacion(resultado.datos, resultado);
    } catch {
      fallo = true;
      base = null;
    }
  }
  if (!base || typeof base !== 'object') base = documentoDesdePaneles(resultado);
  const notas = [...NOTAS_GENERICAS];
  if (fallo) notas.push('No se pudo armar el detalle propio de este juego. El archivo sale de los paneles.');
  for (const nota of base.notas || []) notas.push(String(nota));
  return {
    juego: base.juego || resultado.nombreJuego || resultado.juego || 'partida',
    idJuego: resultado.juego || '',
    version: String(base.version ?? resultado.version ?? ''),
    titulo: base.titulo || resultado.datos?.nombre || resultado.nombreJuego || 'partida',
    exportado: ahora.toISOString(),
    notas,
    advertencias: [...(resultado.advertencias || [])],
    secciones: Array.isArray(base.secciones) ? base.secciones : [],
  };
}

const ARMADORES = {
  texto: ['txt', 'text/plain;charset=utf-8', armarTexto],
  csv: ['csv', 'text/csv;charset=utf-8', armarCsv],
  json: ['json', 'application/json;charset=utf-8', armarJson],
};

export function armarArchivo(resultado, tipo, opciones = {}) {
  const elegido = ARMADORES[tipo];
  if (!elegido) return null;
  const documento = opciones.documento || documentoDe(resultado, opciones);
  if (!documento) return null;
  const fecha = Number.isFinite(Date.parse(documento.exportado)) ? new Date(documento.exportado) : new Date();
  const [extension, mime, armar] = elegido;
  return {
    id: tipo,
    nombre: nombreArchivo(documento.titulo, extension, fecha),
    mime,
    contenido: armar(documento, opciones),
  };
}
