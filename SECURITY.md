# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅        |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, report privately:

1. Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/private-reporting-a-vulnerability) on this repository, **or**
2. Email the maintainer (see the GitHub profile for contact details).

Include: a description of the issue, steps to reproduce, affected endpoints/components, and any proof-of-concept details.

You can expect an initial response within 7 days. We will coordinate a fix and disclosure timeline with you.

## Security notes for operators

- Never commit real credentials — use `backend/.env` (gitignored) or your platform's secret manager.
- `JWT_SECRET` and `PRIVACY_SALT` must be cryptographically random in production (`openssl rand -hex 32`). The backend rejects known-weak defaults at startup.
- Server-side AI calls only: LLM API keys must never reach the frontend.
- `/metrics` is intentionally not exposed through the frontend proxy; scrape it from inside the network.
