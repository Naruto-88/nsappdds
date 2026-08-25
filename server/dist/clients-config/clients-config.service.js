"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ClientsConfigService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientsConfigService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ClientsConfigService = ClientsConfigService_1 = class ClientsConfigService {
    config;
    logger = new common_1.Logger(ClientsConfigService_1.name);
    cache = null;
    cacheTtlMs = 5 * 60 * 1000;
    constructor(config) {
        this.config = config;
    }
    async getMapping(sheetKey) {
        const rows = await this.getAllRows();
        return rows.find((r) => r.sheetKey === sheetKey) ?? null;
    }
    async getMappingBySiteUrl(gscSiteUrl) {
        const rows = await this.getAllRows();
        return rows.find((r) => r.gscSiteUrl === gscSiteUrl) ?? null;
    }
    async getAllRows() {
        if (this.cache && Date.now() - this.cache.at < this.cacheTtlMs) {
            return this.cache.rows;
        }
        const sheetId = this.config.get('CONFIG_SHEET_ID');
        if (!sheetId) {
            this.logger.warn('CONFIG_SHEET_ID not set — no client rows available.');
            return [];
        }
        try {
            const { rows: rawRows, colLabels } = await this.fetchConfigRows(sheetId);
            const rows = this.parseClientRows(rawRows, colLabels);
            this.logger.log(`Loaded ${rows.length} client row(s) from _CONFIG: ` +
                rows
                    .map((r) => `${r.sheetKey}(gsc=${r.gscSiteUrl ? 'set' : '-'},ga4=${r.ga4PropertyId ? 'set' : '-'},ads=${r.googleAdsCustomerId ? 'set' : '-'})`)
                    .join(', '));
            this.cache = { at: Date.now(), rows };
            return rows;
        }
        catch (e) {
            this.logger.error(`Failed to load _CONFIG: ${e.message}`);
            return this.cache?.rows ?? [];
        }
    }
    async fetchConfigRows(sheetId) {
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=_CONFIG&range=A1:CZ500&_cb=${Date.now()}`;
        const res = await fetch(url);
        if (!res.ok)
            throw new Error(`gviz HTTP ${res.status}`);
        const text = await res.text();
        if (!text.includes('google.visualization'))
            throw new Error('_CONFIG tab not found');
        const json = JSON.parse(text.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
        const table = json.table;
        const colLabels = (table?.cols || []).map((c) => String(c?.label || '').trim());
        if (!table?.rows)
            return { rows: [], colLabels };
        const rows = table.rows.map((r) => r.c.map((cell) => String(cell ? (cell.f ?? cell.v ?? '') : '')));
        return { rows, colLabels };
    }
    parseClientRows(rows, colLabels) {
        const normHdr = (s) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const num = (v) => {
            const n = parseFloat(String(v ?? '').replace(/[$,x%\s]/g, ''));
            return isNaN(n) ? 0 : n;
        };
        const bClientIdx = rows.findIndex((r) => {
            const a = normHdr(r[0]);
            return a.includes('client') && a.includes('baselines');
        });
        const hasClientCols = colLabels.some((l) => normHdr(l).includes('client id'));
        if (bClientIdx < 0 && !hasClientCols)
            return [];
        let headerIdx = -1;
        for (let i = Math.max(0, bClientIdx); i < rows.length; i++) {
            if (normHdr(rows[i][0]) === 'client id') {
                headerIdx = i;
                break;
            }
        }
        const headers = (headerIdx >= 0 ? rows[headerIdx] : colLabels).map(normHdr);
        const findCol = (needle) => {
            const n = normHdr(needle);
            return headers.findIndex((h) => h.includes(n));
        };
        const iGoogleCPL = findCol('baseline google cpl');
        const iMetaCPL = findCol('baseline meta cpl');
        const iSeoLeadsFound = findCol('baseline seo leads');
        const iSeoLeads = iSeoLeadsFound >= 0 ? iSeoLeadsFound : 14;
        const iGscUrl = findCol('gsc site url') >= 0 ? findCol('gsc site url') : findCol('gsc url');
        const iGa4Id = findCol('ga4 property id') >= 0 ? findCol('ga4 property id') : findCol('ga4 id');
        const iAdsId = findCol('google ads customer id') >= 0
            ? findCol('google ads customer id')
            : findCol('google ads id') >= 0
                ? findCol('google ads id')
                : findCol('google ads') >= 0
                    ? findCol('google ads')
                    : findCol('customer id');
        const iMetaId = findCol('meta ad account id') >= 0
            ? findCol('meta ad account id')
            : findCol('meta ad acc id') >= 0
                ? findCol('meta ad acc id')
                : findCol('meta account id') >= 0
                    ? findCol('meta account id')
                    : findCol('meta ads id') >= 0
                        ? findCol('meta ads id')
                        : findCol('meta id');
        const isBanner = (a) => {
            if (!a)
                return true;
            const low = a.toLowerCase();
            return ((low.includes('client') && low.includes('baselines')) ||
                (low.includes('rules') && low.includes('engine')) ||
                (low.includes('vertical') && low.includes('benchmarks')) ||
                (low.includes('reusable') && low.includes('wins')) ||
                low.includes('protected —') ||
                low.includes('protected -'));
        };
        const loopStart = headerIdx >= 0 ? headerIdx + 1 : bClientIdx >= 0 ? bClientIdx + 1 : 0;
        const result = [];
        for (let i = loopStart; i < rows.length; i++) {
            const row = rows[i];
            const a = String(row[0] || '').trim();
            if (isBanner(a))
                break;
            if (!a || normHdr(a) === 'client id')
                continue;
            const leadsCell = String(row[2] || '').trim();
            if (leadsCell === '' && String(row[4] || '').trim() === '')
                continue;
            const baseCPL = num(row[4]);
            result.push({
                sheetKey: a,
                name: String(row[1] || a).trim(),
                baselines: {
                    leads: num(row[2]),
                    seoLeads: String(row[iSeoLeads] || '').trim() !== '' ? num(row[iSeoLeads]) : null,
                    qualLeads: num(row[3]),
                    cpl: baseCPL,
                    googleCPL: iGoogleCPL >= 0 && String(row[iGoogleCPL] || '').trim() !== '' ? num(row[iGoogleCPL]) : baseCPL,
                    metaCPL: iMetaCPL >= 0 && String(row[iMetaCPL] || '').trim() !== '' ? num(row[iMetaCPL]) : null,
                    conv: num(row[5]),
                    roas: num(row[6]),
                    traffic: num(row[7]),
                },
                revTier: String(row[8] || '1-5m').trim(),
                vertical: String(row[9] || '—').trim(),
                driPrimary: String(row[10] || '').trim(),
                driSecondary: String(row[11] || '').trim(),
                gscSiteUrl: iGscUrl >= 0 ? String(row[iGscUrl] || '').trim() || null : null,
                ga4PropertyId: iGa4Id >= 0 ? String(row[iGa4Id] || '').trim() || null : null,
                googleAdsCustomerId: iAdsId >= 0 ? String(row[iAdsId] || '').trim() || null : null,
                metaAdAccountId: iMetaId >= 0 ? String(row[iMetaId] || '').trim() || null : null,
            });
        }
        return result;
    }
};
exports.ClientsConfigService = ClientsConfigService;
exports.ClientsConfigService = ClientsConfigService = ClientsConfigService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ClientsConfigService);
//# sourceMappingURL=clients-config.service.js.map