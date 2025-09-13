#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const CERTS_DIR = path.join(__dirname, "../../../../.certs");

const requiredCerts = [
  "www.uspark.dev.pem",
  "www.uspark.dev-key.pem",
  "app.uspark.dev.pem",
  "app.uspark.dev-key.pem",
  "docs.uspark.dev.pem",
  "docs.uspark.dev-key.pem",
  "uspark.dev.pem",
  "uspark.dev-key.pem",
];

console.log("🔍 Checking certificates...\n");

let allCertsExist = true;

requiredCerts.forEach((cert) => {
  const certPath = path.join(CERTS_DIR, cert);
  const exists = fs.existsSync(certPath);
  console.log(`${exists ? "✅" : "❌"} ${cert}`);
  if (!exists) allCertsExist = false;
});

console.log("");

if (allCertsExist) {
  console.log("✅ All certificates are present");
} else {
  console.log("⚠️  Some certificates are missing");
  console.log("Run: npm run generate-certs (from host machine)");
  process.exit(1);
}
