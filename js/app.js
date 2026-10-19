import { LIMITE_CODIGO, decodificarAutomatico, presentar } from './nucleo/decodificar.js';
import { armarArchivo } from './nucleo/exportar.js';
import { engancharFiltros, escaparHtml, renderizarAdvertencias, renderizarAlerta, renderizarPaneles } from './nucleo/paneles.js';
import { NOTACION_CIENTIFICA, NOTACION_CORTA, formatearNumero } from './nucleo/numeros.js';
import { listarLectores } from './nucleo/registro.js';
import './lectores/indice.js';

const CLAVE_NOTACION = 'savedeco-notacion';

const formulario = document.querySelector('#formulario');
const entrada = document.querySelector('#codigo');
const archivo = document.querySelector('#archivo');
const notacion = document.querySelector('#notacion');
const resultado = document.querySelector('#resultado');
const juegos = document.querySelector('#juegos');

let ultimo = null;

function notacionElegida() {
  return notacion.value === NOTACION_CIENTIFICA ? NOTACION_CIENTIFICA : NOTACION_CORTA;
}

function guardarNotacion() {
  try {
    localStorage.setItem(CLAVE_NOTACION, notacionElegida());
  } catch {
    // Si el navegador no deja guardar, la preferencia vive solo en esta visita.
  }
}

function restaurarNotacion() {
  try {
    const guardada = localStorage.getItem(CLAVE_NOTACION);
    if (guardada === NOTACION_CIENTIFICA || guardada === NOTACION_CORTA) notacion.value = guardada;
  } catch {
    // Seguimos con la notación corta.
  }
}

function mostrarError(mensaje) {
  resultado.innerHTML = renderizarAlerta(mensaje);
}

function descargarBlob(archivo) {
  // Blob y createObjectURL: la descarga queda en el navegador. La CSP no deja
  // traer un generador de afuera, y acá no hace falta.
  const blob = new Blob([archivo.contenido], { type: archivo.mime });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = archivo.nombre;
  enlace.rel = 'noopener';
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  // El click de la descarga es asíncrono en algunos navegadores.
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function engancharExportacion(raiz, resultadoDecodificado) {
  const estado = raiz.querySelector('[data-exportar-estado]');
  raiz.querySelectorAll('[data-exportar]').forEach((boton) => {
    boton.addEventListener('click', () => {
      try {
        const archivo = armarArchivo(resultadoDecodificado, boton.dataset.exportar, { ahora: new Date() });
        if (!archivo?.contenido) {
          if (estado) estado.textContent = 'No pude armar ese archivo.';
          return;
        }
        descargarBlob(archivo);
        if (estado) estado.textContent = `Descarga lista: ${archivo.nombre}`;
      } catch {
        if (estado) estado.textContent = 'No pude armar el archivo. La partida sigue en pantalla.';
      }
    });
  });
}

function mostrar(resultadoDecodificado) {
  ultimo = resultadoDecodificado;
  if (!resultadoDecodificado?.ok) {
    mostrarError(resultadoDecodificado?.error || 'No pude leer esta partida.');
    return;
  }
  const formatear = (valor) => formatearNumero(valor, notacionElegida());
  const paneles = presentar(resultadoDecodificado, formatear);
  const bloqueAvisos = renderizarAdvertencias(resultadoDecodificado.advertencias);
  resultado.innerHTML = `
    <p class="partida-ok">Partida de ${escaparHtml(resultadoDecodificado.nombreJuego || 'un juego')}, versión ${escaparHtml(resultadoDecodificado.version)}.</p>
    ${bloqueAvisos}
    <section class="panel exportar" aria-label="Descargar los datos">
      <header class="panel-encabezado">
        <h2>Guardar estos datos</h2>
      </header>
      <p class="nota">Descargá todo lo leído para tenerlo guardado o pasárselo a una IA. Se arma en esta máquina: no se sube a ningún lado.</p>
      <div class="acciones">
        <button type="button" class="boton boton-principal" data-exportar="texto">Texto para una IA</button>
        <button type="button" class="boton boton-secundario" data-exportar="csv">Excel (CSV)</button>
        <button type="button" class="boton boton-secundario" data-exportar="json">JSON</button>
      </div>
      <p class="estado-exportar" data-exportar-estado></p>
    </section>
    ${renderizarPaneles(paneles, formatear)}
  `;
  engancharFiltros(resultado);
  engancharExportacion(resultado, resultadoDecodificado);
}

function decodificarTexto(texto) {
  try {
    mostrar(decodificarAutomatico(texto));
  } catch {
    mostrarError('Pasó algo inesperado al leer el código. La página sigue en pie: probá de nuevo.');
  }
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  decodificarTexto(entrada.value);
});

archivo.addEventListener('change', () => {
  const file = archivo.files?.[0];
  if (!file) return;
  if (file.size > LIMITE_CODIGO) {
    mostrarError('Ese archivo es demasiado grande para leerlo en el navegador. Un export pesa unos pocos kilobytes.');
    archivo.value = '';
    return;
  }
  const lector = new FileReader();
  lector.addEventListener('load', () => {
    entrada.value = String(lector.result ?? '');
    decodificarTexto(entrada.value);
  });
  lector.addEventListener('error', () => {
    mostrarError('No pude leer ese archivo. Probá de nuevo o pegá el código a mano.');
  });
  lector.readAsText(file);
});

notacion.addEventListener('change', () => {
  guardarNotacion();
  if (ultimo?.ok) mostrar(ultimo);
});

juegos.textContent = listarLectores().map((lector) => lector.nombre).join(', ') || 'ninguno todavía';
restaurarNotacion();
