# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for
receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

Please report (suspected) security vulnerabilities to **ryudg95@gmail.com**. You
will receive a response from us within 48 hours. If the issue is confirmed, we
will release a patch as soon as possible depending on complexity but
historically within a few days.

## Security Best Practices

### Database Security

- **Use dedicated database users** with minimal required permissions
- **Never use sa credentials** or administrative accounts in production
- **Restrict database access** to only necessary operations (SELECT, INSERT,
  UPDATE, DELETE)
- **Enable SSL/TLS encryption** for database connections when possible
- **Use connection pooling** with appropriate limits

### Credential Management

- **Never commit credentials** to version control
- **Use environment variables** for all sensitive configuration
- **Rotate credentials regularly** in production environments
- **Use strong passwords** with appropriate complexity requirements

### Network Security

- **Restrict network access** to database servers
- **Use firewalls** to limit database port access
- **Consider VPN or private networks** for database connections
- **Monitor connection attempts** and failed authentications

### Application Security

- **Validate all input parameters** to prevent SQL injection
- **Use parameterized queries** for all database operations
- **Implement rate limiting** for query execution
- **Log all database operations** for audit purposes
- **Regular security audits** of database access patterns

### Production Deployment

- **Use read-only connections** when possible
- **Implement query whitelisting** for production environments
- **Monitor and alert** on suspicious database activity
- **Regular backup and recovery testing**
- **Keep dependencies updated** and scan for vulnerabilities

## Security Configuration Guide

### Creating a Restricted SQL Server Login

```sql
-- Create a dedicated login for MCP server
CREATE LOGIN mcp_user WITH PASSWORD = 'StrongPassword123!';

-- Create user in target database
USE your_database;
CREATE USER mcp_user FOR LOGIN mcp_user;

-- Grant minimal required permissions
GRANT SELECT ON SCHEMA::dbo TO mcp_user;
-- Only grant additional permissions if absolutely necessary
-- GRANT INSERT ON SCHEMA::dbo TO mcp_user;
-- GRANT UPDATE ON SCHEMA::dbo TO mcp_user;
-- GRANT DELETE ON SCHEMA::dbo TO mcp_user;
```

### Environment Variable Security

```bash
# Use strong, unique passwords
DB_PASSWORD=ComplexPassword123!@#

# Enable encryption when possible
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

# Set appropriate timeouts
DB_CONNECTION_TIMEOUT=30000
DB_REQUEST_TIMEOUT=30000
```

## Security Contact

For security-related questions or concerns, please contact:

- Email: ryudg95@gmail.com
- Security Advisory: Check GitHub Security Advisories

⚠️ **IMPORTANT**: Always follow the principle of least privilege when
configuring database access.
