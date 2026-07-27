// Spoof process.platform to 'linux' so playwright-core supports Android/Termux
Object.defineProperty(process, 'platform', { value: 'linux' });

require('dotenv/config');
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

// Default constants
const CHAT_URL = "https://chat.deepseek.com/";
const SIGNIN_URL = "https://chat.deepseek.com/sign_in";
const DEFAULT_CHROMIUM_PATH = "/data/data/com.termux/files/usr/bin/chromium-browser";

// Parse CLI flags
const args = process.argv.slice(2);
let profileDir = null;
let headless = false;
let assumeLoggedOut = false;
let timeoutSeconds = 300;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--profile' && i + 1 < args.length) {
    profileDir = args[++i];
  } else if (args[i] === '--headless') {
    headless = true;
  } else if (args[i] === '--assume-logged-out') {
    assumeLoggedOut = true;
  } else if (args[i] === '--timeout' && i + 1 < args.length) {
    timeoutSeconds = parseInt(args[++i], 10);
  }
}

const chromiumPath = process.env.CHROMIUM_PATH || DEFAULT_CHROMIUM_PATH;

let capturedNetworkToken = null;

async function safeEvaluate(page, js) {
  try {
    return await page.evaluate(js);
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (msg.includes('Execution context was destroyed') || msg.toLowerCase().includes('navigation')) {
      return null;
    }
    throw e;
  }
}

async function safeGoto(page, url) {
  try {
    await page.goto(url, { waitUntil: 'commit', timeout: 60000 });
  } catch (e) {
    console.error(`[auth-helper] Navigation to ${url} interrupted (${e.message}); continuing.`);
  }
  await page.waitForTimeout(2000);
}

async function inspectPageState(page) {
  const result = {
    token: null,
    localStorageKeys: [],
    localStorageDump: {},
    sessionStorageDump: {},
    cookieNames: [],
    indexedDbNames: [],
    url: page.url()
  };

  try {
    const cookies = await page.context().cookies();
    result.cookieNames = cookies.map(c => c.name);

    for (const c of cookies) {
      if (['userToken', 'user_token', 'auth_token', 'token', 'bearer'].includes(c.name)) {
        if (c.value && c.value.length > 20) {
          result.token = c.value;
          console.error(`[auth-helper] Found token in cookie '${c.name}': ${c.value.substring(0, 15)}...`);
        }
      }
    }

    const dumps = await safeEvaluate(page, `
      async () => {
        const ls = {};
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            ls[k] = localStorage.getItem(k);
          }
        } catch(e) {}

        const ss = {};
        try {
          for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            ss[k] = sessionStorage.getItem(k);
          }
        } catch(e) {}

        let idb = [];
        try {
          if (window.indexedDB && window.indexedDB.databases) {
            const dbs = await window.indexedDB.databases();
            idb = dbs.map(d => d.name);
          }
        } catch (e) {}

        return { ls, ss, idb };
      }
    `);

    if (dumps) {
      result.localStorageDump = dumps.ls || {};
      result.sessionStorageDump = dumps.ss || {};
      result.localStorageKeys = Object.keys(result.localStorageDump);
      result.indexedDbNames = dumps.idb || [];

      // Scan localStorage & sessionStorage for token candidates
      for (const storageObj of [result.localStorageDump, result.sessionStorageDump]) {
        for (const [k, v] of Object.entries(storageObj)) {
          if (!v) continue;
          let parsed = null;
          try { parsed = JSON.parse(v); } catch (e) {}

          if (parsed && typeof parsed === 'object') {
            const candidate = parsed.value || parsed.token || parsed.userToken || parsed.user_token || parsed.access_token;
            if (candidate && typeof candidate === 'string' && candidate.length > 20) {
              result.token = candidate;
              console.error(`[auth-helper] Found token in storage key '${k}' (parsed property): ${candidate.substring(0, 15)}...`);
              break;
            }
          } else if (typeof v === 'string' && (k.toLowerCase().includes('token') || k.toLowerCase().includes('user') || k.toLowerCase().includes('auth'))) {
            if (v.length > 20 && !v.startsWith('{')) {
              result.token = v;
              console.error(`[auth-helper] Found token in storage key '${k}' (raw value): ${v.substring(0, 15)}...`);
              break;
            }
          }
        }
        if (result.token) break;
      }
    }
  } catch (e) {
    console.error(`[auth-helper] Error inspecting page state: ${e.message}`);
  }

  if (!result.token && capturedNetworkToken) {
    result.token = capturedNetworkToken;
    console.error(`[auth-helper] Using captured network Authorization header token: ${result.token.substring(0, 15)}...`);
  }

  return result;
}

