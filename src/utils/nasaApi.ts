import { NasaFlareRecord, VERIFIED_FALLBACK_FLARES } from '../data/nasaTelemetry';

export interface DonkiFetchResult {
  flares: NasaFlareRecord[];
  mode: 'LIVE_NASA_DONKI' | 'VERIFIED_ARCHIVE_FALLBACK';
  fetchedAt: string;
  statusNote: string;
}

function classifyFlareRadiation(classType: string): number {
  const upper = classType.toUpperCase();
  if (upper.startsWith('X')) return 0.85;
  if (upper.startsWith('M')) return 0.45;
  if (upper.startsWith('C')) return 0.18;
  return 0.1;
}

/**
 * Queries NASA's public DONKI Solar Flare (/FLR) and CME (/CME) endpoints using DEMO_KEY.
 * Automatically falls back to embedded verified NASA telemetry if offline, timed out, or rate-limited.
 */
export async function fetchNasaDonkiTelemetry(): Promise<DonkiFetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3200);

  // Clamp query window if host clock is ahead of real-world DONKI archive
  const nowMs = Math.min(Date.now(), Date.UTC(2025, 10, 15));
  const endDate = new Date(nowMs).toISOString().slice(0, 10);
  const startDate = new Date(nowMs - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const flrUrl = `https://api.nasa.gov/DONKI/FLR?startDate=${startDate}&endDate=${endDate}&api_key=DEMO_KEY`;
  const cmeUrl = `https://api.nasa.gov/DONKI/CME?startDate=${startDate}&endDate=${endDate}&api_key=DEMO_KEY`;

  try {
    const [flrRes, cmeRes] = await Promise.all([
      fetch(flrUrl, { signal: controller.signal }),
      fetch(cmeUrl, { signal: controller.signal }).catch(() => null),
    ]);

    clearTimeout(timeout);

    if (!flrRes.ok) {
      throw new Error(`DONKI HTTP ${flrRes.status}`);
    }

    const flrJson = (await flrRes.json()) as Array<{
      flrID?: string;
      classType?: string;
      peakTime?: string;
      activeRegionNum?: number;
      note?: string;
    }>;

    let cmeCount = 0;
    if (cmeRes && cmeRes.ok) {
      const cmeJson = (await cmeRes.json()) as unknown[];
      if (Array.isArray(cmeJson)) {
        cmeCount = cmeJson.length;
      }
    }

    if (Array.isArray(flrJson) && flrJson.length > 0) {
      const parsed: NasaFlareRecord[] = flrJson
        .slice(-4)
        .reverse()
        .map((item, idx) => {
          const classType = item.classType || 'C4.0';
          return {
            id: item.flrID || `DONKI-FLR-${idx + 1}`,
            source: 'DONKI_LIVE',
            classType,
            peakTime: item.peakTime || new Date().toISOString(),
            activeRegion: item.activeRegionNum ? `AR ${item.activeRegionNum}` : 'Active Region',
            note:
              item.note?.trim() ||
              `Live NASA DONKI solar flare (${classType}) recorded; ${cmeCount} CME events tracked in 14-day window.`,
            radBoostMsv: classifyFlareRadiation(classType),
          };
        });

      return {
        flares: parsed,
        mode: 'LIVE_NASA_DONKI',
        fetchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        statusNote: `Connected to NASA / CCMC DONKI (${parsed.length} recent flares, ${cmeCount} CMEs tracked).`,
      };
    }

    return {
      flares: VERIFIED_FALLBACK_FLARES,
      mode: 'VERIFIED_ARCHIVE_FALLBACK',
      fetchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      statusNote: 'Live DONKI window quiet — displaying verified NASA solar baseline archive.',
    };
  } catch {
    clearTimeout(timeout);
    return {
      flares: VERIFIED_FALLBACK_FLARES,
      mode: 'VERIFIED_ARCHIVE_FALLBACK',
      fetchedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      statusNote: 'Offline / rate-limited fallback active — running verified NASA telemetry archive.',
    };
  }
}
