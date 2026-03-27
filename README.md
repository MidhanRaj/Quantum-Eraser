# YEETMYDATA: Quantum-Hardened Data Destruction ⚛️🛡️

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![NIST Compliance](https://img.shields.io/badge/Compliance-NIST_800--88-brightgreen.svg)](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-88r1.pdf)
[![Chain: Sepolia](https://img.shields.io/badge/Blockchain-Sepolia_Testnet-627EEA.svg)](https://sepolia.etherscan.io/)

**EraseXpertz** (codenamed *Annihilator*) is an enterprise-grade, post-quantum data sanitization suite. It ensures that deleted data remains unrecoverable even against future quantum computing threats by leveraging Quantum Random Number Generation (QRNG) and Post-Quantum Cryptography (PQC).

---

## 🔥 Key Features

- 🧬 **Quantum Entropy**: Uses IBM Quantum's backend for true quantum randomness during file overwriting.
- ⛓️ **Immutable Audit Ledger**: Automatically logs sanitization events to the **Ethereum Sepolia Testnet** for third-party verification.
- 🛡️ **PQC Encrypted Logs**: Local audit logs are protected using CRYSTALS-Kyber (with AES-GCM fallback).
- 🤖 **AI Guard**: Integrated machine learning model that warns users before wiping high-risk or sensitive system files.
- 📑 **Compliance Reports**: Generates NIST SP 800-88 Rev.1 compliant PDF Certificates of Data Sanitization.
- 💨 **VSS Shadow Killer**: Automatically purges Volume Shadow Copies to prevent "time-travel" data recovery.

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10 or higher**
- **Windows** (Optimized for PowerShell-based drive detection and VSS management)
- **MetaMask** (Browser extension for blockchain audit verification)

### Installation

1. **Clone the Repository** (if not already done)
   ```bash
   git clone https://github.com/MidhanRaj/Quantum-Eraser.git
   cd Quantum-Eraser
   ```

2. **Install Dependencies**
   It is recommended to use a virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

   *Note: `pqcrypto` is an optional dependency for Kyber encryption. If installation fails on Windows, the app will automatically fall back to AES-256-GCM.*

3. **Setup Environment (Optional)**
   Create a `.env` file in the root directory:
   ```env
   WIPELOG_CONTRACT_ADDRESS=0x7c1B9A...f0Ba68
   IBM_QUANTUM_TOKEN=your_token_here
   ```

---

## 💻 How to Run

To launch the application, run the main entry point with **Administrator privileges** (required for low-level drive access and VSS management):

```powershell
python run_app.py
```

- **Wallet Connection**: Upon launch, connect your MetaMask wallet via the bridge to enable the Immutable Audit Ledger.
- **Scanning**: Select a drive or folder to scan for sensitivity risk before wiping.
- **Wiping**: Choose your algorithm (NIST Clear, DoD 5220.22-M, etc.) and initiate the secure deletion.

---

## 🛠 Tech Stack

- **Backend**: Python, Pywebview, Web3.py, `pqcrypto`
- **Frontend**: HTML5, CSS3 (Glassmorphism), Vanilla JavaScript, Ethers.js
- **Intelligence**: Scikit-Learn (AI Guard)
- **Blockchain**: Solidity Smart Contract (Ethereum Sepolia)

---

## ⚖️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Disclaimer: This tool is designed for permanent data destruction. Use with extreme caution. The authors are not responsible for accidental data loss.*
