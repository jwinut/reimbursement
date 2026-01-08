# Security Policy

## Supported Versions

The following versions of the Expense Reimbursement Application are currently supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Use GitHub's private vulnerability reporting feature:
   - Go to the repository's "Security" tab
   - Click "Report a vulnerability"
   - Provide detailed information about the vulnerability

### What to Include

- Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any suggested fixes (optional)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days for critical issues

### What to Expect

- We will acknowledge receipt of your report
- We will investigate and validate the issue
- We will work on a fix and coordinate disclosure
- We will credit you in the security advisory (unless you prefer anonymity)

## Security Measures

This application implements the following security measures:

- **Authentication**: LINE OAuth with server-side validation via NextAuth.js
- **Authorization**: Role-based access control (Employee/Manager)
- **CSRF Protection**: Token-based CSRF protection on state-changing operations
- **Input Validation**: Zod schema validation on all inputs
- **Database**: Prisma ORM with parameterized queries (SQL injection prevention)
- **Dependencies**: Automated security scanning via Dependabot and npm audit

## Security Best Practices for Contributors

- Never commit secrets or credentials
- Use environment variables for sensitive configuration
- Validate all user inputs
- Use parameterized queries (handled by Prisma)
- Follow the principle of least privilege
- Keep dependencies up to date
