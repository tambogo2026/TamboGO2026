/* TamboGo · mapa nítido y rutas por las calles
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

  /* ===== Rutas por las calles y tiempos reales (OSRM público) ===== */
  const rad = x => x * Math.PI / 180;
  function hav(a, b) {
    const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }
  const Route = {
    /* Servidores de rutas gratuitos, sin llave. Si el primero falla se usa el segundo. */
    servers: ['https://router.project-osrm.org/route/v1/driving/', 'https://routing.openstreetmap.de/routed-car/route/v1/driving/'],
    factor: 1.15, /* ajuste de tiempo para moto y tuctuc en pueblo (1 = velocidad de carro) */
    cache: {}, pending: {}, failed: {}, leg: null, fetching: false, onleg: null,
    key(a, b) { return [a.lat, a.lng, b.lat, b.lng].map(n => Number(n).toFixed(4)).join(','); },
    peek(a, b) { return this.cache[this.key(a, b)] || null; },
    failedRecently(a, b) { const f = this.failed[this.key(a, b)]; return !!f && Date.now() - f < 60000; },
    prune() {
      const ks = Object.keys(this.cache);
      if (ks.length > 70) ks.sort((x, y) => this.cache[x].t - this.cache[y].t).slice(0, ks.length - 45).forEach(k => { delete this.cache[k]; });
    },
    build(coords, distM, durS) {
      const cum = [0];
      for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + hav(coords[i - 1], coords[i]));
      return { coords, cum, hkm: cum[cum.length - 1] || 0.0001, km: distM / 1000, min: durS / 60 * this.factor };
    },
    async get(a, b) {
      const k = this.key(a, b), hit = this.cache[k];
      if (hit && Date.now() - hit.t < 300000) return hit;
      if (this.pending[k]) return this.pending[k];
      if (this.failed[k] && Date.now() - this.failed[k] < 60000) return null;
      const job = (async () => {
        for (const base of this.servers) {
          const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 7000);
          try {
            const r = await fetch(base + a.lng + ',' + a.lat + ';' + b.lng + ',' + b.lat + '?overview=full&geometries=geojson', { signal: ctl.signal });
            clearTimeout(tm);
            if (!r.ok) continue;
            const j = await r.json(), rt = j.routes && j.routes[0];
            if (!rt) continue;
            const res = this.build(rt.geometry.coordinates.map(c => [c[1], c[0]]), rt.distance, rt.duration);
            res.t = Date.now(); this.cache[k] = res; this.prune();
            return res;
          } catch (e) { clearTimeout(tm); }
        }
        this.failed[k] = Date.now();
        return null;
      })();
      this.pending[k] = job;
      try { return await job; } finally { delete this.pending[k]; }
    },
    /* Punto más cercano sobre el trazado (proyección sobre cada tramo): sirve para saber cuánto falta y si se salió de la ruta */
    nearest(res, p) {
      const c = res.coords, q0 = [p.lat, p.lng];
      if (c.length < 2) return { i: 0, d: hav(q0, c[0]), at: 0 };
      const cosLat = Math.cos(rad(p.lat)), px = p.lng * cosLat, py = p.lat;
      let best = { i: 0, d: Infinity, at: 0 };
      for (let i = 0; i < c.length - 1; i++) {
        const A = c[i], B = c[i + 1], ax = A[1] * cosLat, ay = A[0], dx = B[1] * cosLat - ax, dy = B[0] - ay, len2 = dx * dx + dy * dy;
        const u = len2 > 0 ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
        const d = hav(q0, [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u]);
        if (d < best.d) best = { i, d, at: res.cum[i] + (res.cum[i + 1] - res.cum[i]) * u };
      }
      return best;
    },
    remainingFrom(res, p, n) {
      const frac = Math.max(0, (res.hkm - n.at) / res.hkm);
      const km = res.km * frac + n.d, min = res.min * frac + (res.km > 0 ? n.d / res.km * res.min : 0);
      return { coords: [[p.lat, p.lng]].concat(res.coords.slice(n.i + 1)), km, min };
    },
    /* Punto que está a cierta fracción (0 a 1) del recorrido, siguiendo las calles */
    along(res, frac) {
      if (res.coords.length < 2) return { lat: res.coords[0][0], lng: res.coords[0][1] };
      const target = Math.min(1, Math.max(0, frac)) * res.hkm, c = res.cum;
      let i = 1; while (i < c.length - 1 && c[i] < target) i++;
      const seg = c[i] - c[i - 1] || 1e-9, u = Math.min(1, Math.max(0, (target - c[i - 1]) / seg));
      const A = res.coords[i - 1], B = res.coords[i];
      return { lat: A[0] + (B[0] - A[0]) * u, lng: A[1] + (B[1] - A[1]) * u };
    },
    /* Tramo que falta desde 'from' hasta 'to'. Se recalcula cada 45 s o si el vehículo se sale de la ruta. */
    trackLeg(from, to) {
      const tk = Number(to.lat).toFixed(4) + ',' + Number(to.lng).toFixed(4), L = this.leg;
      let rem = null, off = false;
      if (L && L.tk === tk && L.res) { const n = this.nearest(L.res, from); off = n.d > 0.15; rem = this.remainingFrom(L.res, from, n); }
      const stale = !L || L.tk !== tk || Date.now() - L.at > 45000 || off;
      if (stale && !this.fetching) {
        this.fetching = true;
        this.get(from, to).then(res => {
          this.leg = { tk, res: res || (L && L.tk === tk ? L.res : null), at: Date.now() };
          this.fetching = false; if (this.onleg) this.onleg();
        }).catch(() => { this.fetching = false; });
      }
      return rem;
    }
  };
  w.MapRoute = Route;

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
