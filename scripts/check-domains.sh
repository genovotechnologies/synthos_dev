#!/bin/bash

# Domain availability checker for Synthos project
echo "🔍 Checking domain availability for Synthos..."
echo "================================================"

domains=(
    "synthos.com"
    "synthos.dev" 
    "synthos.io"
    "synthos.ai"
    "synthos.app"
    "synthos.co"
    "get-synthos.com"
    "usesynthos.com"
)

check_domain() {
    domain=$1
    echo -n "Checking $domain... "
    
    if command -v whois &> /dev/null; then
        result=$(whois $domain 2>/dev/null | grep -i "no match\|not found\|no entries found\|status: available")
        if [ -n "$result" ]; then
            echo "✅ AVAILABLE"
        else
            echo "❌ Taken"
        fi
    else
        echo "⚠️  Install whois to check (sudo apt install whois)"
    fi
}

for domain in "${domains[@]}"; do
    check_domain $domain
done

echo ""
echo "💡 Recommendations:"
echo "• synthos.dev - Perfect for developer tools (~$13/year)"
echo "• synthos.com - Classic choice (~$13/year)" 
echo "• synthos.io - Tech startup vibe (~$40/year)"
echo "• synthos.ai - AI-focused premium (~$100/year)"
echo ""
echo "🛒 Best places to buy:"
echo "• Namecheap.com (easy setup)"
echo "• Cloudflare.com (cheapest prices)"
echo "• Porkbun.com (developer-friendly)" 