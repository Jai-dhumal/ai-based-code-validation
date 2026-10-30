#!/usr/bin/env bash
# Production Build & Runtime Provisioning Script for Render
# Ensures all 5 language runtimes (Node.js, Python, GCC, G++, Java JDK) are ready.
set -e

echo "=== [1/4] Checking Native Runtimes ==="
echo "Node.js: $(node --version)"
echo "Python: $(python3 --version 2>/dev/null || python --version 2>/dev/null || echo 'Not found')"
echo "GCC: $(gcc --version 2>/dev/null | head -n 1 || echo 'Not found')"
echo "G++: $(g++ --version 2>/dev/null | head -n 1 || echo 'Not found')"

echo "=== [2/4] Provisioning OpenJDK for Java Execution ==="
JDK_DIR="$HOME/.jdk/jdk-17"
if [ -f "$JDK_DIR/bin/javac" ]; then
    echo "OpenJDK 17 already provisioned at $JDK_DIR"
else
    echo "Downloading Eclipse Temurin OpenJDK 17 LTS (Linux x64)..."
    mkdir -p "$HOME/.jdk"
    curl -sSL -o /tmp/openjdk17.tar.gz "https://api.adoptium.net/v3/binary/latest/17/ga/linux/x64/jdk/hotspot/normal/eclipse"
    echo "Extracting OpenJDK 17..."
    mkdir -p "$JDK_DIR"
    tar -xzf /tmp/openjdk17.tar.gz -C "$JDK_DIR" --strip-components=1
    rm -f /tmp/openjdk17.tar.gz
    echo "OpenJDK 17 extracted successfully."
fi

# Verify Java and Javac
export JAVA_HOME="$JDK_DIR"
export PATH="$JAVA_HOME/bin:$PATH"
echo "Java Version: $("$JAVA_HOME/bin/java" -version 2>&1 | head -n 1)"
echo "Javac Version: $("$JAVA_HOME/bin/javac" -version 2>&1 | head -n 1)"

echo "=== [3/4] Installing Backend Dependencies ==="
npm install --prefix server

echo "=== [4/4] Installing & Building Frontend (Vite) ==="
npm install --prefix client
npm run build --prefix client

echo "=== BUILD AND PROVISIONING COMPLETED SUCCESSFULLY ==="
