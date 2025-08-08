# Troubleshooting Guide

This guide helps you solve common issues with Conceal Node Guardian.

## Common Issues

### Guardian Won't Start

**Solutions:**
1. **Check Configuration**
   ```bash
   # Node.js method
   node index.js --setup
   
   # Binary method
   ./guardian-linux64 --setup
   ```

2. **Check File Permissions**
   ```bash
   # Linux/macOS
   chmod +x guardian-linux64
   ```

3. **Check Dependencies**
   ```bash
   # Node.js method, within your conceal-guardian folder
   sudo npm install
   ```

### Daemon Won't Start

**Solutions:**
1. **Check Daemon Path**
   ```bash
   # Test daemon manually
   /path/to/conceald --version
   ```


### Service Won't Start

**Solutions:**
1. **Check Service Status**
   ```bash
   sudo systemctl status ccx-guardian
   sudo journalctl -u ccx-guardian -n 50
   ```

2. **Reinstall Service**
   ```bash
   # Binary method
   sudo ./guardian-linux64 --service remove
   sudo ./guardian-linux64 --service install
   sudo systemctl daemon-reload
   sudo systemctl start ccx-guardian
   ```

## Network Issues

### Network Connectivity

**Symptoms:**
- "Connection refused" errors
- Pool notification failures
- Can't access web interface

**Solutions:**
1. **Check Firewall Rules**
   ```bash
   # Check if ports 16000 and 8080 are open
   sudo ufw status
   sudo iptables -L
   
   # Allow ports if needed
   sudo ufw allow 16000/tcp
   sudo ufw allow 8080/tcp
   ```

2. **Check Router Port Forwarding**
   - Access your router admin panel
   - Check port forwarding for port 16000
   - Ensure port 16000 is forwarded to your guardian machine

3. **Test Connectivity**
   ```bash
   # Test local connectivity
   curl http://localhost:8080/getInfo
   
   # Test external connectivity
   curl http://your-external-ip:8080/getInfo
   ```

### Pool Notification Failures

**Solutions:**
1. **Check Network Connectivity**
   ```bash
   # Test DNS resolution
   nslookup conceal.network
   
   # Test HTTP connectivity
   curl -I https://conceal.network
   ```

2. **Check Pool URL**
   ```json
   {
     "pool": {
       "notify": {
         "url": "https://explorer.conceal.network/pool/update"
       }
     }
   }
   ```


## Getting Help


1. **GitHub Issues**
   - [Create a new issue](https://github.com/ConcealNetwork/conceal-guardian/issues/new)
   - Include system information and logs
   - Describe the problem clearly

2. **Discord Community**
   - Join [Conceal Network Discord](https://discord.gg/conceal)
   - Ask in the #smart-nodes channel
   - Share logs and error messages

3. **Documentation**
   - Review [Installation Guide](Installation.md)
   - Check [Usage Guide](Usage.md) 