import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ClientConfigRow {
  sheetKey: string;
  name: string;
  baselines: {
    leads: number;
    seoLeads: number | null;
    qualLeads: number;
    cpl: number;
    googleCPL: number;
    metaCPL: number | null;
    conv: number;
    roas: number;
    traffic: number;
  };
  revTier: string;
  vertical: string;
  driPrimary: string;
  driSecondary: string;
  gscSiteUrl: string | null;
  ga4PropertyId: string | null;
  googleAdsCustomerId: string | null;
}

interface GvizCell {
  f?: string;
  v?: string | number;
}

// Reads the same _CONFIG Google Sheet tab the dashboard's Governance view already
// points at, via the same public gviz endpoint the frontend uses (loadConfigTab()
// in index.html) — no separate credentials needed, the sheet is already shared
// "anyone with the link can view". Mirrors that same CLIENT BASELINES parsing
// (name/baselines/DRI/vertical), plus three extra columns this backend added:
// "GSC Site URL", "GA4 Property ID", "Google Ads Customer ID". RosterService uses
// the full row (not just the three Google columns) to enrich GSC-discovered
// properties with real client names/baselines instead of a bare domain.
@Injectable()
export class ClientsConfigService {
  private readonly logger = new Logger(ClientsConfigService.name);
  private cache: { at: number; rows: ClientConfigRow[] } | null = null;
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 min — avoid hammering gviz on every card render

  constructor(private readonly config: ConfigService) {}

  async getMapping(sheetKey: string): Promise<ClientConfigRow | null> {
    const rows = await this.getAllRows();
    return rows.find((r) => r.sheetKey === sheetKey) ?? null;
  }

  async getMappingBySiteUrl(gscSiteUrl: string): Promise<ClientConfigRow | null> {
    const rows = await this.getAllRows();
    return rows.find((r) => r.gscSiteUrl === gscSiteUrl) ?? null;
  }

  async getAllRows(): Promise<ClientConfigRow[]> {
    if (this.cache && Date.now() - this.cache.at < this.cacheTtlMs) {
      return this.cache.rows;
    }
    const sheetId = this.config.get<string>('CONFIG_SHEET_ID');
    if (!sheetId) {
      this.logger.warn('CONFIG_SHEET_ID not set — no client rows available.');
      return [];
    }
    try {
      const { rows: rawRows, colLabels } = await this.fetchConfigRows(sheetId);
      const rows = this.parseClientRows(rawRows, colLabels);
      this.logger.log(
        `Loaded ${rows.length} client row(s) from _CONFIG: ` +
          rows
            .map((r) => `${r.sheetKey}(gsc=${r.gscSiteUrl ? 'set' : '-'},ga4=${r.ga4PropertyId ? 'set' : '-'},ads=${r.googleAdsCustomerId ? 'set' : '-'})`)
            .join(', '),
      );
      this.cache = { at: Date.now(), rows };
      return rows;
    } catch (e) {
      this.logger.error(`Failed to load _CONFIG: ${(e as Error).message}`);
      return this.cache?.rows ?? [];
    }
  }

  private async fetchConfigRows(sheetId: string): Promise<{ rows: string[][]; colLabels: string[] }> {
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=_CONFIG&range=A1:CZ500&_cb=${Date.now()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`gviz HTTP ${res.status}`);
    const text = await res.text();
    if (!text.includes('google.visualization')) throw new Error('_CONFIG tab not found');
    const json = JSON.parse(text.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
    const table = json.table;
    const colLabels: string[] = (table?.cols || []).map((c: { label?: string }) => String(c?.label || '').trim());
    if (!table?.rows) return { rows: [], colLabels };
    const rows = table.rows.map((r: { c: (GvizCell | null)[] }) =>
      r.c.map((cell) => String(cell ? (cell.f ?? cell.v ?? '') : '')),
    );
    return { rows, colLabels };
  }

  // Mirrors loadConfigTab() in index.html, including its handling of a gviz quirk:
  // when the CLIENT BASELINES banner is a merged title cell, gviz sometimes absorbs
  // that whole banner (and even the "Client ID" header text) into cols[0].label
  // instead of leaving it as a data row — so row 0 in `rows` can already be the
  // FIRST CLIENT's data, with no literal header row anywhere in the data at all. In
  // that case we fall back to the gviz column labels themselves as the header row.
  private parseClientRows(rows: string[][], colLabels: string[]): ClientConfigRow[] {
    const normHdr = (s: string) => String(s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const num = (v: string) => {
      const n = parseFloat(String(v ?? '').replace(/[$,x%\s]/g, ''));
      return isNaN(n) ? 0 : n;
    };

    const bClientIdx = rows.findIndex((r) => {
      const a = normHdr(r[0]);
      return a.includes('client') && a.includes('baselines');
    });
    const hasClientCols = colLabels.some((l) => normHdr(l).includes('client id'));
    if (bClientIdx < 0 && !hasClientCols) return [];

    let headerIdx = -1;
    for (let i = Math.max(0, bClientIdx); i < rows.length; i++) {
      if (normHdr(rows[i][0]) === 'client id') {
        headerIdx = i;
        break;
      }
    }

    const headers = (headerIdx >= 0 ? rows[headerIdx] : colLabels).map(normHdr);
    const findCol = (needle: string) => {
      const n = normHdr(needle);
      return headers.findIndex((h) => h.includes(n));
    };
    const iGoogleCPL = findCol('baseline google cpl');
    const iMetaCPL = findCol('baseline meta cpl');
    const iSeoLeadsFound = findCol('baseline seo leads');
    const iSeoLeads = iSeoLeadsFound >= 0 ? iSeoLeadsFound : 14; // column O, same fallback as the frontend
    const iGscUrl = findCol('gsc site url');
    const iGa4Id = findCol('ga4 property id');
    const iAdsId = findCol('google ads customer id');

    const isBanner = (a: string) => {
      if (!a) return true;
      const low = a.toLowerCase();
      return (
        (low.includes('client') && low.includes('baselines')) ||
        (low.includes('rules') && low.includes('engine')) ||
        (low.includes('vertical') && low.includes('benchmarks')) ||
        (low.includes('reusable') && low.includes('wins')) ||
        low.includes('protected —') ||
        low.includes('protected -')
      );
    };

    // Skip past whichever row actually held the header (if any) — when headerIdx is
    // -1 (the quirk case), there's no literal header row in the data to skip past.
    const loopStart = headerIdx >= 0 ? headerIdx + 1 : bClientIdx >= 0 ? bClientIdx + 1 : 0;

    const result: ClientConfigRow[] = [];
    for (let i = loopStart; i < rows.length; i++) {
      const row = rows[i];
      const a = String(row[0] || '').trim();
      if (isBanner(a)) break; // next section reached
      if (!a || normHdr(a) === 'client id') continue;
      const leadsCell = String(row[2] || '').trim();
      if (leadsCell === '' && String(row[4] || '').trim() === '') continue; // same skip rule as the frontend loader

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
      });
    }
    return result;
  }
}
