# AWS App Runner Compatibility Reference

## Supported Python Runtimes (as of January 2025)

✅ **Supported:**
- Python 3.7.x (3.7.16, 3.7.15, 3.7.10)
- Python 3.8.x ⭐ (Currently Used) - (3.8.20, 3.8.16, 3.8.15)
- Python 3.11.x (3.11.12, 3.11.11, etc.)

❌ **NOT Supported:**
- Python 3.9
- Python 3.10
- Python 3.12
- Python 3.13

## Current Configuration

**Runtime Version:** `3.8`
**Runtime Base:** Amazon Linux 2

## Key App Runner Requirements

1. **YAML Field Names:** Must use hyphens (`pre-build`, `post-build`, not underscores)
2. **Environment Variables:** Must be defined in `apprunner.yaml` (not auto-loaded from `.env`)
3. **Python Compatibility:** Dependencies must be compatible with AL2-based Python builds
4. **Build Commands:** Must include proper pip upgrades and dependency verification

## Last Updated
January 2025 - Based on AWS App Runner documentation and deployment testing

## References
- [AWS App Runner Python platforms](https://docs.aws.amazon.com/apprunner/latest/dg/runtime-python.html)
- [AWS App Runner Release Notes](https://docs.aws.amazon.com/apprunner/latest/relnotes/relnotes.html) 