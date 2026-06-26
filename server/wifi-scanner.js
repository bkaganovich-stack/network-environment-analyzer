import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Parses the output of `system_profiler SPAirPortDataType`
 * @param {string} stdout 
 * @returns {Array} List of Wi-Fi networks found
 */
export function parseSystemProfiler(stdout) {
  const lines = stdout.split('\n');
  const networks = [];
  let currentNetwork = null;
  let section = null; // 'current' or 'other'

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (line.includes('Current Network Information:')) {
      section = 'current';
      continue;
    } else if (line.includes('Other Local Wi-Fi Networks:')) {
      section = 'other';
      continue;
    } else if (trimmed === '' || trimmed.startsWith('awdl0:') || trimmed.startsWith('Interfaces:')) {
      continue;
    }

    // Check indentation level (spaces at start)
    const matchSpaces = line.match(/^(\s+)/);
    const indent = matchSpaces ? matchSpaces[1].length : 0;

    // A network entry starts with 12 spaces indentation and ends with a colon
    if (section && indent === 12 && trimmed.endsWith(':')) {
      if (currentNetwork) {
        networks.push(currentNetwork);
      }
      currentNetwork = {
        ssid: trimmed.slice(0, -1),
        isCurrent: section === 'current',
        phyMode: '',
        channel: 0,
        band: '',
        width: 20,
        security: 'WPA2 Personal',
        signal: -70,
        noise: -95
      };
    } else if (currentNetwork && indent === 14 && trimmed.includes(':')) {
      const parts = trimmed.split(':');
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim();

      if (key === 'PHY Mode') {
        currentNetwork.phyMode = val;
      } else if (key === 'Channel') {
        // e.g. "100 (5GHz, 80MHz)" or "11 (2GHz, 20MHz)" or "6"
        const channelNum = parseInt(val, 10);
        currentNetwork.channel = channelNum || 0;

        if (val.includes('5GHz')) {
          currentNetwork.band = '5GHz';
        } else if (val.includes('2GHz')) {
          currentNetwork.band = '2GHz';
        } else if (val.includes('6GHz')) {
          currentNetwork.band = '6GHz';
        } else {
          // Fallback guess based on channel number
          currentNetwork.band = channelNum >= 36 ? '5GHz' : '2GHz';
        }

        if (val.includes('160MHz')) currentNetwork.width = 160;
        else if (val.includes('80MHz')) currentNetwork.width = 80;
        else if (val.includes('40MHz')) currentNetwork.width = 40;
        else currentNetwork.width = 20;
      } else if (key === 'Security') {
        currentNetwork.security = val;
      } else if (key === 'Signal / Noise') {
        const sigParts = val.split('/');
        if (sigParts[0]) {
          currentNetwork.signal = parseInt(sigParts[0].replace('dBm', '').trim(), 10) || -70;
        }
        if (sigParts[1]) {
          currentNetwork.noise = parseInt(sigParts[1].replace('dBm', '').trim(), 10) || -95;
        }
      }
    }
  }

  if (currentNetwork) {
    networks.push(currentNetwork);
  }

  // Replace '<redacted>' SSIDs with friendly placeholder names showing their channel
  networks.forEach((net, index) => {
    if (net.ssid === '<redacted>') {
      net.ssid = `Сеть #${index + 1} (Канал ${net.channel})`;
    }
  });

  return networks;
}

/**
 * Returns mock/simulated neighboring Wi-Fi networks
 */
export function getSimulatedWifiNetworks() {
  return [
    {
      ssid: 'Keenetic-9943_5G',
      isCurrent: false,
      phyMode: '802.11ax',
      channel: 36,
      band: '5GHz',
      width: 80,
      security: 'WPA3 Personal',
      signal: -48,
      noise: -92
    },
    {
      ssid: 'Neighbor-WiFi-2G',
      isCurrent: false,
      phyMode: '802.11g/n',
      channel: 4, // Overlapping!
      band: '2GHz',
      width: 40, // Too wide for 2.4GHz!
      security: 'WPA2 Personal',
      signal: -55,
      noise: -90
    },
    {
      ssid: 'TP-LINK_Guest',
      isCurrent: false,
      phyMode: '802.11b/g/n',
      channel: 6,
      band: '2GHz',
      width: 20,
      security: 'None', // Open Guest Network!
      signal: -62,
      noise: -95
    },
    {
      ssid: 'ASUS_Home_2G',
      isCurrent: false,
      phyMode: '802.11b/g/n',
      channel: 11,
      band: '2GHz',
      width: 20,
      security: 'WPA2 Personal',
      signal: -68,
      noise: -93
    },
    {
      ssid: 'Neighbor-DFS-Network',
      isCurrent: false,
      phyMode: '802.11a/n/ac/ax',
      channel: 100, // DFS Channel
      band: '5GHz',
      width: 160, // Wide channel
      security: 'WPA2 Personal',
      signal: -58,
      noise: -94
    },
    {
      ssid: 'Unknown_Network_Ch1',
      isCurrent: false,
      phyMode: '802.11n',
      channel: 1,
      band: '2GHz',
      width: 20,
      security: 'WEP', // Very outdated security!
      signal: -82,
      noise: -95
    }
  ];
}

/**
 * Scan for local Wi-Fi networks.
 * Runs system_profiler on macOS or falls back to simulation data.
 */
export async function scanWifi() {
  if (process.platform !== 'darwin') {
    return getSimulatedWifiNetworks();
  }

  try {
    // Run macOS native system_profiler for Wi-Fi (takes ~2-3 seconds)
    const { stdout } = await execPromise('system_profiler SPAirPortDataType', { timeout: 10000 });
    const parsed = parseSystemProfiler(stdout);

    // If parsing returned nothing (e.g. Wi-Fi card disabled), return simulated networks
    if (parsed.length === 0) {
      return getSimulatedWifiNetworks();
    }
    
    return parsed;
  } catch (error) {
    console.error('macOS system_profiler Wi-Fi scan failed:', error.message);
    return getSimulatedWifiNetworks();
  }
}
