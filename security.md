# Security

## Security Scan Report

Relia Monitor undergoes regular security scanning to ensure the safety and integrity of the codebase. 

**Latest Security Scan Report:** [https://tryrelia.com/sample-project/relia_BZlTP2ceRsG0oeTdW5N7spXLMT58FWbzKGkRkmZ-9peKsqHgO8PvGQY-TfyTD51D](https://tryrelia.com/sample-project/relia_BZlTP2ceRsG0oeTdW5N7spXLMT58FWbzKGkRkmZ-9peKsqHgO8PvGQY-TfyTD51D)

---

## Browser Storage Security Considerations

This project stores client-side data using browser storage mechanisms (`IndexedDB` and `localStorage`).

### Important Security Notes

- **API Keys Storage:** API keys are stored only in `localStorage` on your device and are never transmitted to or stored on any external servers
- **Client-Side Data:** All conversations and settings are stored only in IndexedDB on your device
- **No Backend Persistence:** The Next.js API route is a stateless proxy — it does not log, persist, or forward API keys or conversation data
- **Browser Storage Access:** Browser storage is accessible from client-side JavaScript, and sensitive data (API keys) may be exposed in the event of:
  - Cross-Site Scripting (XSS) vulnerabilities
  - Compromised browser extensions
  - Compromised browser environments

### Recommended Usage Scenarios

The current implementation is primarily intended for:

- **Development environments** — local testing and development
- **Personal use** — individual machines with secure browsers
- **Self-hosted deployments** — where you control the entire infrastructure

### Security Best Practices

When using Relia Monitor:

1. **Use in Secure Environments** — Use on trusted, regularly updated machines with up-to-date browsers
2. **Keep Dependencies Updated** — Regularly update Node.js and npm dependencies to receive security patches
3. **Monitor Browser Security** — Keep your browser updated and review installed extensions
4. **Rotate API Keys** — Periodically rotate your API keys, especially if running on shared systems
5. **Use HTTPS** — If self-hosting, always use HTTPS for secure transmission of data
6. **Avoid Public Networks** — Do not use on public WiFi networks without a VPN

### Caution in Shared Environments

**Do not use in shared or public environments** where multiple users have access to the same browser or device, as API keys could be exposed through browser history, cache, or IndexedDB data.

---

## Reporting Security Issues

If you discover a security vulnerability, please email **tryrelia1@gmail.com** with details of the vulnerability. Do not open a public issue for security vulnerabilities.

Please include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if applicable)

We take security seriously and will acknowledge receipt of your report within 48 hours and work toward a resolution as quickly as possible.

---

## Security Headers

When self-hosting Relia Monitor, consider implementing the following security headers:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## Third-Party Dependencies

Relia Monitor's security also depends on the security of its dependencies. We regularly monitor dependencies for known vulnerabilities using:

- npm audit
- Dependabot
- SNYK security scanning

Keep your dependencies updated by running:

```bash
npm update
npm audit fix
```

---

## Compliance

- **Data Privacy:** All data stays on your device; no tracking or analytics are sent to external servers
- **GDPR:** By not collecting or storing personal data on external servers, GDPR compliance is delegated to your infrastructure
- **No Telemetry:** The application does not include any telemetry or usage tracking
