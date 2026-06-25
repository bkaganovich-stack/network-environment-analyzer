import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanWifi } from './wifi-scanner.js';
import { 
  scrapeKeenetic, 
  scrapeOpenWrt, 
  scrapeTPLinkOrGeneric, 
  detectRouterBrand,
  getSimulatedKeeneticConfig, 
  getSimulatedOpenWrtConfig, 
  getSimulatedTPLinkConfig,
  getSimulatedAsuswrtConfig,
  getSimulatedFritzBoxConfig,
  getSimulatedXiaomiConfig,
  getSimulatedHuaweiConfig,
  getSimulatedDLinkConfig,
  getSimulatedTendaConfig
} from './scrapers.js';
import { runDiagnostics } from './diagnostics-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static assets in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

/**
 * Diagnostic Endpoint
 * Accepts router address, credentials, and router model class.
 * Performs scans and returns rule-based recommendations.
 */
app.post('/api/diagnose', async (req, res) => {
  const { ip, username, password, model } = req.body;

  try {
    let routerConfig;
    const isDemo = model.includes('(Demo)') || model.includes('Simulated');

    // 1. Gather Router Config (Real or Simulated)
    if (isDemo) {
      if (model.includes('Keenetic')) {
        routerConfig = getSimulatedKeeneticConfig();
      } else if (model.includes('OpenWrt')) {
        routerConfig = getSimulatedOpenWrtConfig();
      } else if (model.includes('ASUSWRT')) {
        routerConfig = getSimulatedAsuswrtConfig();
      } else if (model.includes('FRITZ!Box')) {
        routerConfig = getSimulatedFritzBoxConfig();
      } else if (model.includes('Xiaomi')) {
        routerConfig = getSimulatedXiaomiConfig();
      } else if (model.includes('Huawei')) {
        routerConfig = getSimulatedHuaweiConfig();
      } else if (model.includes('D-Link')) {
        routerConfig = getSimulatedDLinkConfig();
      } else if (model.includes('Tenda')) {
        routerConfig = getSimulatedTendaConfig();
      } else {
        routerConfig = getSimulatedTPLinkConfig();
      }
    } else {
      if (!ip || !username) {
        return res.status(400).json({ error: 'IP address and Username are required for real router connection.' });
      }

      let activeModel = model;
      if (model === 'auto') {
        const detected = await detectRouterBrand(ip);
        console.log(`[Auto-detect] Resolved brand: ${detected}`);
        activeModel = detected;
      }

      if (activeModel.includes('Keenetic')) {
        routerConfig = await scrapeKeenetic(ip, username, password || '');
      } else if (activeModel.includes('OpenWrt')) {
        routerConfig = await scrapeOpenWrt(ip, username, password || '');
      } else if (['TP-Link', 'ASUSWRT', 'FRITZ!Box', 'Xiaomi MiWiFi', 'Huawei', 'D-Link', 'Tenda', 'Generic'].some(b => activeModel.includes(b) || activeModel === b)) {
        const matchedBrand = ['TP-Link', 'ASUSWRT', 'FRITZ!Box', 'Xiaomi MiWiFi', 'Huawei', 'D-Link', 'Tenda', 'Generic'].find(b => activeModel.includes(b) || activeModel === b) || 'Generic';
        routerConfig = await scrapeTPLinkOrGeneric(ip, username, password || '');
        routerConfig.brand = matchedBrand;
        routerConfig.model = `${matchedBrand} Router (${model === 'auto' ? 'Auto-detected' : 'Manual'})`;
      } else {
        routerConfig = await scrapeTPLinkOrGeneric(ip, username, password || '');
        routerConfig.brand = 'Generic';
        routerConfig.model = 'Generic Router (Fallback)';
      }
    }

    // 2. Scan Local Wi-Fi Environment (macOS commands or fallback)
    const wifiScan = await scanWifi();

    // 3. Execute Rule-Based Diagnostics Engine
    const diagnosticReport = runDiagnostics(routerConfig, wifiScan);

    // Return the response, combining router data, wifi environment and recommendations
    return res.json({
      routerInfo: {
        brand: routerConfig.brand,
        model: routerConfig.model,
        firmwareVersion: routerConfig.firmwareVersion,
        uptime: routerConfig.uptime,
        cpuUsage: routerConfig.cpuUsage,
        ramUsage: routerConfig.ramUsage,
        wanIp: routerConfig.wanIp,
        dhcp: routerConfig.dhcp,
        dns: routerConfig.dns,
        upnp: routerConfig.upnp,
        remoteManagement: routerConfig.remoteManagement,
        wps: routerConfig.wps,
        interfaces: routerConfig.interfaces,
        clientsCount: routerConfig.clients?.length || 0,
        clients: routerConfig.clients || []
      },
      wifiEnvironment: wifiScan,
      report: diagnosticReport
    });
  } catch (err) {
    console.error('Diagnostics execution error:', err.message);
    return res.status(500).json({
      error: err.message || 'An error occurred during diagnostics scanning.'
    });
  }
});

// Fallback to serving index.html for React router support (SPA frontend)
app.get('*splat', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      // In development, dist might not exist yet, so output simple status
      res.status(200).send('Network Environment Analyzer API Server running. Frontend is available via dev server.');
    }
  });
});

app.listen(PORT, () => {
  console.log(`[Server] Router Diagnostics Agent Backend running on port ${PORT}`);
});
