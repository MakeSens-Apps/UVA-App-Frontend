/**
 * B11 — Areachart (entrada nativa).
 *
 * La implementación real vive en `AreachartSvg.tsx` y es COMPARTIDA por nativo
 * y web: se dibuja con `react-native-svg`, sin `victory-native`/Skia.
 *
 * Motivo (D-01, gráfica del histórico vacía en Android): la rama Skia nunca
 * llegó a pintar — el `require` de la fuente apuntaba a una carpeta inexistente
 * (`src/assets/fonts/`) y `CartesianChart` sólo dibuja cuando su `Canvas` de
 * Skia ha reportado layout, así que el contenedor reservaba alto y quedaba
 * vacío.  El detalle completo está documentado en `AreachartSvg.tsx`.
 *
 * Este archivo se conserva para no romper los imports existentes
 * (`@/components/areachart/Areachart`).
 */

export { Areachart, hexToRgba, default } from './AreachartSvg';
export type { AreachartProps } from './AreachartSvg';
