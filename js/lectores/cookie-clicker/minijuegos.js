// Minijuegos de Cookie Clicker. El string lo escribe cada M.save y lo vuelve a
// abrir M.load, en el fuente público del juego (espejo ozh/cookieclicker,
// revisado el 2026-10-20):
//   minigameGarden.js, minigameMarket.js, minigamePantheon.js, minigameGrimoire.js
// Los nombres en español salen de la loc oficial ES.js. Si la traducción es "/",
// queda el inglés. La primera letra se muestra en mayúscula cuando el oficial
// arranca en minúscula.

const MAX_LARGO = 4_000;
const MAX_BIENES = 40;
const MAX_PARCELA = 36;
const EDAD_MAXIMA = 100;
// Muy por arriba de una partida: cosechas, stock o hechizos no llegan acá.
const CANTIDAD_DESMEDIDA = 1e12;

function entero(texto) {
  if (typeof texto !== 'string' || !/^-?\d+$/.test(texto)) return null;
  const valor = Number(texto);
  return Number.isSafeInteger(valor) ? valor : null;
}

function decimal(texto) {
  if (typeof texto !== 'string' || !/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(texto)) return null;
  const valor = Number(texto);
  return Number.isFinite(valor) ? valor : null;
}

function sinColaVacia(partes) {
  if (partes.length && partes[partes.length - 1] === '') partes.pop();
  return partes;
}

function reemplazarPanaderia(plantilla, nombre) {
  const texto = nombre || '';
  // Función, no string: si el nombre trae $& o $', un reemplazo de texto se lo come.
  return String(plantilla).replaceAll('%1', () => texto);
}

// Orden de M.plants en minigameGarden.js. El id del casillero es este índice + 1.
// madura es la edad (de 0 a 100) a partir de la cual el fuente la trata como madura.
const PLANTAS = [
  ['bakerWheat', "Baker's wheat", 'Trigo de panadero', 35],
  ['thumbcorn', 'Thumbcorn', 'Maíz de pulgar', 20],
  ['cronerice', 'Cronerice', 'Arroz de bruja', 55],
  ['gildmillet', 'Gildmillet', 'Mijo dorado', 40],
  ['clover', 'Ordinary clover', 'Trébol ordinario', 35],
  ['goldenClover', 'Golden clover', 'Trébol dorado', 50],
  ['shimmerlily', 'Shimmerlily', 'Lila brillante', 70],
  ['elderwort', 'Elderwort', 'Sauco', 90],
  ['bakeberry', 'Bakeberry', 'Baya pastelera', 50],
  ['chocoroot', 'Chocoroot', 'Chocorraíz', 25],
  ['whiteChocoroot', 'White chocoroot', 'Chocorraíz blanca', 25],
  ['whiteMildew', 'White mildew', 'Moho blanco', 70],
  ['brownMold', 'Brown mold', 'Moho marrón', 70],
  ['meddleweed', 'Meddleweed', 'Hierbainsolente', 50],
  ['whiskerbloom', 'Whiskerbloom', 'Flor bigote', 60],
  ['chimerose', 'Chimerose', 'Quimerosa', 30],
  ['nursetulip', 'Nursetulip', 'Curipán', 60],
  ['drowsyfern', 'Drowsyfern', 'Helecho somnoliento', 30],
  ['wardlichen', 'Wardlichen', 'Liquen guardián', 65],
  ['keenmoss', 'Keenmoss', 'Musgo fino', 65],
  ['queenbeet', 'Queenbeet', 'Remolacha', 80],
  ['queenbeetLump', 'Juicy queenbeet', 'Remolacha jugosa', 85],
  ['duketater', 'Duketater', 'Comeduques', 95],
  ['crumbspore', 'Crumbspore', 'Migaspora', 65],
  ['doughshroom', 'Doughshroom', 'Champidónut', 85],
  ['glovemorel', 'Glovemorel', 'Colmenilla', 80],
  ['cheapcap', 'Cheapcap', 'Baraseta', 40],
  ['foolBolete', "Fool's bolete", 'Boletus engañoso', 50],
  ['wrinklegill', 'Wrinklegill', 'Gill arrugado', 65],
  ['greenRot', 'Green rot', 'Moho verde', 65],
  ['shriekbulb', 'Shriekbulb', 'Bulbo aullador', 60],
  ['tidygrass', 'Tidygrass', 'Hierba ordenada', 40],
  ['everdaisy', 'Everdaisy', 'Margarita eterna', 75],
  ['ichorpuff', 'Ichorpuff', 'Icor abombado', 35],
].map(([clave, ingles, nombre, madura], id) => ({ id, clave, ingles, nombre, madura }));

// M.soils, en el orden del fuente. Nombres de loc("Dirt") y compañía.
const SUELOS = ['Barro', 'Fertilizador', 'Arcilla', 'Guijarros', 'Astillas'];

// loc(["bud","sprout","bloom","mature"]), con la primera letra en mayúscula.
const ETAPAS = ['Cogollo', 'Brote', 'Flor', 'Madurez'];

// M.plotLimits. El nivel 0 se lee como 1, igual que isTileUnlocked.
const LIMITES_PARCELA = [
  [2, 2, 4, 4],
  [2, 2, 5, 4],
  [2, 2, 5, 5],
  [1, 2, 5, 5],
  [1, 1, 5, 5],
  [1, 1, 6, 5],
  [1, 1, 6, 6],
  [0, 1, 6, 6],
  [0, 0, 6, 6],
];

