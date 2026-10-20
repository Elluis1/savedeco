// Componentes genéricos de panel. Reciben datos ya normalizados y devuelven HTML.
// No saben de ningún juego: solo de tarjetas, barras, tablas, listas, logros y mosaicos.

export function escaparHtml(valor) {
  return String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function textoDe(item, formatear, formatearFecha) {
  if (item == null) return '';
  if (typeof item !== 'object') return escaparHtml(item);
  if (Object.prototype.hasOwnProperty.call(item, 'numero')) return escaparHtml(formatear(item.numero));
  if (Object.prototype.hasOwnProperty.call(item, 'fecha')) return escaparHtml(formatearFecha(item.fecha));
  return escaparHtml(item.texto ?? '');
}

function detalleDe(item) {
  return item.detalle ? `<p class="detalle">${escaparHtml(item.detalle)}</p>` : '';
}

function panelTarjetas(panel, formatear, formatearFecha) {
  const tarjetas = (panel.items || [])
    .map((item) => {
      return `<article class="tarjeta">
        <h3>${escaparHtml(item.etiqueta)}</h3>
        <p class="valor">${textoDe(item, formatear, formatearFecha)}</p>
        ${detalleDe(item)}
      </article>`;
    })
    .join('');
  return `<div class="grilla-tarjetas">${tarjetas}</div>`;
}

function panelBarras(panel, formatear) {
  const items = panel.items || [];
  const maximo = items.reduce((max, item) => Math.max(max, Number(item.valor) || 0), 0) || 1;
  const filas = items
    .map((item) => {
      const valor = Number(item.valor) || 0;
      const ancho = Math.max(0, Math.min(100, (valor / maximo) * 100));
      const extra = item.detalle ? `<span class="detalle-barra">${escaparHtml(item.detalle)}</span>` : '';
      return `<li class="fila-barra">
        <div class="fila-barra-texto">
          <span class="nombre-barra">${escaparHtml(item.etiqueta)}</span>
          <span class="cantidad-barra">${escaparHtml(formatear(valor))}</span>
        </div>
        <div class="pista" aria-hidden="true"><span class="relleno" style="width:${ancho.toFixed(2)}%"></span></div>
        ${extra}
      </li>`;
    })
    .join('');
  return `<ul class="lista-barras">${filas}</ul>`;
}

function panelProgreso(panel, formatear) {
  const grupos = (panel.grupos || [])
    .map((grupo) => {
      const total = Number(grupo.total) || 0;
      const obtenidos = Number(grupo.obtenidos) || 0;
      const porcentaje = total > 0 ? Math.max(0, Math.min(100, (obtenidos / total) * 100)) : 0;
      const nombres = (grupo.nombres || [])
        .map((nombre) => `<li>${escaparHtml(nombre)}</li>`)
        .join('');
      const lista = nombres
        ? `<details class="lista-nombres">
            <summary>Ver los ${escaparHtml(formatear(obtenidos))} nombres</summary>
            <input class="filtro" type="search" placeholder="Filtrar por nombre" data-filtro>
            <ul data-lista>${nombres}</ul>
          </details>`
        : '';
      return `<article class="grupo-progreso">
        <div class="fila-barra-texto">
          <h3>${escaparHtml(grupo.etiqueta)}</h3>
          <p class="cantidad-barra">${escaparHtml(formatear(obtenidos))} / ${escaparHtml(formatear(total))}</p>
        </div>
        <div class="pista" role="meter" aria-valuenow="${obtenidos}" aria-valuemin="0" aria-valuemax="${total}" aria-label="${escaparHtml(grupo.etiqueta)}">
          <span class="relleno" style="width:${porcentaje.toFixed(2)}%"></span>
        </div>
        ${grupo.detalle ? `<p class="detalle">${escaparHtml(grupo.detalle)}</p>` : ''}
        ${lista}
      </article>`;
    })
    .join('');
  return `<div class="grupos-progreso">${grupos}</div>`;
}

function panelLista(panel) {
  const items = panel.items || [];
  if (items.length === 0) {
    return `<p class="vacio">${escaparHtml(panel.vacio || 'No hay nada para mostrar.')}</p>`;
  }
  const filas = items
    .map((item) => {
      const marca = item.marca ? `<span class="pastilla">${escaparHtml(item.marca)}</span>` : '';
      return `<li class="item-lista">
        <div class="fila-barra-texto">
          <strong>${escaparHtml(item.titulo)}</strong>
          ${marca}
        </div>
        ${item.detalle ? `<p class="detalle">${escaparHtml(item.detalle)}</p>` : ''}
      </li>`;
    })
    .join('');
  return `<ul class="lista-simple">${filas}</ul>`;
}

const TONOS_MOSAICO = new Set(['apagado', 'hueco', 'inicio', 'medio', 'alto', 'listo', 'neutro']);

// 12 columnas es el tope del dibujo. 256 casilleros cubren una grilla holgada
// (el jardín usa 36) y cortan un mosaico de cientos de miles antes de armar el HTML.
export const MAX_CELDAS_MOSAICO = 256;

function mensajeMosaicoEnorme(cantidad) {
  return `Esta grilla trae ${cantidad} casilleros. Es demasiado grande para mostrarla.`;
}

function enteroAcotado(valor, minimo, maximo, porDefecto) {
  const numero = Number(valor);
  if (!Number.isInteger(numero)) return porDefecto;
  return Math.max(minimo, Math.min(maximo, numero));
}

function tonoMosaico(tono) {
  return TONOS_MOSAICO.has(tono) ? tono : 'neutro';
}

function pasosMosaico(celda) {
  const total = enteroAcotado(celda.pasosTotal, 0, 8, 0);
  if (total === 0) return '';
  const activos = enteroAcotado(celda.pasos, 0, total, 0);
  const marcas = Array.from({ length: total }, (_, indice) => (
    `<span class="${indice < activos ? 'paso activo' : 'paso'}"></span>`
  )).join('');
  return `<span class="pasos" aria-hidden="true">${marcas}</span>`;
}

function panelMosaico(panel, formatear, formatearFecha) {
  const celdas = Array.isArray(panel.celdas) ? panel.celdas : [];
  if (celdas.length === 0) {
    return `<p class="vacio">${escaparHtml(panel.vacio || 'No hay nada para mostrar.')}</p>`;
  }
  if (celdas.length > MAX_CELDAS_MOSAICO) {
    return `<p class="vacio">${escaparHtml(mensajeMosaicoEnorme(celdas.length))}</p>`;
  }
  const columnas = enteroAcotado(panel.columnas, 1, 12, 1);
  const piezas = celdas.map((celda) => {
    if (celda == null || typeof celda !== 'object') {
      return '<li class="celda-mosaico tono-neutro"><p class="titulo-celda">Vacío</p></li>';
    }
    const tono = tonoMosaico(celda.tono);
    const titulo = escaparHtml(celda.titulo ?? '');
    const linea = celda.linea ? `<p class="linea-celda">${escaparHtml(celda.linea)}</p>` : '';
    const marca = celda.marca ? `<span class="marca-celda" aria-hidden="true">${escaparHtml(celda.marca)}</span>` : '';
    const etiqueta = escaparHtml(celda.etiqueta || celda.titulo || 'Casillero');
    return `<li class="celda-mosaico tono-${tono}" aria-label="${etiqueta}">
      ${marca}
      <p class="titulo-celda">${titulo}</p>
      ${linea}
      ${pasosMosaico(celda)}
    </li>`;
  }).join('');
  const leyenda = (Array.isArray(panel.leyenda) ? panel.leyenda : [])
    .map((item) => {
      if (item == null || typeof item !== 'object') return '';
      const tono = tonoMosaico(item.tono);
      return `<li><span class="muestra tono-${tono}" aria-hidden="true"></span>${escaparHtml(item.texto ?? '')}</li>`;
    })
    .join('');
  const bloqueLeyenda = leyenda ? `<ul class="leyenda-mosaico" role="list">${leyenda}</ul>` : '';
  let detalle = '';
  if (panel.detalle?.columnas && Array.isArray(panel.detalle.filas) && panel.detalle.filas.length > 0) {
    const filasDetalle = panel.detalle.filas.length > MAX_CELDAS_MOSAICO
      ? panel.detalle.filas.slice(0, MAX_CELDAS_MOSAICO)
      : panel.detalle.filas;
    const tabla = panelTabla({ ...panel.detalle, filas: filasDetalle }, formatear, formatearFecha);
    const resumen = escaparHtml(panel.detalle.resumen || 'Ver el detalle');
    const corte = panel.detalle.filas.length > MAX_CELDAS_MOSAICO
      ? `<p class="detalle">Mostré los primeros ${MAX_CELDAS_MOSAICO} de ${panel.detalle.filas.length}.</p>`
      : '';
    detalle = `<details class="detalle-mosaico"><summary>${resumen}</summary>${tabla}${corte}</details>`;
  }
  const etiquetaGrilla = escaparHtml(panel.etiqueta || panel.titulo || 'Grilla');
  return `<div class="tablero-mosaico">
    <ul class="mosaico" style="--columnas:${columnas}" role="list" aria-label="${etiquetaGrilla}">${piezas}</ul>
    ${bloqueLeyenda}
  </div>
  ${detalle}`;
}

function panelTabla(panel, formatear, formatearFecha) {
  const columnas = panel.columnas || [];
  const cabeza = columnas.map((columna) => `<th>${escaparHtml(columna.etiqueta || columna.id)}</th>`).join('');
  const cuerpo = (panel.filas || [])
    .map((fila) => {
      const celdas = columnas
        .map((columna) => `<td>${textoDe(fila[columna.id] ?? { texto: fila[columna.id] }, formatear, formatearFecha)}</td>`)
        .join('');
      return `<tr>${celdas}</tr>`;
    })
    .join('');
  return `<div class="envoltorio-tabla"><table><thead><tr>${cabeza}</tr></thead><tbody>${cuerpo}</tbody></table></div>`;
}

const RENDER = {
  tarjetas: panelTarjetas,
  barras: panelBarras,
  progreso: panelProgreso,
  lista: panelLista,
  tabla: panelTabla,
  mosaico: panelMosaico,
};

function formatearFechaPorDefecto(marca) {
  const numero = Number(marca);
  if (!Number.isFinite(numero) || numero <= 0) return 'desconocida';
  const fecha = new Date(numero);
  // Fuera del rango de Date, toISOString también tira. Mejor un texto que una excepción.
  if (Number.isNaN(fecha.getTime())) return 'desconocida';
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(fecha);
  } catch {
    return 'desconocida';
  }
}

