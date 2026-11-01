const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'nirbhaya_super_secure_jwt_secret_2026';

const OUTPUT_DIR = path.join(__dirname, '..', 'output_screens');
const ARTIFACT_DIR = 'C:\\Users\\Abish\\.gemini\\antigravity\\brain\\bb0e4526-351b-4bfe-8ce3-cef6382e7ab3\\screens';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

// User Accounts
const citizenUser = {
  id: 'USR-7F42A91C',
  name: 'Abhishek K',
  email: 'demo@nirbhaya.ai',
  phone: '+91 93455 96322',
  role: 'USER',
  hasPin: true,
  createdAt: '2026-09-24T13:42:44.826Z'
};
const citizenToken = jwt.sign(
  { id: citizenUser.id, email: citizenUser.email, name: citizenUser.name, role: citizenUser.role },
  JWT_SECRET,
  { expiresIn: '7d' }
);

const responderUser = {
  id: 'RSP-1042',
  name: 'Officer Arjun Kumar (Application Responder)',
  email: 'arjun@police.gov.in',
  phone: '+91 112 000 1042',
  role: 'RESPONDER',
  hasPin: false,
  createdAt: '2026-09-24T13:42:44.934Z'
};
const responderToken = jwt.sign(
  { id: responderUser.id, email: responderUser.email, name: responderUser.name, role: responderUser.role },
  JWT_SECRET,
  { expiresIn: '7d' }
);

const adminUser = {
  id: 'ADM-9001',
  name: 'Safety Operations Admin',
  email: 'admin@nirbhaya.ai',
  phone: '+919999999999',
  role: 'ADMIN',
  hasPin: true,
  createdAt: '2026-09-24T13:42:44.826Z'
};
const adminToken = jwt.sign(
  { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role },
  JWT_SECRET,
  { expiresIn: '7d' }
);

async function capture() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    defaultViewport: {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1.5,
    },
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars'
    ]
  });

  const page = await browser.newPage();

  async function takeScreenshot(filename, url, auth = null, waitTime = 2500) {
    console.log(`[CAPTURE] ${filename} -> ${url}`);
    
    // First, navigate to base to configure localStorage
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
    if (auth) {
      await page.evaluate((t, u) => {
        localStorage.setItem('nirbhaya_auth_token', t);
        localStorage.setItem('nirbhaya_user_session', JSON.stringify(u));
      }, auth.token, auth.user);
    } else {
      await page.evaluate(() => {
        localStorage.clear();
      });
    }

    // Now navigate to the target page
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 }).catch(e => console.log('Networkidle timeout, continuing...'));
    await new Promise(r => setTimeout(r, waitTime));

    const outPath = path.join(OUTPUT_DIR, filename);
    const artPath = path.join(ARTIFACT_DIR, filename);

    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, artPath);
    console.log(`✓ Saved ${filename} (${fs.statSync(outPath).size} bytes)`);
  }

  try {
    // 1. Landing Page
    await takeScreenshot('01_landing_page.png', 'http://localhost:3000/', null, 2000);

    // 2. Login Page
    await takeScreenshot('02_login_page.png', 'http://localhost:3000/login', null, 2000);

    // 3. Register Page
    await takeScreenshot('03_register_page.png', 'http://localhost:3000/register', null, 2000);

    // Citizen Pages
    const citizenAuth = { token: citizenToken, user: citizenUser };

    // 4. User Dashboard
    await takeScreenshot('04_user_dashboard.png', 'http://localhost:3000/dashboard', citizenAuth, 3500);

    // 5. Silent SOS Page
    await takeScreenshot('05_silent_sos.png', 'http://localhost:3000/sos', citizenAuth, 2500);

    // 6. Safe Route Navigator
    await takeScreenshot('06_safe_route.png', 'http://localhost:3000/safe-route', citizenAuth, 4000);

    // 7. AI Risk Analysis
    await takeScreenshot('07_risk_analysis.png', 'http://localhost:3000/risk-analysis', citizenAuth, 3000);

    // 8. Live Tracking Page
    await takeScreenshot('08_live_tracking.png', 'http://localhost:3000/live-tracking', citizenAuth, 4000);

    // 9. Trusted Contacts
    await takeScreenshot('09_trusted_contacts.png', 'http://localhost:3000/contacts', citizenAuth, 2500);

    // 10. Evidence Locker
    await takeScreenshot('10_evidence_locker.png', 'http://localhost:3000/evidence', citizenAuth, 2500);

    // 11. Safety History
    await takeScreenshot('11_safety_history.png', 'http://localhost:3000/history', citizenAuth, 2500);

    // 12. Settings Page
    await takeScreenshot('12_settings_page.png', 'http://localhost:3000/settings', citizenAuth, 2500);

    // Admin / Analytics Pages
    const adminAuth = { token: adminToken, user: adminUser };

    // 13. Safety Analytics
    await takeScreenshot('13_safety_analytics.png', 'http://localhost:3000/analytics', adminAuth, 3500);

    // 14. Incident Heatmap
    await takeScreenshot('14_incident_heatmap.png', 'http://localhost:3000/heatmap', adminAuth, 4000);

    // Responder Pages
    const responderAuth = { token: responderToken, user: responderUser };

    // 15. Responder Command Center
    await takeScreenshot('15_responder_dashboard.png', 'http://localhost:3000/responder', responderAuth, 3500);

    // 16. Responder Map
    await takeScreenshot('16_responder_map.png', 'http://localhost:3000/responder-map', responderAuth, 4000);

    console.log('=== ALL SCREENSHOTS CAPTURED AND VERIFIED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Capture process error:', err);
  } finally {
    await browser.close();
  }
}

capture();