// M.gods, en el orden en que el fuente les asigna id.
const ESPIRITUS = [
  'Holobore, espíritu del ascetismo',
  'Vomitrax, espíritu de la decadencia',
  'Godzamok, espíritu de la ruina',
  'Cyclius, espíritu de las edades',
  'Selebrak, espíritu de las festividades',
  'Dotjeiess, espíritu de la creación',
  'Muridal, espíritu del trabajo',
  'Jeremy, espíritu de la industria',
  'Mokalsium, espíritu materno',
  'Skruuia, espíritu del escarnio',
  'Rigidel, espíritu del orden',
];

const RANURAS = ['Ranura de diamante', 'Ranura de rubí', 'Ranura de jade'];

// M.goods. tipo, empresa y símbolo salen de STOCK n TYPE / NAME / LOGO.
// El 18 reemplaza %1 por el nombre de la panadería, como hace el fuente.
const BIENES = [
  ['Cereales', 'Molinos viejos', 'CRL'],
  ['Chocolate', 'Excavaciones de cacao', 'CHC'],
  ['Mantequilla', 'Sector bovino', 'MTQ'],
  ['Azúcar', 'Monopolio de caramelo', 'AZU'],
  ['Frutos secos', 'Monasterio de avellano', 'FRT'],
  ['Sal', 'Reactivos extravagantes', 'SAL'],
  ['Vainilla', 'Exportaciones cósmicas', 'VNL'],
  ['Huevos', 'Gnósticos orgánicos', 'HVS'],
  ['Canela', 'Intercambio dimensional', 'CNL'],
  ['Crema', 'Envejecimiento de precisión', 'CRM'],
  ['Mermelada', 'Estudios de pectina', 'MRM'],
  ['Chocolate blanco', 'Corporación Deslumbrante S.L.', 'CHB'],
  ['Miel', 'Colmena próspera', 'MIE'],
  ['Galletas', 'Panaderías caseras', 'GLL'],
  ['Recetas', 'Fantasías asociadas', 'RCT'],
  ['Sucursales', 'Adquisiciones polivalentes', 'SCR'],
  ['Publicistas', 'Grandes mentes', 'PBL'],
  ['%1', 'Panadería de %1', 'TÚ'],
].map(([tipo, empresa, simbolo], id) => ({ id, tipo, empresa, simbolo }));

// M.offices, en orden. El id es el officeLevel guardado.
const OFICINAS = [
  'Taller de crédito',
  'Pequeño banco',
  'Compañía de préstamos',
  'Sede financiera',
  'Intercambio internacional',
  'Palacio de la codicia',
];

// El array está comentado en el dibujo del gráfico (minigameMarket.js):
// ['stable','slow rise','slow fall','fast rise','fast fall','chaotic'][me.mode]
// El juego no lo muestra. El nombre de acá es esa etiqueta, en español.
const MODOS_BOLSA = [
  'estable',
  'subida lenta',
  'bajada lenta',
  'subida rápida',
  'bajada rápida',
  'caótico',
];

// it.last, según el comentario de M.reset: 0 nada, 1 compró, 2 vendió, en ese tick.
const OPERACIONES = ['ninguna', 'compra', 'venta'];

// graphLines: 0 dibuja barras, 1 dibuja líneas. graphCols elige colBases.
const ESTILOS_GRAFICO = ['barras', 'líneas'];
const COLORES_GRAFICO = ['blanco', 'oscuro'];

const TIPO_POR_EDIFICIO = {
  2: 'jardin',
  5: 'bolsa',
  6: 'panteon',
  7: 'grimorio',
};

const NOMBRE_TIPO = {
  jardin: 'Jardín',
  bolsa: 'Bolsa',
  panteon: 'Panteón',
  grimorio: 'Grimorio',
};

const CON_ARTICULO = {
  jardin: 'El jardín',
  bolsa: 'La bolsa',
  panteon: 'El panteón',
  grimorio: 'El grimorio',
};

function vacio(tipo) {
  return { tipo, nombre: NOMBRE_TIPO[tipo], presente: false, ok: true, aviso: null };
}

function ilegible(tipo) {
  return {
    tipo,
    nombre: NOMBRE_TIPO[tipo],
    presente: true,
    ok: false,
    aviso: `${CON_ARTICULO[tipo]} no tiene la forma que escribe el fuente. Lo dejo sin interpretar.`,
  };
}

function demasiado(tipo) {
  return {
    tipo,
    nombre: NOMBRE_TIPO[tipo],
    presente: true,
    ok: false,
    aviso: `${CON_ARTICULO[tipo]} trae un texto demasiado largo para leerlo. Lo dejo sin interpretar.`,
  };
}

function rechazado(tipo, aviso) {
  return {
    tipo,
    nombre: NOMBRE_TIPO[tipo],
    presente: true,
    ok: false,
    aviso,
  };
}

function cantidadRara(valor) {
  return valor < 0 || valor > CANTIDAD_DESMEDIDA;
}

function casilleroAbierto(x, y, nivel) {
  const indice = Math.max(1, Math.min(LIMITES_PARCELA.length, Number(nivel) || 0)) - 1;
  const [x0, y0, x1, y1] = LIMITES_PARCELA[indice];
  return x >= x0 && x < x1 && y >= y0 && y < y1;
}

function etapaDe(edad, madura) {
  // El mismo corte que tileTooltip: madura, 2/3 y 1/3 de esa edad.
  if (edad >= madura) return ETAPAS[3];
  if (edad >= madura * 0.666) return ETAPAS[2];
  if (edad >= madura * 0.333) return ETAPAS[1];
  return ETAPAS[0];
}

