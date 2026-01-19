# IPAM-NAM-NSG-SSI

Synchronization service that manages IP address objects between IPAM and NAM.

## Overview

IPAM-NAM-NSG-SSI automatically syncs IP prefixes from IPAM to NAM and creates
and updates nsg-consumer-* and nsg-environment-* groups

- **NAM**: Creates security groups based on domains and environments from IPAM
- **IPAM**: Fetches prefixes from Netbox
- **Automated sync**: Runs on configurable intervals
- **Flexible execution**: One-shot mode for CronJobs or continuous mode for
  long-running containers

## Requirements

- Deno runtime
- Access to NAM (Network Architecture Management) API
- Netbox with API access
- Splunk HEC endpoint (optional, for logging)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd dcn-ipam-nam-nsg-ssi

# Copy example configuration files
cp examples/config.yaml.example config/config.yaml
cp examples/secrets.yaml.example secrets/secrets.yaml

# Edit configuration files with your actual values
# config/config.yaml - Update NAM_URL, SPLUNK_URL, etc.
# secrets/secrets.yaml - Add your NAM_TOKEN and SPLUNK_TOKEN

# Install dependencies (handled by Deno automatically)
deno cache main.ts
```

## Configuration

Example configuration files are provided in the `examples/` folder. Copy and
customize them:

```bash
cp examples/config.yaml.example config/config.yaml
cp examples/secrets.yaml.example secrets/secrets.yaml
```

### config.yaml

Configuration file for non-sensitive settings:

```yaml
---
# Environment and SSI settings
DENO_ENV: "production" # Runtime environment: development, production
CRON_MODE: "false" # Execution mode: "false" or undefined = one-shot (CronJob), "true" = continuous (Pod)
SSI_NAME: "IPAM-NAM-NSG-SSI" # Service name
SSI_INTERVAL: "300" # Sync interval in seconds (used in continuous mode)
REQUEST_TIMEOUT: "10000" # API request timeout in milliseconds

# NAM (Network Automation Manager) settings
NAM_URL: "https://nam.example.com/api" # NAM API endpoint URL

# Splunk logging settings
SPLUNK_URL: "https://splunk.example.com" # Splunk HEC endpoint
SPLUNK_INDEX: "network_automation" # Target Splunk index
SPLUNK_SOURCE: "ipam-nam-nsg-ssi:qa" # Log source identifier
SPLUNK_SOURCE_TYPE: "ipam-nam-nsg-ssi" # Source type
```

### secrets.yaml

Sensitive credentials (keep secure):

```yaml
---
NAM_TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
SPLUNK_TOKEN: "12345678-1234-1234-1234-123456789abc"
IPAM_TOKEN: "eyJhbGciOiJIUzI1NiIsInR5cCIasdfXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
```

### Environment Variables

You can also set configuration via environment variables:

```bash
export DENO_ENV="production"
export CRON_MODE="false"
export SSI_NAME="IPAM-NAM-NSG-SSI"
export SSI_INTERVAL="300"
export REQUEST_TIMEOUT="10000"
export NAM_URL="https://nam.example.com/api"
export NAM_TOKEN="your-jwt-token-here"
export SPLUNK_URL="https://splunk.example.com"
export SPLUNK_TOKEN="your-splunk-hec-token"
export SPLUNK_INDEX="network_automation"
export SPLUNK_SOURCE="ipam-nam-nsg-ssi"
export SPLUNK_SOURCE_TYPE="ipam-nam-nsg-ssi"
```

## Usage

### Run the service

```bash
# Development mode (with auto-reload on file changes)
deno task dev

# Production mode
deno task run

# One-shot mode (runs once and exits - for CronJobs, default if CRON_MODE not set)
export CRON_MODE="false"
deno task run

# Or simply omit CRON_MODE for one-shot mode
deno task run

# Continuous mode (runs with interval scheduling)
export CRON_MODE="true"
deno task run

