# 🏛️ Property-Ops
> **The Residential Property Acquisition OS — From raw listing to Bank-Ready dossier.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js: v20+](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Built for: Gemini & Claude](https://img.shields.io/badge/Built%20for-Gemini%20%26%20Claude-orange.svg)](https://github.com/google-gemini/gemini-cli)

**Property-Ops** is an AI-native screening engine designed for professional-grade real estate due diligence. It transforms a single URL into a 1000+ word corporate feasibility study, including net-net yield modeling, environmental risk audits, and automated bank packages.

---

## 🌟 Key Highlights

- **🤖 Autonomous Feasibility Study:** Executes a mandatory strategy interview followed by deep hyper-local web research on employment hubs and micro-economics.
- **💰 Advanced Financial Engineering:** Integrated support for **Asset-Backed Financing (Pledging)** and **Differentiated Scenario Analysis** (Home vs. Investment).
- **📄 Automated Bank Package:** Generates a complete, professional PDF/HTML dossier for lenders with a single command.
- **🔍 Surgical Risk Audit:** Automated checks for soil pollution (BDES), flood risks (WalOnMap), and urban planning compliance.
- **🌍 Agnostic & Scalable:** Fully customizable via regional **YAML Packs** (Registration duties, energy policies, and construction costs).

---

## 🚀 Quick Start

### 1. Installation
```bash
git clone https://github.com/antoineghigny/property-ops.git
cd property-ops
npm install
npm run init-user
```

### 2. Configuration
Fill your financial profile in `config/profile.yml` and define your investment goals in `config/strategy.yml`.

### 3. Run your first screen
```bash
# Using Gemini CLI or Claude Code
/property-ops https://www.immoweb.be/fr/annonce/maison/a-vendre/...
```

---

## 📂 Project Structure

```text
├── adapters/           # Connectors to external data (Market, Notary, Energy)
├── config/             # User-specific profile and strategy (Protected by gitignore)
├── engine/             # Core logic
│   ├── finance/        # Mortgage & Yield modeling
│   ├── pricing/        # Intrinsic value & Market gap analysis
│   ├── decision-engine/# Scoring and Go/No-Go logic
│   └── artifacts/      # Expert report & PDF generators
├── packs/              # Regional policy rules (Duties, Energy, Construction)
├── scripts/            # CLI entry points and maintenance tools
└── modes/              # AI Agent operational protocols
```

---

## 🛠️ Tech Stack

- **Runtime:** Node.js (ESM)
- **Validation:** [Zod](https://zod.dev/) for strict data contract enforcement.
- **Automation:** [Playwright](https://playwright.dev/) for listing ingestion.
- **Reporting:** Custom Markdown-to-HTML/PDF engine for bank packages.
- **AI Integration:** Optimized for agentic workflows (Gemini CLI, Claude Code).

---

## 🤝 Contributing

Property-Ops is open-source. We welcome contributions to expand regional **Packs** (France, Luxembourg, etc.) or new **Adapters** (local market data).

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🛡️ Security & Privacy

**Privacy by Design:** `Property-Ops` is built to run locally. All sensitive financial data (income, assets, specific cases) is stored in the `config/` and `data/` directories, which are strictly excluded from git tracking via `.gitignore`.

---
<p align="center">Built with precision by [Antoine Ghigny](https://github.com/antoineghigny) • Part of the Career-Ops Ecosystem</p>
