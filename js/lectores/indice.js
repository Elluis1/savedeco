// Único lugar que hay que tocar para sumar un juego: una línea de import
// y el registrar(). El núcleo no se entera de los nombres.

import { registrar } from '../nucleo/registro.js';
import { lector as cookieClicker } from './cookie-clicker/index.js';

registrar(cookieClicker);
