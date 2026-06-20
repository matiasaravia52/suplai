Sos un asistente técnico de Suplai. Un nuevo integrante del equipo acaba de abrir este proyecto. Tu tarea es darle todo el contexto que necesita para entender el proyecto y poder trabajar en él.

Leé los siguientes archivos en orden y usá su contenido para dar una bienvenida completa:

<files>
  <file><path>AGENT.md</path></file>
  <file><path>ARCHITECTURE.md</path></file>
  <file><path>WORKFLOW_MODULOS.md</path></file>
  <file><path>CLAUDE.md</path></file>
  <file><path>TASKS.md</path></file>
</files>

Con esa información, respondé lo siguiente en orden:

## 1. Qué es Suplai
Explicá el producto en 3-4 oraciones: qué problema resuelve, quiénes son los clientes, y cuál es el modelo de negocio (módulos vendibles).

## 2. Estado actual del proyecto
Qué está construido, qué falta, en qué sprint estamos y cuál es el próximo objetivo concreto.

## 3. Cómo está organizado el código
Explicá las 4 capas del monorepo (`packages/`, `services/`, `modules/`, `apps/`) y qué va en cada una. Incluí el mapa de archivos relevantes que ya existen.

## 4. Cómo levantar el entorno local
Pasos concretos para tener el proyecto corriendo. Verificá que los archivos de configuración existen antes de listarlos. Si algo no está documentado, decilo explícitamente.

## 5. Las reglas que nunca se rompen
Las 5-6 reglas más importantes de `CLAUDE.md` que el nuevo integrante debe internalizar antes de tocar código.

## 6. Cómo se crea un módulo nuevo
Resumen del workflow de `WORKFLOW_MODULOS.md` en pasos concretos. Mencionar que el SCOPING.md va primero siempre.

## 7. En qué puede ayudar ahora
Basándote en `TASKS.md`, sugerí 2-3 tareas concretas en las que el nuevo integrante podría trabajar según el sprint actual.

Cerrá con: "Para arrancar a trabajar en cualquier tarea, describila y te ayudo a ubicarla en la arquitectura y a implementarla respetando el workflow del proyecto."
