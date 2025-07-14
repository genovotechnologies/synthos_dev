# AWS App Runner Compatibility Reference

## Supported Python Runtimes (as of January 2025)

✅ **Supported:**
- Python 3.8
- Python 3.9  
- Python 3.10 ⭐ (Currently Used)
- Python 3.11

❌ **NOT Supported:**
- Python 3.12
- Python 3.13

## Current Configuration

**Runtime Version:** `3.10`
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