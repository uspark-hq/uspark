#!/usr/bin/env node

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CERTS_DIR = path.join(__dirname, "../../../../.certs");
const CADDYFILE = path.join(__dirname, "../Caddyfile");

// Check if certificates exist
const certsExist =
  fs.existsSync(path.join(CERTS_DIR, "www.uspark.dev.pem")) &&
  fs.existsSync(path.join(CERTS_DIR, "www.uspark.dev-key.pem"));

if (!certsExist) {
  console.log("⚠️  No certificates found in .certs directory");
  console.log("   Caddy proxy will not be started.\n");
  console.log("   To enable HTTPS proxy:");
  console.log("   1. Run: npm run generate-certs (from host machine)");
  console.log("   2. Run: npm run dev");
  process.exit(0);
}

console.log("🔐 Starting Caddy with HTTPS...");

// Stop any existing Caddy instance
const stopCaddy = spawn("caddy", ["stop"], { stdio: "ignore" });
stopCaddy.on("close", () => {
  // Start Caddy with the config file
  const caddy = spawn(
    "caddy",
    ["run", "--config", CADDYFILE, "--adapter", "caddyfile"],
    {
      stdio: "inherit",
    },
  );

  caddy.on("error", (err) => {
    console.error("Failed to start Caddy:", err);
    process.exit(1);
  });

  console.log("✅ Caddy proxy started successfully");
  console.log("📝 Domains available at:");
  console.log("   - Web:  https://www.uspark.dev:8443");
  console.log("   - App:  https://app.uspark.dev:8443");
  console.log("   - Docs: https://docs.uspark.dev:8443");

  // Handle process termination
  process.on("SIGINT", () => {
    console.log("\n🛑 Stopping Caddy...");
    spawn("caddy", ["stop"], { stdio: "inherit" });
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    spawn("caddy", ["stop"], { stdio: "inherit" });
    process.exit(0);
  });
});