# Specify custom config paths
export CONFIG_PATH="/path/to/config.yaml"
export SECRETS_PATH="/path/to/secrets.yaml"
deno task dev   # for development
deno task run   # for production
```

### Execution Modes

- **One-shot mode** (default, `CRON_MODE="false"` or undefined): Executes sync
  once and exits with code 0 on success or 1 on error. Ideal for Kubernetes
  CronJobs.
- **Continuous mode** (`CRON_MODE="true"`): Runs continuously with
  interval-based scheduling. Ideal for long-running Pods.

### Run tests

```bash
deno task test
```

## Project Structure

```
dcn-ipam-nam-nsg-ssi/
├── main.ts                   # Application entry point
├── main_test.ts              # Test file
├── deno.json                 # Deno configuration
├── Dockerfile                # Container image definition
├── docker-compose.yml        # Docker Compose configuration
├── README.md                 # This file
├── config/                   # Configuration directory
│   └── config.yaml           # Main config (create from example)
├── secrets/                  # Secrets directory
│   └── secrets.yaml          # Secrets file (create from example)
├── examples/                 # Example configuration templates
│   ├── config.yaml.example   # Config template with demo values
│   ├── secrets.yaml.example  # Secrets template with demo tokens
│   └── argo-ipam-nam-nsg-ssi.yaml.example # Argo CD Application example
├── logs/                     # Log files directory (auto-created)
├── charts/                   # Helm charts
│   └── dcn-ipam-nam-nsg-ssi/ # Production Helm chart
│       ├── Chart.yaml        # Chart metadata (v0.9.24)
│       ├── README.md         # Helm chart documentation
│       ├── values.yaml       # Default values
│       ├── env/              # Environment-specific values
│       │   ├── prod.yaml     # Production configuration
│       │   ├── qa.yaml       # QA configuration
│       │   └── test.yaml     # Test configuration
│       └── templates/        # Kubernetes resource templates
│           ├── _helpers.tpl  # Template helpers
│           ├── configmap.yaml # ConfigMap template
│           ├── credentials.yaml # Secret template
│           └── cronjob.yaml  # CronJob template
├── kubernetes/               # Basic Kubernetes manifests (alternative to Helm)
│   ├── configmap.yaml        # ConfigMap for mapping config.yaml
│   ├── secret.yaml           # Secret for mapping secrets.yaml
│   └── ipam-nam-nsg-ssi.yaml # Pod deployment
└── ssi/                      # Source code
    ├── ssi.worker.ts         # Main orchestration worker
    ├── ssi.utils.ts          # Utility functions
    ├── loggers/
        └── logger.ts         # Winston logger configuration
```

## Deployment

### Helm Chart (Recommended)

The recommended deployment method is using the Helm chart with Argo CD or
standard Helm.

**Quick Start:**

```bash
# Install using Helm
helm install ipam-nam-nsg-ssi-prod ./charts/dcn-ipam-nam-nsg-ssi \
  -f charts/dcn-ipam-nam-nsg-ssi/env/prod.yaml \
  --set credentials.namToken="your-nam-token" \
  --set credentials.splunkToken="your-splunk-token"
  --set credentials.ipamToken="your-ipam-token"
```

**Features:**

- Environment-specific configurations (prod, qa, test)
- CronJob-based deployment with configurable schedules
- Argo CD compatible with automated sync
- See `charts/ipam-nam-nsg-ssi/README.md` for complete documentation

**Argo CD Deployment:**

```bash
# Apply Argo CD Application manifest
kubectl apply -f examples/argo-ipam-nam-nsg-ssi.yaml.example
```

For detailed Helm chart usage, configuration options, and examples, see:

- **Helm Chart README**: `charts/dcn-ipam-nam-nsg-ssi/README.md`
- **Argo CD Example**: `examples/argo-ipam-nam-nsg-ssi.yaml.example`

### Docker

Build and run using Docker:

```bash
# Copy example files and configure
cp examples/config.yaml.example config/config.yaml
cp examples/secrets.yaml.example secrets/secrets.yaml
# Edit config/config.yaml and secrets/secrets.yaml with your values

# Build the image
docker build -t ipam-nam-nsg-ssi:latest .

# Prepare configuration files with correct permissions
mkdir -p config secrets
chmod 755 config secrets
chmod 644 config/config.yaml secrets/secrets.yaml

# Set ownership for deno user (UID:GID 1993:1993) if needed
sudo chown 1993:1993 config/config.yaml secrets/secrets.yaml

# Run with docker-compose
docker-compose up -d

# Run manually with custom config/secrets and volumes
docker run -d \
  --name ipam-nam-nsg-ssi \
  --user 1993:1993 \
  -v $(pwd)/config/config.yaml:/app/config/config.yaml:ro \
  -v $(pwd)/secrets/secrets.yaml:/app/secrets/secrets.yaml:ro \
  ipam-nam-nsg-ssi:latest
