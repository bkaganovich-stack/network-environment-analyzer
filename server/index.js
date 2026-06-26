import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { scanWifi } from './wifi-scanner.js';
import { runPingCheck, runDpiDetection } from './network-diagnostics.js';
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
    const gatewayIp = ip || '192.168.1.1';

    // 1. Scan Local Wi-Fi Environment and run network diagnostics in parallel
    console.log(`[Diagnostics] Running parallel scans (Wi-Fi, pings to ${gatewayIp} and 1.1.1.1, DPI check)...`);
    const [wifiScan, gatewayPing, internetPing, dpi] = await Promise.all([
      scanWifi(),
      runPingCheck(gatewayIp),
      runPingCheck('1.1.1.1'),
      runDpiDetection()
    ]);

    const currentNet = wifiScan.find(n => n.isCurrent) || null;

    let routerConfig;
    const isDemo = model.includes('(Demo)') || model.includes('Simulated');

    // 2. Gather Router Config (Real or Simulated)
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
        routerConfig = await scrapeTPLinkOrGeneric(ip, username, password || '', currentNet);
        routerConfig.brand = matchedBrand;
        routerConfig.model = `${matchedBrand} Router (${model === 'auto' ? 'Auto-detected' : 'Manual'})`;
      } else {
        routerConfig = await scrapeTPLinkOrGeneric(ip, username, password || '', currentNet);
        routerConfig.brand = 'Generic';
        routerConfig.model = 'Generic Router (Fallback)';
      }
    }

    // 3. Execute Rule-Based Diagnostics Engine
    const diagnosticReport = runDiagnostics(routerConfig, wifiScan);

    // Return the response, combining router data, wifi environment, diagnostics, and recommendations
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
        clients: routerConfig.clients || [],
        clientRetrievalMethod: routerConfig.clientRetrievalMethod || 'router'
      },
      wifiEnvironment: wifiScan,
      report: diagnosticReport,
      networkDiagnostics: {
        gateway: gatewayPing,
        internet: internetPing,
        dpi: dpi
      }
    });
  } catch (err) {
    console.error('Diagnostics execution error:', err.message);
    return res.status(500).json({
      error: err.message || 'An error occurred during diagnostics scanning.'
    });
  }
});

// Graceful shutdown endpoint
app.post('/api/exit', (req, res) => {
  console.log('[Server] Shutdown requested via Web UI...');
  res.json({ success: true, message: 'Server is shutting down.' });
  setTimeout(() => {
    console.log('[Server] Exiting process...');
    process.exit(0);
  }, 500);
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
