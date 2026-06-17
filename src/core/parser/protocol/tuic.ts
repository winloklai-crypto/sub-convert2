import type { TuicConfig } from '../types';
import { hasKey } from '../../../shared';
import { Faker } from '../../../shared/faker';
import { PsUtil } from '../../../shared/ps';

export class TuicParser extends Faker {
    /** * @description 原始链接 */
    #originLink: string = '';

    /** * @description 混淆链接 */
    #confuseLink: string = '';

    /** * @description vps原始配置 */
    #originConfig: Partial<TuicConfig> = {};

    /** * @description 混淆配置 */
    #confuseConfig: Partial<TuicConfig> = {};

    /** * @description 原始备注 */
    #originPs: string = '';

    /** * @description 混淆备注 */
    #confusePs: string = '';

    constructor(v: string) {
        super();
        this.#confusePs = crypto.randomUUID();
        // 设置原始配置
        this.setOriginConfig(v);
        // 设置混淆配置
        this.setConfuseConfig(v);
    }

    /**
     * @description 设置原始配置
     * @param {string} v
     */
    private setOriginConfig(v: string): void {
        this.#originLink = v;
        this.#originConfig = new URL(v);
        this.#originPs = PsUtil.formatPs(this.#originConfig.hash) ?? '';
    }

    /**
     * @description 更新原始配置
     * @param {string} ps
     */
    public updateOriginConfig(ps: string): void {
        this.#originConfig.hash = PsUtil.formatPs(ps);
        this.#originPs = PsUtil.formatPs(ps);
        this.#originLink = this.#originConfig.href!;
        this.setConfuseConfig(this.#originLink);
    }

    /**
     * @description 设置混淆配置
     * @param {string} v
     */
    private setConfuseConfig(v: string): void {
        this.#confuseConfig = new URL(v);
        this.#confuseConfig.username = this.getUsername();
        this.#confuseConfig.password = this.getPassword();
        this.#confuseConfig.host = this.getHost();
        this.#confuseConfig.hostname = this.getHostName();
        this.#confuseConfig.port = this.getPort();
        this.#confuseConfig.hash = PsUtil.setPs(this.#originPs, this.#confusePs);
        this.#confuseLink = this.#confuseConfig.href!;
    }

    private getSearchParam(...keys: string[]): string | null {
        for (const key of keys) {
            const value = this.originConfig.searchParams?.get(key);
            if (value !== null && value !== undefined) {
                return value;
            }
        }
        return null;
    }

    private getBooleanSearchParam(...keys: string[]): boolean | null {
        const value = this.getSearchParam(...keys);
        if (value === null) {
            return null;
        }
        return value === '1' || value === 'true';
    }

    private restoreValue(proxy: Record<string, any>, key: string, ...paramKeys: string[]): void {
        if (!hasKey(proxy, key)) {
            return;
        }
        const value = this.getSearchParam(...paramKeys, key);
        if (value !== null) {
            proxy[key] = decodeURIComponent(value);
        }
    }

    private restoreBooleanValue(proxy: Record<string, any>, key: string, ...paramKeys: string[]): void {
        if (!hasKey(proxy, key)) {
            return;
        }
        const value = this.getBooleanSearchParam(...paramKeys, key);
        if (value !== null) {
            proxy[key] = value;
        }
    }

    public restoreClash(proxy: Record<string, any>, ps: string): Record<string, any> {
        proxy.name = ps;
        proxy.server = this.originConfig.hostname ?? '';
        proxy.port = Number(this.originConfig.port ?? 0);
        proxy.uuid = this.originConfig.username ?? '';
        proxy.password = this.originConfig.password ?? '';
        proxy.alpn = proxy.alpn ? proxy.alpn.map((i: string) => decodeURIComponent(i)) : proxy.alpn;

        const sni = this.getSearchParam('sni', 'servername', 'server_name');
        if (sni !== null && (hasKey(proxy, 'sni') || hasKey(proxy, 'servername'))) {
            proxy.sni = decodeURIComponent(sni);
        }

        this.restoreValue(proxy, 'ip');
        this.restoreValue(proxy, 'congestion-controller', 'congestion_control', 'congestionController');
        this.restoreValue(proxy, 'udp-relay-mode', 'udp_relay_mode', 'udpRelayMode');
        this.restoreValue(proxy, 'request-timeout', 'request_timeout', 'requestTimeout');
        this.restoreValue(proxy, 'heartbeat-interval', 'heartbeat_interval', 'heartbeatInterval');
        this.restoreBooleanValue(proxy, 'skip-cert-verify', 'allow_insecure', 'allowInsecure', 'insecure');
        this.restoreBooleanValue(proxy, 'disable-sni', 'disable_sni', 'disableSni');
        this.restoreBooleanValue(proxy, 'reduce-rtt', 'reduce_rtt', 'reduceRtt');

        return proxy;
    }

    public restoreSingbox(outbound: Record<string, any>, ps: string): Record<string, any> {
        outbound.uuid = this.originConfig.username ?? '';
        outbound.password = this.originConfig.password ?? '';
        outbound.server = this.originConfig.hostname ?? '';
        outbound.server_port = Number(this.originConfig.port ?? 0);
        outbound.tag = ps;

        this.restoreValue(outbound, 'congestion_control', 'congestion-controller', 'congestionController');
        this.restoreValue(outbound, 'udp_relay_mode', 'udp-relay-mode', 'udpRelayMode');
        this.restoreValue(outbound, 'heartbeat', 'heartbeat_interval', 'heartbeat-interval', 'heartbeatInterval');
        this.restoreBooleanValue(outbound, 'zero_rtt_handshake', 'reduce-rtt', 'reduce_rtt', 'reduceRtt', 'zero_rtt', 'zeroRtt');

        if (outbound.tls?.server_name) {
            outbound.tls.server_name = this.getSearchParam('sni', 'servername', 'server_name') ?? this.originConfig.hostname ?? '';
        }
        if (outbound.tls?.insecure !== undefined) {
            outbound.tls.insecure = this.getBooleanSearchParam('allow_insecure', 'allowInsecure', 'insecure', 'skip-cert-verify') ?? outbound.tls.insecure;
        }
        if (outbound.tls?.alpn) {
            outbound.tls.alpn = outbound.tls.alpn.map((i: string) => decodeURIComponent(i));
        }

        return outbound;
    }

    /**
     * @description 原始备注
     * @example '#originPs'
     */
    get originPs(): string {
        return this.#originPs;
    }

    /**
     * @description 原始链接
     * @example 'tuic://...'
     */
    get originLink(): string {
        return this.#originLink;
    }

    /**
     * @description 原始配置
     */
    get originConfig(): Partial<TuicConfig> {
        return this.#originConfig;
    }

    /**
     * @description 混淆备注
     * @example 'confusePs'
     */
    get confusePs(): string {
        return this.#confusePs;
    }

    /**
     * @description 混淆链接
     * @example 'tuic://...'
     */
    get confuseLink(): string {
        return this.#confuseLink;
    }

    /**
     * @description 混淆配置
     */
    get confuseConfig(): Partial<TuicConfig> {
        return this.#confuseConfig;
    }
}
