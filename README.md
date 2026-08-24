# Teleprompter

Telepronter es una interfaz web de teleprompter creada con React, TypeScript y Vite.

## Funciones

- Editor de guion con contador de palabras.
- Desplazamiento automático con velocidad configurable.
- Tamaño de texto ajustable.
- Modo espejo para lectura frente a cámara.
- Modo enfoque y atajos: `espacio`, `R` y `Esc`.
- Compatible con controles de presentación que envían `PageUp`, `PageDown` o flechas.

## Aplicación de escritorio

La versión de escritorio puede recibir las teclas del dispositivo secundario aunque otra ventana tenga el foco.

```bash
npm run desktop:dev
npm run desktop
```

En la interfaz, asigná cada acción presionando el botón y luego la tecla del dispositivo. En la versión de escritorio, los controles globales se activan automáticamente para operar mientras trabajás en otra aplicación.

## Desarrollo

```bash
npm install
npm run dev
```

Para validar una compilación de producción:

```bash
npm run build
```
