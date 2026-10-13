---
name: develop-emulator
description: Probar la app UVA (React Native) contra el backend develop en el emulador de Android, con la cuenta de agentes que entra sin código SMS. Úsala solo cuando un ticket pida comprobar de punta a punta, con datos de develop, la sesión, la vinculación a un RACIMO o lo que cambia el dashboard RACIMO.
---

# Probar contra develop en el emulador

El procedimiento vigente está en la sección **"Probar contra develop"** de `AGENTS.md`. Léelo entero y síguelo paso a paso: esta skill solo lo señala, para que no haya dos versiones.

Este resumen no reemplaza la sección; si difieren, prevalece `AGENTS.md`:

- Solo develop, solo en local. Nunca `test`, `main` ni producción.
- `amplifyconfiguration.json` real: se genera en una carpeta temporal, se comprueba sin imprimir valores que apunta a develop y se copia a la raíz (está en `.gitignore`). Nunca se abre, se cita ni se versiona, y se borra al terminar.
- La app se maneja en el emulador con `android.sh` del plugin racimo-harness, en un AVD sin la app real. Nunca `npm run android` ni `expo run:android`.
- Cuenta: la de agentes, `+573000000010`, que existe solo en develop. Un agente no crea cuentas.
- Vinculación: solo al RACIMO de prueba "Prueba dashboard", con el código que da el orquestador, que no se escribe en el repo.

La skill de Playwright que había aquí apuntaba al servidor de la versión Ionic (`localhost:4200`), que ya no existe; se retiró en #77. La evidencia de este repo se toma en el emulador.
