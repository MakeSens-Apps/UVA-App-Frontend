<!--
Plantilla del harness de Claude de MakeSens (racimo-harness). Con el harness, el cuerpo lo genera
render-evidence.mjs desde evidence.json; si escribes el PR a mano, completa las mismas secciones.
Título: Conventional Commits con descripción en español. Base: la rama base del repo (develop).
Sin imágenes: enlaza las secciones del Artifact de evidencia.
-->

## Resumen
<!-- Qué cambia y por qué, en 2 a 4 líneas. -->

Closes #

## Criterios de aceptación
<!-- Uno por línea: - [x] criterio: cumplido · - [ ] criterio: parcial | no cumplido | fuera de este PR | después del merge: motivo.
     Con algún criterio parcial, no cumplido o fuera de este PR, usa "Refs #" en vez de "Closes #". -->
- [ ] …

## Evidencia
<!-- Artifact: <url> · Capturas o Comportamiento: <url>#capturas · Revisión: <url>#revision -->

## Hallazgos sin resolver
<!-- - [GRAVE] … (decisión: …) / - [MEDIA] … / - [MENOR] … · "Ninguno." si no hay. Sin detalle explotable. -->

## Orden de integración
Depende de: nada · Rebasar después: nada

## Pasos posteriores al merge
<!-- Despliegues, migraciones, configuración o verificaciones que hace una persona. "Ninguno." si no hay. -->

## Checklist
- [ ] El título sigue Conventional Commits y la base es la rama base del repo.
- [ ] Cada criterio de aceptación está verificado o se explica por qué no.
- [ ] La CI está en verde (o el repo no tiene CI y la verificación local está en la evidencia).
- [ ] Si el PR toca infraestructura o despliegues, están descritos en "Pasos posteriores al merge".
- [ ] Si el PR cambia un contrato público (API o esquema), el cambio está declarado.
- [ ] No hay secretos, credenciales ni datos reales de personas o RACIMOS.
- [ ] No hay cambios fuera del alcance del ticket.
- [ ] Artifact de evidencia publicado con la plantilla del harness.
- [ ] Revisión adversarial: rondas × 4 enfoques.
- [ ] Ticket en In review.