```

**Important: File Permissions**

The container runs as user `deno` (UID:GID 1993:1993) for security. Ensure
proper permissions:

```bash
# Required permissions for mounted volumes:
# - config.yaml: Must be readable by UID 1993 (644 or 444)
# - secrets.yaml: Must be readable by UID 1993 (644 or 400 recommended)

# Set ownership to deno user (recommended)
sudo chown 1993:1993 config/config.yaml secrets/secrets.yaml

# Or make readable by all (less secure for secrets)
chmod 644 config/config.yaml
chmod 644 secrets/secrets.yaml  # or 400 for more security
```

**Docker Compose Configuration:**

The `docker-compose.yml` includes:

- User specification: `user: "1993:1993"`
- Volume mounts:
  - `./config/config.yaml:/app/config/config.yaml:ro` - Config (read-only)
  - `./secrets/secrets.yaml:/app/secrets/secrets.yaml:ro` - Secrets (read-only)
- Environment variables for config paths

**Note:** Logs are written inside the container and not persisted to host. Use
`docker logs` to view output.

**Dockerfile Features:**

- Based on official Deno image
- Runs tests during build to validate configuration
- Includes NHN internal CA chain for SSL verification
- Runs as non-root user (deno:1993)
- Cleans up secrets after build for security
- Configurable paths via `CONFIG_PATH` and `SECRETS_PATH` environment variables

### Kubernetes (Basic Manifests)

For simple deployments without Helm, basic Kubernetes manifests are available:

```bash
# Create namespace
kubectl create namespace ssi

# Apply configuration
kubectl apply -f kubernetes/configmap.yaml
kubectl apply -f kubernetes/secret.yaml
kubectl apply -f kubernetes/ipam-nam-nsg-ssi.yaml

# Check status
kubectl get pods -n ssi
kubectl logs -n ssi ipam-nam-nsg-ssi

# Update configuration
kubectl edit configmap ipam-nam-nsg-ssi-config -n ssi
kubectl delete pod ipam-nam-nsg-ssi -n ssi  # Restart pod
```

**Note:** For production deployments, use the Helm chart instead for better
configuration management and multi-environment support.

**Deployment Options:**

1. **CronJob** (default): Set `CRON_MODE: "false"` or omit it in ConfigMap,
   deploy as a Kubernetes CronJob for scheduled one-shot executions
2. **Long-running Pod**: Set `CRON_MODE: "true"` in ConfigMap for continuous
   execution with interval-based scheduling

**Kubernetes Resources:**

- **ConfigMap** (`configmap.yaml`): Non-sensitive configuration
- **Secret** (`secret.yaml`): Sensitive credentials (NAM_TOKEN, SPLUNK_TOKEN)
- **Pod** (`ipam-nam-nsg-ssi.yaml`): Main application deployment

**Security Features:**

- Read-only root filesystem
- Runs as non-root user (1993:1993)
- No privilege escalation
- Minimal capabilities (all dropped)
- Runtime security profile enabled
- Resource limits enforced (128-384Mi memory, 100-300m CPU)
- EmptyDir volume for logs (50Mi limit) - logs stored in container, not
  persisted

### Configuration Paths

The application looks for configuration files at:

- **Default Local**: `./config/config.yaml` and `./secrets/secrets.yaml`
- **Docker/Kubernetes**:
  - Config: `/app/config/config.yaml` (via `CONFIG_PATH` env var)
  - Secrets: `/app/secrets/secrets.yaml` (via `SECRETS_PATH` env var)

**Quick Start:**

```bash
# Copy example templates
cp examples/config.yaml.example config/config.yaml
cp examples/secrets.yaml.example secrets/secrets.yaml

# Edit with your actual values
nano config/config.yaml
nano secrets/secrets.yaml
```

Set custom paths using environment variables:

```bash
export CONFIG_PATH="/custom/path/config.yaml"
export SECRETS_PATH="/custom/path/secrets.yaml"
```

## Troubleshooting

### Permission Denied Errors

If you encounter permission errors when running with Docker:

```bash
# Error: Cannot read config.yaml or secrets.yaml
# Solution: Ensure files are readable
chmod 644 config/config.yaml secrets/secrets.yaml
# OR set ownership
sudo chown 1993:1993 config/config.yaml secrets/secrets.yaml

