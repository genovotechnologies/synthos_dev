# Domain Name Options for Synthos

## 🆓 Free Options

### 1. Vercel Free Subdomain
- **Current**: `https://synthos-dev.vercel.app` 
- **Cost**: Free
- **Pros**: Already working, no setup needed
- **Cons**: Not branded, long URL

### 2. Free Subdomain Services
- **Freenom** (.tk, .ml, .ga, .cf domains)
  - Cost: Free for 1 year
  - Example: `synthos.tk`
  - ⚠️ Warning: Can be unreliable, not recommended for production

### 3. GitHub Pages Subdomain
- `username.github.io/synthos`
- Free but requires GitHub Pages setup

## 💰 Affordable Paid Options (Recommended)

### 1. Namecheap (Best Value)
- **Cost**: $8-15/year
- **Popular TLDs**:
  - `.com` - $13.98/year
  - `.dev` - $12.98/year (perfect for your app!)
  - `.io` - $39.98/year (tech-focused)
  - `.ai` - $99.98/year (AI-focused, premium)

### 2. Cloudflare Registrar
- **Cost**: At-cost pricing (cheapest)
- **Examples**:
  - `.com` - $9.15/year
  - `.dev` - $9.95/year
  - `.io` - $35/year

### 3. Google Domains → Squarespace
- **Cost**: $12-20/year
- Simple management
- Good integration with Google services

### 4. Porkbun (Developer Favorite)
- **Cost**: $8-12/year
- **Popular with developers**
- Great customer service

## 🎯 Recommended Strategy

### Option A: Quick & Free (MVP Testing)
1. Keep using `https://synthos-dev.vercel.app`
2. Test your app with users
3. Buy domain later when ready to scale

### Option B: Professional Setup ($10-15)
1. **Buy `synthos.dev` from Namecheap** (~$13/year)
2. Perfect name for your AI platform
3. Add to Vercel custom domains

### Option C: Premium Branding ($35-100)
1. `synthos.io` for tech appeal (~$40/year)
2. `synthos.ai` for AI branding (~$100/year)

## 🚀 Setting Up Custom Domain on Vercel

Once you have a domain:

### 1. Add Domain to Vercel
```bash
# Via Vercel CLI
vercel domains add synthos.dev

# Or via Vercel Dashboard
# Go to Project Settings → Domains → Add Domain
```

### 2. Configure DNS
Point your domain to Vercel:
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

### 3. SSL Certificate
Vercel automatically provisions SSL certificates for custom domains.

## 💡 My Recommendation

**Start with Option A** (keep current URL) for now, then:

1. **If budget allows**: Buy `synthos.dev` for $13/year
2. **If very tight budget**: Use current Vercel URL until you have paying users
3. **If targeting enterprise**: Consider `synthos.io` or `synthos.ai`

The `.dev` TLD is perfect for your project - it's affordable, modern, and signals that you're building developer/tech tools.

## ⚡ Quick Setup Commands

```bash
# After buying domain, add to Vercel
vercel domains add your-domain.com

# Update environment variables
# CORS_ORIGINS=https://your-domain.com
# In your backend/backend.env
``` 