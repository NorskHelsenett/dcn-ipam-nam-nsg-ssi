# IPAM-NAM-NSG-SSI Helm Chart

Network automation sync for IPAM to NAM

## Quick Start

```bash
helm install ipam-nam-nsg-ssi-prod ./charts/dcn-ipam-nam-nsg-ssi \
  -f charts/dcn-ipam-nam-nsg-ssi/env/prod.yaml \
  --set credentials.namToken="your-nam-token" \
  --set credentials.splunkToken="your-splunk-token" \
  --set credentials.ipamToken="your-ipam-token"
```

## Mandatory Parameters

| Parameter                 | Description                  | Values             |
| ------------------------- | ---------------------------- | ------------------ |
| `credentials.namToken`    | NAM API authentication token | String (JWT token) |
| `credentials.splunkToken` | Splunk HEC token             | String (UUID)      |

## All Configurable Variables

### Basic Configuration

| Variable       | Description          | Default            |
| -------------- | -------------------- | ------------------ |
| `namespace`    | Target namespace     | `ssi`              |
| `nameOverride` | Override chart name  | `""`               |
| `workspace`    | Workspace identifier | `ipam-nam-nsg-ssi` |

### Image Configuration

| Variable           | Description                | Default                                                   |
| ------------------ | -------------------------- | --------------------------------------------------------- |
| `image.repository` | Container image repository | `ncr.sky.nhn.no/ghcr/norskhelsenett/dcn-ipam-nam-nsg-ssi` |
| `image.tag`        | Image tag                  | `latest`                                                  |
| `image.pullPolicy` | Pull policy                | `Always`                                                  |

### CronJob Configuration

| Variable                     | Description                 | Default        |
| ---------------------------- | --------------------------- | -------------- |
| `schedule`                   | Cron schedule expression    | `*/15 * * * *` |
| `successfulJobsHistoryLimit` | Successful jobs to keep     | `3`            |
| `failedJobsHistoryLimit`     | Failed jobs to keep         | `3`            |
| `allowConcurrent`            | Allow concurrent executions | `false`        |

### Resource Limits

| Variable            | Description    | Default  |
| ------------------- | -------------- | -------- |
| `limits.memory.min` | Memory request | `384Mi`  |
| `limits.memory.max` | Memory limit   | `1152Mi` |
| `limits.cpu.min`    | CPU request    | `300m`   |
| `limits.cpu.max`    | CPU limit      | `600m`   |

### Application Settings

| Variable                  | Description                 | Default      | Values                                  |
| ------------------------- | --------------------------- | ------------ | --------------------------------------- |
| `settings.infrastructure` | Infrastructure environment  | `prod`       | `prod`, `qa`, `dev`                     |
| `settings.environment`    | Runtime environment         | `production` | `production`, `development`             |
| `settings.interval`       | Sync interval in seconds    | `300`        | Integer                                 |
| `settings.timeout`        | API timeout in milliseconds | `3000`       | Integer                                 |
| `settings.continuousMode` | CRON_MODE setting           | `false`      | `true` (continuous), `false` (one-shot) |

### Integration Settings

| Variable                    | Description              | Default                     |
| --------------------------- | ------------------------ | --------------------------- |
| `integration.nam.url`       | NAM API endpoint URL     | `""`                        |
| `integration.ipam.url`      | IPAM API endpoint URL    | `""`                        |
| `integration.splunk.url`    | Splunk HEC endpoint      | `https://splunk-hec.nhn.no` |
| `integration.splunk.index`  | Splunk index name        | `dc_nam`                    |
| `integration.splunk.source` | Splunk source identifier | `ipam-nam-nsg-ssi:prod`     |

### Credentials (Mandatory)

| Variable                  | Description               | Default |
| ------------------------- | ------------------------- | ------- |
| `credentials.namToken`    | NAM authentication token  | `""`    |
| `credentials.splunkToken` | Splunk HEC token          | `""`    |
| `credentials.ipamToken`   | IPAM authentication token | `""`    |

## Usage Examples

### Production Deployment

```bash
helm install ipam-nam-nsg-ssi-prod ./charts/dcn-ipam-nam-nsg-ssi \
  -f charts/dcn-ipam-nam-nsg-ssi/env/prod.yaml \
  --set credentials.namToken="prod-token-here" \
  --set credentials.splunkToken="prod-splunk-token"
  --set credentials.ipamToken="your-ipam-token"
```

Creates CronJob: `ipam-nam-nsg-ssi-prod` in namespace `ssi`

### QA Deployment

```bash
helm install ipam-nam-nsg-ssi-qa ./charts/dcn-ipam-nam-nsg-ssi \
  -f charts/dcn-ipam-nam-nsg-ssi/env/qa.yaml \
  --set credentials.namToken="qa-token-here" \
  --set credentials.splunkToken="qa-splunk-token"
  --set credentials.ipamToken="your-ipam-token"
```

Creates CronJob: `ipam-nam-nsg-ssi-qa` in namespace `ssi`

### Test Deployment

