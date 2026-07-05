import https from "https";
import sodium from "libsodium-wrappers";

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
        "User-Agent": "setup-secrets/1.0",
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
    };
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || "{}"));
        } else {
          resolve({ error: true, status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function setSecret(name, value, keyId, keyBytes) {
  const encryptedBytes = sodium.crypto_box_seal(Buffer.from(value), keyBytes);
  const encryptedValue = Buffer.from(encryptedBytes).toString("base64");
  const result = await github("PUT", `/actions/secrets/${name}`, {
    encrypted_value: encryptedValue,
    key_id: keyId,
  });
  if (!result.error) {
    console.log(`  ✅ ${name}`);
  } else {
    console.log(`  ❌ ${name}: ${result.body}`);
  }
}

async function main() {
  await sodium.ready;

  console.log("Fetching public key...");
  const pubkey = await github("GET", "/actions/secrets/public-key");
  if (pubkey.error || !pubkey.key_id) {
    console.error("Failed to get public key:", JSON.stringify(pubkey));
    process.exit(1);
  }
  console.log(`  Public key: ${pubkey.key_id}`);

  const keyBytes = Buffer.from(pubkey.key, "base64");

  const secrets = {
    OPENCODE_AUTH_JSON: JSON.stringify({
      deepseek: {
        type: "api",
        key: "sk-9599a61410d24c0d8da184c253427928",
      },
    }),
    GH_TOKEN: TOKEN,
    EMAIL_HOST: "smtp.163.com",
    EMAIL_PORT: "465",
    EMAIL_USER: "m_wentao@163.com",
    EMAIL_PASS: "BQkRYsx2tQzXkcBs",
    EMAIL_TO: "m_wentao@163.com",
  };

  console.log("\nSetting secrets...");
  for (const [name, value] of Object.entries(secrets)) {
    await setSecret(name, String(value), pubkey.key_id, keyBytes);
  }

  console.log("\nVerifying...");
  const verify = await github("GET", "/actions/secrets");
  if (!verify.error && verify.secrets) {
    console.log(`  Total secrets: ${verify.total_count}`);
    verify.secrets.forEach((s) => console.log(`  - ${s.name}`));
  }
}

main().catch(console.error);
