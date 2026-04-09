# Threat model

## System purpose
Conceal Node Guardian monitors the `conceald` daemon, detects errors or stalled block progress, restarts the daemon when needed, and sends notifications through Discord webhooks, e-mail, or both. It can also connect to a monitoring pool or remote nodes for infrastructure monitoring and fee-listing use cases.

## Sensitive assets
- Discord webhook URLs and e-mail configuration
- Process control over `conceald` start/stop/restart behavior
- Node health, error, and block-height monitoring state
- Local config files, logs, and runtime settings
- Remote monitoring or pool connectivity configuration
- HTTP status service exposure on port 8080

## Entry points
- `conceald` stdout/stderr and daemon state observations
- Execa-based child-process launch, restart, and signal handling
- Express HTTP routes on port 8080
- Environment variables and local configuration files
- Outbound Discord webhook and e-mail notification destinations
- Remote node or pool monitoring connections
- Monitoring timers, loops, and restart thresholds

## Trust boundaries
- Untrusted network clients -> local Express service
- Guardian logic -> child-process control of `conceald`
- Local config/env -> runtime behavior
- Guardian -> Discord/e-mail providers
- Guardian -> remote monitoring peers
- Daemon output/state -> restart decisions

## Primary security concerns
- Exposure of the unauthenticated Express status endpoint if port 8080 is publicly reachable
- Leakage of Discord webhook URLs or e-mail credentials in config, logs, or commits
- Restart loops or denial-of-service caused by unsafe health or restart logic
- Unsafe handling of untrusted data from remote monitoring peers
- Overexposure of operational state through status endpoints or notifications