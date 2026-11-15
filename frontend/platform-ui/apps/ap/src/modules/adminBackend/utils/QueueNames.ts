/**
 * Nombre legible de una cola de RabbitMQ para el monitor de colas del admin.
 *
 * El endpoint (`/statistics/queues`) proxea la API de management y devuelve TODAS las colas del
 * vhost, no sólo las declaradas por Messenger: las de AR (MassTransit, `ar.<nombre-en-kebab>`, una
 * por consumer registrado) y sus colas `_error` / `_skipped` también aparecen.
 *
 * Vive fuera del SFC para poder probarse contra los diccionarios reales; el componente sólo le
 * pasa su `t`.
 */

const QUEUE_NAMES_KEY = 'adminBackend.statistics.queueStatistics.queueNames';
const QUEUE_SUFFIXES_KEY = 'adminBackend.statistics.queueStatistics.queueSuffixes';

/** MassTransit crea una cola por fallo y otra por mensaje no enrutable junto a cada cola. */
const QUEUE_SUFFIXES = ['_error', '_skipped'];

type Translate = (key: string) => string;

/** `spend_file_export` → `Spend File Export`, para cualquier cola que aún no esté en el diccionario. */
export const prettifyQueueName = (queueName: string): string =>
  queueName
    .split(/[._-]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * Traducción de una cola, o `null` si no está en el diccionario.
 *
 * Dos detalles que hacían que se viera la clave cruda en pantalla:
 *
 *  - vue-i18n parte las rutas de clave por puntos, así que las colas de AR viven anidadas bajo
 *    `queueNames.ar` en el diccionario y el nombre de la cola se usa tal cual como ruta.
 *  - cuando la clave no existe, `t()` devuelve la RUTA COMPLETA, no el nombre de la cola, por lo
 *    que el fallback anterior (`translatedName === queueName`) nunca se cumplía. Se compara contra
 *    la clave — y no con `te()`, que ignora `fallbackLocale` y ocultaría a un usuario `es` las
 *    entradas que sólo existen en `en`.
 */
const translateQueueName = (queueName: string, t: Translate): string | null => {
  const key = `${QUEUE_NAMES_KEY}.${queueName}`;
  const translatedName = t(key);

  return translatedName === key ? null : translatedName;
};

/**
 * Las colas `_error` / `_skipped` se etiquetan a partir de la cola base más un calificador, en vez
 * de triplicar cada nombre en el diccionario.
 */
export const getQueueDisplayName = (queueName: string, t: Translate): string => {
  const translatedName = translateQueueName(queueName, t);
  if (translatedName) return translatedName;

  const suffix = QUEUE_SUFFIXES.find(candidate => queueName.endsWith(candidate));
  if (suffix) {
    const baseName = queueName.slice(0, -suffix.length);
    const baseLabel = translateQueueName(baseName, t) ?? prettifyQueueName(baseName);
    const suffixLabel = t(`${QUEUE_SUFFIXES_KEY}.${suffix.slice(1)}`);

    return `${baseLabel} (${suffixLabel})`;
  }

  return prettifyQueueName(queueName);
};
