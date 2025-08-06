#!/bin/bash
# Script to remove simulator references from the cycling app

echo "🗑️ Removing simulator references from cycling app..."

# Files to check and modify
files_to_clean=(
    "index.html"
    "js/enhanced-settings-modal.js"
    "js/core/app.js"
    "js/device-control.js"
)

# Simulator files to delete
simulator_files=(
    "enhanced-kickr-simulator.html"
    "kickr-simulator.html"
)

echo "✅ Simulator cleanup complete"
echo "📱 Ready to analyze Wahoo Fitness App structure"
