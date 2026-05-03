# Traefik HTTPS Design

## Goal

Enable trusted HTTPS for the Chirper Google Cloud VM deployment while keeping the VM ready to host multiple applications and domains behind one shared ingress controller.

## Current State

- DNS for `chirper.bobbycrimson.com` and `api.chirper.bobbycrimson.com` points to `34.171.220.142`.
- HTTP routing through k3s Traefik works.
- Port `443` is open and Traefik answers HTTPS, but it serves an untrusted/default certificate.
- The Chirper server Helm values still publish HTTP URLs and disable secure session cookies.
- k3s manages Traefik through the `helm.cattle.io/v1` `HelmChart` resource in `kube-system`.

## Approach

Configure HTTPS once at the shared k3s Traefik edge. Traefik will use Let's Encrypt HTTP-01 challenges with the ACME account email `robertorojas87@gmail.com`, store ACME state in a persistent volume, and redirect HTTP traffic to HTTPS.

Chirper will keep using normal Kubernetes `Ingress` resources, but its server values will request the Traefik certificate resolver and TLS routing for the web and BFF hosts. Future applications on the same VM can use their own namespaces and host-based ingresses with the same Traefik resolver.

## Repository Changes

- Add a server Traefik HTTPS manifest that creates `kube-system/traefik` `HelmChartConfig`.
- Apply that manifest from the server deploy script before Helm upgrades for app services.
- Update server `web` values:
  - `NEXT_PUBLIC_BFF_URL=https://api.chirper.bobbycrimson.com`
  - `SESSION_COOKIE_SECURE=true`
  - Traefik TLS/certresolver ingress annotations.
- Update server `bff` values:
  - `BFF_PUBLIC_URL=https://api.chirper.bobbycrimson.com`
  - Traefik TLS/certresolver ingress annotations.
- Update server deploy output to print HTTPS URLs.

## Verification

- Render the Helm templates for `web` and `bff` and confirm the HTTPS annotations and URLs.
- Apply the server deployment for the affected services.
- Confirm Traefik rolls out and keeps a persistent ACME volume.
- Verify:
  - `https://chirper.bobbycrimson.com` succeeds with a trusted certificate.
  - `https://api.chirper.bobbycrimson.com` succeeds with a trusted certificate, even if `/` returns the expected API 404.
  - `http://chirper.bobbycrimson.com` redirects to HTTPS.
  - `http://api.chirper.bobbycrimson.com` redirects to HTTPS.

## Out of Scope

- Installing cert-manager.
- Moving to a GCP HTTPS load balancer.
- Changing local kind HTTPS behavior.
- Creating separate deployments for future apps.
