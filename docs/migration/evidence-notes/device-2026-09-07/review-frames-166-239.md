# Revisión device — frames 166–239 (Alertas, Configuración, logout, registro, login)

Revisor: Opus (2026-09-07). Device Redmi Note 10S. Referencia: `docs/evidence/<feature>/`.

## ALTA

- **D1 Header bajo la barra de estado en Perfil, Notificaciones e Información personal** (166–188): banda teal desde y=0, "←" choca con la hora, campana/engranaje con la batería. Configuración, Inicio y Registro sí aplican el inset → solo pantallas con header propio.
- **D2 Perfil muestra la tab bar sin pestaña activa**; el original es página empujada fuera de tabs (`profile/screen-01`, `screen-02` con logo Natura al pie).
- **D3 "Vinculando al proyecto" con layout distinto** (225–239): RN panel blanco opaco anclado arriba solapando la status bar, badge cuadrado, spinner circular, "Cancelar" como enlace; original tarjeta centrada translúcida con esquinas 20, badge circular, loader de punto y "Cancelar" botón sólido teal (`auth-login/screen-05`, `register/screen-14`). La captura terminó atascada ahí ~29 s.
- **D4 Toast LogBox rojo en Login tras cerrar sesión** (189) por `DataStore.clear` (F-16). La app sí quedó en Login. No hay modal de confirmación de logout y eso coincide con el original.
- **D5 Botón "Actualizar configuraciones" bajo la nav bar** con el panel expandido (170); "Guardar cambios" de Info personal casi oculto (147–149).
- **D6 Progreso contradictorio**: Inicio "1 de 3" (179/185/186) y Registrar "0 de 3" 10 s después (183/184); chip de semillas parpadea 0→3.
- (147–149, cruce con log 20:09:06) El usuario pulsó "Guardar cambios"; toast LogBox "Error saving personal info…"; la vista volvió a lectura simulando éxito; sin feedback al usuario. "Otras acciones" en naranja (original gris) y falta la tarjeta gris que agrupa los campos.

## MEDIA

- **D7** Chips de estado del sistema en contorno (original píldora rellena rosa/verde sin borde, `profile/screen-14`). **D8** "Sincronizar mediciones" y "Actualizaciones" sin tarjeta gris contenedora. **D9** Back "‹" chevron en Configuración vs "←" en el resto (original siempre ←).
- **D10/D11** Home: títulos en negro (original teal oscuro #164551), ⓘ contorno vs relleno, sin caja blanca interna, días futuros con círculo gris, letras D L M M J V S oscuras, semilla desplazada. La misma tarjeta en Registrar SÍ respeta el patrón original.
- **D12** Backdrop del modal de confirmación de teléfono demasiado claro (original oscurece fuerte con blur, `auth-login/screen-04`).
- **D13** MoonCard flash "Luna llena" ~2 s (185→186).
- **D14** Badge de la campana no se limpia tras leer las notificaciones (178, 187, 188).
- **D15** Lista de notificaciones sin padding inferior; última tarjeta y base del FAB bajo la nav bar.
- **D16** Toast "Notificaciones habilitadas correctamente" solapa el botón "Actualizar configuraciones" y toca la nav bar.
- **D17** Spinner en "Continuar" del login (223–224): el original no tiene loading (README auth-login).

## BAJA

- **D18** Botones del modal de teléfono "No, editar"/"Sí, continuar"; el original (`auth-login/screen-04`) muestra "No, Editar"/"Sí, Continuar" → la "corrección" #13 de la auditoría de lógica fue errónea, hay que revertirla.
- **D19** Tarjeta de notificación ~8 px más ancha y menos padding. **D20** Hueco del punto de no leído se conserva al marcar leído (original desplaza el contenido). **D21** Check de pre-registro en cian más brillante. **D22** Guiones del círculo de "hoy" más gruesos y menos.

## Correcto

Login (paridad casi exacta), Pre-registro, Registro nombre con validación en rojo, Set-phone con nombre, modal de confirmación de teléfono (geometría), navegación atrás del registro conservando estado, panel "Estado del Sistema" y transición a verde al conceder permiso, Notificaciones (iconografía por tipo, punto no leído, FAB, marcar leído), Perfil (menú, chips, logos reales), headers de medición con/sin back, teclado desplaza la tarjeta, minimizar desde Login y reabrir con estado.

## No cubierto

Modal de compartir app, Logros y sus modales (ver 091-165), pulsar Sincronizar (siempre naranja), minimizar desde Home (reportado por el usuario como bug F-12), badge con contador, OTP/validate-code, fin del login (atascado en "Vinculando al proyecto"), vinculación de RACIMO y resto del registro, modal eliminar cuenta, estado vacío de notificaciones.