function nombreCatalogo(lista, id, etiqueta) {
  if (id >= 0 && id < lista.length) return lista[id];
  return `${etiqueta} #${id}`;
}

function leerJardin(crudo, nivel) {
  const partes = crudo.split(' ');
  if (partes.length !== 3) return ilegible('jardin');
  const cabecera = sinColaVacia(partes[0].split(':'));
  if (cabecera.length < 9) return ilegible('jardin');
  const numeros = cabecera.slice(0, 9).map((campo, indice) => (
    indice === 1 || indice === 3 || indice === 4 || indice === 5 || indice === 6
      ? entero(campo)
      : decimal(campo)
  ));
  if (numeros.some((valor) => valor == null)) return ilegible('jardin');
  const semillas = partes[1];
  if (!/^[01]*$/.test(semillas)) return ilegible('jardin');
  const celdas = sinColaVacia(partes[2].split(':'));
  if (celdas.length % 2 !== 0) return ilegible('jardin');
  const pares = celdas.length / 2;
  // Más de 36 no es "texto largo": es una parcela que no entra en 6 por 6.
  // No la dibujamos a medias, porque la fila 7 ya no es un casillero del juego.
  if (pares > MAX_PARCELA) {
    return rechazado('jardin', 'El jardín trae más casilleros que la parcela de 6 por 6. Lo dejo sin interpretar.');
  }
  const deMas = cabecera.length > 9;

  const [proximoPaso, sueloId, proximoSuelo, congelado, cosechas, cosechasTotales, abierto, sacrificios, proximoCongelar] = numeros;
  const sueloConocido = sueloId >= 0 && sueloId < SUELOS.length;
  const listaSemillas = [];
  for (let i = 0; i < semillas.length; i += 1) {
    const planta = PLANTAS[i];
    listaSemillas.push({
      id: i,
      nombre: planta ? planta.nombre : `Semilla desconocida #${i}`,
      desbloqueada: semillas[i] === '1',
    });
  }
  const casilleros = [];
  let plantaDesconocida = false;
  let edadRara = false;
  for (let i = 0; i < pares; i += 1) {
    const plantaGuardada = entero(celdas[i * 2]);
    const edad = entero(celdas[i * 2 + 1]);
    if (plantaGuardada == null || edad == null) return ilegible('jardin');
    const x = i % 6;
    const y = Math.floor(i / 6);
    if (x < 0 || x > 5 || y < 0 || y > 5) {
      return rechazado('jardin', 'El jardín trae un casillero fuera de la parcela de 6 por 6. Lo dejo sin interpretar.');
    }
    const vacia = plantaGuardada === 0;
    const planta = vacia ? null : PLANTAS[plantaGuardada - 1];
    if (!vacia && !planta) plantaDesconocida = true;
    if (!vacia && (edad < 0 || edad > EDAD_MAXIMA)) edadRara = true;
    casilleros.push({
      x,
      y,
      plantaId: vacia ? null : plantaGuardada - 1,
      nombre: vacia ? 'Hoyo vacío' : (planta ? planta.nombre : `Planta desconocida #${plantaGuardada - 1}`),
      edad: vacia ? null : edad,
      etapa: vacia || !planta ? null : etapaDe(edad, planta.madura),
      abierto: casilleroAbierto(x, y, nivel),
    });
  }

  const avisos = [];
  if (!sueloConocido) avisos.push(`El suelo del jardín ${sueloId} no está en la lista del fuente.`);
  if (deMas || semillas.length !== PLANTAS.length || pares !== MAX_PARCELA) {
    avisos.push('El jardín no trae la cantidad de semillas o de casilleros que escribe el fuente actual. Leí lo que vino.');
  }
  if (plantaDesconocida) avisos.push('Hay una planta del jardín que no está en la lista del fuente.');
  if (edadRara) avisos.push('Hay una edad del jardín fuera de 0 a 100. La muestro igual.');
  if (Number(nivel) < 0) {
    avisos.push('El nivel de la granja es negativo. Para los casilleros abiertos lo leo como 1.');
  }
  if (cantidadRara(cosechas) || cantidadRara(cosechasTotales) || cantidadRara(sacrificios)) {
    avisos.push('El jardín trae una cantidad negativa o desmedida. La muestro igual.');
  }
  return {
    tipo: 'jardin',
    nombre: 'Jardín',
    presente: true,
    ok: true,
    aviso: avisos.join(' ') || null,
    suelo: { id: sueloId, nombre: sueloConocido ? SUELOS[sueloId] : `desconocido (${sueloId})` },
    congelado: congelado !== 0,
    cosechas,
    cosechasTotales,
    sacrificios,
    abierto: abierto !== 0,
    proximoPaso,
    proximoSuelo,
    proximoCongelar,
    semillas: listaSemillas,
    semillasDesbloqueadas: listaSemillas.filter((semilla) => semilla.desbloqueada).length,
    casilleros,
  };
}

