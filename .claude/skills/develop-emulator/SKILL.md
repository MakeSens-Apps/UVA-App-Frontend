---
name: develop-emulator
description: Probar la app UVA (React Native) contra el backend develop en el emulador de Android, con una cuenta de la lista de prueba que entra sin código SMS. Úsala solo cuando un ticket pida comprobar de punta a punta, con datos de develop, la sesión, la vinculación a un RACIMO o lo que cambia el dashboard RACIMO, y el ticket o el orquestador hayan autorizado por escrito el amplify pull de develop.
---

# Probar contra develop en el emulador

El procedimiento vigente está en la sección **"Probar contra develop"** de `AGENTS.md`. Léelo entero y síguelo paso a paso: esta skill solo lo señala, para que no haya dos versiones.

Resumen de lo que no cambia:

- Solo develop. Nunca `test`, `main` ni producción, y sin autorización escrita no hay `amplify pull`: se usa la "Configuración sintética" de `AGENTS.md`.
- `amplifyconfiguration.json` real: se genera en una carpeta temporal, se comprueba sin imprimir valores que apunta a develop y se copia a la raíz (está en `.gitignore`). Nunca se abre, se cita ni se versiona.
- La app se maneja en el emulador con `android.sh` del plugin racimo-harness, en un AVD sin la app real. Nunca `npm run android` ni `expo run:android`.
- Cuentas: solo las `+5730000000NN` de `src/data/auth/test-users.ts` que existan en develop. Un agente no crea cuentas.
- Vinculación: solo al RACIMO de prueba "Prueba dashboard", con el código que da el orquestador, que no se escribe en el repo.

La app ya no corre en el navegador: la skill de Playwright de la versión Ionic se retiró en #77.
