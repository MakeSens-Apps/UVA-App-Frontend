# Revisión device — frames 021–090 (arranque, Home, modales, lunar, Registrar, guía, formulario, Historial inicial)

Revisor: Opus (2026-09-07). Device Redmi Note 10S. Referencia: `docs/evidence/<feature>/`.

## Verificación de fixes de la ronda 1

- (a) Tab bar sobre la nav bar: **OK** (039, 049, 054, 078, 086).
- (b) Franja gris derecha: **OK** (049 lunar, 086/087).
- (c) Dígitos completos: **OK** (059/060, 068/071). F-08 resuelto.
- (d) Rich text (negritas/colores en subtítulo, etiquetas, guía): **OK** (057, 067, 056, 065). F-09 resuelto.
- (e) Guía como sheet con header detrás y X bajo status bar: **OK** (056, 065). Faltan drag handle y backdrop que atenúe (D-14, D-29).
- (f) Botones inferiores: **"Entendido" de la guía SIGUE bajo la nav bar** (056, 065) → FALLA. "Guardar registro" OK.
- (g) Splash UVA nativo: **OK** (033). Splash JS (034): el logo lleva un recuadro cuadrado teal distinto alrededor del badge (D-42).

## ALTA

- **D-01 Tarjetas del Home sin estructura**: original = tarjeta gris claro con borde y caja interior blanca con borde (calendario semanal / progreso+barra); RN = tarjeta blanca sin borde con sombra y sin caja interior. `home/screen-01`.
- **D-02 Días futuros del strip semanal con círculo gris relleno** (08–12); original solo texto gris claro. (= D-10 del rango 091-165)
- **D-09 Modal de semillas invertido** (042): RN número arriba y texto abajo; original texto primero y número debajo centrado; RN añade encabezado "5 🌰" inexistente; texto partido por los círculos 03→03✓ va todo junto. `home/screen-07`.
- **D-10 Modal de ejemplo de racha roto** (046): pinta la semana real del usuario en tamaño ilegible en vez del ejemplo ilustrativo 02–08 con estados; falta fila D L M M J V S; caja blanca en vez de celeste; título fuera de la caja. `home/screen-06`.
- **D-16 Avatar de Perfil casi invisible** (040): círculo lavanda apenas visible; original cian claro #A8E5F5 con silueta azul. `profile/screen-01`.
- **D-25 "Entendido" de la guía bajo la nav bar** (056, 065). Bloquea el uso de la guía.
- **D-37 Historial mes: días sin registro con círculo gris relleno** (08–30 en 086); original sin círculo. Inconsistente (01–06 sin círculo). `historical/screen-26`, `screen-01`.

## MEDIA

- D-03 Icono ⓘ contorno cian vs círculo teal relleno con i blanca (ambas tarjetas Home). D-04 Semilla 🌰 movida al extremo derecho en "Registra y gana: +2". D-05 Títulos de tarjetas en negro/negrita vs dark teal #0e5c6b; botones en negrita vs regular; flecha → más pequeña. D-08 Flash "Luna llena" ~2 s en MoonCard.
- D-11 Texto del modal de racha acortado, falta badge circular "03" inline. D-12 Botón de cierre de sheets: ✕ teal suelta vs ✕ blanca sobre cuadrado teal. D-13 Bottom sheets no cubren la tab bar (franja blanca) y no atenúan la tab bar. D-14 Falta drag handle en todos los sheets.
- D-17 Iconos de filas de Perfil a opacidad casi nula. D-18 RN muestra tab bar en Perfil; original es página empujada sin tabs con logo Natura al pie (`profile/screen-02`).
- D-21 Lunar: el círculo de "hoy" solo rodea la lunita, el número queda fuera; original engloba icono + número (`moon-phase/screen-04`).
- D-22 Encabezados "Registros sin completar/completados" fuera de la tarjeta (original dentro). D-23 Tipografía de tareas más grande, "Temperatura y humedad (mañana) 🌡️" parte en 2 líneas.
- D-26 Faltan flechas ↑ verde / ↓ roja junto al título de la guía. D-27 Imagen de la guía mucho más pequeña (~215 px vs ~320). D-28 Checkbox "Mostrar automáticamente" viene MARCADO (original desmarcado) y el texto difiere ("Mostrar automaticamente." sin tilde con punto).
- D-30 Faltan flechas ↑/↓ en tarjetas del formulario (F-10). D-31 Icono "¿Cómo ver este dato?" emoji ℹ️ vs círculo dark teal con i blanca (F-10). D-32 Alerta de rango: RN caja crema con ⚠️ inline a la izquierda; original caja blanca con borde, ⚠️ centrado en su línea, título centrado (`measurement/screen-07`).
- D-35 Modal "Verifica los datos": RN tarjeta blanca con márgenes y valor unido "38 °C"; original sin tarjeta, flotando sobre formulario con blur, dígitos separados con subrayado (`measurement/screen-09`, `screen-20`). D-36 Modal "Registro guardados": botón "Siguiente" diminuto sin padding; el borde de la tarjeta corta el botón de atrás.
- D-38 Vista Año sin cabeceras D L M M J V S en mini-meses. D-39 Círculos de día de vista Año demasiado grandes, se tocan y los ✓ se solapan. D-40 Carga de Historial en blanco sin cabecera ~10 s (080–085, 088–090); status bar blanca.
- D-42 Recuadro cuadrado alrededor del logo en el splash JS (asset con fondo horneado).

## BAJA

- D-06 "Inicio" en negrita (original regular). D-07 Etiquetas del tab bar en negrita, pill activo más estrecho. D-15 Texto intro del modal germinación sin tarjeta blanca y descripciones a la izquierda (original centradas). D-20 Chips de perfil con más padding. D-24 Chip "Disponible hasta" más estrecho. D-29 Sheet de guía no atenúa el fondo. D-33 "Guardar registro" más alto y en negrita. D-34 Con teclado abierto "Guardar" queda oculto (ambiguo). D-41 Cajas Tem/Hum/Acu sin borde y espacio emoji-texto. D-43/44 artefactos dev (LogBox, red box).
- Ambiguo: a las "08:16" de la barra de estado, tareas "Disponible hasta las 08:00" aparecen habilitadas (054). El reloj del device parece desfasado (frames a las 20:0x); requiere prueba dirigida.

## Correcto

Flujo de medición completo máximos→mínimos→guardado→lista con completados y semillas; validación de rango; calendario lunar (salvo D-21); vista Año con datos; segmentado, "Ver como gráfica", navegación de meses, "Compartir datos" presentes; header y tab bar; guías con contenido S3; cero crashes.

## No cubierto en este rango

Flujo de lluvias, otras dos tareas, gráfica del histórico (ver 091-165: vacía), estado vacío del historial, auth/login (sesión restaurada tras reinstalar; F-01 sin re-verificar), subpáginas de perfil (ver 091-165 y 166-239), racha > 0 en Home.

## Prioridad sugerida

1. D-25 Entendido bajo nav bar. 2. D-01 + D-02/D-37 tarjetas y círculos grises. 3. D-09/D-10 modales de gamificación. 4. D-16/D-17 avatar e iconos de Perfil. 5. D-40 y D-42.