function leerBolsa(crudo, nombrePanaderia) {
  const partes = crudo.split(' ');
  if (partes.length !== 3) return ilegible('bolsa');
  const cabecera = sinColaVacia(partes[0].split(':'));
  if (cabecera.length < 5) return ilegible('bolsa');
  const oficinaId = entero(cabecera[0]);
  const brokers = entero(cabecera[1]);
  const estiloId = entero(cabecera[2]);
  const beneficios = decimal(cabecera[3]);
  const colorId = entero(cabecera[4]);
  if ([oficinaId, brokers, estiloId, colorId].some((valor) => valor == null) || beneficios == null) {
    return ilegible('bolsa');
  }
  const trozos = partes[1].split('!');
  if (trozos.length && trozos[trozos.length - 1] === '') trozos.pop();
  if (trozos.length > MAX_BIENES) {
    return rechazado('bolsa', 'La bolsa trae demasiados bienes para leerlos. Lo dejo sin interpretar.');
  }
  const abierto = entero(partes[2]);
  if (abierto == null) return ilegible('bolsa');

  const bienes = [];
  let filaRota = false;
  let sobranCampos = false;
  let cantidadFuera = false;
  let catalogoFuera = false;
  // Los beneficios pueden ser negativos: es una pérdida, no un save roto.
  if (cantidadRara(brokers) || Math.abs(beneficios) > CANTIDAD_DESMEDIDA) cantidadFuera = true;
  if (estiloId < 0 || estiloId >= ESTILOS_GRAFICO.length || colorId < 0 || colorId >= COLORES_GRAFICO.length) {
    catalogoFuera = true;
  }
  for (let i = 0; i < trozos.length; i += 1) {
    const campos = trozos[i].split(':');
    if (campos.length < 8) {
      filaRota = true;
      continue;
    }
    if (campos.length > 8) sobranCampos = true;
    const valores = campos.slice(0, 8).map(entero);
    if (valores.some((valor) => valor == null)) {
      filaRota = true;
      continue;
    }
    const [centesimas, modoId, derivaCentesimas, ticks, stock, oculto, operacionId, previoCentesimas] = valores;
    if (cantidadRara(stock) || cantidadRara(ticks) || cantidadRara(centesimas) || cantidadRara(previoCentesimas)) {
      cantidadFuera = true;
    }
    if (Math.abs(derivaCentesimas) > CANTIDAD_DESMEDIDA) cantidadFuera = true;
    if (modoId < 0 || modoId >= MODOS_BOLSA.length || operacionId < 0 || operacionId >= OPERACIONES.length) {
      catalogoFuera = true;
    }
    const catalogo = BIENES[i];
    const nombre = catalogo ? reemplazarPanaderia(catalogo.tipo, nombrePanaderia) : `Bien desconocido #${i}`;
    bienes.push({
      id: i,
      nombre,
      empresa: catalogo ? reemplazarPanaderia(catalogo.empresa, nombrePanaderia) : '',
      simbolo: catalogo ? catalogo.simbolo : '',
      valorCentesimas: centesimas,
      valor: centesimas / 100,
      modo: { id: modoId, nombre: nombreCatalogo(MODOS_BOLSA, modoId, 'modo') },
      derivaCentesimas,
      deriva: derivaCentesimas / 100,
      ticks,
      stock,
      oculto: oculto !== 0,
      operacion: { id: operacionId, nombre: nombreCatalogo(OPERACIONES, operacionId, 'operación') },
      previoCentesimas,
      previo: previoCentesimas / 100,
    });
  }
  if (bienes.length === 0) return ilegible('bolsa');

  const avisos = [];
  if (cabecera.length > 5 || trozos.length !== BIENES.length || filaRota || sobranCampos) {
    avisos.push('La bolsa no trae la cantidad de bienes que escribe el fuente actual. Leí lo que pude.');
  }
  if (oficinaId < 0 || oficinaId >= OFICINAS.length) {
    avisos.push(`La oficina ${oficinaId} no está en la lista del fuente.`);
  }
  if (cantidadFuera) avisos.push('La bolsa trae una cantidad negativa o desmedida. La muestro igual.');
  if (catalogoFuera) avisos.push('La bolsa trae un modo, una operación o un estilo que no está en la lista del fuente.');
  return {
    tipo: 'bolsa',
    nombre: 'Bolsa',
    presente: true,
    ok: true,
    aviso: avisos.join(' ') || null,
    oficina: { id: oficinaId, nombre: nombreCatalogo(OFICINAS, oficinaId, 'oficina') },
    brokers,
    estilo: { id: estiloId, nombre: nombreCatalogo(ESTILOS_GRAFICO, estiloId, 'estilo') },
    beneficios,
    color: { id: colorId, nombre: nombreCatalogo(COLORES_GRAFICO, colorId, 'color') },
    abierto: abierto !== 0,
    bienes,
  };
}

function leerPanteon(crudo) {
  const partes = crudo.split(' ');
  if (partes.length < 4) return ilegible('panteon');
  const ranurasCrudas = partes[0].split('/');
  if (ranurasCrudas.length !== 3) return ilegible('panteon');
  const ids = ranurasCrudas.map(entero);
  const cambios = entero(partes[1]);
  const ultimoCambio = decimal(partes[2]);
  const abierto = entero(partes[3]);
  if (ids.some((valor) => valor == null) || cambios == null || ultimoCambio == null || abierto == null) {
    return ilegible('panteon');
  }
  const avisos = [];
  if (partes.length > 4) avisos.push('El panteón trae campos de más. Leí los que escribe el fuente actual.');
  if (cambios < 0 || cambios > 3) {
    avisos.push('Los cambios de culto quedan fuera de 0 a 3. Los muestro igual.');
  }
  const ranuras = ids.map((id, indice) => {
    // El fuente usa -1 para la ranura vacía. Otro negativo no es "vacía".
    const vacia = id === -1;
    if (!vacia && (id < 0 || id >= ESPIRITUS.length)) {
      avisos.push(`El espíritu ${id} no está en la lista del fuente.`);
    }
    return {
      id: indice,
      nombre: RANURAS[indice],
      espirituId: vacia ? null : id,
      espiritu: vacia ? 'vacía' : nombreCatalogo(ESPIRITUS, id, 'espíritu'),
    };
  });
  return {
    tipo: 'panteon',
    nombre: 'Panteón',
    presente: true,
    ok: true,
    aviso: avisos.join(' ') || null,
    ranuras,
    cambios,
    ultimoCambio,
    abierto: abierto !== 0,
  };
}

