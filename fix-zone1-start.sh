#!/bin/bash

# Quick fix script to ensure Zone 1 start in all HTML files

echo "🔧 Fixing resistance to start at Zone 1 (-5%)..."

# Fix all HTML files to start at Zone 1
for file in *.html; do
    if [ -f "$file" ]; then
        echo "Updating $file..."
        
        # Fix initial resistance value (should be 15, not 20)
        sed -i 's/resistance: 20/resistance: 15  \/\/ Start at Zone 1/g' "$file"
        
        # Ensure currentZone starts at 1
        sed -i 's/this\.currentZone = [0-9]/this.currentZone = 1/g' "$file"
        
        # Fix resistance display initial value
        sed -i 's/id="resistance-value">20</id="resistance-value">15</g' "$file"
        sed -i 's/id="resistance-display">20%</id="resistance-display">15%</g' "$file"
        
        # Add initialization to set Zone 1 on start
        sed -i '/this\.initialize();/a\                // Always start in Zone 1 for easy warm-up\n                this.setZone(1);' "$file"
    fi
done

echo "✅ Fixed! All HTML files now start at Zone 1 (15% resistance)"
echo ""
echo "Zone 1 settings:"
echo "- Resistance: 15% (base 20% + zone offset -5%)"
echo "- Intensity: Recovery (50-60% FTP)"
echo "- Purpose: Easy warm-up"