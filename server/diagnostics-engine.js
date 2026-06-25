/**
 * Runs rule-based diagnostics on router config and Wi-Fi scan results.
 * @param {Object} config Router configuration object
 * @param {Array} wifiScan Neighboring Wi-Fi networks
 * @returns {Object} Diagnostic report containing score, recommendations, and metrics
 */
export function runDiagnostics(config, wifiScan = []) {
  const recommendations = [];
  let score = 100;

  const brand = config.brand || 'Generic';
  const getPath = (paths) => paths[brand] || paths['Generic'];

  // Paths mapping in Admin UI for different brands
  const paths = {
    channel2g: {
      Keenetic: 'Wi-Fi Clients -> Home Segment -> Channel',
      OpenWrt: 'Network -> Wireless -> edit 2.4G device -> Channel',
      'TP-Link': 'Advanced -> Wireless -> Wireless Settings -> Channel (2.4GHz)',
      ASUSWRT: 'Advanced Settings -> Wireless -> General -> Control Channel',
      'FRITZ!Box': 'Wi-Fi -> Radio Channel -> Radio Channel Settings -> Adjust manually',
      'Xiaomi MiWiFi': 'Settings -> Wi-Fi -> 2.4GHz Channel',
      Huawei: 'My Wi-Fi -> Wi-Fi Settings -> Channel',
      'D-Link': 'Settings -> Wireless -> Advanced -> Channel',
      Tenda: 'Wireless Settings -> WiFi Name & Password -> Channel',
      Generic: 'Wireless Settings -> 2.4 GHz Channel'
    },
    width2g: {
      Keenetic: 'Wi-Fi Clients -> Home Segment -> Channel Width',
      OpenWrt: 'Network -> Wireless -> edit 2.4G device -> Bandwidth',
      'TP-Link': 'Advanced -> Wireless -> Wireless Settings -> Channel Width (2.4GHz)',
      ASUSWRT: 'Advanced Settings -> Wireless -> General -> Channel Bandwidth',
      'FRITZ!Box': 'Wi-Fi -> Radio Channel -> Wi-Fi Coexistence (enable/disable)',
      'Xiaomi MiWiFi': 'Settings -> Wi-Fi -> 2.4GHz Bandwidth',
      Huawei: 'My Wi-Fi -> Wi-Fi Settings -> Bandwidth',
      'D-Link': 'Settings -> Wireless -> Advanced -> Channel Width',
      Tenda: 'Wireless Settings -> WiFi Name & Password -> Bandwidth',
      Generic: 'Wireless Settings -> 2.4 GHz Bandwidth'
    },
    wifi5gToggle: {
      Keenetic: 'Wi-Fi Clients -> Home Segment -> 5 GHz network (toggle)',
      OpenWrt: 'Network -> Wireless -> click Enable on 5GHz radio',
      'TP-Link': 'Basic -> Wireless -> check 5GHz network',
      ASUSWRT: 'Advanced Settings -> Wireless -> Professional -> Enable Radio (5GHz)',
      'FRITZ!Box': 'Wi-Fi -> Radio Network -> Wi-Fi frequency bands (enable 5 GHz)',
      'Xiaomi MiWiFi': 'Settings -> Wi-Fi -> 5GHz Wi-Fi (toggle)',
      Huawei: 'My Wi-Fi -> Wi-Fi Settings -> 5 GHz Wi-Fi',
      'D-Link': 'Settings -> Wireless -> 5GHz band toggle',
      Tenda: 'Wireless Settings -> WiFi Name & Password -> 5G WiFi',
      Generic: 'Wireless Settings -> Enable 5 GHz'
    },
    wps: {
      Keenetic: 'Wi-Fi Clients -> Home Segment -> WPS (disable)',
      OpenWrt: 'Network -> Wireless -> edit interface -> Wireless Security -> WPS (disable)',
      'TP-Link': 'Advanced -> Wireless -> WPS -> Disable WPS',
      ASUSWRT: 'Advanced Settings -> Wireless -> WPS -> Enable WPS (disable)',
      'FRITZ!Box': 'Wi-Fi -> Security -> WPS Quick Connection',
      'Xiaomi MiWiFi': 'Settings -> Wi-Fi -> WPS',
      Huawei: 'More Functions -> Wi-Fi Settings -> Wi-Fi WPS',
      'D-Link': 'Settings -> Wireless -> WPS',
      Tenda: 'Wireless Settings -> WPS',
      Generic: 'Security Settings -> WPS Configuration'
    },
    encryption2g: {
      Keenetic: 'Wi-Fi Clients -> Home Segment -> Network protection',
      OpenWrt: 'Network -> Wireless -> edit 2.4G interface -> Wireless Security -> Encryption',
      'TP-Link': 'Advanced -> Wireless -> Wireless Settings -> Security (2.4GHz)',
      ASUSWRT: 'Advanced Settings -> Wireless -> General -> Authentication Method',
      'FRITZ!Box': 'Wi-Fi -> Security -> Encryption -> WPA mode',
      'Xiaomi MiWiFi': 'Settings -> Wi-Fi -> 2.4GHz Encryption',
      Huawei: 'My Wi-Fi -> Wi-Fi Settings -> Security mode',
      'D-Link': 'Settings -> Wireless -> Security Mode',
      Tenda: 'Wireless Settings -> WiFi Name & Password -> Security Mode',
      Generic: 'Wireless Security -> Encryption Mode'
    },
    password2g: {
      Keenetic: 'Wi-Fi Clients -> Home Segment -> Network key',
      OpenWrt: 'Network -> Wireless -> edit 2.4G interface -> Wireless Security -> Key',
      'TP-Link': 'Advanced -> Wireless -> Wireless Settings -> Password (2.4GHz)',
      ASUSWRT: 'Advanced Settings -> Wireless -> General -> WPA Pre-Shared Key',
      'FRITZ!Box': 'Wi-Fi -> Security -> Encryption -> Network Key',
      'Xiaomi MiWiFi': 'Settings -> Wi-Fi -> 2.4GHz Password',
      Huawei: 'My Wi-Fi -> Wi-Fi Settings -> Wi-Fi Password',
      'D-Link': 'Settings -> Wireless -> Password',
      Tenda: 'Wireless Settings -> WiFi Name & Password -> WiFi Password',
      Generic: 'Wireless Security -> Password'
    },
    ssid2g: {
      Keenetic: 'Wi-Fi Clients -> Home Segment -> Network Name (SSID)',
      OpenWrt: 'Network -> Wireless -> edit 2.4G interface -> ESSID',
      'TP-Link': 'Advanced -> Wireless -> Wireless Settings -> Network Name (SSID) (2.4GHz)',
      ASUSWRT: 'Advanced Settings -> Wireless -> General -> Network Name (SSID)',
      'FRITZ!Box': 'Wi-Fi -> Radio Network -> Name of the Wi-Fi radio network (SSID)',
      'Xiaomi MiWiFi': 'Settings -> Wi-Fi -> 2.4GHz SSID',
      Huawei: 'My Wi-Fi -> Wi-Fi Settings -> Wi-Fi Name',
      'D-Link': 'Settings -> Wireless -> Wi-Fi Name (SSID)',
      Tenda: 'Wireless Settings -> WiFi Name & Password -> WiFi Name',
      Generic: 'Wireless Settings -> SSID Name'
    },
    firmware: {
      Keenetic: 'Management -> System Settings -> Update component firmware',
      OpenWrt: 'System -> Backup / Flash Firmware -> Flash new firmware image',
      'TP-Link': 'Advanced -> System Tools -> Firmware Upgrade',
      ASUSWRT: 'Administration -> Firmware Upgrade',
      'FRITZ!Box': 'System -> Update -> Fritz!OS Version',
      'Xiaomi MiWiFi': 'Settings -> Status -> Update Firmware',
      Huawei: 'More Functions -> System Settings -> Software Update',
      'D-Link': 'Management -> Upgrade',
      Tenda: 'Administration -> Device Upgrade',
      Generic: 'System Settings -> Firmware Upgrade'
    },
    dhcp: {
      Keenetic: 'Network Rules -> Home Segment -> IP Pool Settings',
      OpenWrt: 'Network -> Interfaces -> edit LAN -> DHCP Server -> Limit',
      'TP-Link': 'Advanced -> Network -> DHCP Server -> Address Pool',
      ASUSWRT: 'Advanced Settings -> LAN -> DHCP Server -> IP Pool Settings',
      'FRITZ!Box': 'Home Network -> Network -> Network Settings -> IPv4 Addresses',
      'Xiaomi MiWiFi': 'Settings -> LAN -> DHCP Service',
      Huawei: 'More Functions -> Network Settings -> LAN -> DHCP Server',
      'D-Link': 'Settings -> Network -> IPv4 Rules',
      Tenda: 'Administration -> LAN Settings -> DHCP Server',
      Generic: 'Network Settings -> DHCP Server settings'
    },
    dns: {
      Keenetic: 'Internet -> Domain Name System (DNS) -> DNS Servers',
      OpenWrt: 'Network -> Interfaces -> edit WAN -> Advanced -> Use DNS advertised by peer (disable) -> Custom DNS',
      'TP-Link': 'Advanced -> Network -> Internet -> DNS Address',
      ASUSWRT: 'Advanced Settings -> WAN -> Internet Connection -> WAN DNS Setting',
      'FRITZ!Box': 'Internet -> Account Information -> DNS Server',
      'Xiaomi MiWiFi': 'Settings -> Network -> DNS Server',
      Huawei: 'More Functions -> Network Settings -> Internet -> DNS Server',
      'D-Link': 'Settings -> Network -> DNS Server',
      Tenda: 'Administration -> WAN Settings -> DNS Settings',
      Generic: 'WAN settings -> Primary / Secondary DNS'
    },
    upnp: {
      Keenetic: 'Network Rules -> UPnP (toggle off)',
      OpenWrt: 'Services -> UPnP -> uncheck Start UPnP service',
      'TP-Link': 'Advanced -> NAT Forwarding -> UPnP -> Disable',
      ASUSWRT: 'Advanced Settings -> WAN -> Internet Connection -> Enable UPnP',
      'FRITZ!Box': 'Home Network -> Network -> Network Settings -> Allow access for devices via UPnP',
      'Xiaomi MiWiFi': 'Advanced -> UPnP',
      Huawei: 'More Functions -> Network Settings -> UPnP',
      'D-Link': 'Advanced -> UPnP',
      Tenda: 'Advanced -> UPnP',
      Generic: 'NAT Settings / Services -> UPnP configuration'
    },
    remoteMgmt: {
      Keenetic: 'Management -> System Settings -> Allow access from Internet (disable)',
      OpenWrt: 'System -> Administration -> SSH Access / Web Access (disable WAN interface rules)',
      'TP-Link': 'Advanced -> System Tools -> Administration -> Remote Management (disable)',
      ASUSWRT: 'Administration -> System -> Basic Config -> Enable Web Access from WAN',
      'FRITZ!Box': 'Internet -> Permit Access -> FRITZ!Box Services -> Internet access to the FRITZ!Box',
      'Xiaomi MiWiFi': 'Settings -> Status -> WAN Access',
      Huawei: 'More Functions -> Security Settings -> Remote Management',
      'D-Link': 'Management -> Admin -> Remote Management',
      Tenda: 'Administration -> Remote Web Management',
      Generic: 'System Administration -> WAN Remote Management'
    },
    width5g: {
      Keenetic: 'Wi-Fi Clients -> Home Segment -> 5 GHz Channel Width',
      OpenWrt: 'Network -> Wireless -> edit 5G device -> Bandwidth',
      'TP-Link': 'Advanced -> Wireless -> Wireless Settings -> Channel Width (5GHz)',
      ASUSWRT: 'Advanced Settings -> Wireless -> General -> Channel Bandwidth (5GHz)',
      'FRITZ!Box': 'Wi-Fi -> Radio Channel -> Wi-Fi Coexistence / Adjust manually',
      'Xiaomi MiWiFi': 'Settings -> Wi-Fi -> 5GHz Bandwidth',
      Huawei: 'More Functions -> Wi-Fi Settings -> Wi-Fi Advanced -> 5 GHz Bandwidth',
      'D-Link': 'Settings -> Wireless -> Advanced -> 5GHz Channel Width',
      Tenda: 'Wireless Settings -> WiFi Name & Password -> 5G Bandwidth',
      Generic: 'Wireless Settings -> 5 GHz Bandwidth'
    },
    smartConnect: {
      Keenetic: 'Wi-Fi Clients -> Home Segment -> Enable Band Steering',
      OpenWrt: 'Network -> Wireless -> give 2.4G and 5G the exact same SSID and security key',
      'TP-Link': 'Advanced -> Wireless -> Wireless Settings -> Enable Smart Connect',
      ASUSWRT: 'Advanced Settings -> Wireless -> General -> Enable Smart Connect',
      'FRITZ!Box': 'Wi-Fi -> Radio Network -> Different names (uncheck) / Same name',
      'Xiaomi MiWiFi': 'Settings -> Wi-Fi -> Smart Connect (toggle)',
      Huawei: 'My Wi-Fi -> Prioritize 5 GHz (toggle)',
      'D-Link': 'Settings -> Wireless -> Smart Connect (toggle)',
      Tenda: 'Wireless Settings -> WiFi Name & Password -> Unify 2.4G & 5G',
      Generic: 'Wireless settings -> Enable Band Steering / Smart Connect'
    },
    guestWifi: {
      Keenetic: 'Wi-Fi Clients -> Guest Network -> Network Protection',
      OpenWrt: 'Network -> Wireless -> Add Guest Interface',
      'TP-Link': 'Advanced -> Wireless -> Guest Network',
      ASUSWRT: 'General -> Guest Network',
      'FRITZ!Box': 'Wi-Fi -> Guest Access',
      'Xiaomi MiWiFi': 'Settings -> Wi-Fi -> Guest Wi-Fi',
      Huawei: 'More Functions -> Wi-Fi Settings -> Guest Wi-Fi',
      'D-Link': 'Settings -> Wireless -> Guest Zone',
      Tenda: 'Wireless Settings -> Guest Network',
      Generic: 'Wireless Settings -> Guest Network'
    }
  };

  const w2 = config.interfaces?.wifi2g || {};
  const w5 = config.interfaces?.wifi5g || {};

  // Count nearby networks in 2.4G and 5G bands
  const count2gNeighbors = wifiScan.filter(n => n.band === '2GHz').length;
  const count5gNeighbors = wifiScan.filter(n => n.band === '5GHz').length;

  // 1. Rule 2.4G: Channel is not 1, 6 or 11
  if (w2.enabled && ![1, 6, 11].includes(w2.channel)) {
    score -= 10;
    recommendations.push({
      id: 'channel-2g-overlapping',
      category: '2.4 GHz',
      severity: 'warning',
      title: `Используется нерекомендуемый канал ${w2.channel} на 2.4 ГГц`,
      problem: `Ваш роутер использует канал ${w2.channel} в диапазоне 2.4 ГГц. Большинство каналов в этом диапазоне накладываются друг на друга по частоте, создавая сильный шум. Единственные непересекающиеся каналы — это 1, 6 и 11.`,
      solution: `Смените канал Wi-Fi для 2.4 ГГц на один из свободных непересекающихся каналов: 1, 6 или 11.`,
      benefit: `Меньше коллизий и задержек в передаче данных, более стабильное и быстрое Wi-Fi-соединение.`,
      location: getPath(paths.channel2g),
      currentValue: `Канал ${w2.channel}`,
      recommendedValue: 'Канал 1, 6 или 11 (в зависимости от загруженности)'
    });
  }

  // 2. Rule 2.4G: Channel width is 40 MHz in a congested area
  if (w2.enabled && w2.width === 40 && count2gNeighbors >= 2) {
    score -= 8;
    recommendations.push({
      id: 'width-2g-40mhz',
      category: '2.4 GHz',
      severity: 'warning',
      title: 'Ширина канала 2.4 ГГц установлена в 40 МГц в загруженном эфире',
      problem: 'Ширина канала 40 МГц увеличивает скорость при чистом эфире, но в плотной городской застройке занимает почти весь частотный диапазон 2.4 ГГц, собирая помехи от всех соседских роутеров.',
      solution: 'Снизьте ширину канала в диапазоне 2.4 ГГц до 20 МГц.',
      benefit: 'Повысится помехоустойчивость и стабильность соединения при высокой плотности сетей.',
      location: getPath(paths.width2g),
      currentValue: '40 МГц',
      recommendedValue: '20 МГц'
    });
  }

  // 3. Rule Wi-Fi bands: 5 GHz is disabled
  if (w5 && !w5.enabled) {
    score -= 15;
    recommendations.push({
      id: 'wifi-5g-disabled',
      category: 'Wi-Fi Bands',
      severity: 'critical',
      title: 'Диапазон 5 ГГц выключен на роутере',
      problem: 'Диапазон 2.4 ГГц переполнен и подвержен помехам от микроволновок, Bluetooth и соседей. Диапазон 5 ГГц предоставляет намного больше свободных каналов и более высокие скорости.',
      solution: 'Включите диапазон 5 ГГц в настройках беспроводного режима роутера.',
      benefit: 'Многократное увеличение скорости Интернета на совместимых смартфонах, ноутбуках и ТВ.',
      location: getPath(paths.wifi5gToggle),
      currentValue: 'Выключен',
      recommendedValue: 'Включен'
    });
  }

  // 4. Rule Security: WPS is enabled
  if (config.wps?.enabled) {
    score -= 12;
    recommendations.push({
      id: 'wps-enabled',
      category: 'Security',
      severity: 'critical',
      title: 'Включен уязвимый протокол WPS',
      problem: 'Протокол WPS (Wi-Fi Protected Setup) имеет критическую уязвимость в дизайне PIN-кодов. Злоумышленник может подобрать PIN-код за несколько часов с помощью бесплатных утилит и получить полный доступ к Wi-Fi.',
      solution: 'Отключите WPS (кнопку и PIN-код) в веб-интерфейсе роутера.',
      benefit: 'Устранение популярной уязвимости взлома домашней сети.',
      location: getPath(paths.wps),
      currentValue: 'Включен',
      recommendedValue: 'Выключен'
    });
  }

  // 5. Rule Security: Weak encryption mode
  const weakEncryptions = ['wep', 'wpa', 'none', 'psk-mixed', 'wpa-wpa2'];
  const enc2g = w2.encryption ? w2.encryption.toLowerCase() : '';
  const enc5g = w5.encryption ? w5.encryption.toLowerCase() : '';
  if ((w2.enabled && weakEncryptions.some(we => enc2g.includes(we))) || 
      (w5.enabled && weakEncryptions.some(we => enc5g.includes(we)))) {
    score -= 15;
    
    let currentVal = `2.4G: ${w2.encryption || 'Нет'}`;
    if (w5.enabled) currentVal += `, 5G: ${w5.encryption || 'Нет'}`;

    recommendations.push({
      id: 'weak-encryption',
      category: 'Security',
      severity: 'critical',
      title: 'Используется слабый режим шифрования Wi-Fi',
      problem: `Ваш роутер использует устаревший стандарт безопасности (${w2.encryption || 'Без защиты'}), который легко взламывается современными методами подбора и дешифрования пакетов.`,
      solution: 'Установите режим защиты WPA2-Personal (WPA3-Personal, если поддерживается вашими устройствами) с шифрованием AES.',
      benefit: 'Защита трафика от перехвата и ограничение нежелательного доступа посторонних лиц.',
      location: getPath(paths.encryption2g),
      currentValue: currentVal,
      recommendedValue: 'WPA2-PSK (AES) или WPA3'
    });
  }

  // 6. Rule Security: Short password
  if ((w2.enabled && w2.keyLength < 8) || (w5.enabled && w5.keyLength < 8)) {
    score -= 15;
    recommendations.push({
      id: 'short-wifi-password',
      category: 'Security',
      severity: 'critical',
      title: 'Слишком короткий или простой пароль Wi-Fi',
      problem: 'Пароль беспроводной сети имеет длину менее 8 символов. Простые и короткие пароли взламываются методом перебора по словарям (WPA handshake dictionary attack) за несколько минут.',
      solution: 'Установите новый пароль беспроводной сети длиной не менее 10-12 символов, содержащий буквы верхнего/нижнего регистра, цифры и спецсимволы.',
      benefit: 'Исключает взлом сети перебором паролей.',
      location: getPath(paths.password2g),
      currentValue: 'Менее 8 символов',
      recommendedValue: 'Надежный пароль (>= 10 символов)'
    });
  }

  // 7. Rule Security: Default SSID name
  const defaults = ['keenetic', 'openwrt', 'tp-link', 'tplink', 'asus', 'netgear', 'dlink', 'huawei', 'miwifi', 'tenda'];
  const hasDefaultSsid = (w2.enabled && defaults.some(d => w2.ssid.toLowerCase().includes(d))) ||
                         (w5.enabled && defaults.some(d => w5.ssid.toLowerCase().includes(d)));
  if (hasDefaultSsid) {
    score -= 5;
    recommendations.push({
      id: 'default-ssid',
      category: 'Security',
      severity: 'warning',
      title: 'Используется имя Wi-Fi сети по умолчанию',
      problem: 'Имя сети (SSID) выдает производителя роутера (например, TP-Link, Keenetic). Это позволяет хакеру сразу определить потенциальные уязвимости прошивки и применить специализированные эксплойты.',
      solution: 'Измените SSID Wi-Fi на нейтральное уникальное имя, не указывающее на бренд роутера.',
      benefit: 'Усложняет злоумышленнику сбор информации о вашей сети (Security by Obscurity).',
      location: getPath(paths.ssid2g),
      currentValue: `2.4G: "${w2.ssid}"` + (w5.enabled ? `, 5G: "${w5.ssid}"` : ''),
      recommendedValue: 'Уникальное имя сети (например, Nebula_Home)'
    });
  }

  // 8. Rule Firmware: Outdated firmware
  // Just parsing string tags for MVP or simulator triggers
  if (config.firmwareVersion && (config.firmwareVersion.startsWith('1.0') || config.firmwareVersion.includes('23.05.0-rc2') || config.firmwareVersion.startsWith('3.9'))) {
    score -= 10;
    recommendations.push({
      id: 'outdated-firmware',
      category: 'Firmware',
      severity: 'warning',
      title: 'Прошивка роутера устарела',
      problem: `На роутере установлена старая версия прошивки (${config.firmwareVersion}). Производители регулярно закрывают критические бреши безопасности, исправляют баги с зависанием Wi-Fi и оптимизируют работу процессора в обновлениях.`,
      solution: 'Зайдите в раздел обновлений и запустите поиск и установку новой прошивки.',
      benefit: 'Закрытие известных бэкдоров, улучшение стабильности связи и работы NAT-таблиц.',
      location: getPath(paths.firmware),
      currentValue: config.firmwareVersion,
      recommendedValue: 'Последняя стабильная версия от производителя'
    });
  }

  // 9. Rule Network: DHCP IP Range Exhausted
  if (config.dhcp && config.dhcp.activeClients >= config.dhcp.poolSize * 0.9) {
    score -= 8;
    recommendations.push({
      id: 'dhcp-exhaustion',
      category: 'Network',
      severity: 'warning',
      title: 'Пул IP-адресов DHCP близок к исчерпанию',
      problem: `Занято ${config.dhcp.activeClients} из ${config.dhcp.poolSize} IP-адресов. Новые устройства не смогут подключиться к домашней сети из-за отсутствия свободных адресов, выдаваемых роутером.`,
      solution: 'Расширьте диапазон IP-адресов в настройках DHCP сервера (например, с 192.168.1.100-150 до 192.168.1.50-250) или уменьшите время аренды (lease time) до 4-8 часов.',
      benefit: 'Гарантия бесперебойного подключения новых гаджетов и гостевых устройств.',
      location: getPath(paths.dhcp),
      currentValue: `Диапазон ${config.dhcp.rangeStart} - ${config.dhcp.rangeEnd} (${config.dhcp.poolSize} адресов)`,
      recommendedValue: 'Увеличенный диапазон (не менее 150-200 адресов)'
    });
  }

  // 10. Rule Network: Default ISP DNS
  if (config.dns && !config.dns.isCustom) {
    score -= 5;
    recommendations.push({
      id: 'default-dns',
      category: 'Network',
      severity: 'info',
      title: 'Используются стандартные DNS-серверы провайдера',
      problem: 'Роутер автоматически использует DNS вашего интернет-провайдера. Эти серверы часто работают медленно, вызывают задержки при первом открытии сайтов и могут логировать историю ваших посещений.',
      solution: 'Укажите в настройках WAN/DNS публичные скоростные серверы: Cloudflare DNS (1.1.1.1 и 1.0.0.1) или Google Public DNS (8.8.8.8 и 8.8.4.4).',
      benefit: 'Сайты будут открываться немного быстрее (меньше latency), повысится конфиденциальность веб-серфинга.',
      location: getPath(paths.dns),
      currentValue: config.dns.servers?.join(', ') || 'Автоматический DNS провайдера',
      recommendedValue: '1.1.1.1, 8.8.8.8'
    });
  }

  // 11. Rule Security: UPnP is enabled
  if (config.upnp?.enabled) {
    score -= 10;
    recommendations.push({
      id: 'upnp-enabled',
      category: 'Security',
      severity: 'warning',
      title: 'Включена служба автопроброса портов UPnP',
      problem: 'Служба UPnP позволяет программам на ваших компьютерах и смартфонах автоматически пробрасывать входящие порты в роутере без вашего ведома. Вирусы или вредоносный софт могут открыть доступ к вашим локальным файлам из внешней сети.',
      solution: 'Выключите службу UPnP в настройках сетевых служб или брандмауэра роутера.',
      benefit: 'Защита от несанкционированного открытия портов на ваших устройствах из Интернета.',
      location: getPath(paths.upnp),
      currentValue: 'Включена',
      recommendedValue: 'Выключена'
    });
  }

  // 12. Rule Security: Remote management enabled
  if (config.remoteManagement?.enabled) {
    score -= 20;
    recommendations.push({
      id: 'remote-wan-management',
      category: 'Security',
      severity: 'critical',
      title: 'Админка роутера доступна из внешней сети (WAN)',
      problem: 'Управление роутером доступно из Интернета. Боты круглосуточно сканируют Сеть на наличие таких роутеров и пытаются подобрать к ним пароль. Уязвимости в веб-сервере роутера могут дать хакерам контроль над домашней сетью.',
      solution: 'Отключите удаленное веб-управление (Remote Web/WAN Management) или ограничьте доступ по конкретным внешним IP-адресам.',
      benefit: 'Ваш роутер перестает быть видимым для внешних сканеров и ботнетов.',
      location: getPath(paths.remoteMgmt),
      currentValue: `Включено на порту ${config.remoteManagement.port}`,
      recommendedValue: 'Отключено'
    });
  }

  // 13. Rule 5G: Channel width is 160 MHz in congested area
  if (w5.enabled && w5.width === 160 && count5gNeighbors >= 3) {
    score -= 5;
    recommendations.push({
      id: 'width-5g-160mhz',
      category: '5 GHz',
      severity: 'info',
      title: 'Ширина канала 5 ГГц установлена в 160 МГц в плотном окружении',
      problem: 'Каналы 160 МГц часто пересекаются с радарами (DFS) и другими сетями, из-за чего роутер вынужден часто сбрасывать соединение, сканировать эфир и искать более тихий спектр.',
      solution: 'Снизьте ширину канала 5 ГГц до 80 МГц.',
      benefit: 'Более стабильный пинг, отсутствие внезапных дисконнектов при просмотре потокового видео или в онлайн-играх.',
      location: getPath(paths.width5g),
      currentValue: '160 МГц',
      recommendedValue: '80 МГц'
    });
  }

  // 14. Rule Wi-Fi bands: Smart Connect / Band Steering disabled
  if (w2.enabled && w5.enabled && w2.ssid !== w5.ssid) {
    score -= 5;
    recommendations.push({
      id: 'band-steering-disabled',
      category: 'Wi-Fi Bands',
      severity: 'info',
      title: 'Раздельные имена (SSID) для 2.4 ГГц и 5 ГГц',
      problem: 'В вашей сети диапазоны 2.4G и 5G работают как две разные точки доступа. Мобильные устройства не умеют автоматически переключаться между ними при ухудшении сигнала, оставаясь на медленном 2.4 ГГц.',
      solution: 'Объедините сети, задав одинаковое имя (SSID) и пароль для обоих диапазонов, либо включите функцию Band Steering (Smart Connect).',
      benefit: 'Устройства будут автоматически и плавно роумиться на 5 ГГц вблизи роутера и переходить на 2.4 ГГц при отдалении.',
      location: getPath(paths.smartConnect),
      currentValue: `2.4G SSID: "${w2.ssid}", 5G SSID: "${w5.ssid}"`,
      recommendedValue: 'Одинаковое имя (SSID) + включенный Band Steering'
    });
  }

  // 15. Rule Security: Open guest network
  const hasOpenGuest = (config.interfaces && Object.values(config.interfaces).some(i => i.ssid?.toLowerCase().includes('guest') && i.enabled && i.encryption === 'none'));
  if (hasOpenGuest) {
    score -= 12;
    recommendations.push({
      id: 'open-guest-network',
      category: 'Security',
      severity: 'critical',
      title: 'Обнаружена открытая гостевая сеть Wi-Fi',
      problem: 'Гостевая сеть активна и не требует пароля для входа. Посторонние люди могут использовать ваш интернет-канал для нелегальной активности, за которую несет ответственность владелец договора.',
      solution: 'Установите пароль с шифрованием WPA2 на гостевую сеть или выключите её.',
      benefit: 'Безопасность вашего интернет-канала от несанкционированного использования.',
      location: getPath(paths.guestWifi),
      currentValue: 'Открытая гостевая сеть (без шифрования)',
      recommendedValue: 'WPA2-PSK или выключена'
    });
  }

  // 16. Rule Radio: Co-channel interference
  if (w2.enabled) {
    const overlappingCoChannel = wifiScan.filter(n => n.band === '2GHz' && n.channel === w2.channel && n.signal >= -65);
    if (overlappingCoChannel.length > 0) {
      score -= 5;
      recommendations.push({
        id: 'co-channel-interference',
        category: 'Layout',
        severity: 'warning',
        title: `Конфликт каналов: обнаружены соседские сети на вашем канале ${w2.channel}`,
        problem: `В вашем радиусе обнаружено ${overlappingCoChannel.length} соседских сетей, вещающих на том же канале (${w2.channel}) с высоким уровнем сигнала. Это вызывает прямую интерференцию пакетов и заставляет ваши устройства ждать освобождения эфира.`,
        solution: 'Переключите выбор канала в автоматический режим (чтобы роутер сам сканировал эфир при перезагрузке) или вручную выберите наименее загруженный канал 1, 6 или 11.',
        benefit: 'Повышение реальной скорости обмена данными, снижение пинга.',
        location: getPath(paths.channel2g),
        currentValue: `Канал ${w2.channel} (занят сильными сетями соседей)`,
        recommendedValue: 'Автовыбор или наименее загруженный канал'
      });
    }
  }

  // 17. Rule Radio: Adjacent channel interference
  if (w2.enabled && [2, 3, 4, 5, 7, 8, 9, 10].includes(w2.channel)) {
    const activeAdjacent = wifiScan.filter(n => n.band === '2GHz' && Math.abs(n.channel - w2.channel) < 5 && n.channel !== w2.channel && n.signal >= -70);
    if (activeAdjacent.length > 0) {
      score -= 5;
      recommendations.push({
        id: 'adjacent-channel-interference',
        category: 'Layout',
        severity: 'warning',
        title: 'Боковое наложение сигналов (Adjacent Channel Interference)',
        problem: `Канал ${w2.channel} перекрывается боковыми лепестками частот соседних сетей. Это создает постоянный белый шум, снижающий качество модуляции и стабильность связи.`,
        solution: 'Измените канал на 1, 6 или 11.',
        benefit: 'Устранение частотного наложения, чистый прием пакетов.',
        location: getPath(paths.channel2g),
        currentValue: `Канал ${w2.channel} (перекрывается соседями)`,
        recommendedValue: 'Канал 1, 6 или 11'
      });
    }
  }

  // 18. Rule Layout: Weak signal for active clients
  const weakSignalClients = config.clients?.filter(c => c.signal <= -75) || [];
  if (weakSignalClients.length > 0) {
    score -= 5;
    recommendations.push({
      id: 'weak-client-signal',
      category: 'Layout',
      severity: 'warning',
      title: `Обнаружены устройства с очень слабым уровнем сигнала Wi-Fi`,
      problem: `Устройства (${weakSignalClients.map(c => c.name).join(', ')}) имеют уровень сигнала хуже -75 дБм. Роутер тратит много эфирного времени на повторную отправку потерянных пакетов для этих клиентов, снижая скорость для всех остальных устройств.`,
      solution: 'Переставьте роутер ближе к центру квартиры, поднимите его выше или избавьтесь от препятствий (зеркала, металлические шкафы) на пути прохождения волн.',
      benefit: 'Стабилизация скорости по всему дому, ликвидация "мертвых зон".',
      location: 'Физическое размещение роутера',
      currentValue: `${weakSignalClients.length} устр. с уровнем < -75 дБм`,
      recommendedValue: 'Сигнал не хуже -65 дБм для всех важных устройств'
    });
  }

  // Ensure score stays within 0 - 100 range
  score = Math.max(10, Math.min(100, score));

  // Compute metric stats
  const criticalCount = recommendations.filter(r => r.severity === 'critical').length;
  const warningCount = recommendations.filter(r => r.severity === 'warning').length;
  const infoCount = recommendations.filter(r => r.severity === 'info').length;

  return {
    score,
    metrics: {
      totalIssues: recommendations.length,
      critical: criticalCount,
      warning: warningCount,
      info: infoCount,
      wifiCongestionLevel: wifiScan.length > 8 ? 'High' : (wifiScan.length > 4 ? 'Medium' : 'Low')
    },
    recommendations
  };
}