function leerGrimorio(crudo) {
  const partes = crudo.split(' ');
  if (partes.length < 4) return ilegible('grimorio');
  const magia = decimal(partes[0]);
  const hechizos = entero(partes[1]);
  const hechizosTotales = entero(partes[2]);
  const abierto = entero(partes[3]);
  if (magia == null || hechizos == null || hechizosTotales == null || abierto == null) return ilegible('grimorio');
  const avisos = [];
  if (partes.length > 4) avisos.push('El grimorio trae campos de más. Leí los que escribe el fuente actual.');
  if (cantidadRara(magia) || cantidadRara(hechizos) || cantidadRara(hechizosTotales)) {
    avisos.push('El grimorio trae una cantidad negativa o desmedida. La muestro igual.');
  }
  return {
    tipo: 'grimorio',
    nombre: 'Grimorio',
    presente: true,
    ok: true,
    aviso: avisos.join(' ') || null,
    magia,
    hechizos,
    hechizosTotales,
    abierto: abierto !== 0,
  };
}

const LECTORES = {
  jardin: (crudo, nivel) => leerJardin(crudo, nivel),
  bolsa: (crudo, _nivel, nombre) => leerBolsa(crudo, nombre),
  panteon: (crudo) => leerPanteon(crudo),
  grimorio: (crudo) => leerGrimorio(crudo),
};

export function leerMinijuego(indice, crudo, nivel, nombrePanaderia) {
  const tipo = TIPO_POR_EDIFICIO[indice];
  if (!tipo) return null;
  const texto = String(crudo ?? '').trim();
  if (!texto) return vacio(tipo);
  if (texto.length > MAX_LARGO) return demasiado(tipo);
  return LECTORES[tipo](texto, nivel, nombrePanaderia);
}

export function leerMinijuegos(edificiosLista, nombrePanaderia) {
  const salida = {
    jardin: vacio('jardin'),
    bolsa: vacio('bolsa'),
    panteon: vacio('panteon'),
    grimorio: vacio('grimorio'),
  };
  const avisos = [];
  for (const edificio of edificiosLista) {
    const leido = leerMinijuego(edificio.indice, edificio.minijuegoCrudo, edificio.nivel, nombrePanaderia);
    if (!leido) continue;
    salida[leido.tipo] = leido;
    if (leido.aviso) avisos.push(leido.aviso);
  }
  return { minijuegos: salida, avisos };
}

function siNo(valor) {
  return valor ? 'sí' : 'no';
}

function tarjeta(etiqueta, valor, extra) {
  const item = typeof valor === 'number' ? { etiqueta, numero: valor } : { etiqueta, texto: valor };
  if (extra) item.detalle = extra;
  return item;
}

const TONO_ETAPA = {
  Cogollo: 'inicio',
  Brote: 'medio',
  Flor: 'alto',
  Madurez: 'listo',
};

const PASOS_ETAPA = {
  Cogollo: 1,
  Brote: 2,
  Flor: 3,
  Madurez: 4,
};

const LEYENDA_JARDIN = [
  ['inicio', 'Cogollo'],
  ['medio', 'Brote'],
  ['alto', 'Flor'],
  ['listo', 'Madurez'],
  ['hueco', 'Hoyo vacío'],
  ['apagado', 'Cerrado'],
  ['neutro', 'Sin etapa'],
];

function celdaJardin(casilla, formatear) {
  const marca = `${casilla.y + 1}·${casilla.x + 1}`;
  const lugar = `Fila ${casilla.y + 1}, columna ${casilla.x + 1}`;
  if (casilla.plantaId == null) {
    if (!casilla.abierto) {
      return {
        titulo: 'Cerrado',
        tono: 'apagado',
        marca,
        etiqueta: `${lugar}. Cerrado: el nivel de la granja todavía no abre este casillero.`,
      };
    }
    return {
      titulo: 'Hoyo vacío',
      tono: 'hueco',
      marca,
      etiqueta: `${lugar}. Hoyo vacío.`,
    };
  }
  const partes = [];
  if (casilla.etapa) partes.push(casilla.etapa);
  if (casilla.edad != null) partes.push(formatear(casilla.edad));
  if (!casilla.abierto) partes.push('cerrado');
  const linea = partes.join(' · ');
  const estado = casilla.abierto ? 'abierto' : 'cerrado';
  const etapa = casilla.etapa || 'sin etapa';
  const edad = casilla.edad == null ? 'sin edad' : `edad ${formatear(casilla.edad)}`;
  return {
    titulo: casilla.nombre,
    linea,
    tono: TONO_ETAPA[casilla.etapa] || 'neutro',
    pasos: PASOS_ETAPA[casilla.etapa] || 0,
    pasosTotal: casilla.etapa ? 4 : 0,
    marca,
    etiqueta: `${lugar}. ${casilla.nombre}. ${etapa}, ${edad}. Casillero ${estado}.`,
  };
}

