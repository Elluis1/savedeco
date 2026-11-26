// Nombres de la leche, de Papá Noel y del dragón.
// El orden es el de main.js de orteil.dashnet.org/cookieclicker/main.js,
// bajado el 2026-11-26. El index.html del espejo ozh/cookieclicker declara VERSION=2.058.
// El texto en español sale de loc/ES.js de esa misma fecha. Si la loc trae "/"
// o no tiene la clave, queda el inglés: es lo que devuelve loc() en el juego.
// No copiamos el código del juego, solo estos nombres.

// Game.AllMilks, en el orden del arreglo. El id del save es el índice.
// "Melon milk" y "Blackcurrant milk" no están en la loc ES de esa fecha.
export const LECHES = [
  'Automático',
  'Leche sola',
  'Leche con chocolate',
  'Leche de frambuesa',
  'Leche de naranja',
  'Leche de caramelo',
  'Leche de plátano',
  'Leche de lima',
  'Leche de arándano',
  'Leche de fresa',
  'Leche de vainilla',
  'Leche de cebra',
  'Leche cósmica',
  'Leche llameante',
  'Leche sanguinolenta',
  'Leche de Midas',
  'Leche de medianoche',
  'Leche infierno verde',
  'Leche fuego gélido',
  'Leche con miel',
  'Leche con café',
  'Leche con té',
  'Leche de coco',
  'Leche de cereza',
  'Leche de soja',
  'Leche especiada',
  'Leche de arce',
  'Leche de menta',
  'Leche de regaliz',
  'Leche de rosa',
  'Leche de pitaya',
  'Melon milk',
  'Blackcurrant milk',
  'Leche de melocotón',
  'Leche de avellana',
];

// Game.santaLevels. "Nick" está como "/" en la loc, así que queda el inglés.
export const NIVELES_SANTA = [
  'Tubo de ensayo navideño',
  'Adorno navideño',
  'Corona navideña',
  'Árbol navideño',
  'Regalo navideño',
  'Feto de elfo navideño',
  'Niño elfo',
  'Elfo',
  'Elfo joven',
  'Elfo voluminoso',
  'Nick',
  'Papá Noel',
  'Papá Noel anciano',
  'Papá Noel auténtico',
  'Papá Noel final',
];

// Game.dragonAuras, clave 0 a 21. El 0 es la ranura vacía, no un id desconocido.
// "Epoch Manipulator" está en la loc como "Manipulador clásico".
export const AURAS = [
  'No hay aura',
  'Aliento lechoso',
  'Cursor de dragón',
  'Batallón de ancianas',
  'Siega campos',
  'Tiembla tierras',
  'Amo de la armería',
  'Fiero acaparador',
  'Dios dragón',
  'Aura arcana',
  'Vuelo de dragón',
  'Metamorfosis ancestral',
  'Dominio profano',
  'Manipulador clásico',
  'Mente sobre materia',
  'Apetito radiante',
  'Fortuna de dragón',
  'Curva de dragón',
  'Manipulación de realidad',
  'Orbes de dragón',
  'Intelecto supremo',
  'Tripas de dragón',
];

// Game.dragonLevels. El name se repite: el índice y la acción distinguen la etapa.
// De la 4 a la 24, la acción es loc("Train %1", aura.dname), o sea "Adiestrar" más el aura i-3.
// La segunda aura se dibuja si dragonLevel >= 27 (el comentario del fuente dice "2nd aura slot").
export const ETAPA_AURA_SECUNDARIA = 27;

const CRIAS = 'Krumblor, cría de galleta';
const DRAGON = 'Krumblor, dragón de galleta';

function adiestrar(indiceAura) {
  return { nombre: indiceAura < 5 ? CRIAS : DRAGON, accion: `Adiestrar ${AURAS[indiceAura]}` };
}

export const ETAPAS_DRAGON = [
  { nombre: 'Huevo de dragón', accion: 'Picar' },
  { nombre: 'Huevo de dragón', accion: 'Picar' },
  { nombre: 'Huevo de dragón', accion: 'Picar' },
  { nombre: 'Huevo de dragón tembloroso', accion: 'Romper cascarón' },
  adiestrar(1),
  adiestrar(2),
  adiestrar(3),
  adiestrar(4),
  adiestrar(5),
  adiestrar(6),
  adiestrar(7),
  adiestrar(8),
  adiestrar(9),
  adiestrar(10),
  adiestrar(11),
  adiestrar(12),
  adiestrar(13),
  adiestrar(14),
  adiestrar(15),
  adiestrar(16),
  adiestrar(17),
  adiestrar(18),
  adiestrar(19),
  adiestrar(20),
  adiestrar(21),
  { nombre: DRAGON, accion: 'Hornear galleta de dragón' },
  { nombre: DRAGON, accion: 'Adiestrar aura secundaria' },
  { nombre: DRAGON, accion: 'Tu dragón está adiestrado del todo.' },
];
