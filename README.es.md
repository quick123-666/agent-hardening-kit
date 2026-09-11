# 🛡️ Agent Hardening Kit（Español）

<div align="center">

[![Licencia: MIT](https://img.shields.io/badge/Licencia-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-16+-green.svg)](https://nodejs.org/)

**Haga que los Agentes de Codificación de IA sean más seguros, estables y confiables.**

[English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · [Español](./README.es.md) · [Français](./README.fr.md)

</div>

---

## ✨ ¿Por qué Agent Hardening Kit?

Los agentes de codificación de IA modernos son poderosos pero frágiles. Sin las barandas adecuadas, pueden:
- ❌ Eliminar archivos críticos del sistema
- ❌ Ejecutar comandos peligrosos como `rm -rf /`
- ❌ Perder contexto en sesiones largas
- ❌ Desviarse de los requisitos originales
- ❌ Olvidar las preferencias del usuario entre sesiones

**Agent Hardening Kit** proporciona un conjunto completo de restricciones y extensiones que actúan como **barandas** para los agentes de codificación de IA, garantizando un comportamiento seguro, estable y predecible.

---

## 🎯 Características Principales

### 🔒 Restricciones de Seguridad
- **Lista blanca de rutas** — Restringir operaciones de archivos a directorios del proyecto
- **Intercepción de comandos peligrosos** — Bloquear `rm -rf`, `chmod 777`, `curl|bash`, etc.
- **Prevención de inyección de código** — Detectar `eval()`, `exec()`, inyección SQL, traversal de rutas
- **Bloqueo de creación de archivos binarios** — Prevenir `.exe`, `.dll`, `.bat`, `.ps1`, `.sh`
- **Lista blanca de comandos** — Denegación por defecto, solo permitir comandos seguros

### ⚡ Restricciones de Estabilidad
- **Límite de rondas de sesión** — Prevenir bucles infinitos (15 rondas por defecto)
- **Instantánea automática** — Crear instantáneas antes de modificaciones de archivos
- **Filtrado de ruido** — Filtrar errores duplicados y registros de depuración
- **Detección de terminación de razonamiento** — Prevenir autorreflexión infinita
- **Seguimiento del estado de la sesión** — Registrar historial de operaciones

### 📦 Restricciones de Entrega
- **Control de granularidad de cambios** — Máximo 5 archivos por cambio
- **Entrega forzada** — Indicar finalización después de 3+ rondas de pulido
- **Seguimiento del progreso de entrega** — Visualización del estado
- **Anclaje de requisitos** — Prevenir la deriva de requisitos

### 🧠 Extensiones de Memoria
- **Memoria a largo plazo** — Persistir conocimiento entre sesiones
- **Observación automática** — Registrar silenciosamente operaciones importantes
- **Búsqueda entre sesiones** — Buscar en sesiones históricas
- **Mecanismo de recuperación** — Restaurar memorias eliminadas

---

## 🚀 Inicio Rápido

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/quick123-666/agent-hardening-kit.git
cd agent-hardening-kit

# Instalar dependencias
npm install
```

### Uso Básico

```typescript
import {
  createSecurityExtension,
  createStabilityExtension,
  createMemoryExtension,
} from 'agent-hardening-kit';

// Crear restricción de seguridad
const security = createSecurityExtension({
  allowedPaths: ['/path/to/project'],
});

// Crear restricción de estabilidad
const stability = createStabilityExtension({
  maxRounds: 15,
  snapshotEnabled: true,
});

// Crear extensión de memoria
const memory = createMemoryExtension({
  memoryDir: './memory',
  silentMode: true,
});

// Inicializar
await Promise.all([security.init(), stability.init(), memory.init()]);
```

### Integración con Pi Coding Agent

```bash
# Cargar todas las restricciones
pi \
  -e ./examples/pi/pi-security-constraints.ts \
  -e ./examples/pi/pi-stability-constraints.ts \
  -e ./examples/pi/pi-memory.ts
```

---

## 📚 Documentación

- 📖 [Inicio Rápido](./docs/getting-started.md) — Guía de inicio rápido
- 🔧 [Referencia API](./docs/api-reference.md) — Documentación detallada de la API
- 💡 [Mejores Prácticas](./docs/best-practices.md) — Patrones recomendados
- 🎓 [Estudio de Caso de Pi Coding Agent](./examples/pi/README.md) — Ejemplo completo

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────┐
│              Agent Hardening Kit                    │
├─────────────────────────────────────────────────────┤
│  🔒 Seguridad     ⚡ Estabilidad   📦 Entrega      │
│     Capa              Capa            Capa           │
│                                                     │
│              ┌──────────────────┐                   │
│              │ Motor de Runtime │                   │
│              │ (Confianza Cero) │                   │
│              └──────────────────┘                   │
│                       │                             │
│              ┌────────▼─────────┐                   │
│              │ Tubería de       │                   │
│              │ Comprobaciones   │                   │
│              └────────┬─────────┘                   │
│                       │                             │
│         ┌─────────────┼─────────────┐               │
│         │             │             │               │
│    ┌────▼───┐   ┌────▼───┐   ┌────▼───┐            │
│    │ Comandos│   │Archivos│   │Memoria │            │
│    │  Ops   │   │  Ops   │   │  Ops   │            │
│    └────────┘   └────────┘   └────────┘            │
└─────────────────────────────────────────────────────┘
```

### Principios de Diseño

1. **Seguridad de Confianza Cero** — Cada operación debe pasar la validación de runtime
2. **Defensa en Profundidad** — Múltiples capas de restricciones trabajan juntas
3. **Principio de Menor Privilegio** — Denegación por defecto, permiso explícito
4. **Valores por Defecto a Prueba de Fallos** — En caso de duda, bloquear la operación
5. **Comportamiento Observable** — Todas las decisiones se registran

---

## 📂 Estructura del Proyecto

```
agent-hardening-kit/
├── core/                    # Marco central
│   ├── types.ts             # Definiciones de tipos
│   ├── base-extension.ts    # Clase base de extensión
│   └── index.ts             # Punto de entrada
├── constraints/             # Implementaciones de restricciones
├── extensions/              # Módulos de extensión
├── examples/
│   └── pi/                  # Estudio de caso de Pi Coding Agent
├── config/
│   └── default.json         # Configuración predeterminada
├── docs/                    # Documentación
├── README.md                # English
├── README.zh.md             # 简体中文
├── README.ja.md             # 日本語
├── README.es.md             # Español
├── README.fr.md             # Français
├── LICENSE
└── package.json
```

---

## 🤝 Contribuyendo

¡Las contribuciones son bienvenidas! Por favor, lea primero nuestras [Pautas de Contribución](./CONTRIBUTING.md).

1. Haga fork del repositorio
2. Cree su rama de función (`git checkout -b feature/amazing-feature`)
3. Confirme sus cambios (`git commit -m 'Añadir alguna función increíble'`)
4. Empuje a la rama (`git push origin feature/amazing-feature`)
5. Abra una Solicitud de Pull

---

## 📊 Estadísticas

- **Líneas de Código**: ~3,000+
- **Módulos de Restricciones**: 10+
- **Agentes de IA Soportados**: Pi Coding Agent (más próximamente)
- **Patrones de Errores Detectados**: 15+
- **Lenguajes**: TypeScript

---

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT — consulte el archivo [LICENSE](./LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- Inspirado por la necesidad de herramientas de codificación de IA más seguras
- Construido sobre el excelente [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent)
- Gracias a todos los [contribuyentes](https://github.com/quick123-666/agent-hardening-kit/graphs/contributors)

---

## 📬 Contacto

- GitHub: [@quick123-666](https://github.com/quick123-666)
- Problemas: [GitHub Issues](https://github.com/quick123-666/agent-hardening-kit/issues)

---

<div align="center">

**⭐ ¡Dale una Estrella si te resulta útil!**

Hecho con ❤️ para una codificación de IA más segura

</div>
