import { exec } from 'child_process';
import util from 'util';
import tls from 'tls';

const execPromise = util.promisify(exec);

/**
 * Runs a ping check to a target IP
 * Returns packet loss, average latency, and jitter
 */
export async function runPingCheck(targetIp) {
  const result = { ip: targetIp, avg: 0, loss: 100, jitter: 0 };
  
  if (!targetIp || targetIp === 'Unknown') {
    return result;
  }
  
  const cmd = process.platform === 'win32' 
    ? `ping -n 4 -w 2000 ${targetIp}` 
    : `ping -c 4 -t 2 ${targetIp}`;
    
  try {
    const { stdout } = await execPromise(cmd, { timeout: 6000 });
    
    // Parse packet loss percentage
    const lossMatch = stdout.match(/(\d+(?:\.\d+)?)%\s*(?:packet\s*)?loss/i);
    if (lossMatch) {
      result.loss = parseFloat(lossMatch[1]);
    }
    
    // Parse average round-trip times and jitter
    if (process.platform === 'win32') {
      const minMatch = stdout.match(/Minimum\s*=\s*(\d+)ms/i);
      const maxMatch = stdout.match(/Maximum\s*=\s*(\d+)ms/i);
      const avgMatch = stdout.match(/Average\s*=\s*(\d+)ms/i);
      
      const min = minMatch ? parseInt(minMatch[1], 10) : 0;
      const max = maxMatch ? parseInt(maxMatch[1], 10) : 0;
      const avg = avgMatch ? parseInt(avgMatch[1], 10) : 0;
      
      result.avg = avg;
      result.jitter = Math.max(0, parseFloat(((max - min) / 2).toFixed(2)));
    } else {
      // macOS/Linux: round-trip min/avg/max/stddev = 12.115/13.716/15.420/1.245 ms
      const statsMatch = stdout.match(/min\/avg\/max\/(?:stddev|mdev)\s*=\s*([\d\.]+)\/([\d\.]+)\/([\d\.]+)\/([\d\.]+)/i);
      if (statsMatch) {
        result.avg = parseFloat(parseFloat(statsMatch[2]).toFixed(2));
        result.jitter = parseFloat(parseFloat(statsMatch[4]).toFixed(2));
      } else {
        const avgMatch = stdout.match(/avg\s*=\s*([\d\.]+)/i);
        if (avgMatch) {
          result.avg = parseFloat(parseFloat(avgMatch[1]).toFixed(2));
        }
      }
    }
  } catch (err) {
    // If ping returns non-zero code (e.g. some packets lost), we still try to parse stdout
    const stdout = err.stdout || '';
    const lossMatch = stdout.match(/(\d+(?:\.\d+)?)%\s*(?:packet\s*)?loss/i);
    if (lossMatch) {
      result.loss = parseFloat(lossMatch[1]);
    }
    
    if (result.loss < 100) {
      if (process.platform === 'win32') {
        const avgMatch = stdout.match(/Average\s*=\s*(\d+)ms/i);
        if (avgMatch) result.avg = parseInt(avgMatch[1], 10);
      } else {
        const statsMatch = stdout.match(/min\/avg\/max\/(?:stddev|mdev)\s*=\s*([\d\.]+)\/([\d\.]+)\/([\d\.]+)\/([\d\.]+)/i);
        if (statsMatch) {
          result.avg = parseFloat(parseFloat(statsMatch[2]).toFixed(2));
          result.jitter = parseFloat(parseFloat(statsMatch[4]).toFixed(2));
        }
      }
    } else {
      console.warn(`[Ping] Target ${targetIp} is completely unreachable.`);
    }
  }
  
  return result;
}

/**
 * Performs a TLS connection helper
 */
function testTlsHandshake(host, port, sni) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const socket = tls.connect({
      host: host,
      port: port,
      servername: sni,
      rejectUnauthorized: false,
      timeout: 3000
    }, () => {
      const elapsed = Date.now() - startTime;
      socket.end();
      resolve({ status: 'success', elapsed });
    });

    socket.on('error', (err) => {
      const elapsed = Date.now() - startTime;
      resolve({ status: 'error', error: err.message, code: err.code, elapsed });
    });

    socket.on('timeout', () => {
      const elapsed = Date.now() - startTime;
      socket.destroy();
      resolve({ status: 'timeout', elapsed });
    });
  });
}

/**
 * Checks for SNI-based DPI blocking on the local connection
 */
export async function runDpiDetection() {
  console.log('[DPI] Checking for SNI blocking...');
  const cleanTest = await testTlsHandshake('1.1.1.1', 443, 'google.com');
  
  // If clean test failed, either offline or 1.1.1.1 is unreachable
  if (cleanTest.status !== 'success') {
    return { status: 'Inconclusive', details: 'Offline or public DNS port 443 blocked' };
  }
  
  // Test blocked hosts SNI
  const blocked1 = await testTlsHandshake('1.1.1.1', 443, 'instagram.com');
  const blocked2 = await testTlsHandshake('1.1.1.1', 443, 'rutracker.org');
  
  // Check if blocked SNIs failed with timeout or connection reset
  const isBlocked1 = blocked1.status === 'timeout' || (blocked1.status === 'error' && (blocked1.code === 'ECONNRESET' || blocked1.code === 'EPIPE'));
  const isBlocked2 = blocked2.status === 'timeout' || (blocked2.status === 'error' && (blocked2.code === 'ECONNRESET' || blocked2.code === 'EPIPE'));
  
  if (isBlocked1 && isBlocked2) {
    return { status: 'Detected', details: 'SNI-based blocking/interception detected' };
  }
  
  return { status: 'Not Detected', details: 'No SNI-based filtering observed' };
}
