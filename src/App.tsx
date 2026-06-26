import React, { useState, useEffect } from 'react';
import { 
  Wifi, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Server, 
  Settings, 
  AlertTriangle, 
  ChevronRight, 
  Info, 
  Lock, 
  RefreshCw, 
  Globe, 
  Radio, 
  X, 
  ArrowRight,
  Database,
  CheckCircle2,
  Power,
  Share2
} from 'lucide-react';

// Unified schema definitions
interface WifiNetwork {
  ssid: string;
  isCurrent: boolean;
  phyMode: string;
  channel: number;
  band: string;
  width: number;
  security: string;
  signal: number;
  noise: number;
}

interface ClientDevice {
  ip: string;
  mac: string;
  name: string;
  band: string;
  signal: number;
}

interface Recommendation {
  id: string;
  category: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  problem: string;
  solution: string;
  benefit: string;
  location: string;
  currentValue: string;
  recommendedValue: string;
}

interface NetworkPingResult {
  ip: string;
  avg: number;
  loss: number;
  jitter: number;
}

interface ScanResult {
  routerInfo: {
    brand: string;
    model: string;
    firmwareVersion: string;
    uptime: string;
    cpuUsage: number;
    ramUsage: number;
    wanIp: string;
    clientRetrievalMethod?: string;
    dhcp: {
      rangeStart: string;
      rangeEnd: string;
      poolSize: number;
      activeClients: number;
      leaseTime: string;
    };
    dns: {
      servers: string[];
      isCustom: boolean;
    };
    upnp: {
      enabled: boolean;
    };
    remoteManagement: {
      enabled: boolean;
      port: number;
    };
    wps: {
      enabled: boolean;
    };
    interfaces: {
      wifi2g: {
        ssid: string;
        enabled: boolean;
        band: string;
        channel: number;
        width: number;
        encryption: string;
        keyLength: number;
        wpsEnabled: boolean;
      };
      wifi5g?: {
        ssid: string;
        enabled: boolean;
        band: string;
        channel: number;
        width: number;
        encryption: string;
        keyLength: number;
        wpsEnabled: boolean;
      };
    };
    clientsCount: number;
    clients: ClientDevice[];
  };
  wifiEnvironment: WifiNetwork[];
  report: {
    score: number;
    metrics: {
      totalIssues: number;
      critical: number;
      warning: number;
      info: number;
      wifiCongestionLevel: 'High' | 'Medium' | 'Low';
    };
    recommendations: Recommendation[];
  };
  networkDiagnostics: {
    gateway: NetworkPingResult;
    internet: NetworkPingResult;
    dpi: {
      status: 'Detected' | 'Not Detected' | 'Inconclusive';
      details: string;
    };
  };
}

