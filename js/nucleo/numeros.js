// Notación de números enormes, al estilo de Cookie Clicker (escala corta),
// con coma decimal y punto de miles, como se escribe en el Río de la Plata.
// "Billón" acá es 10^9, igual que en el juego, no el billón de la escala larga.

const PALABRAS = [
  'mil',
  'millón',
  'billón',
  'trillón',
  'cuatrillón',
  'quintillón',
  'sextillón',
  'septillón',
  'octillón',
  'nonillón',
];

const PREFIJOS = ['', 'un', 'duo', 'tre', 'quattuor', 'quin', 'sex', 'septen', 'octo', 'novem'];
const SUFIJOS = [
  'decillón',
  'vigintillón',
  'trigintillón',
  'quadragintillón',
  'quinquagintillón',
  'sexagintillón',
  'septuagintillón',
  'octogintillón',
  'nonagintillón',
];

for (const sufijo of SUFIJOS) {
  for (const prefijo of PREFIJOS) PALABRAS.push(prefijo + sufijo);
}

export const NOTACION_CORTA = 'corta';
export const NOTACION_CIENTIFICA = 'cientifica';

function pluralizar(palabra) {
  if (palabra.endsWith('ón')) return `${palabra.slice(0, -2)}ones`;
  return `${palabra}s`;
}

function textoAgrupado(numero) {
  const redondeado = Math.round(numero * 1000) / 1000;
  const crudo = String(redondeado);
  const [entero, fraccion] = crudo.split('.');
  const conPuntos = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return fraccion ? `${conPuntos},${fraccion}` : conPuntos;
}

function partesEscalaCorta(valor) {
  let restante = valor;
  let indice = 0;
  restante /= 1000;
  while (Math.round(restante) >= 1000) {
    restante /= 1000;
    indice += 1;
    if (indice > PALABRAS.length) return null;
  }
  return {
    coeficiente: Math.round(restante * 1000) / 1000,
    indice,
  };
}

function notacionCientifica(valor) {
  const exponente = Math.floor(Math.log10(valor));
  let mantisa = valor / 10 ** exponente;
  mantisa = Math.round(mantisa * 1000) / 1000;
  let exp = exponente;
  if (mantisa >= 10) {
    mantisa /= 10;
    exp += 1;
  }
  return `${String(mantisa).replace('.', ',')}e+${exp}`;
}

export function formatearNumero(valor, notacion = NOTACION_CORTA) {
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  if (!Number.isFinite(numero)) return '∞';
  if (numero === 0) return '0';
  const signo = numero < 0 ? '−' : '';
  const absoluto = Math.abs(numero);
  if (absoluto < 1000000) return signo + textoAgrupado(absoluto);
  if (notacion === NOTACION_CIENTIFICA) return signo + notacionCientifica(absoluto);
  const partes = partesEscalaCorta(absoluto);
  if (!partes || partes.indice >= PALABRAS.length) return signo + notacionCientifica(absoluto);
  const palabra = PALABRAS[partes.indice];
  const escrita = Math.abs(partes.coeficiente) === 1 ? palabra : pluralizar(palabra);
  return `${signo}${textoAgrupado(partes.coeficiente)} ${escrita}`;
}

const UNIDADES = [
  ['día', 86400],
  ['h', 3600],
  ['min', 60],
  ['s', 1],
];

// Cookie Clicker cuenta varios temporizadores en fotogramas, a 30 por segundo.
export function formatearFotogramas(fotogramas, fps = 30) {
  if (!Number.isFinite(fotogramas)) return 'desconocido';
  if (fotogramas < 0) return 'sin límite';
  const segundos = Math.round(fotogramas / fps);
  if (segundos <= 0) return '0 s';
  let restante = segundos;
  const partes = [];
  for (const [nombre, tamanio] of UNIDADES) {
    if (restante < tamanio && nombre !== 's') continue;
    const cantidad = Math.floor(restante / tamanio);
    restante -= cantidad * tamanio;
    if (cantidad <= 0 && nombre !== 's') continue;
    const etiqueta = nombre === 'día' ? (cantidad === 1 ? 'día' : 'días') : nombre;
    partes.push(`${cantidad} ${etiqueta}`);
    if (partes.length === 2) break;
  }
  return partes.join(' ');
}
