"use strict";
var e = require("react"),
  t = require("react/jsx-runtime");
let s, n;
const r = new Map();
((e) => {
  n ||
    ((s = { ...s, ...e }),
    (n = new Proxy(s, {
      get(e, t) {
        if ("string" == typeof t && t in e) return e[t];
      },
      set(e, t, s) {
        if ("string" == typeof t) {
          const n = e[t];
          if (JSON.stringify(n) !== JSON.stringify(s)) {
            e[t] = s;
            const n = r.get(t);
            n && n.forEach((e) => e(s));
          }
          return !0;
        }
        return !1;
      },
    })));
})({ styleData: null });
const o = "State is not initialized yet 👺",
  a = (e, t) => (
    r.has(e) || r.set(e, new Set()), r.get(e)?.add(t), () => r.get(e)?.delete(t)
  ),
  l = (t) => {
    const s = () => (n ? { ...n } : (console.warn(o), {}))[t];
    return [
      e.useSyncExternalStore((e) => a(t, e), s, s),
      e.useCallback(
        (e) => {
          const r = s(),
            a = "function" == typeof e ? e(r) : e;
          var l, c;
          Object.is(r, a) ||
            ((l = t), (c = a), n ? (n[l] = c) : console.warn(o));
        },
        [t]
      ),
    ];
  };
const c = (e, t) => e.length === t.length && e.every((e, s) => e === t[s]),
  i = ({ id: e, fileNames: t }) => {
    if (
      (t &&
        t.forEach((e) => {
          const t = document.head.getElementsByClassName(e)[0];
          t && document.head.removeChild(t);
        }),
      e && !t)
    ) {
      const t = CSS.escape(e);
      document.head.querySelectorAll(`[id^='${t}']`).forEach((e) => {
        document.head.removeChild(e);
      });
    }
  },
  f = (e, t) => {
    const s = (function (e) {
      let t = e.replace(/^\d+/, "");
      return (
        (t = t.replace(/[-_]\w/g, (e) => e.charAt(1).toUpperCase())),
        (t = t.charAt(0).toLowerCase() + t.slice(1)),
        t
      );
    })(t);
    let n = document.getElementsByClassName(s)[0];
    return (
      n ||
        ((n = document.createElement("style")),
        (n.id = e),
        (n.className = s),
        document.head.appendChild(n)),
      n
    );
  },
  u = (t) => {
    const [s, n] = l("styleData"),
      r = e.useRef({}),
      o = (e) => {
        Object.entries(e ?? {}).forEach(([e, s]) => {
          const o = r.current?.[e];
          let a = [];
          if (o) {
            const e = o.fileNames || [],
              t = s.fileNames || [];
            a = e.filter((e) => !t.includes(e));
          }
          (async (e, t, s, n) => {
            const r = Object.keys(e)[0],
              { fileNames: o, stylesLoaded: a } = e[r];
            if (o && 0 !== o.length)
              for (const e of o) {
                const l = f(r, e);
                try {
                  const { default: t } = await s(e);
                  l.textContent = t;
                } catch (t) {
                  console.error(`Error loading style for ${e} 👺`, t),
                    (l.textContent = "👺");
                } finally {
                  (t && c(t?.fileNames || [], o || []) && a) ||
                    n((e) => ({ ...e, [r]: { ...e?.[r], stylesLoaded: !0 } }));
                }
              }
            else console.warn(`No files to load for id "${r}" 👺`);
          })({ [e]: s }, o || {}, t, n),
            o && a.length > 0 && i({ id: e, fileNames: a });
        });
      };
    e.useEffect(() => {
      const e = Object.keys(r.current ?? {}),
        t = s ? Object.keys(s) : [];
      e.filter((e) => !t.includes(e)).forEach((e) => i({ id: e })),
        s && o(s),
        (r.current = { ...s });
    }, [s]);
  },
  d = "styledAtom💫",
  y = "empty⭐️",
  m = () => {
    sessionStorage.removeItem(d);
  },
  h = (e) => {
    sessionStorage.setItem(d, JSON.stringify(e));
  };
(exports.StyleCore = ({ path: t, watch: r }) => {
  u(t);
  const l = sessionStorage.getItem(d),
    c = n ? { ...n } : (console.warn(o), {});
  if (!r) return void (l && m());
  if (!l) {
    if (!c.styleData) return void h(y);
    h(c.styleData);
  }
  const i = ((e) => {
    const t = [];
    for (const r in s)
      t.push(
        a(r, () => {
          e({ ...n });
        })
      );
    return () => {
      t.forEach((e) => e());
    };
  })((e) => {
    e.styleData ? h(e.styleData) : h(y);
  });
  return (
    e.useEffect(
      () => () => {
        i(), l && m();
      },
      []
    ),
    null
  );
}),
  (exports.StyledAtom = ({ fileNames: s, children: n }) => {
    const [r, o] = l("styleData"),
      a = `${e.useId()}⭐️`.replace(/:/g, "");
    e.useEffect(
      () => (
        o((e) => ({ ...e, [a]: { ...e?.[a], fileNames: s } })),
        () => {
          o((e) => {
            if (!e) return null;
            const { [a]: t, ...s } = e;
            return s.length ? { ...s } : null;
          });
        }
      ),
      [s, a]
    );
    return r?.[a]?.stylesLoaded ?? !1
      ? t.jsx(t.Fragment, { children: n })
      : null;
  });
