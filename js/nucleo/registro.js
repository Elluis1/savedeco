// Registro de lectores. El núcleo no conoce ningún juego en particular:
// cada lector se anota solo desde js/lectores/indice.js.

const lectores = [];

export function registrar(lector) {
  if (!lector || !lector.id || typeof lector.detectar !== 'function' || typeof lector.decodificar !== 'function') {
    throw new Error('El lector tiene que tener id, detectar y decodificar.');
  }
  const ya = lectores.findIndex((otro) => otro.id === lector.id);
  if (ya >= 0) lectores.splice(ya, 1);
  lectores.push(lector);
  return lector;
}

export function listarLectores() {
  return lectores.slice();
}

export function buscarLector(id) {
  return lectores.find((lector) => lector.id === id) || null;
}

export function limpiarLectores() {
  lectores.length = 0;
}
