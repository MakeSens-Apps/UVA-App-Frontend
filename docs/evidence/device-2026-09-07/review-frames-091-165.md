# Revisión device — frames 091–165 (Historial, compartir, Home, Perfil, Info personal, Logros, Alertas)

Revisor: Opus (2026-09-07). Device Redmi Note 10S. Referencia: `docs/evidence/<feature>/`.

## ALTA
- **D-01 Gráfica del histórico vacía** (117–122 Mayo, 128–129 Abril): contenedor con altura pero sin curva/banda/barras/ejes/etiquetas en Tem/Hum/Acu durante ≥21 s. Original: `historical/screen-06..08`.
- **D-02 Header de Perfil y subpáginas bajo la barra de estado** (134–165): back, título y acciones a la altura del reloj. Historial e Inicio sí están bien. Falta inset superior en el stack de perfil.
- **D-03 Contenido inferior bajo la nav bar en stack de perfil**: botón "Editar datos"/"Guardar cambios" cortado (140–155), lista de Notificaciones y FAB papelera (164–165), zona inferior de Logros (158–159). Original: `profile/screen-04`, `screen-13`, `gamification-alerts/screen-08`.
- **D-04 Toast LogBox en inglés** "Error saving personal info: Field Email…" visible al usuario (148–150) y guardado fallido. (F-15)
- **D-05 Logros sin píldora "¿Dudas?"** (original `profile/screen-09`): en su lugar aparece un sheet blanco con asa, "<" y "×" parcialmente bajo la nav bar. (Relacionado con F-13: sin botón de volver.)

## MEDIA
- **D-06 Check del calendario espejado**: badge abajo-izquierda en RN, abajo-derecha en original (`historical/screen-29`, `screen-03`, `screen-21`).
- **D-07 Letras D L M M J V S demasiado oscuras** (original ≈#c7c7c7).
- **D-08 Toast de éxito de compartir** (115): original barra verde sólida a todo el ancho, texto blanco; RN tarjeta blanca con acento verde, texto negro negrita, cortada por la nav bar.
- **D-09 Tarjeta "Registra y gana"**: título negro (original teal oscuro) con semilla pegada al "+2" (RN la manda al extremo derecho); icono ⓘ original círculo teal relleno con i blanca (RN contorno cian); original tiene panel blanco interno sobre tarjeta gris; radio de esquina mayor en RN (~24 vs ~12); "Completar registros" en negrita (original normal). `home/screen-11`, `screen-01`.
- **D-10 Días futuros del strip de racha con fondo gris** (original solo texto gris claro sin fondo). `home/screen-12`.
- **D-11 MoonCard flash "Luna llena" ~2 s** antes de "Cuarto menguante" en cada entrada a Home (130–131); punto decorativo sobre el texto "Fase•lunar".
- **D-12 Pantalla en blanco sin header ~8 s** al cambiar de mes (091–092, 123–126); se pierde el modo gráfica al cambiar de mes.
- **D-13 Flash de estado vacío en Logros** "Aún no tienes logros…" (copy que el original no tiene) antes de los 16 brotes.
- **D-14 Tiles de logros con doble capa** gris-verdosa; original cuadrado plano #eaf5df.
- **D-15 Agregados Tem/Hum/Acu distintos con el mismo dataset**: Abril RN 25.1/31/22 vs orig 23.9/28/21; Hum 73.7/86/65 vs 72.5/82/65; Acu 54 mm/max 15 vs 189 mm/max 60. Mayo Acu 34 vs 81. Calendario idéntico día a día y conteos iguales (41, 68). Verificar agregación en código (`historical-aggregations.ts`, `calculateValue`).
- **D-16 Fecha en Notificaciones** "Hoy · 20:05" vs original siempre absoluta (ambiguo, verificar en código).

## BAJA
- **D-17** Icono "Compartir datos": flecha ↗ fina vs icono de subida del original.
- **D-18** Títulos con back centrados en RN vs alineados a la derecha en original (`profile/screen-04`, `screen-09`).
- **D-19** Nombre del archivo compartido "ReactNative-snapshot…png" (debería ser `reporte-mayo-2026.png`).
- **D-20** Espacio entre emoji y etiqueta en cabecera Tem/Hum/Acu (original pegado).
- **D-21** "Tienes 0 Días de racha" en negro; original "Tienes Días de racha 😌" en teal oscuro (el 0 probablemente es fix correcto; el color no).
- **D-22** Transición push horizontal tipo iOS; original Android usa fade (aceptable).

## Correcto
Calendario mensual día a día idéntico (Mayo/Abril), segmento Mes/Año, navegación de meses, detalle de medición (fecha con año, bloques completados/sin completar, colores max verde/min rojo), Perfil (chips, menú, logos cargan), texto de compartir app, Información personal, Notificaciones (estructura), tab bar con inset inferior, compartir reporte de punta a punta.

## No cubierto en este rango
Formulario de medición y modales (antes del 091), vista Año, mes vacío, detalle de día sin datos, contenido del reporte compartido (nunca visible), Configuración y sync, modales de logros, página lunar, borrar notificación.
