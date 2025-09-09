#!/bin/bash

# Render build script for TypeScript project
echo "Starting Render build process..."

# Clean install dependencies
echo "Installing dependencies..."
npm ci

# Verify type definitions are installed
echo "Verifying type definitions..."
ls -la node_modules/@types/

# Build the project
echo "Building TypeScript project..."
npm run build

echo "Build completed successfully!"