```bash
helm install ipam-nam-nsg-ssi-test ./charts/dcn-ipam-nam-nsg-ssi \
  -f charts/dcn-ipam-nam-nsg-ssi/env/test.yaml \
  --set credentials.namToken="test-token-here" \
  --set credentials.splunkToken="test-splunk-token"
  --set credentials.ipamToken="your-ipam-token"
```

Creates CronJob: `ipam-nam-nsg-ssi-test` in namespace `ssi`

### Custom Schedule

```bash
helm install ipam-nam-nsg-ssi-prod ./charts/dcn-ipam-nam-nsg-ssi \
  -f charts/dcn-ipam-nam-nsg-ssi/env/prod.yaml \
  --set schedule="0 */2 * * *" \
  --set credentials.namToken="token" \
  --set credentials.splunkToken="splunk-token"
  --set credentials.ipamToken="your-ipam-token"
```

## Environment-Specific Values

Pre-configured environment files are available:

- `env/prod.yaml` - Production settings (schedule: \*/15 min, resources:
  384-1152Mi/300-600m)
- `env/qa.yaml` - QA settings (schedule: \*/15 min, resources:
  384-1152Mi/300-600m)
- `env/test.yaml` - Test/Development settings (schedule: \*/5 min, resources:
  384-1152Mi/300-600m, with test integrator)

## Commands

```bash
# Install
helm install ipam-nam-nsg-ssi-{infrastructure} ./charts/dcn-ipam-nam-nsg-ssi \
  -f charts/dcn-ipam-nam-nsg-ssi/env/{infrastructure}.yaml \
  --set credentials.namToken="token" \
  --set credentials.splunkToken="splunk-token"
  --set credentials.ipamToken="your-ipam-token"

# Upgrade
helm upgrade ipam-nam-nsg-ssi-{infrastructure} ./charts/dcn-ipam-nam-nsg-ssi \
  -f charts/dcn-ipam-nam-nsg-ssi/env/{infrastructure}.yaml

# Uninstall
helm uninstall ipam-nam-nsg-ssi-{infrastructure}

# Template (dry-run)
helm template ipam-nam-nsg-ssi-test ./charts/dcn-ipam-nam-nsg-ssi \
  -f charts/dcn-ipam-nam-nsg-ssi/env/test.yaml \
  --set credentials.namToken="test" \
  --set credentials.splunkToken="test"
  --set credentials.ipamToken="your-ipam-token"

# Validate
helm lint ./charts/dcn-ipam-nam-nsg-ssi

# List releases
helm list -A
```

## Argo CD Deployment

See `examples/argo-ipam-nam-nsg-ssi.yaml.example` for a complete Argo CD
Application manifest.

### Example Argo CD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: ipam-nam-nsg-ssi-qa #ipam-nam-nsg-ssi-<environment>
  namespace: argocd

spec:
  destination:
    namespace: ssi
    server: https://kubernetes.default.svc
  project: default
  source:
    chart: dcn-ipam-nam-nsg-ssi
    helm:
      valueFiles:
        - values.yaml
        - env/qa.yaml #test, qa, prod
      parameters:
        - name: settings.continuousMode
          value: "true" # True for continuous mode (Pod), false for one shot mode (CronJob)
        - name: settings.interval
          value: "300" #Seconds for continuous mode (Pod)
        - name: schedule
          value: "*/5 * * * *" # Used for one shot mode (CronJob)
        - name: credentials.namToken
          value: "<NAM_TOKEN_HERE>"
        - name: credentials.splunkToken
          value: "<SPLUNK_TOKEN_HERE>"
        - name: credentials.ipamToken
          value: "<IPAM_TOKEN_HERE>"
    repoURL: ncr.sky.nhn.no/ghcr/norskhelsenett/helm
    targetRevision: "*"
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

### Deploy with Argo CD CLI

```bash
# Production
argocd app create ipam-nam-nsg-ssi-prod \
  --repo ncr.sky.nhn.no/ghcr/norskhelsenett/helm \
  --helm-chart dcn-ipam-nam-nsg-ssi \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace ssi \
  --values env/prod.yaml \
  --helm-set credentials.namToken="your-token" \
  --helm-set credentials.splunkToken="your-splunk-token" \
  --sync-policy automated \
  --sync-option CreateNamespace=true

# QA 
argocd app create ipam-nam-nsg-ssi-qa \
  --repo ncr.sky.nhn.no/ghcr/norskhelsenett/helm \
  --helm-chart dcn-ipam-nam-nsg-ssi \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace ssi \
  --values env/qa.yaml \
  --helm-set credentials.namToken="your-token" \
  --helm-set credentials.splunkToken="your-splunk-token" \
  --sync-policy automated \
  --sync-option CreateNamespace=true
```

## Notes

- `continuousMode=false` creates one-shot CronJob execution (default)
- `continuousMode=true` enables continuous mode (not recommended for CronJobs)
- CronJob naming pattern: `ipam-nam-nsg-ssi-{infrastructure}`
- ConfigMap naming pattern: `ipam-nam-nsg-ssi-{infrastructure}-config`
- Secret naming pattern: `ipam-nam-nsg-ssi-{infrastructure}-secrets`
- Security context runs as non-root user (UID/GID 1993)
- Read-only root filesystem with writable logs volume
