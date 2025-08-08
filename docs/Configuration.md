# Configuration Guide

This guide covers all configuration options for Conceal Node Guardian.

## Table of Contents

- [Configuration File](#configuration-file)
- [Basic Configuration](#basic-configuration)
- [Node Configuration](#node-configuration)
- [Error Handling](#error-handling)
- [API Configuration](#api-configuration)
- [Pool Configuration](#pool-configuration)
- [Notification Settings](#notification-settings)
- [Security Settings](#security-settings)
- [Advanced Configuration](#advanced-configuration)
- [Configuration Examples](#configuration-examples)

## Configuration File

The guardian uses a `config.json` file for all settings. This file is created during the initial setup or can be created manually.

### File Location

- config.json

### File Structure

```json
{
  "node": { ... },
  "error": { ... },
  "restart": { ... },
  "api": { ... },
  "pool": { ... },
  "url": { ... }
}
```

## Basic Configuration

### Node Section

The `node` section controls the Conceal daemon settings.

```json
{
  "node": {
    "args": [
      "--rpc-bind-ip",
      "127.0.0.1",
      "--rpc-bind-port",
      "16000"
    ],
    "path": "/path/to/conceald",
    "port": 16000,
    "name": "MyNode",
    "bindAddr": "0.0.0.0",
    "feeAddr": "ccx7ZuCP9NA2KmnxbyBn9QgeLSATHXHRAXVpxgiaNxsH4GwMvQ92SeYhEeF2tJHADHbW4bZMFHvFf8GpucLrRyw49q4Gkc3AXM",
    "autoUpdate": true
  }
}
```

#### Node Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `args` | Array | `[]` | Command-line arguments passed to the daemon |
| `path` | String | `""` | Path to the `conceald` executable (empty for auto-download) |
| `port` | Number | `16000` | RPC port for the daemon |
| `name` | String | `hostname` | Public name of your node |
| `bindAddr` | String | `"127.0.0.1"` | Binding address (`127.0.0.1` for local, `0.0.0.0` for external) |
| `feeAddr` | String | `""` | CCX address for fee collection (for remote nodes) |
| `autoUpdate` | Boolean | `false` | Enable automatic daemon updates |

### Error Handling Section

The `error` section controls notification settings.

```json
{
  "error": {
    "notify": {
      "discord": {
        "url": "https://discord.com/api/webhooks/..."
      },
      "email": {
        "smtp": {
          "host": "smtp.gmail.com",
          "port": 587,
          "secure": true
        },
        "auth": {
          "username": "your-email@gmail.com",
          "password": "your-app-password"
        },
        "message": {
          "from": "guardian@yourdomain.com",
          "to": "admin@yourdomain.com",
          "subject": "Guardian Error Alert"
        }
      }
    }
  }
}
```

### Restart Section

The `restart` section controls automatic restart behavior.

```json
{
  "restart": {
    "errorForgetTime": 600,
    "maxCloseErrors": 3,
    "maxBlockTime": 1800,
    "maxInitTime": 900,
    "terminateTimeout": 120
  }
}
```

#### Restart Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `errorForgetTime` | Number | `600` | Seconds before error count is reset |
| `maxCloseErrors` | Number | `3` | Maximum errors before guardian stops |
| `maxBlockTime` | Number | `1800` | Maximum seconds between block updates |
| `maxInitTime` | Number | `900` | Maximum seconds for daemon initialization |
| `terminateTimeout` | Number | `120` | Seconds before force-killing daemon |

**Note**: during initial daemon which can take up to 3-5 days, you may consider increasing those value, or even wait for the daemon to be fully synchronized before using Guardian.

### API Section

The `api` section controls the web API server.

```json
{
  "api": {
    "port": 8080,
    "host": "127.0.0.1"
  }
}
```

#### API Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | Number | `8080` | API server port (0 to disable) |
| `host` | String | `"127.0.0.1"` | API server binding address |

access on http://127.0.0.1:8080/index.html

### Pool Section

The `pool` section controls pool registration and notifications.

```json
{
  "pool": {
    "notify": {
      "url": "https://explorer.conceal.network/pool/update",
      "interval": 30
    }
  }
}
```

#### Pool Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `notify.url` | String | `""` | Pool notification URL |
| `notify.interval` | Number | `30` | Notification interval in seconds |

### URL Section

The `url` section controls custom hostname settings.

```json
{
  "url": {
    "host": "https://mynode.example.com",
    "port": ""
  }
}
```

#### URL Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `host` | String | `""` | Custom hostname for your node |
| `port` | Number | `16000` | is a Custom port for your node |

## Security Settings

### File Permissions

The guardian creates several files with specific permissions:

- **`nodedata.json`**: `0o664` (read/write for owner and group)
- **`debug.log`**: `0o644` (read/write for owner, read for others)
- **`config.json`**: `0o600` (read/write for owner only)

## Advanced Configuration

### Custom Daemon Arguments

You can pass custom arguments to the daemon:

```json
{
  "node": {
    "args": [
      "--enable-blockchain-indexes",
      "--enable-autosave"
    ]
  }
}
```

### Custom Logging

The guardian logs to multiple locations:

- **Application Logs**: `~/.local/share/ccxNodeGuard/debug.log`
- **System Logs**: `journalctl -u ccx-guardian` (Linux)
- **Windows Event Log**: Windows Event Viewer

### Performance Tuning

For high-performance nodes:

```json
{
  "restart": {
    "maxInitTime": 300,
    "terminateTimeout": 60
  },
  "pool": {
    "notify": {
      "interval": 15
    }
  }
}
```

## Configuration Examples

### Basic Local Node

```json
{
  "node": {
    "name": "MyLocalNode",
    "port": 16000,
    "bindAddr": "127.0.0.1"
  },
  "api": {
    "port": 8080
  },
  "restart": {
    "maxCloseErrors": 3,
    "maxInitTime": 900
  }
}
```

### Fee-based Remote Node

```json
{
  "node": {
    "name": "MyRemoteNode",
    "port": 16000,
    "bindAddr": "0.0.0.0",
    "feeAddr": "ccx7V4LeUXy2eZ9waDXgsLS7Uc11e2CpNSCWVdxEqSRFAm6P6NQhSb7XMG1D6VAZKmJeaJP37WYQg84zbNrPduTX2whZ5pacfj"
  }
}
```

## Configuration Management

### Editing Configuration

**Manual Edit:**
```bash
# Linux/macOS
nano config.json

# Windows
notepad config.json
```

**Using Guardian Commands:**
```bash
# Re-run setup
./guardian-linux64 --setup
```

### Configuration Validation

The guardian validates configuration on startup:

- **Required Fields**: Ensures all required fields are present
- **Data Types**: Validates data types (numbers, strings, booleans)
- **Value Ranges**: Checks port numbers and timeouts are within valid ranges
- **URL Validation**: Validates all URLs are properly formatted
- **Path Validation**: Ensures file paths are accessible


## Next Steps

After configuring your guardian:

- **[Usage](Usage.md)** - How to use and manage the guardian
- **[Troubleshooting](Troubleshooting.md)** - Solve configuration issues