function notaJardin(jardin, casilleros) {
  if (!jardin.presente || !jardin.ok) {
    return jardin.aviso || 'Esta partida no trae datos del jardín.';
  }
  const forma = casilleros.length === 36
    ? 'La grilla es la parcela de 6 por 6, en el orden del save: de izquierda a derecha y de arriba abajo.'
    : 'La grilla sigue el orden del save: de izquierda a derecha y de arriba abajo, de a 6 casilleros.';
  const lectura = 'El número de la esquina es fila y columna. Cerrado es el casillero que el nivel de la granja todavía no abre. La etapa sale del corte del fuente y el número de al lado es la edad guardada, de 0 a 100.';
  const lista = casilleros.some((casilla) => casilla.plantaId != null)
    ? ' La lista plegada trae solo las plantas.'
    : '';
  const nota = `${forma} ${lectura}${lista}`;
  return jardin.aviso ? `${nota} ${jardin.aviso}` : nota;
}

export function panelesMinijuegos(minijuegos, formatear = (valor) => String(valor)) {
  const juegos = minijuegos || {};
  const jardin = juegos.jardin || vacio('jardin');
  const bolsa = juegos.bolsa || vacio('bolsa');
  const panteon = juegos.panteon || vacio('panteon');
  const grimorio = juegos.grimorio || vacio('grimorio');

  const resumen = [];
  const semillasJardin = Array.isArray(jardin.semillas) ? jardin.semillas : [];
  const casilleros = jardin.ok && jardin.presente && Array.isArray(jardin.casilleros) ? jardin.casilleros : [];
  if (!jardin.presente) resumen.push(tarjeta('Jardín', 'Sin datos'));
  else if (!jardin.ok) resumen.push(tarjeta('Jardín', 'No se pudo leer', jardin.aviso));
  else {
    const nombres = semillasJardin.filter((semilla) => semilla.desbloqueada).map((semilla) => semilla.nombre);
    resumen.push(tarjeta('Suelo del jardín', jardin.suelo.nombre, jardin.congelado ? 'El jardín estaba congelado.' : 'El jardín no estaba congelado.'));
    resumen.push(tarjeta('Plantas maduras cosechadas', jardin.cosechas, `${formatear(jardin.cosechasTotales)} en total.`));
    resumen.push(tarjeta('Sacrificios del jardín', jardin.sacrificios, 'Veces que se sacrificó el jardín. El fuente lo guarda como convertTimes.'));
    resumen.push(tarjeta(
      'Semillas desbloqueadas',
      `${formatear(jardin.semillasDesbloqueadas)} de ${formatear(semillasJardin.length)}`,
      nombres.length ? nombres.join(', ') : 'Ninguna figura con el bit en 1.',
    ));
  }

  if (!panteon.presente) resumen.push(tarjeta('Panteón', 'Sin datos'));
  else if (!panteon.ok) resumen.push(tarjeta('Panteón', 'No se pudo leer', panteon.aviso));
  else {
    for (const ranura of (Array.isArray(panteon.ranuras) ? panteon.ranuras : [])) {
      resumen.push(tarjeta(ranura.nombre, ranura.espiritu));
    }
    resumen.push(tarjeta('Cambios de culto', panteon.cambios, 'Los que quedaban, de 3.'));
  }

  if (!grimorio.presente) resumen.push(tarjeta('Grimorio', 'Sin datos'));
  else if (!grimorio.ok) resumen.push(tarjeta('Grimorio', 'No se pudo leer', grimorio.aviso));
  else {
    resumen.push(tarjeta('Magia', grimorio.magia, 'El número guardado. El máximo no viaja en el save: el juego lo recalcula.'));
    resumen.push(tarjeta('Hechizos lanzados', grimorio.hechizos, `${formatear(grimorio.hechizosTotales)} en total.`));
  }

  if (!bolsa.presente) resumen.push(tarjeta('Bolsa', 'Sin datos'));
  else if (!bolsa.ok) resumen.push(tarjeta('Bolsa', 'No se pudo leer', bolsa.aviso));
  else {
    resumen.push(tarjeta('Oficina', bolsa.oficina.nombre, `${formatear(bolsa.brokers)} brókers.`));
    resumen.push(tarjeta('Beneficios', bolsa.beneficios, 'En segundos del mayor g/s crudo, como los muestra el juego. No son galletas.'));
  }

  const plantadas = casilleros.filter((casilla) => casilla.plantaId != null);
  const celdas = casilleros.map((casilla) => celdaJardin(casilla, formatear));
  const tonosUsados = new Set(celdas.map((celda) => celda.tono));
  const panelJardin = {
    id: 'jardin',
    tipo: 'mosaico',
    titulo: 'Jardín',
    nota: notaJardin(jardin, casilleros),
    etiqueta: 'Parcela del jardín',
    columnas: 6,
    leyenda: LEYENDA_JARDIN
      .filter(([tono]) => tonosUsados.has(tono))
      .map(([tono, texto]) => ({ tono, texto })),
    celdas,
    vacio: 'Esta partida no trae casilleros del jardín.',
    detalle: plantadas.length === 0 ? null : {
      resumen: plantadas.length === 1 ? 'Ver la planta' : `Ver las ${formatear(plantadas.length)} plantas`,
      columnas: [
        { id: 'lugar', etiqueta: 'Lugar' },
        { id: 'planta', etiqueta: 'Planta' },
        { id: 'edad', etiqueta: 'Edad' },
        { id: 'etapa', etiqueta: 'Etapa' },
        { id: 'casillero', etiqueta: 'Casillero' },
      ],
      filas: plantadas.map((casilla) => ({
        lugar: { texto: `fila ${casilla.y + 1}, columna ${casilla.x + 1}` },
        planta: { texto: casilla.nombre },
        edad: { numero: casilla.edad },
        etapa: { texto: casilla.etapa || '' },
        casillero: { texto: casilla.abierto ? 'abierto' : 'cerrado' },
      })),
    },
  };

  const panelBolsa = {
    id: 'bolsa',
    tipo: 'tabla',
    titulo: 'Bolsa',
    nota: bolsa.presente && bolsa.ok
      ? 'El valor es el que guardó el juego, dividido 100: así lo vuelve a armar al cargar. El precio está en segundos del mayor g/s crudo. El modo es la etiqueta que el fuente tiene comentada en el gráfico y no muestra en pantalla.'
      : (bolsa.aviso || 'Esta partida no trae datos de la bolsa.'),
    columnas: [
      { id: 'bien', etiqueta: 'Bien' },
      { id: 'simbolo', etiqueta: 'Símbolo' },
      { id: 'valor', etiqueta: 'Valor' },
      { id: 'stock', etiqueta: 'En depósito' },
      { id: 'modo', etiqueta: 'Modo' },
      { id: 'oculto', etiqueta: 'Oculto' },
    ],
    filas: (bolsa.ok && bolsa.presente && Array.isArray(bolsa.bienes) ? bolsa.bienes : []).map((bien) => ({
      bien: { texto: bien.nombre },
      simbolo: { texto: bien.simbolo },
      valor: { numero: bien.valor },
      stock: { numero: bien.stock },
      modo: { texto: bien.modo.nombre },
      oculto: { texto: siNo(bien.oculto) },
    })),
  };

  return [
    {
      id: 'minijuegos',
      tipo: 'tarjetas',
      titulo: 'Minijuegos',
      nota: 'Salen del quinto campo del edificio, con la forma que escribe cada minijuego del fuente. No recalculamos crecimiento, magia ni precios.',
      items: resumen,
    },
    panelJardin,
    panelBolsa,
  ];
}

