import { armarExportacion, armarPaneles, decodificar, detectar } from './formato.js';

export const lector = {
  id: 'cookie-clicker',
  nombre: 'Cookie Clicker',
  paneles: [
    { id: 'resumen', titulo: 'Resumen de la partida', tipo: 'tarjetas' },
    { id: 'edificios', titulo: 'Edificios', tipo: 'barras' },
    { id: 'progreso', titulo: 'Logros y mejoras', tipo: 'progreso' },
    { id: 'prestigio', titulo: 'Prestigio y ascensión', tipo: 'tarjetas' },
    { id: 'mods', titulo: 'Mods detectados', tipo: 'lista' },
  ],
  detectar,
  decodificar,
  armarPaneles,
  armarExportacion,
};
