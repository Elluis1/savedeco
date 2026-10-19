// Detección automática y errores amables. Ningún lector debería romper la página.

import { buscarLector, listarLectores } from './registro.js';

export const MENSAJE_VACIO = 'Pegá un código de exportación o subí el archivo de la partida.';
export const MENSAJE_DESCONOCIDO = 'No reconocí este texto como un código de partida. Por ahora leo exports de Cookie Clicker. Fijate que esté completo.';
export const MENSAJE_INESPERADO = 'No pude leer esta partida. El código parece dañado, pero la página sigue en pie.';

const CONFIANZA_MINIMA = 0.5;

export function decodificarAutomatico(texto) {
  if (texto == null || String(texto).trim() === '') {
    return { ok: false, error: MENSAJE_VACIO, advertencias: [] };
  }

  let elegido = null;
  let confianza = 0;
  for (const lector of listarLectores()) {
    let valor = 0;
    try {
      valor = Number(lector.detectar(texto));
    } catch {
      valor = 0;
    }
    if (!Number.isFinite(valor) || valor < 0) valor = 0;
    if (valor > confianza) {
      confianza = valor;
      elegido = lector;
    }
  }

  if (!elegido || confianza < CONFIANZA_MINIMA) {
    return { ok: false, error: MENSAJE_DESCONOCIDO, advertencias: [] };
  }

  try {
    const resultado = elegido.decodificar(texto);
    if (!resultado || typeof resultado !== 'object') {
      return { ok: false, error: MENSAJE_INESPERADO, advertencias: [] };
    }
    if (resultado.ok === false) {
      return {
        ok: false,
        error: resultado.error || MENSAJE_INESPERADO,
        advertencias: resultado.advertencias || [],
        juego: elegido.id,
      };
    }
    return { ...resultado, juego: resultado.juego || elegido.id, confianza };
  } catch {
    return { ok: false, error: MENSAJE_INESPERADO, advertencias: [], juego: elegido.id };
  }
}

export function presentar(resultado, formatear) {
  if (!resultado?.ok) return [];
  const lector = buscarLector(resultado.juego);
  if (lector && typeof lector.armarPaneles === 'function') {
    return lector.armarPaneles(resultado.datos, formatear);
  }
  return resultado.paneles || [];
}