export default function App() {
  const [screen, setScreen] = useState<'connect' | 'scanning' | 'results' | 'shutdown'>('connect');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [formData, setFormData] = useState({
    ip: '192.168.1.1',
    username: 'admin',
    password: '',
    model: 'Keenetic (Demo)'
  });

  const [scanStep, setScanStep] = useState<number>(0);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  
  // Interactive UI filters and overlays
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [recFilter, setRecFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [wifiFilter, setWifiFilter] = useState<'all' | '2GHz' | '5GHz'>('all');
  const [activeTab, setActiveTab] = useState<'issues' | 'wifi' | 'network' | 'clients'>('issues');
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [chartBand, setChartBand] = useState<'2.4GHz' | '5GHz'>('2.4GHz');

  // Auto-dismiss share toast
  useEffect(() => {
    if (shareToast) {
      const timer = setTimeout(() => setShareToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [shareToast]);

  // Fast auto-IP detection when changing router template
  useEffect(() => {
    const modelLower = formData.model.toLowerCase();
    let defaultIp = '192.168.1.1';
    
    if (modelLower.includes('tp-link') || modelLower.includes('d-link') || modelLower.includes('tenda')) {
      defaultIp = '192.168.0.1';
    } else if (modelLower.includes('asuswrt') || modelLower.includes('asus')) {
      defaultIp = '192.168.50.1';
    } else if (modelLower.includes('fritz')) {
      defaultIp = '192.168.178.1';
    } else if (modelLower.includes('xiaomi') || modelLower.includes('miwifi')) {
      defaultIp = '192.168.31.1';
    } else if (modelLower.includes('huawei')) {
      defaultIp = '192.168.3.1';
    }
    
    setFormData(prev => ({ ...prev, ip: defaultIp }));
  }, [formData.model]);

  // Adjust router model options when toggling demo/real mode
  const handleModeChange = (demo: boolean) => {
    setIsDemoMode(demo);
    setFormData(prev => ({
      ...prev,
      model: demo ? 'Keenetic (Demo)' : 'auto',
      password: ''
    }));
  };

  const handleExit = async () => {
    if (window.confirm('Вы действительно хотите остановить работу Сетевого Радара и закрыть приложение?')) {
      setScreen('shutdown');
      try {
        await fetch('/api/exit', { method: 'POST' });
      } catch (err) {
        // ignore because connection is closed as server shuts down
      }
    }
  };

  const generateMarkdownReport = (res: ScanResult) => {
    const issues = res.report.recommendations;
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warningIssues = issues.filter(i => i.severity === 'warning');
    
    let report = `## Отчет о диагностике сети: ${res.routerInfo.brand} ${res.routerInfo.model}\n`;
    report += `*Дата проведения:* ${new Date().toLocaleString('ru-RU')}\n`;
    report += `*Оценка сети:* ${res.report.score}/100 (${getScoreText(res.report.score)})\n\n`;
    
    report += `### 📡 Информация об оборудовании\n`;
    report += `- **ПО (Прошивка):** ${res.routerInfo.firmwareVersion}\n`;
    report += `- **Uptime:** ${res.routerInfo.uptime}\n`;
    report += `- **WAN IP:** ${res.routerInfo.wanIp}\n`;
    report += `- **Активные DHCP клиенты:** ${res.routerInfo.dhcp.activeClients} из ${res.routerInfo.dhcp.poolSize}\n`;
    report += `- **WPS Статус:** ${res.routerInfo.wps.enabled ? 'Включен (Уязвимо)' : 'Выключен'}\n`;
    report += `- **UPnP Статус:** ${res.routerInfo.upnp.enabled ? 'Включен' : 'Выключен'}\n\n`;
    
    report += `### ⚡ Качество сети и DPI\n`;
    report += `- **Локальный шлюз (${res.networkDiagnostics.gateway.ip}):** Latency ${res.networkDiagnostics.gateway.avg}ms, Jitter ${res.networkDiagnostics.gateway.jitter}ms, Loss ${res.networkDiagnostics.gateway.loss}%\n`;
    report += `- **Внешний интернет (1.1.1.1):** Latency ${res.networkDiagnostics.internet.avg}ms, Jitter ${res.networkDiagnostics.internet.jitter}ms, Loss ${res.networkDiagnostics.internet.loss}%\n`;
    report += `- **Статус фильтрации DPI:** ${res.networkDiagnostics.dpi.status} (${res.networkDiagnostics.dpi.details})\n\n`;
    
    report += `### ⚠️ Обнаруженные проблемы и рекомендации\n`;
    if (issues.length === 0) {
      report += `Проблем не обнаружено. Ваши настройки соответствуют лучшим практикам!\n`;
    } else {
      if (criticalIssues.length > 0) {
        report += `#### 🚨 Критические (${criticalIssues.length}):\n`;
        criticalIssues.forEach(i => {
          report += `- **${i.title}** (${i.category})\n`;
          report += `  *Проблема:* ${i.problem}\n`;
          report += `  *Решение:* ${i.solution} (Раздел: ${i.location})\n`;
        });
        report += `\n`;
      }
      if (warningIssues.length > 0) {
        report += `#### ⚠️ Предупреждения (${warningIssues.length}):\n`;
        warningIssues.forEach(i => {
          report += `- **${i.title}** (${i.category})\n`;
          report += `  *Проблема:* ${i.problem}\n`;
          report += `  *Решение:* ${i.solution} (Раздел: ${i.location})\n`;
        });
        report += `\n`;
      }
      const infoIssues = issues.filter(i => i.severity === 'info');
      if (infoIssues.length > 0) {
        report += `#### 💡 Советы (${infoIssues.length}):\n`;
        infoIssues.forEach(i => {
          report += `- **${i.title}**\n`;
          report += `  *Решение:* ${i.solution}\n`;
        });
      }
    }
    
    return report;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShareToast('Отчет скопирован в буфер обмена в формате Markdown!');
    } catch (err) {
      setShareToast('Не удалось скопировать отчет.');
    }
  };

  const handleShareReport = async () => {
    if (!scanResult) return;
    const md = generateMarkdownReport(scanResult);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Отчет о состоянии сети: ${scanResult.routerInfo.brand}`,
          text: md
        });
        setShareToast('Успешно отправлено!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await copyToClipboard(md);
        }
      }
    } else {
      await copyToClipboard(md);
    }
  };

  // Scanning sequence steps list
  const scanningSteps = [
    'Установка безопасного соединения с роутером...',
    'Чтение конфигурации беспроводных интерфейсов...',
    'Анализ радиоэфира и соседних Wi-Fi сетей...',
    'Запуск экспертного логического анализатора...'
  ];

  // Scan trigger
  const handleStartScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setScreen('scanning');
    setScanStep(0);
    setScanProgress(0);

    // Frontend animation timings for smooth loading UX (4 seconds total)
    const stepInterval = setInterval(() => {
      setScanStep(prev => {
        if (prev < 3) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 1000);

    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev < 100) return prev + 2;
        clearInterval(progressInterval);
        return prev;
      });
    }, 80);

    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: isDemoMode ? '127.0.0.1' : formData.ip,
          username: formData.username,
          password: formData.password,
          model: formData.model
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при подключении к роутеру.');
      }

      // Keep screen on scanning for at least 4s to complete the premium scanning animation
      setTimeout(() => {
        setScanResult(data);
        setScreen('results');
        setActiveTab('issues');
        clearInterval(stepInterval);
        clearInterval(progressInterval);
      }, 4200);

    } catch (err: any) {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      setErrorMsg(err.message || 'Не удалось связаться с агентом диагностики.');
      setScreen('connect');
    }
  };

  // Reset tool state
  const handleReset = () => {
    setScanResult(null);
    setSelectedRec(null);
    setRecFilter('all');
    setScreen('connect');
  };

  // Recommendations rating coloring
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'success';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  const getScoreText = (score: number) => {
    if (score >= 85) return 'Отлично';
    if (score >= 60) return 'Удовлетворительно';
    return 'Критично';
  };

  const get2gChannelLoad = (channel: number) => {
    const networksInBand = scanResult?.wifiEnvironment.filter(n => n.band === '2GHz' || n.band === '2.4GHz') || [];
    let load = 0;
    let count = 0;
    networksInBand.forEach(net => {
      const halfWidth = net.width === 40 ? 4 : 2;
      if (Math.abs(net.channel - channel) <= halfWidth) {
        count++;
        // Weighted congestion contribution based on signal strength
        if (net.signal >= -50) {
          load += 45;
        } else if (net.signal >= -65) {
          load += 25;
        } else if (net.signal >= -75) {
          load += 12;
        } else if (net.signal >= -85) {
          load += 5;
        } else {
          load += 2;
        }
      }
    });
    const percentage = Math.min(100, load);
    return { percentage, count };
  };

  const get5gChannelLoad = (channel: number) => {
    const networksInBand = scanResult?.wifiEnvironment.filter(n => n.band === '5GHz') || [];
    let load = 0;
    let count = 0;
    networksInBand.forEach(net => {
      const chDiff = Math.abs(net.channel - channel);
      let overlap = false;
      if (net.channel === channel) {
        overlap = true;
      } else if (net.width === 40 && chDiff <= 4) {
        overlap = true;
      } else if (net.width === 80 && chDiff <= 12) {
        overlap = true;
      } else if (net.width === 160 && chDiff <= 28) {
        overlap = true;
      }
      if (overlap) {
        count++;
        // Weighted congestion contribution based on signal strength
        if (net.signal >= -50) {
          load += 45;
        } else if (net.signal >= -65) {
          load += 25;
        } else if (net.signal >= -75) {
          load += 12;
        } else if (net.signal >= -85) {
          load += 5;
        } else {
          load += 2;
        }
      }
    });
    const percentage = Math.min(100, load);
    return { percentage, count };
  };

  const isChannelCurrent = (channel: number, band: '2GHz' | '5GHz') => {
    if (band === '2GHz') {
      const current2g = scanResult?.routerInfo.interfaces.wifi2g;
      if (current2g?.enabled && current2g.channel === channel) return true;
      const currentNet = scanResult?.wifiEnvironment.find(n => n.isCurrent);
      if (currentNet && (currentNet.band === '2GHz' || currentNet.band === '2.4GHz') && currentNet.channel === channel) return true;
    } else {
      const current5g = scanResult?.routerInfo.interfaces.wifi5g;
      if (current5g?.enabled && current5g.channel === channel) return true;
      const currentNet = scanResult?.wifiEnvironment.find(n => n.isCurrent);
      if (currentNet && currentNet.band === '5GHz' && currentNet.channel === channel) return true;
    }
    return false;
  };

  const channels5g = [36, 40, 44, 48, 52, 56, 60, 64, 100, 104, 108, 112, 116, 120, 124, 128, 132, 136, 140, 144, 149, 153, 157, 161, 165];

  const filteredRecommendations = scanResult?.report.recommendations.filter(rec => {
    if (recFilter === 'all') return true;
    return rec.severity === recFilter;
  }) || [];

  const filteredWifi = scanResult?.wifiEnvironment.filter(net => {
    if (wifiFilter === 'all') return true;
    return net.band === wifiFilter;
  }) || [];

  return (
    <div className="app-container">
      {/* HEADER */}
      {screen !== 'shutdown' && (
        <header className="fade-in">
          <h1 className="title-glow">
            <span>📡</span> Сетевой Радар
          </h1>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div className="status-badge">
              <Activity size={14} className="animate-pulse" />
              <span>Локальный агент v1.0</span>
            </div>
            <button className="exit-btn" onClick={handleExit} title="Остановить работу и выйти из приложения">
              <Power size={14} />
              <span>Выйти</span>
            </button>
          </div>
        </header>
      )}

      {/* 1. CONNECTION SCREEN */}
      {screen === 'connect' && (
        <div className="glass-panel fade-in" style={{ padding: '2.5rem', maxWidth: '600px', margin: '2rem auto 0 auto' }}>
          <h2 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>Диагностика Wi-Fi и Роутера</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem', lineHeight: 1.5 }}>
            Подключитесь к панели управления вашего роутера для сбора параметров и анализа соседних Wi-Fi сетей.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <button 
              type="button"
              className={`btn ${isDemoMode ? '' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', boxShadow: 'none' }}
              onClick={() => handleModeChange(true)}
            >
              Режим симуляции (Demo)
            </button>
            <button 
              type="button"
              className={`btn ${!isDemoMode ? '' : 'btn-secondary'}`}
              style={{ flex: 1, padding: '0.6rem', fontSize: '0.9rem', boxShadow: 'none' }}
              onClick={() => handleModeChange(false)}
            >
              Реальный роутер
            </button>
          </div>

          {errorMsg && (
            <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#f87171', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleStartScan}>
            <div className="form-group">
              <label>Модель роутера</label>
              <select 
                className="form-control"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              >
                {isDemoMode ? (
                  <>
                    <option value="Keenetic (Demo)">Keenetic KN-1711 (Demo)</option>
                    <option value="OpenWrt (Demo)">Archer C7 v5 OpenWrt (Demo)</option>
                    <option value="ASUSWRT (Demo)">ASUS RT-AX58U (Demo)</option>
                    <option value="FRITZ!Box (Demo)">AVM FRITZ!Box 7590 AX (Demo)</option>
                    <option value="Xiaomi (Demo)">Xiaomi Router AX3200 (Demo)</option>
                    <option value="Huawei (Demo)">Huawei WiFi AX3 (Demo)</option>
                    <option value="D-Link (Demo)">D-Link DIR-842 (Demo)</option>
                    <option value="Tenda (Demo)">Tenda AC23 (Demo)</option>
                    <option value="TP-Link (Demo)">TP-Link Archer AX23 (Demo)</option>
                  </>
                ) : (
                  <>
                    <option value="auto">Определить автоматически (Рекомендуется)</option>
                    <option value="Keenetic">Keenetic RCI (KeeneticOS 3.x / 4.x)</option>
                    <option value="OpenWrt">OpenWrt LuCI JSON-RPC</option>
                    <option value="ASUSWRT">ASUSWRT Stock (ASUS RT-AX / RT-AC)</option>
                    <option value="FRITZ!Box">FRITZ!OS Stock (AVM FRITZ!Box)</option>
                    <option value="Xiaomi">Xiaomi MiWiFi Stock (Mi Router)</option>
                    <option value="Huawei">Huawei Stock (Huawei AX / WS)</option>
                    <option value="D-Link">D-Link Stock (DIR series)</option>
                    <option value="Tenda">Tenda Stock (AC / RX series)</option>
                    <option value="TP-Link">TP-Link / Generic Router (TR-064 / UPnP)</option>
                  </>
                )}
              </select>
            </div>

            {!isDemoMode && (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label>IP-адрес роутера</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.ip} 
                      onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                      placeholder="192.168.1.1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Имя пользователя (Логин)</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      value={formData.username} 
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="admin"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Пароль от админки</label>
                  <input 
                    type="password" 
                    className="form-control" 
                    value={formData.password} 
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}

            {isDemoMode && (
              <div style={{ padding: '0.8rem 1rem', background: 'rgba(30, 144, 255, 0.05)', border: '1px solid rgba(30, 144, 255, 0.15)', borderRadius: '8px', color: '#60a5fa', marginBottom: '1.5rem', fontSize: '0.85rem', lineHeight: 1.4 }}>
                💡 <strong>Режим демо-симуляции:</strong> агент сгенерирует реалистичный набор настроек роутера и запустит реальное сканирование Wi-Fi радиоэфира вашего компьютера (на macOS) для выявления взаимных помех.
              </div>
            )}

            <button type="submit" className="btn" style={{ width: '100%', marginTop: '0.5rem' }}>
              <span>Запустить диагностику</span>
              <ArrowRight size={18} />
            </button>
          </form>
        </div>
      )}

      {/* 2. SCANNING PROGRESS SCREEN */}
      {screen === 'scanning' && (
        <div className="glass-panel fade-in" style={{ padding: '3.5rem 2.5rem', maxWidth: '600px', margin: '3rem auto 0 auto', textAlign: 'center' }}>
          {/* Animated Scanning Radar */}
          <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 2.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '2px solid rgba(30, 144, 255, 0.15)', animation: 'pulseGlow 2.5s infinite ease-in-out' }}></div>
            <div style={{ position: 'absolute', width: '80%', height: '80%', borderRadius: '50%', border: '1px solid rgba(30, 144, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ position: 'absolute', width: '50%', height: '50%', borderRadius: '50%', background: 'rgba(30, 144, 255, 0.05)', border: '1px dashed rgba(30, 144, 255, 0.5)' }}></div>
            </div>
            
            {/* Radar Sweep Rotating Bar */}
            <div style={{ 
              position: 'absolute', 
              width: '80px', 
              height: '80px', 
              top: '0', 
              left: '80px', 
              transformOrigin: 'bottom left', 
              background: 'linear-gradient(45deg, rgba(30, 144, 255, 0.4) 0%, transparent 80%)',
              borderTopRightRadius: '100%',
              animation: 'spin 2s linear infinite'
            }}></div>
            
            <Wifi size={44} className="animate-bounce" style={{ color: '#1e90ff', zIndex: 2 }} />
          </div>

          <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Выполняется сканирование сети...</h3>
          
          {/* Progress Bar Container */}
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden', marginBottom: '2.5rem' }}>
            <div style={{ 
              width: `${scanProgress}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, #1e90ff, #8a2be2)', 
              borderRadius: '999px',
              transition: 'width 0.1s ease'
            }}></div>
          </div>

          {/* Checklist Animation */}
          <div style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
            {scanningSteps.map((step, idx) => {
              const isActive = scanStep === idx;
              const isCompleted = scanStep > idx;
              return (
                <div key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.75rem', 
                  marginBottom: '1rem',
                  opacity: isActive || isCompleted ? 1 : 0.25,
                  transition: 'opacity 0.3s ease'
                }}>
                  {isCompleted ? (
                    <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                  ) : isActive ? (
                    <RefreshCw size={18} className="animate-spin" style={{ color: '#1e90ff' }} />
                  ) : (
                    <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--text-dark)' }}></div>
                  )}
                  <span style={{ fontSize: '0.9rem', color: isActive ? '#fff' : 'var(--text-muted)', fontWeight: isActive ? 500 : 400 }}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. RESULTS SCREEN */}
      {screen === 'results' && scanResult && (
        <div className="fade-in">
          {/* Router Header Info */}
          <div className="glass-panel" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', display: 'flex', justifyContent: 'between', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
              <div style={{ padding: '0.75rem', background: 'rgba(30, 144, 255, 0.1)', borderRadius: '12px', border: '1px solid rgba(30, 144, 255, 0.2)' }}>
                <Server size={30} style={{ color: '#1e90ff' }} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Анализируемое устройство</span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>{scanResult.routerInfo.brand} {scanResult.routerInfo.model}</h2>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Версия ПО</span>
                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{scanResult.routerInfo.firmwareVersion}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Uptime</span>
                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{scanResult.routerInfo.uptime}</p>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Внешний WAN IP</span>
                <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{scanResult.routerInfo.wanIp}</p>
              </div>
              <button className="btn" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', boxShadow: 'none' }} onClick={handleShareReport}>
                <Share2 size={14} />
                <span>Поделиться</span>
              </button>
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={handleReset}>
                <RefreshCw size={14} />
                <span>Новый скан</span>
              </button>
            </div>
          </div>

          <div className="grid-container">
            {/* LEFT COLUMN: GENERAL STATUS & SCORE */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Score circle box */}
              <div className="glass-panel flex-between" style={{ padding: '1.5rem 2rem', gap: '1.5rem', flexDirection: 'column', textAlign: 'center' }}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <div className={`score-circle-glow ${getScoreColor(scanResult.report.score)}`}></div>
                  <div className="score-circle">
                    <span className="score-value">{scanResult.report.score}</span>
                    <span className="score-label">Баллов</span>
                  </div>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.35rem' }}>Оценка сети: {getScoreText(scanResult.report.score)}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Индекс безопасности и качества настроек Wi-Fi радиоэфира
                  </p>
                </div>
              </div>

              {/* Resource usage & status panel */}
              <div className="glass-panel" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                  <Activity size={16} style={{ color: '#1e90ff' }} />
                  <span>Статус оборудования</span>
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Загрузка процессора (CPU)</span>
                      <span>{scanResult.routerInfo.cpuUsage}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${scanResult.routerInfo.cpuUsage}%`, height: '100%', background: '#1e90ff' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex-between" style={{ fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Оперативная память (RAM)</span>
                      <span>{scanResult.routerInfo.ramUsage}%</span>
                    </div>
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${scanResult.routerInfo.ramUsage}%`, height: '100%', background: '#8a2be2' }}></div>
                    </div>
                  </div>

                  <div className="flex-between" style={{ fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Database size={14} /> DHCP Клиенты</span>
                    <span style={{ fontWeight: 600 }}>{scanResult.routerInfo.dhcp.activeClients} из {scanResult.routerInfo.dhcp.poolSize}</span>
                  </div>

                  <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Globe size={14} /> DNS Серверы</span>
                    <span style={{ fontWeight: 600, color: scanResult.routerInfo.dns.isCustom ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {scanResult.routerInfo.dns.isCustom ? 'Публичные DNS' : 'DNS Провайдера'}
                    </span>
                  </div>

                  <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Lock size={14} /> Защита WPS</span>
                    <span style={{ fontWeight: 600, color: scanResult.routerInfo.wps.enabled ? 'var(--color-critical)' : 'var(--color-success)' }}>
                      {scanResult.routerInfo.wps.enabled ? 'Активна (Опасно)' : 'Выключена'}
                    </span>
                  </div>

                  <div className="flex-between" style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Settings size={14} /> UPnP служба</span>
                    <span style={{ fontWeight: 600, color: scanResult.routerInfo.upnp.enabled ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {scanResult.routerInfo.upnp.enabled ? 'Включена' : 'Выключена'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: ACTIONABLE TABS */}
            <div>
              {/* Tab switching */}
              <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <button 
                  className={`btn-secondary`}
                  style={{ 
                    background: activeTab === 'issues' ? 'rgba(30, 144, 255, 0.15)' : 'transparent',
                    borderColor: activeTab === 'issues' ? 'var(--color-primary)' : 'transparent',
                    padding: '0.5rem 1rem', 
                    fontSize: '0.9rem',
                    boxShadow: 'none',
                    borderRadius: '8px'
                  }}
                  onClick={() => setActiveTab('issues')}
                >
                  Рекомендации ({scanResult.report.metrics.totalIssues})
                </button>
                <button 
                  className={`btn-secondary`}
                  style={{ 
                    background: activeTab === 'wifi' ? 'rgba(30, 144, 255, 0.15)' : 'transparent',
                    borderColor: activeTab === 'wifi' ? 'var(--color-primary)' : 'transparent',
                    padding: '0.5rem 1rem', 
                    fontSize: '0.9rem',
                    boxShadow: 'none',
                    borderRadius: '8px'
                  }}
                  onClick={() => setActiveTab('wifi')}
                >
                  Окружающий эфир ({scanResult.wifiEnvironment.length})
                </button>
                <button 
                  className={`btn-secondary`}
                  style={{ 
                    background: activeTab === 'network' ? 'rgba(30, 144, 255, 0.15)' : 'transparent',
                    borderColor: activeTab === 'network' ? 'var(--color-primary)' : 'transparent',
                    padding: '0.5rem 1rem', 
                    fontSize: '0.9rem',
                    boxShadow: 'none',
                    borderRadius: '8px'
                  }}
                  onClick={() => setActiveTab('network')}
                >
                  Качество сети / DPI
                </button>
                <button 
                  className={`btn-secondary`}
                  style={{ 
                    background: activeTab === 'clients' ? 'rgba(30, 144, 255, 0.15)' : 'transparent',
                    borderColor: activeTab === 'clients' ? 'var(--color-primary)' : 'transparent',
                    padding: '0.5rem 1rem', 
                    fontSize: '0.9rem',
                    boxShadow: 'none',
                    borderRadius: '8px'
                  }}
                  onClick={() => setActiveTab('clients')}
                >
                  Подключенные клиенты ({scanResult.routerInfo.clientsCount})
                </button>
              </div>

              {/* TAB 1: RECOMMENDATIONS */}
              {activeTab === 'issues' && (
                <div className="fade-in">
                  {/* Category filters */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    {(['all', 'critical', 'warning', 'info'] as const).map(filter => {
                      const labels = { all: 'Все', critical: 'Критические', warning: 'Предупреждения', info: 'Рекомендации' };
                      return (
                        <button
                          key={filter}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.35rem 0.75rem',
                            fontSize: '0.8rem',
                            background: recFilter === filter ? 'var(--text-main)' : 'rgba(255,255,255,0.03)',
                            color: recFilter === filter ? '#000' : 'var(--text-main)',
                            borderColor: recFilter === filter ? '#fff' : 'var(--border-color)'
                          }}
                          onClick={() => setRecFilter(filter)}
                        >
                          {labels[filter]}
                        </button>
                      );
                    })}
                  </div>

                  {filteredRecommendations.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <ShieldCheck size={48} style={{ color: 'var(--color-success)', margin: '0 auto 1rem auto' }} />
                      <p>Проблем выбранного типа не найдено. Настройки в идеальном порядке!</p>
                    </div>
                  ) : (
                    <div>
                      {filteredRecommendations.map(rec => (
                        <div 
                          key={rec.id} 
                          className={`glass-panel glass-panel-interactive recommendation-item ${rec.severity}`}
                          onClick={() => setSelectedRec(rec)}
                        >
                          <div style={{ flexShrink: 0, marginTop: '0.2rem' }}>
                            {rec.severity === 'critical' ? (
                              <ShieldAlert size={22} style={{ color: 'var(--color-critical)' }} />
                            ) : rec.severity === 'warning' ? (
                              <AlertTriangle size={22} style={{ color: 'var(--color-warning)' }} />
                            ) : (
                              <Info size={22} style={{ color: 'var(--color-info)' }} />
                            )}
                          </div>
                          
                          <div style={{ flex: 1 }}>
                            <div className="flex-between" style={{ marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {rec.category}
                              </span>
                              <span className={`severity-badge ${rec.severity}`}>
                                {rec.severity === 'critical' ? 'критично' : rec.severity === 'warning' ? 'предупреждение' : 'совет'}
                              </span>
                            </div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>{rec.title}</h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {rec.problem}
                            </p>
                          </div>
                          
                          <div style={{ alignSelf: 'center', color: 'var(--text-dark)' }}>
                            <ChevronRight size={20} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: WIRELESS ENVIRONMENT SCAN */}
              {activeTab === 'wifi' && (
                <div className="glass-panel fade-in" style={{ padding: '1.5rem' }}>
                  <div className="flex-between" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Локальное сканирование Wi-Fi</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Загруженность окружающих каналов и сила сигналов соседних точек доступа.</p>
                    </div>
                    
                    {/* Band filtering */}
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      {(['all', '2GHz', '5GHz'] as const).map(band => (
                        <button
                          key={band}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            background: wifiFilter === band ? 'rgba(30, 144, 255, 0.15)' : 'transparent',
                            borderColor: wifiFilter === band ? 'var(--color-primary)' : 'var(--border-color)',
                            color: wifiFilter === band ? '#1e90ff' : 'var(--text-main)',
                            boxShadow: 'none'
                          }}
                          onClick={() => setWifiFilter(band)}
                        >
                          {band}
                        </button>
                      ))}
                    </div>
                  </div>

                  {scanResult.wifiEnvironment.some(net => net.ssid.includes('Сеть #')) && (
                    <div style={{
                      padding: '0.8rem 1rem',
                      background: 'rgba(30, 144, 255, 0.05)',
                      border: '1px solid rgba(30, 144, 255, 0.15)',
                      borderRadius: '8px',
                      color: 'var(--text-muted)',
                      fontSize: '0.8rem',
                      lineHeight: 1.4,
                      marginBottom: '1.25rem',
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'flex-start'
                    }}>
                      <Info size={16} style={{ flexShrink: 0, color: '#1e90ff', marginTop: '0.1rem' }} />
                      <span>
                        <strong>Конфиденциальность macOS:</strong> Имена соседних сетей скрыты операционной системой. Чтобы отобразить реальные названия (SSID), предоставьте приложению «Терминал» (или вашей оболочке) доступ к службам геолокации в настройках конфиденциальности macOS.
                      </span>
                    </div>
                  )}

                  {/* Graphical Channel Congestion Chart */}
                  <div style={{ marginBottom: '2rem', padding: '1.25rem', background: 'rgba(0,0,0,0.15)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="flex-between" style={{ marginBottom: '1.25rem' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        📊 Анализ загруженности каналов
                      </span>
                      <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '6px' }}>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.75rem',
                            background: chartBand === '2.4GHz' ? 'rgba(30, 144, 255, 0.2)' : 'transparent',
                            borderColor: chartBand === '2.4GHz' ? 'rgba(30, 144, 255, 0.4)' : 'transparent',
                            color: chartBand === '2.4GHz' ? '#fff' : 'var(--text-muted)',
                            borderRadius: '4px',
                            boxShadow: 'none'
                          }}
                          onClick={() => setChartBand('2.4GHz')}
                        >
                          2.4 ГГц
                        </button>
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.75rem',
                            background: chartBand === '5GHz' ? 'rgba(30, 144, 255, 0.2)' : 'transparent',
                            borderColor: chartBand === '5GHz' ? 'rgba(30, 144, 255, 0.4)' : 'transparent',
                            color: chartBand === '5GHz' ? '#fff' : 'var(--text-muted)',
                            borderRadius: '4px',
                            boxShadow: 'none'
                          }}
                          onClick={() => setChartBand('5GHz')}
                        >
                          5 ГГц
                        </button>
                      </div>
                    </div>

                    {chartBand === '2.4GHz' ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', height: '140px', alignItems: 'flex-end', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', gap: '6px' }}>
                          {Array.from({ length: 13 }, (_, i) => i + 1).map(ch => {
                            const { percentage, count } = get2gChannelLoad(ch);
                            const isCurrent = isChannelCurrent(ch, '2GHz');
                            const barColor = percentage > 70 
                              ? 'linear-gradient(to top, var(--color-critical-glow) 30%, var(--color-critical))' 
                              : percentage > 35 
                                ? 'linear-gradient(to top, var(--color-warning-glow) 30%, var(--color-warning))' 
                                : 'linear-gradient(to top, var(--color-success-glow) 30%, var(--color-success))';
                            
                            return (
                              <div key={ch} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', position: 'absolute', top: '-1.25rem', whiteSpace: 'nowrap' }}>
                                  {count > 0 ? `${count} шт` : 'свободно'}
                                </div>
                                <div 
                                  className={`channel-bar ${isCurrent ? 'current' : ''}`}
                                  style={{
                                    width: '100%',
                                    height: `${Math.max(5, percentage)}%`,
                                    background: barColor,
                                    borderRadius: '4px 4px 0 0',
                                    transition: 'height 0.5s ease',
                                    position: 'relative'
                                  }}
                                  title={`Канал ${ch}: Загруженность ${percentage}%, сетей: ${count}`}
                                >
                                  {isCurrent && (
                                    <div style={{ position: 'absolute', top: '-5px', left: '50%', transform: 'translateX(-50%)', width: '8px', height: '8px', background: '#1e90ff', borderRadius: '50%', boxShadow: '0 0 8px #1e90ff' }}></div>
                                  )}
                                </div>
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  marginTop: '0.4rem', 
                                  fontWeight: isCurrent ? 'bold' : 'normal',
                                  color: isCurrent ? '#1e90ff' : 'var(--text-main)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}>
                                  {ch} {isCurrent && '★'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '0.75rem', textAlign: 'center' }}>
                          ★ отмечен ваш текущий рабочий канал. Оптимальные каналы в 2.4 ГГц — это 1, 6 и 11 (не перекрывающиеся).
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(55px, 1fr))', gap: '8px', padding: '0.5rem 0' }}>
                          {channels5g.map(ch => {
                            const { percentage, count } = get5gChannelLoad(ch);
                            const isCurrent = isChannelCurrent(ch, '5GHz');
                            let statusClass = 'free';
                            if (isCurrent) statusClass = 'current';
                            else if (count > 0) statusClass = percentage > 50 ? 'busy' : 'occupied';

                            return (
                              <div 
                                key={ch} 
                                className={`channel-grid-item ${statusClass}`}
                                title={`Канал ${ch}: Загруженность ${percentage}%, сетей: ${count}`}
                              >
                                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{ch}</span>
                                {isCurrent ? (
                                  <span style={{ fontSize: '0.55rem', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Мой</span>
                                ) : count > 0 ? (
                                  <span style={{ fontSize: '0.55rem', display: 'block', color: 'var(--text-muted)' }}>{count} шт</span>
                                ) : (
                                  <span style={{ fontSize: '0.55rem', display: 'block', color: '#4ade80' }}>свободен</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dark)', marginTop: '0.75rem', textAlign: 'center' }}>
                          Каналы 5 ГГц не пересекаются напрямую, но широкие полосы (40/80/160 МГц) могут объединять соседние частоты.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="client-list">
                    {filteredWifi.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Сети не обнаружены или применены фильтры.
                      </div>
                    ) : (
                      filteredWifi.map((net, idx) => (
                        <div key={idx} className="client-item">
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <Radio size={14} style={{ color: net.isCurrent ? 'var(--color-success)' : 'var(--text-muted)' }} />
                              <span>{net.ssid || '<Имя скрыто в целях безопасности>'}</span>
                              {net.isCurrent && <span style={{ fontSize: '0.65rem', background: 'var(--color-success-glow)', color: 'var(--color-success)', border: '1px solid rgba(74, 222, 128, 0.2)', padding: '0.05rem 0.35rem', borderRadius: '4px', textTransform: 'uppercase' }}>Ваша сеть</span>}
                            </p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              Band: {net.band} ({net.width}MHz) • Шифрование: {net.security}
                            </p>
                          </div>
                          
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ 
                              fontSize: '0.75rem', 
                              padding: '0.25rem 0.5rem', 
                              borderRadius: '4px',
                              fontWeight: 600,
                              background: net.signal >= -60 ? 'var(--color-success-glow)' : net.signal >= -75 ? 'var(--color-warning-glow)' : 'var(--color-critical-glow)',
                              color: net.signal >= -60 ? '#4ade80' : net.signal >= -75 ? '#fbbf24' : '#f87171'
                            }}>
                              Канал {net.channel} ({net.signal} дБм)
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: NETWORK QUALITY & DPI */}
              {activeTab === 'network' && (
                <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Ping Cards */}
                  <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                      <Activity size={16} style={{ color: '#1e90ff' }} />
                      <span>Качество соединения (Ping / Latency)</span>
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Gateway Ping */}
                      <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Локальный шлюз (Роутер)</span>
                            <h5 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '0.1rem' }}>{scanResult.networkDiagnostics.gateway.ip}</h5>
                          </div>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 600,
                            background: scanResult.networkDiagnostics.gateway.loss === 0 ? 'var(--color-success-glow)' : 'var(--color-critical-glow)',
                            color: scanResult.networkDiagnostics.gateway.loss === 0 ? '#4ade80' : '#f87171'
                          }}>
                            {scanResult.networkDiagnostics.gateway.loss === 0 ? 'Линки стабильны' : `Потери: ${scanResult.networkDiagnostics.gateway.loss}%`}
                          </span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Средний пинг</span>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: scanResult.networkDiagnostics.gateway.avg < 3 ? '#4ade80' : '#fbbf24' }}>
                              {scanResult.networkDiagnostics.gateway.avg} мс
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Джиттер (Jitter)</span>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{scanResult.networkDiagnostics.gateway.jitter} мс</p>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Потери пакетов</span>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: scanResult.networkDiagnostics.gateway.loss === 0 ? '#4ade80' : '#f87171' }}>
                              {scanResult.networkDiagnostics.gateway.loss}%
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Internet Ping */}
                      <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Внешний Интернет (Cloudflare DNS)</span>
                            <h5 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '0.1rem' }}>{scanResult.networkDiagnostics.internet.ip}</h5>
                          </div>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '4px',
                            fontWeight: 600,
                            background: scanResult.networkDiagnostics.internet.loss === 0 ? 'var(--color-success-glow)' : 'var(--color-critical-glow)',
                            color: scanResult.networkDiagnostics.internet.loss === 0 ? '#4ade80' : '#f87171'
                          }}>
                            {scanResult.networkDiagnostics.internet.loss === 0 ? 'Интернет активен' : `Потери: ${scanResult.networkDiagnostics.internet.loss}%`}
                          </span>
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Средний пинг</span>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: scanResult.networkDiagnostics.internet.avg < 45 ? '#4ade80' : scanResult.networkDiagnostics.internet.avg < 100 ? '#fbbf24' : '#f87171' }}>
                              {scanResult.networkDiagnostics.internet.avg} мс
                            </p>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Джиттер (Jitter)</span>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{scanResult.networkDiagnostics.internet.jitter} мс</p>
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Потери пакетов</span>
                            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: scanResult.networkDiagnostics.internet.loss === 0 ? '#4ade80' : '#f87171' }}>
                              {scanResult.networkDiagnostics.internet.loss}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DPI Shield */}
                  <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ 
                      padding: '1rem', 
                      background: scanResult.networkDiagnostics.dpi.status === 'Detected' 
                        ? 'rgba(239, 68, 68, 0.1)' 
                        : scanResult.networkDiagnostics.dpi.status === 'Not Detected'
                          ? 'rgba(74, 222, 128, 0.1)'
                          : 'rgba(255, 255, 255, 0.05)', 
                      borderRadius: '16px', 
                      border: scanResult.networkDiagnostics.dpi.status === 'Detected' 
                        ? '1px solid rgba(239, 68, 68, 0.2)' 
                        : scanResult.networkDiagnostics.dpi.status === 'Not Detected'
                          ? '1px solid rgba(74, 222, 128, 0.2)'
                          : '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '80px',
                      height: '80px',
                      flexShrink: 0
                    }}>
                      {scanResult.networkDiagnostics.dpi.status === 'Detected' ? (
                        <ShieldAlert size={42} style={{ color: 'var(--color-critical)' }} />
                      ) : scanResult.networkDiagnostics.dpi.status === 'Not Detected' ? (
                        <ShieldCheck size={42} style={{ color: 'var(--color-success)' }} />
                      ) : (
                        <AlertTriangle size={42} style={{ color: 'var(--color-warning)' }} />
                      )}
                    </div>
                    
                    <div style={{ flex: 1, minWidth: '250px' }}>
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Анализ блокировок провайдера</span>
                      <h4 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0.15rem 0 0.5rem 0', color: '#fff' }}>
                        {scanResult.networkDiagnostics.dpi.status === 'Detected' 
                          ? 'DPI Блокировки / Фильтрация обнаружена' 
                          : scanResult.networkDiagnostics.dpi.status === 'Not Detected' 
                            ? 'Следов DPI-фильтрации не обнаружено' 
                            : 'Статус DPI-фильтрации не определен'}
                      </h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {scanResult.networkDiagnostics.dpi.status === 'Detected' 
                          ? 'Провайдер перехватывает и сбрасывает (ECONNRESET/Timeout) TLS-соединения с заблокированными SNI (например, instagram.com или rutracker.org) при отправке на публичные IP.' 
                          : scanResult.networkDiagnostics.dpi.status === 'Not Detected' 
                            ? 'Соединения с тестовыми доменами (instagram.com, rutracker.org) на публичный IP-адрес 1.1.1.1 проходят успешно, блокировка на уровне сигнатур SNI не наблюдается.' 
                            : 'Не удалось завершить тест DPI из-за отсутствия стабильного интернет-соединения или полной блокировки порта 443 к серверу 1.1.1.1.'}
                      </p>
                      {scanResult.networkDiagnostics.dpi.status === 'Detected' && (
                        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.8rem', background: 'rgba(239, 68, 68, 0.05)', borderLeft: '3px solid var(--color-critical)', borderRadius: '0 6px 6px 0', fontSize: '0.8rem', color: '#f87171' }}>
                          💡 Рекомендация: используйте утилиты для обхода DPI (GoodbyeDPI, Zapret, ByeDPI) или VPN для восстановления доступа.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: CLIENT DEVICES */}
              {activeTab === 'clients' && (
                <div className="glass-panel fade-in" style={{ padding: '1.5rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>Список активных хостов</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Устройства, подключенные к роутеру в момент диагностики.</p>

                  {(scanResult.routerInfo.model.includes('Fallback') || scanResult.routerInfo.clientRetrievalMethod === 'arp') && (
                    <div style={{ 
                      padding: '0.8rem 1rem', 
                      background: 'rgba(245, 158, 11, 0.05)', 
                      border: '1px solid rgba(245, 158, 11, 0.15)', 
                      borderRadius: '8px', 
                      color: 'var(--text-muted)', 
                      fontSize: '0.8rem', 
                      lineHeight: 1.4, 
                      marginBottom: '1rem',
                      display: 'flex',
                      gap: '0.5rem',
                      alignItems: 'flex-start'
                    }}>
                      <Info size={16} style={{ flexShrink: 0, color: 'var(--color-warning)', marginTop: '0.1rem' }} />
                      <span>
                        <strong>Ограниченный режим (Fallback):</strong> Прямое подключение к API роутера заблокировано или не поддерживается. Список клиентов собран из локального ARP-кэша вашего компьютера и может быть неполным.
                      </span>
                    </div>
                  )}

                  <div className="client-list">
                    {scanResult.routerInfo.clients.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Подключенные беспроводные устройства не обнаружены.
                      </div>
                    ) : (
                      scanResult.routerInfo.clients.map((client, idx) => (
                        <div key={idx} className="client-item">
                          <div>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{client.name || 'Безымянное устройство'}</p>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                              IP: {client.ip} • MAC: {client.mac}
                            </p>
                          </div>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', padding: '0.1rem 0.35rem', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', color: 'var(--text-muted)' }}>
                              {client.band}
                            </span>
                            <span style={{ 
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              color: client.signal >= -60 ? 'var(--color-success)' : client.signal >= -75 ? 'var(--color-warning)' : 'var(--color-critical)'
                            }}>
                              Сигнал: {client.signal} дБм
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. SHUTDOWN SCREEN */}
      {screen === 'shutdown' && (
        <div className="glass-panel fade-in" style={{ padding: '3rem', maxWidth: '500px', margin: '4rem auto 0 auto', textAlign: 'center' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '50%', 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 1.5rem auto' 
          }}>
            <Power size={32} style={{ color: '#f87171' }} />
          </div>
          <h2 style={{ marginBottom: '1rem', fontWeight: 700 }}>Сетевой Радар остановлен</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Локальный агент успешно завершил свою работу и освободил сетевой порт. Теперь вы можете закрыть эту вкладку браузера.
          </p>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            Для повторного запуска запустите команду запуска в терминале.
          </div>
        </div>
      )}

      {/* 5. RECOMMENDATION CARD DETAIL SLIDE-OUT DRAWER */}
      {selectedRec && (
        <div className="details-overlay" onClick={() => setSelectedRec(null)}>
          <div className="details-panel" onClick={(e) => e.stopPropagation()}>
            <div className="details-header">
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {selectedRec.category}
                </span>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem', lineHeight: 1.3 }}>{selectedRec.title}</h3>
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem', borderRadius: '50%', minWidth: 'auto', border: 'none', background: 'rgba(255,255,255,0.05)' }} 
                onClick={() => setSelectedRec(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="details-content" style={{ flex: 1 }}>
              {/* Problem Section */}
              <section>
                <h4>Что не так?</h4>
                <p>{selectedRec.problem}</p>
              </section>

              {/* Solution Section */}
              <section>
                <h4>Что сделать (Решение)?</h4>
                <p style={{ fontWeight: 500, color: '#fff' }}>{selectedRec.solution}</p>
              </section>

              {/* Expected Benefit */}
              <section>
                <h4>Ожидаемый эффект:</h4>
                <div style={{ display: 'flex', gap: '0.5rem', color: 'var(--color-success)' }}>
                  <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                  <p style={{ color: '#4ade80', fontWeight: 500 }}>{selectedRec.benefit}</p>
                </div>
              </section>

              {/* Location in admin panel */}
              <section>
                <h4>Где находится настройка в админке:</h4>
                <div className="config-box" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Settings size={16} style={{ color: '#1e90ff', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: '#60a5fa' }}>{selectedRec.location}</span>
                </div>
              </section>

              {/* Value comparison */}
              <section>
                <h4>Сравнение значений:</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#f87171', display: 'block', marginBottom: '0.25rem' }}>Текущее значение</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#f87171' }}>{selectedRec.currentValue}</span>
                  </div>
                  
                  <div style={{ padding: '0.75rem', background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#4ade80', display: 'block', marginBottom: '0.25rem' }}>Рекомендуется</span>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4ade80' }}>{selectedRec.recommendedValue}</span>
                  </div>
                </div>
              </section>
            </div>
            
            <button 
              className="btn btn-secondary" 
              style={{ width: '100%', marginTop: '1.5rem' }} 
              onClick={() => setSelectedRec(null)}
            >
              <span>Понятно, закрыть</span>
            </button>
          </div>
        </div>
      )}

      {/* 6. TOAST NOTIFICATION */}
      {shareToast && (
        <div className="share-toast fade-in">
          <span>{shareToast}</span>
        </div>
      )}
    </div>
  );
}
