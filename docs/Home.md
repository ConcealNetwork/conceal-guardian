# Conceal Node Guardian Wiki

Welcome to the Conceal Node Guardian Wiki! This comprehensive guide will help you understand, install, configure, and troubleshoot the Conceal Node Guardian.

## What is Conceal Node Guardian?

Conceal Node Guardian is a robust monitoring and management system for Conceal Network nodes. It provides:

- **Automatic Daemon Management**: Monitors and restarts the `conceald` daemon when needed
- **Error Detection & Recovery**: Catches daemon errors and automatically restarts the process
- **Pool Integration**: Connects to the Conceal network pool for infrastructure monitoring
- **Notification System**: Sends alerts via Discord webhooks and email
- **Web API**: Provides real-time node status information
- **Security Features**: Implements secure file operations and input sanitization
- **Cross-Platform Support**: Works on Windows, Linux (Ubuntu 22/24), and macOS

## Quick Start

1. **[Installation Guide](Installation.md)** - Get started with installation
2. **[Configuration](Configuration.md)** - Learn how to configure the guardian
3. **[Usage Guide](Usage.md)** - Understand how to run and manage the guardian
4. **[Troubleshooting](Troubleshooting.md)** - Solve common issues

## Advanced Guides

- **[HTTPS Setup](HOW-TO_HTTPS.md)** - Set up HTTPS access for your node
- **[SSL Certificate Setup](HOW-TO_self-issue-SSL-certificate.md)** - Self-issue SSL certificates

## Key Features

### 🔄 **Automatic Process Management**
- Monitors daemon health and performance
- Automatic restart on failures
- Graceful shutdown handling
- Process recovery mechanisms

### 🌐 **Pool Integration**
- Automatic registration with Conceal network pool
- Real-time status reporting
- Geolocation data collection
- Fee-based node support

### 🔔 **Notification System**
- Discord webhook integration
- Email notifications
- Configurable alert thresholds
- Error tracking and reporting

### 🛡️ **Security Features**
- Secure file operations (TOCTOU protection)
- Input sanitization and validation
- CodeQL compliance
- Bootstrap security updates

### 📊 **Monitoring & API**
- Real-time node status
- Blockchain data monitoring
- Web-based dashboard
- RESTful API endpoints

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Guardian      │    │   Conceal       │    │   Pool Service  │
│   Process       │◄──►│   Daemon        │    │   (Optional)    │
│                 │    │   (conceald)    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web API       │    │   RPC           │    │   Notification  │
│   Server        │    │   Communication │    │   System        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Recent Updates

### v0.7.5 Security Improvements
- **CodeQL Compliance**: Fixed unsafe-jquery-plugin and file operation race conditions
- **Enhanced File Operations**: Atomic file creation with retry mechanisms
- **Input Sanitization**: Comprehensive data validation and sanitization
- **Daemon Management**: Improved graceful shutdown with safety measures
- **Pool Notifications**: Enhanced URL validation and data sanitization

## Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/ConcealNetwork/conceal-guardian/issues)
- **Discord**: Join the [Conceal Network Discord](https://discord.gg/conceal) for community support
- **Documentation**: This wiki contains comprehensive guides and troubleshooting information

## Contributing

We welcome contributions! Please see our [Contributing Guide](Contributing.md) for details on how to submit pull requests, report issues, and contribute to the project.

---

*Last updated: August 2024* 