function campo(etiqueta, valor, tipo, nota) {
  const item = { etiqueta, valor, tipo };
  if (nota) item.nota = nota;
  return item;
}

export function seccionesMinijuegos(minijuegos) {
  const juegos = minijuegos || {};
  const jardin = juegos.jardin || vacio('jardin');
  const bolsa = juegos.bolsa || vacio('bolsa');
  const panteon = juegos.panteon || vacio('panteon');
  const grimorio = juegos.grimorio || vacio('grimorio');
  const secciones = [];

  const camposResumen = [];
  if (jardin.presente && jardin.ok) {
    camposResumen.push(
      campo('Suelo del jardín', jardin.suelo.nombre, 'texto', `Id ${jardin.suelo.id}.`),
      campo('Jardín congelado', siNo(jardin.congelado), 'texto'),
      campo('Jardín abierto al guardar', siNo(jardin.abierto), 'texto', '1 si el panel estaba abierto.'),
      campo('Plantas maduras cosechadas', jardin.cosechas, 'entero', 'Esta ascensión. El juego las muestra como el primer número de "Plantas maduras cosechadas".'),
      campo('Plantas maduras cosechadas en total', jardin.cosechasTotales, 'entero'),
      campo('Sacrificios del jardín', jardin.sacrificios, 'numero', 'convertTimes: veces que se sacrificó el jardín a los avispones de azúcar.'),
      campo('Semillas desbloqueadas', jardin.semillasDesbloqueadas, 'entero', 'Bits en 1. Al cargar, el juego desbloquea el trigo de panadero aunque ese bit venga en 0. Acá se muestra el bit del save.'),
      campo('Próximo tick del jardín', jardin.proximoPaso, 'fecha', 'nextStep, en milisegundos.'),
      campo('Próximo cambio de suelo', jardin.proximoSuelo, 'fecha', 'nextSoil, en milisegundos.'),
      campo('Próximo congelado', jardin.proximoCongelar, 'fecha', 'nextFreeze. El fuente dice que no lo usa, pero lo guarda.'),
    );
  }
  if (panteon.presente && panteon.ok) {
    camposResumen.push(
      campo('Cambios de culto', panteon.cambios, 'entero', 'Los que quedaban. El máximo del fuente es 3.'),
      campo('Último cambio de culto', panteon.ultimoCambio, 'fecha', 'swapT, en milisegundos.'),
      campo('Panteón abierto al guardar', siNo(panteon.abierto), 'texto'),
    );
  }
  if (grimorio.presente && grimorio.ok) {
    camposResumen.push(
      campo('Magia', grimorio.magia, 'numero', 'El número guardado. El máximo no está en el save.'),
      campo('Hechizos lanzados', grimorio.hechizos, 'entero'),
      campo('Hechizos lanzados en total', grimorio.hechizosTotales, 'entero'),
      campo('Grimorio abierto al guardar', siNo(grimorio.abierto), 'texto'),
    );
  }
  if (bolsa.presente && bolsa.ok) {
    camposResumen.push(
      campo('Oficina', bolsa.oficina.nombre, 'texto', `Id ${bolsa.oficina.id}.`),
      campo('Brókers', bolsa.brokers, 'entero'),
      campo('Beneficios', bolsa.beneficios, 'numero', 'En segundos del mayor g/s crudo, como dice la pantalla del juego.'),
      campo('Estilo del gráfico', bolsa.estilo.nombre, 'texto', 'graphLines. 0 dibuja barras y 1 dibuja líneas.'),
      campo('Colores del gráfico', bolsa.color.nombre, 'texto', 'graphCols. 0 es el fondo blanco y 1 el fondo oscuro de colBases.'),
      campo('Bolsa abierta al guardar', siNo(bolsa.abierto), 'texto'),
    );
  }

  secciones.push({
    id: 'minijuegos',
    titulo: 'Minijuegos',
    nota: 'Jardín, bolsa, panteón y grimorio. El string es el quinto campo del edificio. Si no tiene la forma del fuente, no se interpreta.',
    campos: camposResumen,
  });

  if (jardin.presente && jardin.ok) {
    secciones.push({
      id: 'jardin',
      titulo: 'Jardín',
      nota: '36 casilleros, fila por fila. Planta vacía es un hoyo. La etapa usa el umbral de madurez de esa planta en el fuente.',
      tabla: {
        columnas: [
          { id: 'fila', etiqueta: 'Fila', tipo: 'entero' },
          { id: 'columna', etiqueta: 'Columna', tipo: 'entero' },
          { id: 'planta', etiqueta: 'Planta', tipo: 'texto' },
          { id: 'edad', etiqueta: 'Edad', tipo: 'entero' },
          { id: 'etapa', etiqueta: 'Etapa', tipo: 'texto' },
          { id: 'casillero', etiqueta: 'Casillero', tipo: 'texto' },
        ],
        filas: (Array.isArray(jardin.casilleros) ? jardin.casilleros : []).map((casilla) => ({
          fila: casilla.y + 1,
          columna: casilla.x + 1,
          planta: casilla.nombre,
          edad: casilla.edad,
          etapa: casilla.etapa || '',
          casillero: casilla.abierto ? 'abierto' : 'cerrado',
        })),
      },
    });
    secciones.push({
      id: 'semillas',
      titulo: 'Semillas del jardín',
      nota: 'Un bit por planta, en el orden del fuente. 1 es desbloqueada.',
      tabla: {
        columnas: [
          { id: 'id', etiqueta: 'Id', tipo: 'entero' },
          { id: 'nombre', etiqueta: 'Nombre', tipo: 'texto' },
          { id: 'desbloqueada', etiqueta: 'Desbloqueada', tipo: 'texto' },
        ],
        filas: (Array.isArray(jardin.semillas) ? jardin.semillas : []).map((semilla) => ({
          id: semilla.id,
          nombre: semilla.nombre,
          desbloqueada: siNo(semilla.desbloqueada),
        })),
      },
    });
  }

  if (panteon.presente && panteon.ok) {
    secciones.push({
      id: 'panteon',
      titulo: 'Panteón',
      nota: 'Tres ranuras: diamante, rubí y jade. -1 es una ranura vacía. El id es el del espíritu en el fuente.',
      tabla: {
        columnas: [
          { id: 'ranura', etiqueta: 'Ranura', tipo: 'texto' },
          { id: 'id', etiqueta: 'Id', tipo: 'entero' },
          { id: 'espiritu', etiqueta: 'Espíritu', tipo: 'texto' },
        ],
        filas: (Array.isArray(panteon.ranuras) ? panteon.ranuras : []).map((ranura) => ({
          ranura: ranura.nombre,
          id: ranura.espirituId == null ? -1 : ranura.espirituId,
          espiritu: ranura.espiritu,
        })),
      },
    });
  }

  if (bolsa.presente && bolsa.ok) {
    secciones.push({
      id: 'bolsa',
      titulo: 'Bolsa',
      nota: 'Un bien por fila, en el orden del fuente. El valor, la deriva y el precio previo están guardados multiplicados por 100. Ticks es cuánto le queda a ese modo. Cada tick dura 60 segundos en el fuente.',
      tabla: {
        columnas: [
          { id: 'id', etiqueta: 'Id', tipo: 'entero' },
          { id: 'nombre', etiqueta: 'Bien', tipo: 'texto' },
          { id: 'empresa', etiqueta: 'Empresa', tipo: 'texto' },
          { id: 'simbolo', etiqueta: 'Símbolo', tipo: 'texto' },
          { id: 'valor', etiqueta: 'Valor', tipo: 'numero' },
          { id: 'stock', etiqueta: 'En depósito', tipo: 'entero' },
          { id: 'modo', etiqueta: 'Modo', tipo: 'texto' },
          { id: 'deriva', etiqueta: 'Deriva', tipo: 'numero' },
          { id: 'ticks', etiqueta: 'Ticks del modo', tipo: 'entero' },
          { id: 'oculto', etiqueta: 'Oculto', tipo: 'texto' },
          { id: 'operacion', etiqueta: 'Última operación del tick', tipo: 'texto' },
          { id: 'previo', etiqueta: 'Último precio de compra', tipo: 'numero' },
        ],
        filas: (Array.isArray(bolsa.bienes) ? bolsa.bienes : []).map((bien) => ({
          id: bien.id,
          nombre: bien.nombre,
          empresa: bien.empresa,
          simbolo: bien.simbolo,
          valor: bien.valor,
          stock: bien.stock,
          modo: bien.modo.nombre,
          deriva: bien.deriva,
          ticks: bien.ticks,
          oculto: siNo(bien.oculto),
          operacion: bien.operacion.nombre,
          previo: bien.previo,
        })),
      },
    });
  }

  return secciones;
}

export function detalleMinijuego(minijuego) {
  if (!minijuego?.presente || !minijuego.ok) return '';
  return ` · trae ${minijuego.nombre.toLocaleLowerCase('es')}`;
}
