/**
 * 将 TUIC 配置对象转换为 TUIC 标准协议 URL
 * @param {object} config - TUIC 配置对象
 * @returns {string} TUIC 标准协议 URL (tuic://...)
 * @throws {Error} 如果缺少必要的配置字段
 */
export function tuicConvert(config: Record<string, any>): string {
    if (config.type !== 'tuic') {
        throw new Error('Configuration type must be "tuic"');
    }
    if (!config.uuid || !config.password || !config.server || !config.port) {
        throw new Error('Missing required fields: uuid, password, server, or port');
    }

    const params = new URLSearchParams();

    appendParam(params, 'ip', config.ip);
    appendParam(params, 'sni', config.sni || config.servername || config['server-name']);
    appendParam(params, 'alpn', Array.isArray(config.alpn) ? config.alpn.join(',') : config.alpn);
    appendParam(params, 'congestion_control', config['congestion-controller'] || config.congestion_control || config.congestionController);
    appendParam(params, 'udp_relay_mode', config['udp-relay-mode'] || config.udp_relay_mode || config.udpRelayMode);
    appendParam(params, 'request_timeout', config['request-timeout'] || config.request_timeout || config.requestTimeout);
    appendParam(params, 'heartbeat_interval', config['heartbeat-interval'] || config.heartbeat_interval || config.heartbeatInterval);

    if (config['skip-cert-verify'] || config.insecure || config.allow_insecure || config.allowInsecure) {
        params.set('allow_insecure', '1');
    }
    if (config['disable-sni'] || config.disable_sni || config.disableSni) {
        params.set('disable_sni', '1');
    }
    if (config['reduce-rtt'] || config.reduce_rtt || config.reduceRtt) {
        params.set('reduce_rtt', '1');
    }

    const queryString = params.toString();
    const nameFragment = config.name ? `#${encodeURIComponent(config.name)}` : '';
    const userInfo = `${encodeURIComponent(config.uuid)}:${encodeURIComponent(config.password)}`;
    return `tuic://${userInfo}@${encodeURIComponent(config.server)}:${config.port}${queryString ? `?${queryString}` : ''}${nameFragment}`;
}

function appendParam(params: URLSearchParams, key: string, value: any): void {
    if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
    }
}