async function waitForSession(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastLogTime = 0;

  while (Date.now() < deadline) {
    const state = await inspectPageState(page);

    const now = Date.now();
    if (now - lastLogTime > 5000) {
      lastLogTime = now;
      console.error(`[auth-helper] [DEBUG] URL: ${state.url}`);
      console.error(`[auth-helper] [DEBUG] LocalStorage Keys (${state.localStorageKeys.length}): ${JSON.stringify(state.localStorageKeys)}`);
      console.error(`[auth-helper] [DEBUG] Cookies (${state.cookieNames.length}): ${JSON.stringify(state.cookieNames)}`);
      if (state.indexedDbNames.length > 0) {
        console.error(`[auth-helper] [DEBUG] IndexedDB Databases: ${JSON.stringify(state.indexedDbNames)}`);
      }
      if (capturedNetworkToken) {
        console.error(`[auth-helper] [DEBUG] Captured Network Token: ${capturedNetworkToken.substring(0, 15)}...`);
      }
    }

    if (state.token) {
      return state.token;
    }

    await page.waitForTimeout(1000);
  }

  return null;
}

(async () => {
  if (!profileDir) {
    console.error("Error: --profile is required");
    process.exit(1);
  }

  const resolvedProfileDir = path.resolve(profileDir);
  if (!fs.existsSync(resolvedProfileDir)) {
    fs.mkdirSync(resolvedProfileDir, { recursive: true });
  }

  const launchArgs = [
    '--no-sandbox',
    '--disable-gpu',
    '--disable-blink-features=AutomationControlled'
  ];

  let context;
  try {
    context = await chromium.launchPersistentContext(resolvedProfileDir, {
      executablePath: chromiumPath,
      headless: headless,
      args: launchArgs
    });
  } catch (e) {
    console.error(`Failed to launch browser with path ${chromiumPath}: ${e.message}`);
    process.exit(1);
  }

  // Intercept network requests to capture Authorization headers
  context.on('request', request => {
    const headers = request.headers();
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token && token.length > 20) {
        capturedNetworkToken = token;
        console.error(`[auth-helper] Captured Authorization header from request to ${request.url()}`);
      }
    }
  });

  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
  let token = null;

  if (!assumeLoggedOut) {
    await safeGoto(page, CHAT_URL);
    const initialCheck = await inspectPageState(page);
    token = initialCheck.token;
  }

  if (!token) {
    await safeGoto(page, SIGNIN_URL);
    if (!headless) {
      console.error("[auth] Please sign in in the window (solve the human-check if shown). Waiting for the session...");
    }
    token = await waitForSession(page, timeoutSeconds * 1000);
  }

  if (!token) {
    console.error("[auth-helper] Inspection summary before timeout:");
    const finalState = await inspectPageState(page);
    console.error(`[auth-helper] Final URL: ${finalState.url}`);
    console.error(`[auth-helper] LocalStorage Dump: ${JSON.stringify(finalState.localStorageDump, null, 2)}`);
    console.error(`[auth-helper] SessionStorage Dump: ${JSON.stringify(finalState.sessionStorageDump, null, 2)}`);
    console.error(`[auth-helper] Cookies: ${JSON.stringify(finalState.cookieNames)}`);
    console.error(`[auth-helper] IndexedDB: ${JSON.stringify(finalState.indexedDbNames)}`);
    await context.close();
    process.exit(1);
  }

  const cookieList = await context.cookies();
  const cookies = {};
  for (const c of cookieList) {
    cookies[c.name] = c.value;
  }
  const userAgent = (await safeEvaluate(page, "() => navigator.userAgent")) || "";

  await context.close();

  const sessionData = {
    token: token,
    cookies: cookies,
    user_agent: userAgent,
    captured_at: Date.now() / 1000
  };

  console.log(JSON.stringify(sessionData));
  process.exit(0);
})().catch(err => {
  console.error(`[auth-helper] Error: ${err.message}`);
  process.exit(1);
});
