# Usage Guide

This guide covers how to use and manage Conceal Node Guardian.

## Starting the Guardian

### Node.js Method
```bash
# Start manually
node index.js

# Run in background
nohup node index.js > guardian.log 2>&1 &
```

### Binary Method
```bash
# Linux/macOS
./guardian-linux64

# Windows
guardian-win64.exe
```

### Create Service

#### Node.js Method
```bash
# Create systemd service file
sudo tee /etc/systemd/system/ccx-guardian.service << EOF
[Unit]
Description=Conceal Node Guardian
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=$(which node) index.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable ccx-guardian
sudo systemctl start ccx-guardian
```

#### Binary Method
```bash
# Linux
sudo ./guardian-linux64 --service install
sudo systemctl start ccx-guardian
sudo systemctl enable ccx-guardian

# Windows
guardian-win64.exe --service install
guardian-win64.exe --service start
```

### Service Management

```bash
# Linux
sudo systemctl start ccx-guardian
sudo systemctl stop ccx-guardian
sudo systemctl status ccx-guardian
# or using binary
sudo ./guardian-linux64 --service start
sudo ./guardian-linux64 --service stop

# Windows
guardian-win64.exe --service start
guardian-win64.exe --service stop
guardian-win64.exe --service status
```

## Checking Status


### Web Interface
Access the web interface at: [http://localhost:8080/index.html](http://localhost:8080/index.html)

**📹 See it in action:** [Web Interface Demo](images/outputGuardian.gif)

*The web interface provides real-time monitoring of your node status, blockchain information, and connection statistics.*

### Process Status
```bash
# Node.js method
ps aux | grep "node index.js"

# Binary method
ps aux | grep guardian
```

### Service Log
```bash
# Ubuntu
sudo systemctl status ccx-guardian

# Windows
# PowerShell
Get-WmiObject win32_service | Where-Object {$_.Name -like '*ccx-guardian*'} | Select-Object Status
# Or
sc query ccx-guardian

```

### other Logs
```bash
# Node.js method
tail -f ~/.local/share/ccxNodeGuard/debug.log

# Binary method
sudo journalctl -u ccx-guardian -f
```



## Common Commands

### Node.js Method
```bash
# Help
node index.js --help

# Version
node index.js --version

# Setup
node index.js --setup

# Update daemon
node index.js --node update
```

### Binary Method
```bash
# Help
./guardian-linux64 --help

# Version
./guardian-linux64 --version

# Setup
./guardian-linux64 --setup

# Update daemon
./guardian-linux64 --node update
```

## Monitoring

### Check Daemon Status
 Test RPC connection, visit:  
[http://127.0.0.1:16000/getinfo](http://127.0.0.1:16000/getinfo)


### Check Pool Registration
- Visit [Conceal Network Pool](https://explorer.conceal.network/pool/list)
- Look for your node name in the list

### Check Notifications
- Discord webhook messages (if configured)
- Email notifications (if configured)

## Troubleshooting

If you encounter issues:
1. Check logs for error messages
2. Verify daemon is running
3. Check network connectivity
4. See [Troubleshooting Guide](Troubleshooting.md) 