/* TamboGo · mapa nítido
   Usa mapa vectorial (OpenFreeMap, sin llave) con paleta oscura propia: se ve definido en cualquier pantalla.
   Si no carga, usa mosaicos normales con alta resolución (retina) como respaldo. */
(function (w) {
  'use strict';
  const ctx = document.createElement('canvas').getContext('2d');

  function parse(c) {
    ctx.fillStyle = '#010203'; ctx.fillStyle = c;
    const v = ctx.fillStyle; let m;
    if (v === '#010203' && String(c).trim().toLowerCase() !== '#010203') return null;
    if ((m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(v))) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16), 1];
    if ((m = /^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/.exec(v))) return [+m[1], +m[2], +m[3], +m[4]];
    return null;
  }
  function toHsl(p) {
    const r = p[0] / 255, g = p[1] / 255, b = p[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (mx !== mn) {
      const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6;
    }
    return [h, s, l];
  }
  function toRgb(h, s, l) {
    if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
    return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
  }
  function conv(c, kind) {
    const p = parse(c); if (!p) return c;
    let hsl = toHsl(p), h = hsl[0], s = hsl[1] * 0.7, l = hsl[2];
    if (kind === 't') l = Math.min(0.9, 0.93 - l * 0.62);
    else if (kind === 'h') l = 0.05;
    else l = 0.045 + (1 - l) * 0.25;
    const rgb = toRgb(h, s, l);
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + p[3] + ')';
  }
  function walk(v, fn) { if (typeof v === 'string') return fn(v); if (Array.isArray(v)) return v.map(x => walk(x, fn)); return v; }

  function dark(st) {
    const s = JSON.parse(JSON.stringify(st));
    (s.layers || []).forEach(l => {
      const p = l.paint; if (!p) return;
      Object.keys(p).forEach(k => {
        if (!/color$/.test(k)) return;
        const kind = k === 'text-color' ? 't' : k === 'text-halo-color' ? 'h' : 'b';
        p[k] = walk(p[k], c => conv(c, kind));
      });
      if (l.type === 'line' && l['source-layer'] === 'transportation') {
        const id = l.id || '';
        p['line-color'] = /casing/.test(id) ? '#0a0c0f' : (/motorway|trunk|primary|major/.test(id) ? '#434b57' : '#2b313a');
      }
    });
    return s;
  }

  function raster(map, cfg, st) {
    if (st.done) return; st.done = true;
    if (st.layer) { try { map.removeLayer(st.layer); } catch (e) { /* ya quitada */ } }
    st.layer = L.tileLayer((cfg.tileUrl || '').replace('{key}', cfg.tileKey || ''), { maxZoom: 19, detectRetina: true, attribution: cfg.tileAttribution || '' }).addTo(map);
    if (cfg.darkTiles !== false) map.getContainer().classList.add('dark-tiles');
  }

  w.MapBase = {
    add(map, cfg) {
      const st = { done: false, layer: null };
      if (!(cfg.useVector && w.maplibregl && L.maplibreGL)) { raster(map, cfg, st); return; }
      fetch(cfg.vectorStyle).then(r => { if (!r.ok) throw new Error('style'); return r.json(); }).then(style => {
        const layer = L.maplibreGL({ style: dark(style), attribution: cfg.vectorAttribution || '' }).addTo(map);
        st.layer = layer; let ok = false;
        const mm = layer.getMaplibreMap();
        mm.on('load', () => { ok = true; });
        mm.on('error', e => { if (!ok && e && e.error && /Expected|Invalid|style/i.test(String(e.error.message))) raster(map, cfg, st); });
        setTimeout(() => { if (!ok) raster(map, cfg, st); }, 10000);
      }).catch(() => raster(map, cfg, st));
    }
  };
})(window);
