// Componentes genéricos de panel. Reciben datos ya normalizados y devuelven HTML.
// No saben de ningún juego: solo de tarjetas, barras, tablas, listas y logros.

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
