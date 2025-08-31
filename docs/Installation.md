# Installation Guide

This guide covers installing Conceal Node Guardian on all supported platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Platform-Specific Instructions](#platform-specific-instructions)
  - [Windows](#windows)
  - [Ubuntu 22.04](#ubuntu-2204)
  - [Ubuntu 24.04](#ubuntu-2404)
  - [macOS](#macos)
- [Post-Installation Setup](#post-installation-setup)
- [Next Steps](#next-steps)

## Prerequisites

- **Operating System**: Windows 10+, Ubuntu 22.04+, Ubuntu 24.04+, or macOS 10.15+
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: 10GB free space

## Platform-Specific Instructions

### Windows

#### Node.js Method
##### Prerequisites
- **Node.js**: Version 20.0.0 or higher

1. **Install Node.js**
   - Download Node.js 20.x from [nodejs.org](https://nodejs.org/)
   - Run the installer
   - Verify installation: `node --version`

2. **Clone and Install**
   ```cmd
   git clone https://github.com/ConcealNetwork/conceal-guardian.git
   cd conceal-guardian
   npm install
   ```

3. **Run Setup**
   ```cmd
   node index.js --setup
   ```

4. **Start Guardian**
   ```cmd
   node index.js
   ```

#### Precompiled Binary Method
1. **Download and Extract**
   - Download `guardian-win64.zip` from releases
   - **Important**: Right-click the zip file → Properties → Security → Unblock
   - Extract to preferred location

2. **Run Setup**
   ```cmd
   guardian-win64.exe --setup
   ```

3. **Start Guardian**
   ```cmd
   guardian-win64.exe
   ```

### Ubuntu

#### Node.js Method
1. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Clone and Install**
   ```bash
   git clone https://github.com/ConcealNetwork/conceal-guardian.git
   cd conceal-guardian
   npm install
   ```

3. **Run Setup**
   ```bash
   node index.js --setup
   ```

4. **Start Guardian**
   ```bash
   node index.js
   ```

#### Precompiled Binary Method
1. **Download and Extract**
   ```bash
   wget https://github.com/ConcealNetwork/conceal-guardian/releases/download/v0.7.5/guardian-linux64-ubuntu-22.tar.gz
   tar -xzf guardian-linux64-ubuntu-22.tar.gz
   cd guardian-linux64-ubuntu-22
   ```

2. **Run Setup**
   ```bash
   ./guardian-linux64 --setup
   ```

3. **Start Guardian**
   ```bash
   ./guardian-linux64
   ```

### macOS

#### Node.js Method (Recommended)
1. **Install Node.js**
   ```bash
   # Using Homebrew
   brew install node@20
   
   # Or download from nodejs.org
   ```

2. **Clone and Install**
   ```bash
   git clone https://github.com/ConcealNetwork/conceal-guardian.git
   cd conceal-guardian
   npm install
   ```

3. **Run Setup**
   ```bash
   node index.js --setup
   ```

4. **Start Guardian**
   ```bash
   node index.js
   ```


## Post-Installation Setup

### Configuration

The setup process will ask you several questions:

- **Daemon Path**: Path to your `conceald` executable (leave empty for auto-download)
- **Node Name**: Public name for your node
- **Fee-based Node**: Whether to run as a fee-based remote node
- **Fee Address**: CCX address for fee collection (if applicable)
- **External Access**: Whether the node should be accessible from the internet
- **Auto Update**: Enable automatic daemon updates
- **Pool Registration**: Register with the Conceal network pool
- **Notifications**: Configure Discord and email notifications

### Configuration File Location

- config.json

### Basic Configuration Example

```json
{
  "node": {
    "path": "",
    "port": 16000,
    "name": "MyNode",
    "bindAddr": "127.0.0.1",
    "feeAddr": "",
    "autoUpdate": true,
    "args": [
      "--enable-blockchain-indexes",
      "--enable-autosave"
    ]
  },
  "api": {
    "port": 8080,
    "bindAddr": "127.0.0.1"
  },
  "pool": {
    "notify": {
      "url": "https://explorer.conceal.network/pool/update",
      "interval": 60
    }
  }
}
```

### Verification

1. **Check Guardian Status**
   ```bash
   # Node.js method
   ps aux | grep "node index.js"
   
   # Binary method
   sudo systemctl status ccx-guardian
   ```

2. **Check Logs**
   ```bash
   # Node.js method
   tail -f ~/.local/share/ccxNodeGuard/debug.log
   
   # Binary method
   sudo journalctl -u ccx-guardian -f
   ```

3. **Test API**
   ```bash
   curl http://localhost:8080/getInfo
   ```

## Next Steps

- **[Usage Guide](Usage.md)** - Learn how to manage and monitor your guardian
- **[Troubleshooting](Troubleshooting.md)** - Solve common issues 