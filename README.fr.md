# 🛡️ Agent Hardening Kit（Français）

<div align="center">

[![Licence: MIT](https://img.shields.io/badge/Licence-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-16+-green.svg)](https://nodejs.org/)

**Rendez les Agents de Codage IA plus sûrs, plus stables et plus fiables.**

[English](./README.md) · [简体中文](./README.zh.md) · [日本語](./README.ja.md) · [Español](./README.es.md) · [Français](./README.fr.md)

</div>

---

## ✨ Pourquoi Agent Hardening Kit ?

Les agents de codage IA modernes sont puissants mais fragiles. Sans garde-fous appropriés, ils peuvent :
- ❌ Supprimer des fichiers système critiques
- ❌ Exécuter des commandes dangereuses comme `rm -rf /`
- ❌ Perdre le contexte dans les longues sessions
- ❌ S'écarter des exigences initiales
- ❌ Oublier les préférences de l'utilisateur entre les sessions

**Agent Hardening Kit** fournit un ensemble complet de contraintes et d'extensions qui agissent comme **garde-fous** pour les agents de codage IA, garantissant un comportement sûr, stable et prévisible.

---

## 🎯 Fonctionnalités Principales

### 🔒 Contraintes de Sécurité
- **Liste blanche de chemins** — Restreindre les opérations de fichiers aux répertoires du projet
- **Interception des commandes dangereuses** — Bloquer `rm -rf`, `chmod 777`, `curl|bash`, etc.
- **Prévention d'injection de code** — Détecter `eval()`, `exec()`, injection SQL, traversée de chemin
- **Blocage de création de fichiers binaires** — Empêcher `.exe`, `.dll`, `.bat`, `.ps1`, `.sh`
- **Liste blanche de commandes** — Refus par défaut, autoriser uniquement les commandes sûres

### ⚡ Contraintes de Stabilité
- **Limite de tours de session** — Prévenir les boucles infinies (15 tours par défaut)
- **Instantané automatique** — Créer des instantanés avant les modifications de fichiers
- **Filtrage du bruit** — Filtrer les erreurs en double et les journaux de débogage
- **Détection de terminaison de raisonnement** — Prévenir l'auto-réflexion infinie
- **Suivi de l'état de session** — Enregistrer l'historique des opérations

### 📦 Contraintes de Livraison
- **Contrôle de granularité des changements** — Maximum 5 fichiers par changement
- **Livraison forcée** — Inviter à compléter après 3+ tours de polissage
- **Suivi de progression de livraison** — Affichage visuel de l'état
- **Ancrage des exigences** — Prévenir la dérive des exigences

### 🧠 Extensions de Mémoire
- **Mémoire à long terme** — Persistance des connaissances entre les sessions
- **Observation automatique** — Enregistrement silencieux des opérations importantes
- **Recherche inter-sessions** — Rechercher dans les sessions historiques
- **Mécanisme de récupération** — Restaurer les mémoires supprimées

---

## 🚀 Démarrage Rapide

### Installation

```bash
# Cloner le dépôt
git clone https://github.com/quick123-666/agent-hardening-kit.git
cd agent-hardening-kit

# Installer les dépendances
npm install
```

### Utilisation de Base

```typescript
import {
  createSecurityExtension,
  createStabilityExtension,
  createMemoryExtension,
} from 'agent-hardening-kit';

// Créer une contrainte de sécurité
const security = createSecurityExtension({
  allowedPaths: ['/path/to/project'],
});

// Créer une contrainte de stabilité
const stability = createStabilityExtension({
  maxRounds: 15,
  snapshotEnabled: true,
});

// Créer une extension de mémoire
const memory = createMemoryExtension({
  memoryDir: './memory',
  silentMode: true,
});

// Initialiser
await Promise.all([security.init(), stability.init(), memory.init()]);
```

### Intégration avec Pi Coding Agent

```bash
# Charger toutes les contraintes
pi \
  -e ./examples/pi/pi-security-constraints.ts \
  -e ./examples/pi/pi-stability-constraints.ts \
  -e ./examples/pi/pi-memory.ts
```

---

## 📚 Documentation

- 📖 [Démarrage Rapide](./docs/getting-started.md) — Guide de démarrage rapide
- 🔧 [Référence API](./docs/api-reference.md) — Documentation détaillée de l'API
- 💡 [Meilleures Pratiques](./docs/best-practices.md) — Modèles recommandés
- 🎓 [Étude de Cas Pi Coding Agent](./examples/pi/README.md) — Exemple complet

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              Agent Hardening Kit                    │
├─────────────────────────────────────────────────────┤
│  🔒 Sécurité      ⚡ Stabilité     📦 Livraison    │
│     Couche            Couche           Couche        │
│                                                     │
│              ┌──────────────────┐                   │
│              │ Moteur Runtime   │                   │
│              │ (Confiance Zéro) │                   │
│              └──────────────────┘                   │
│                       │                             │
│              ┌────────▼─────────┐                   │
│              │ Pipeline de      │                   │
│              │ Vérifications    │                   │
│              └────────┬─────────┘                   │
│                       │                             │
│         ┌─────────────┼─────────────┐               │
│         │             │             │               │
│    ┌────▼───┐   ┌────▼───┐   ┌────▼───┐            │
│    │Commandes│  │Fichiers│   │Mémoire │            │
│    │  Ops   │   │  Ops   │   │  Ops   │            │
│    └────────┘   └────────┘   └────────┘            │
└─────────────────────────────────────────────────────┘
```

### Principes de Conception

1. **Sécurité de Confiance Zéro** — Chaque opération doit passer la validation runtime
2. **Défense en Profondeur** — Plusieurs couches de contraintes travaillent ensemble
3. **Principe du Moindre Privilège** — Refus par défaut, autorisation explicite
4. **Valeurs par Défaut à Sécurité Intégrée** — En cas de doute, bloquer l'opération
5. **Comportement Observable** — Toutes les décisions sont journalisées

---

## 📂 Structure du Projet

```
agent-hardening-kit/
├── core/                    # Cadre principal
│   ├── types.ts             # Définitions de types
│   ├── base-extension.ts    # Classe de base d'extension
│   └── index.ts             # Point d'entrée
├── constraints/             # Implémentations des contraintes
├── extensions/              # Modules d'extension
├── examples/
│   └── pi/                  # Étude de cas Pi Coding Agent
├── config/
│   └── default.json         # Configuration par défaut
├── docs/                    # Documentation
├── README.md                # English
├── README.zh.md             # 简体中文
├── README.ja.md             # 日本語
├── README.es.md             # Español
├── README.fr.md             # Français
├── LICENSE
└── package.json
```

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Veuillez d'abord lire nos [Directives de Contribution](./CONTRIBUTING.md).

1. Forker le dépôt
2. Créer votre branche de fonctionnalité (`git checkout -b feature/amazing-feature`)
3. Valider vos modifications (`git commit -m 'Ajouter une fonctionnalité incroyable'`)
4. Pousser vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

---

## 📊 Statistiques

- **Lignes de Code** : ~3 000+
- **Modules de Contraintes** : 10+
- **Agents IA Supportés** : Pi Coding Agent (d'autres à venir)
- **Modèles de Bugs Détectés** : 15+
- **Langages** : TypeScript

---

## 📄 Licence

Ce projet est sous licence MIT — voir le fichier [LICENSE](./LICENSE) pour plus de détails.

---

## 🙏 Remerciements

- Inspiré par le besoin d'outils de codage IA plus sûrs
- Construit sur l'excellent [Pi Coding Agent](https://github.com/earendil-works/pi-coding-agent)
- Merci à tous les [contributeurs](https://github.com/quick123-666/agent-hardening-kit/graphs/contributors)

---

## 📬 Contact

- GitHub : [@quick123-666](https://github.com/quick123-666)
- Problèmes : [GitHub Issues](https://github.com/quick123-666/agent-hardening-kit/issues)

---

<div align="center">

**⭐ Mettez une étoile si vous le trouvez utile !**

Fait avec ❤️ pour un codage IA plus sûr

</div>
