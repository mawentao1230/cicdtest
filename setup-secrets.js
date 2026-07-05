const https = require("https");
const sodium = require("libsodium-wrappers");

const TOKEN = "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";
const OWNER = "mawentao1230";
const REPO = "cicdtest";

function github(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.github.com",
      path: `/repos/${OWNER}/${REPO}${path}`,
      method,
      headers: {
        Authorization: `token ${TOKEN}`,
        "User-Agent": "setup-secrets",
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data || "{}")));
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  await sodium.ready;

  const { key_id, key } = await github("GET", "/actions/secrets/public-key");
  console.log("Public key:", key_id);

  const secrets = {
    OPENCODE_AUTH_JSON: "opencode-auth-placeholder",
    GH_TOKEN: TOKEN,
    EMAIL_HOST: "smtp.163.com",
    EMAIL_PORT: "465",
    EMAIL_USER: process.env.EMAIL_USER || "your-email@163.com",
    EMAIL_PASS: process.env.EMAIL_PASS || "your-smtp-auth-code",
    EMAIL_TO: process.env.EMAIL_TO || "your-email@163.com",
  };

  const keyBytes = Buffer.from(key, "base64");

  for (const [name, value] of Object.entries(secrets)) {
    if (value.includes("placeholder") || value.includes("your-")) {
      console.log(`SKIP ${name}: need manual input`);
      continue;
    }

    const encryptedBytes = sodium.crypto_box_seal(Buffer.from(value), keyBytes);
    const encryptedValue = Buffer.from(encryptedBytes).toString("base64");

    const result = await github("PUT", `/actions/secrets/${name}`, {
      encrypted_value: encryptedValue,
      key_id,
    });

    if (result.message && result.message !== "Secret created") {
      // Result from GitHub: no content on success
    }
    console.log(`OK ${name}: set`);
  }
}

main().catch(console.error);