# Verify permissions
ls -la config/ secrets/
# Expected output:
# -rw-r--r-- 1 1993 1993 ... config.yaml
# -rw-r--r-- 1 1993 1993 ... secrets.yaml

# Check container user
docker exec ipam-nam-nsg-ssi id
# Should output: uid=1993(deno) gid=1993(deno)

# View logs (logs are stored inside container)
docker logs ipam-nam-nsg-ssi
docker logs -f ipam-nam-nsg-ssi  # Follow logs in real-time
```

### Docker Volume Issues

```bash
# If volumes aren't mounting correctly:
# 1. Check absolute paths
docker inspect ipam-nam-nsg-ssi | grep -A 10 Mounts

# 2. Verify files exist before starting container
ls -la config/config.yaml secrets/secrets.yaml

# 3. Remove and recreate container
docker-compose down
docker-compose up -d

# 4. Check logs for specific errors
docker logs ipam-nam-nsg-ssi
```

### Kubernetes Permission Issues

```bash
# Logs show permission errors:
# - Verify securityContext in ipam-nam-nsg-ssi.yaml
# - Ensure ConfigMap and Secret are properly mounted
kubectl describe pod ipam-nam-nsg-ssi -n ssi
kubectl logs ipam-nam-nsg-ssi -n ssi
```

## How It Works

1. **Initialization**: Worker reads configuration and connects to NAM API
2. **Fetch prefixes**: Retrieves prefixes from ipam based on domains and
   environments
3. **Deploy to NAM**:
   - Creates missing security groups
   - Updates security groups with new/removed members
4. **Repeat**: Runs continuously at configured interval

## Logging

Logs are written to multiple destinations based on environment:

**Production/Container Mode:**

- **Console**: Real-time output (stdout/stderr)
- **Splunk HEC**: Real-time forwarding to Splunk (if configured)

**Development Mode (DENO_ENV=development):**

- **Console**: Real-time output
- **File logs**: Daily rotating logs in `logs/` directory
  - `combined.log`: All log levels
  - `warn.log`: Warnings and above
  - `error.log`: Errors only
  - `debug.log`: Debug information only
  - `splunk.log`: Splunk-formatted logs (for testing HEC locally)
- **Splunk HEC**: Real-time forwarding to Splunk (if configured)

**Note:** File logging is automatically disabled in production to avoid
container filesystem issues. In Docker/Kubernetes, use `docker logs` or
`kubectl logs` to view output.

**Log Configuration:**

```yaml
# Optional environment variables for file logging (development only)
FILELOG_DIR: "logs" # Log directory path
FILELOG_SIZE: "50m" # Max size per log file (50 megabytes)
FILELOG_DAYS: "30d" # Retention period (30 days)
```

## Development

### Development Mode

Set `DENO_ENV=development` in `config/config.yaml` to:

- Enable debug logging
- Disable SSL certificate verification
- Include full error stack traces in logs

````
### Getting Started

1. **Copy example files:**

   ```bash
   cp examples/config.yaml.example config/config.yaml
   cp examples/secrets.yaml.example secrets/secrets.yaml
````

2. **Update configuration:**

   - Edit `config/config.yaml` with your NAM URL, Splunk settings, etc.
   - Edit `secrets/secrets.yaml` with your actual API tokens

3. **Run locally:**

   ```bash
   deno task dev  # Development mode with auto-reload
   deno task run  # Production mode
   ```

4. **Run with Docker:**
   ```bash
   # Set proper permissions
   sudo chown 1993:1993 config/config.yaml secrets/secrets.yaml
   # Start service
   docker-compose up -d
   # View logs
   docker logs -f ipam-nam-nsg-ssi
   ```

## License

Copyright 2025 Norsk Helsenett SF

Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed
under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
CONDITIONS OF ANY KIND, either express or implied. See the License for the
specific language governing permissions and limitations under the License.

## Support

For issues, bug reports, and feature requests:

- **GitHub Issues**:
  [NorskHelsenett/dcn-ipam-nam-nsg-ssi/issues](https://github.com/NorskHelsenett/dcn-ipam-nam-nsg-ssi/issues)
- **Website**: [https://www.nhn.no](https://www.nhn.no)