export function renderizarAlerta(mensaje) {
  return `<div class="alerta" role="alert"><p>${escaparHtml(mensaje)}</p></div>`;
}

export function renderizarAdvertencias(avisos) {
  const items = (avisos || []).map((aviso) => `<li>${escaparHtml(aviso)}</li>`).join('');
  return items ? `<ul class="advertencias">${items}</ul>` : '';
}

export function renderizarPanel(panel, formatear, formatearFecha = formatearFechaPorDefecto) {
  const tipo = RENDER[panel?.tipo] ? panel.tipo : 'tarjetas';
  const cuerpo = RENDER[tipo](panel || {}, formatear, formatearFecha);
  const nota = panel?.nota ? `<p class="nota">${escaparHtml(panel.nota)}</p>` : '';
  return `<section class="panel" data-panel="${escaparHtml(panel?.id || tipo)}">
    <header class="panel-encabezado">
      <h2>${escaparHtml(panel?.titulo || 'Panel')}</h2>
    </header>
    ${nota}
    ${cuerpo}
  </section>`;
}

export function renderizarPaneles(paneles, formatear, formatearFecha) {
  return (paneles || []).map((panel) => renderizarPanel(panel, formatear, formatearFecha)).join('');
}

export function engancharFiltros(raiz) {
  raiz.querySelectorAll('[data-filtro]').forEach((input) => {
    if (input.dataset.listo === '1') return;
    input.dataset.listo = '1';
    input.addEventListener('input', () => {
      const lista = input.parentElement?.querySelector('[data-lista]');
      if (!lista) return;
      const consulta = input.value.trim().toLocaleLowerCase('es');
      lista.querySelectorAll('li').forEach((item) => {
        const visible = consulta === '' || item.textContent.toLocaleLowerCase('es').includes(consulta);
        item.hidden = !visible;
      });
    });
  });
}
