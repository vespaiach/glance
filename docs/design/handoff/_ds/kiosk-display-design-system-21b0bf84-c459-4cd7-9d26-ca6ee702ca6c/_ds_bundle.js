/* @ds-bundle: {"format":4,"namespace":"KioskDisplayDesignSystem_21b0bf","components":[{"name":"Clock","sourcePath":"components/calendar/Clock.jsx"},{"name":"EventRow","sourcePath":"components/calendar/EventRow.jsx"},{"name":"MonthGrid","sourcePath":"components/calendar/MonthGrid.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Eyebrow","sourcePath":"components/core/Eyebrow.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"PillTabs","sourcePath":"components/core/PillTabs.jsx"},{"name":"TextInput","sourcePath":"components/forms/TextInput.jsx"},{"name":"Ticker","sourcePath":"components/navigation/Ticker.jsx"},{"name":"TopBar","sourcePath":"components/navigation/TopBar.jsx"},{"name":"StickyNote","sourcePath":"components/notes/StickyNote.jsx"},{"name":"Banner","sourcePath":"components/surfaces/Banner.jsx"},{"name":"Card","sourcePath":"components/surfaces/Card.jsx"},{"name":"ColorBlock","sourcePath":"components/surfaces/ColorBlock.jsx"},{"name":"ForecastDay","sourcePath":"components/weather/ForecastDay.jsx"},{"name":"WeatherNow","sourcePath":"components/weather/WeatherNow.jsx"}],"sourceHashes":{"components/calendar/Clock.jsx":"810a775db6cc","components/calendar/EventRow.jsx":"b8536410cf2d","components/calendar/MonthGrid.jsx":"3b0f76834fd9","components/core/Button.jsx":"fc5b4c41dc53","components/core/Eyebrow.jsx":"b601d55e5b72","components/core/Icon.jsx":"c8dce752e0db","components/core/IconButton.jsx":"7fe1359d68a8","components/core/PillTabs.jsx":"eb2b9d51298d","components/forms/TextInput.jsx":"9a16edf6a3db","components/navigation/Ticker.jsx":"bfe724930f8c","components/navigation/TopBar.jsx":"3f5cb8ce0665","components/notes/StickyNote.jsx":"d8bdc0b7896a","components/surfaces/Banner.jsx":"7202702795f3","components/surfaces/Card.jsx":"6778f21f860d","components/surfaces/ColorBlock.jsx":"f2c47cd402e6","components/weather/ForecastDay.jsx":"19541294b1ac","components/weather/WeatherNow.jsx":"a191070eda9c","ui_kits/kiosk/CalendarScreen.jsx":"83699058c9da","ui_kits/kiosk/HomeScreen.jsx":"1e152c2c7037","ui_kits/kiosk/KioskApp.jsx":"c6ef9d0debf6","ui_kits/kiosk/NotesScreen.jsx":"cb59d198b8ab","ui_kits/kiosk/SettingsSheet.jsx":"e24b51011cb9","ui_kits/kiosk/WeatherScreen.jsx":"430cda949cf8","ui_kits/kiosk/data.js":"cda0a8f5a8ee"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.KioskDisplayDesignSystem_21b0bf = window.KioskDisplayDesignSystem_21b0bf || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/calendar/Clock.jsx
try { (() => {
const {
  useEffect,
  useState
} = React;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function Clock({
  time,
  hour12 = true,
  showDate = true,
  size = 'xl',
  align = 'left',
  style
}) {
  const [now, setNow] = useState(() => time ? new Date(time) : new Date());
  useEffect(() => {
    if (time) {
      setNow(new Date(time));
      return;
    }
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [time]);
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  if (hour12) h = h % 12 || 12;
  const big = size === 'xl' ? 'var(--type-clock-size)' : 'var(--type-display-xl-size)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: align === 'center' ? 'center' : 'flex-start',
      gap: 'var(--space-md)',
      ...style
    }
  }, showDate && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-eyebrow-size)',
      letterSpacing: 'var(--type-eyebrow-ls)',
      textTransform: 'uppercase',
      lineHeight: 1.3
    }
  }, DAYS[now.getDay()], ", ", MONTHS[now.getMonth()], " ", now.getDate()), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: big,
      fontWeight: 'var(--type-clock-weight)',
      lineHeight: 'var(--type-clock-lh)',
      letterSpacing: size === 'xl' ? 'var(--type-clock-ls)' : 'var(--type-display-xl-ls)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, h, /*#__PURE__*/React.createElement("span", {
    style: { animation: 'kskBlink 2s steps(1, end) infinite' }
  }, ":"), m), hour12 && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: size === 'xl' ? 28 : 18,
      letterSpacing: '0.6px'
    }
  }, ap)));
}
Object.assign(__ds_scope, { Clock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/calendar/Clock.jsx", error: String((e && e.message) || e) }); }

// components/calendar/EventRow.jsx
try { (() => {
function EventRow({
  start = '9:00',
  end,
  title,
  location,
  status = 'upcoming',
  dot = 'var(--season-block-4)',
  onClick,
  style
}) {
  const now = status === 'now';
  const past = status === 'past';
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      display: 'grid',
      gridTemplateColumns: '120px 16px minmax(0,1fr) auto',
      alignItems: 'center',
      columnGap: 'var(--space-lg)',
      padding: 'var(--space-lg)',
      borderRadius: 'var(--radius-md)',
      background: now ? 'var(--season-block-1)' : 'transparent',
      cursor: onClick ? 'pointer' : undefined,
      boxShadow: now ? 'none' : 'inset 0 -1px 0 var(--border-hairline-soft)',
      color: 'var(--text-primary)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      fontFamily: 'var(--font-mono)',
      letterSpacing: '0.54px'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, start), end && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-caption-size)',
      letterSpacing: 'var(--type-caption-ls)'
    }
  }, "\u2013 ", end)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: 16,
      height: 16,
      borderRadius: 9999,
      background: past ? 'var(--border-hairline)' : dot
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-headline-size)',
      fontWeight: past ? 340 : 'var(--type-headline-weight)',
      letterSpacing: 'var(--type-headline-ls)',
      lineHeight: 1.25,
      textDecoration: past ? 'line-through' : 'none',
      textDecorationThickness: 1
    }
  }, title), location && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      fontWeight: 'var(--type-body-sm-weight)'
    }
  }, location)), now && /*#__PURE__*/React.createElement("span", {
    style: {
      background: 'var(--action-primary)',
      color: 'var(--on-action-primary)',
      borderRadius: 'var(--radius-pill)',
      padding: '6px 14px',
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      letterSpacing: '0.6px'
    }
  }, "NOW"));
}
Object.assign(__ds_scope, { EventRow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/calendar/EventRow.jsx", error: String((e && e.message) || e) }); }

// components/calendar/MonthGrid.jsx
try { (() => {
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function MonthGrid({
  year = 2026,
  month = 9,
  selected,
  today,
  marked = [],
  onSelect,
  showTitle = true,
  cell = 64,
  style
}) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array(first).fill(null).concat(Array.from({
    length: days
  }, (_, i) => i + 1));
  while (cells.length % 7) cells.push(null);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-md)',
      color: 'var(--text-primary)',
      ...style
    }
  }, showTitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-headline-size)',
      fontWeight: 'var(--type-headline-weight)',
      letterSpacing: 'var(--type-headline-ls)'
    }
  }, MONTHS[month], " ", year), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, ' + cell + 'px)',
      rowGap: 6,
      columnGap: 6
    }
  }, ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: 'h' + i,
    style: {
      textAlign: 'center',
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-caption-size)',
      letterSpacing: 'var(--type-caption-ls)',
      padding: '8px 0'
    }
  }, d)), cells.map((d, i) => {
    if (!d) return /*#__PURE__*/React.createElement("div", {
      key: i
    });
    const sel = d === selected;
    const tod = d === today;
    const mk = marked.indexOf(d) >= 0;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      onClick: () => onSelect && onSelect(d),
      style: {
        width: cell,
        height: cell,
        borderRadius: 9999,
        border: 0,
        cursor: 'pointer',
        position: 'relative',
        padding: 0,
        background: sel ? 'var(--action-primary)' : 'transparent',
        color: sel ? 'var(--on-action-primary)' : 'inherit',
        boxShadow: tod && !sel ? 'inset 0 0 0 2px var(--black)' : 'none',
        fontFamily: 'var(--font-sans)',
        fontSize: Math.round(cell * 0.34),
        fontWeight: sel || tod ? 540 : 340,
        fontVariantNumeric: 'tabular-nums',
        transition: 'background var(--dur-fast)'
      }
    }, d, mk && /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: '50%',
        bottom: Math.round(cell * 0.14),
        width: 6,
        height: 6,
        marginLeft: -3,
        borderRadius: 9999,
        background: sel ? 'var(--white)' : 'var(--season-accent)'
      }
    }));
  })));
}
Object.assign(__ds_scope, { MonthGrid });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/calendar/MonthGrid.jsx", error: String((e && e.message) || e) }); }

// components/core/Eyebrow.jsx
try { (() => {
function Eyebrow({
  children,
  size = 'eyebrow',
  color,
  style
}) {
  const cap = size === 'caption';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      textTransform: 'uppercase',
      color: color || 'inherit',
      fontSize: cap ? 'var(--type-caption-size)' : 'var(--type-eyebrow-size)',
      lineHeight: cap ? 'var(--type-caption-lh)' : 'var(--type-eyebrow-lh)',
      letterSpacing: cap ? 'var(--type-caption-ls)' : 'var(--type-eyebrow-ls)',
      fontWeight: 400,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Eyebrow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Eyebrow.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const toPascal = n => String(n).replace(/(^|[-_ ])(\w)/g, (_, __, c) => c.toUpperCase());
function Icon({
  name,
  size = 24,
  strokeWidth = 1.75,
  color = 'currentColor',
  style,
  ...rest
}) {
  const lib = typeof window !== 'undefined' ? window.lucide : null;
  const node = lib && lib.icons ? lib.icons[toPascal(name)] || lib.icons[name] : null;
  let kids = [];
  if (node) kids = Array.isArray(node) && node[0] === 'svg' ? node[2] || [] : node;
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: {
      flexShrink: 0,
      display: 'block',
      ...style
    }
  }, rest), kids.map(([tag, attrs], i) => React.createElement(tag, {
    ...attrs,
    key: i
  })));
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const {
  useState
} = React;
const VARIANTS = {
  primary: {
    background: 'var(--action-primary)',
    color: 'var(--on-action-primary)'
  },
  secondary: {
    background: 'var(--surface-canvas)',
    color: 'var(--text-primary)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-primary)'
  },
  accent: {
    background: 'var(--action-accent)',
    color: 'var(--on-action-accent)'
  },
  inverse: {
    background: 'var(--white)',
    color: 'var(--black)'
  }
};
const SIZES = {
  md: {
    padding: '10px 20px',
    fontSize: 'var(--type-button-size)',
    minHeight: 'var(--touch-min)',
    gap: 8,
    icon: 20
  },
  lg: {
    padding: '16px 32px',
    fontSize: '24px',
    minHeight: 'var(--touch-kiosk)',
    gap: 10,
    icon: 26
  }
};
function Button({
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  fullWidth,
  disabled,
  children,
  style,
  onClick,
  ...rest
}) {
  const [down, setDown] = useState(false);
  const v = VARIANTS[variant] || VARIANTS.primary;
  const s = SIZES[size] || SIZES.md;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    disabled: disabled,
    onClick: onClick,
    onPointerDown: () => setDown(true),
    onPointerUp: () => setDown(false),
    onPointerLeave: () => setDown(false),
    style: {
      ...v,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: s.gap,
      padding: variant === 'secondary' && size === 'md' ? '8px 18px 10px' : s.padding,
      minHeight: s.minHeight,
      width: fullWidth ? '100%' : undefined,
      border: 0,
      borderRadius: 'var(--radius-pill)',
      cursor: disabled ? 'default' : 'pointer',
      fontFamily: 'var(--font-sans)',
      fontSize: s.fontSize,
      fontWeight: 'var(--type-button-weight)',
      lineHeight: 'var(--type-button-lh)',
      letterSpacing: 'var(--type-button-ls)',
      opacity: disabled ? 0.35 : 1,
      transform: down && !disabled ? 'scale(var(--press-scale))' : 'none',
      transition: 'transform var(--dur-press) var(--ease-out)',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rest), icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: s.icon
  }), children, iconRight && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: iconRight,
    size: s.icon
  }));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
const {
  useState
} = React;
const V = {
  soft: {
    background: 'var(--surface-soft)',
    color: 'var(--text-primary)'
  },
  canvas: {
    background: 'var(--surface-canvas)',
    color: 'var(--text-primary)'
  },
  solid: {
    background: 'var(--action-primary)',
    color: 'var(--on-action-primary)'
  },
  inverse: {
    background: 'var(--on-inverse-soft)',
    color: 'var(--text-inverse)'
  }
};
function IconButton({
  icon,
  variant = 'soft',
  size = 'md',
  label,
  onClick,
  active,
  style
}) {
  const [down, setDown] = useState(false);
  const px = size === 'lg' ? 72 : size === 'touch' ? 56 : 40;
  const v = active ? V.solid : V[variant] || V.soft;
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": label,
    title: label,
    onClick: onClick,
    onPointerDown: () => setDown(true),
    onPointerUp: () => setDown(false),
    onPointerLeave: () => setDown(false),
    style: {
      ...v,
      width: px,
      height: px,
      borderRadius: 'var(--radius-full)',
      border: 0,
      display: 'inline-grid',
      placeItems: 'center',
      cursor: 'pointer',
      padding: 0,
      transform: down ? 'scale(var(--press-scale))' : 'none',
      transition: 'transform var(--dur-press) var(--ease-out), background var(--dur-fast)',
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: Math.round(px * 0.45)
  }));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/PillTabs.jsx
try { (() => {
function PillTabs({
  options = [],
  value,
  onChange,
  size = 'md',
  style
}) {
  const lg = size === 'lg';
  return /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'inline-flex',
      gap: 4,
      padding: 4,
      borderRadius: 'var(--radius-pill)',
      background: 'var(--surface-canvas)',
      ...style
    }
  }, options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    const sel = opt.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: opt.value,
      role: "tab",
      "aria-selected": sel,
      type: "button",
      onClick: () => onChange && onChange(opt.value),
      style: {
        border: 0,
        cursor: 'pointer',
        borderRadius: 'var(--radius-pill)',
        padding: lg ? '14px 28px' : '8px 18px',
        minHeight: lg ? 56 : 40,
        background: sel ? 'var(--action-primary)' : 'transparent',
        color: sel ? 'var(--on-action-primary)' : 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
        fontSize: lg ? 22 : 'var(--type-button-size)',
        fontWeight: 'var(--type-button-weight)',
        letterSpacing: 'var(--type-button-ls)',
        lineHeight: 1.2,
        transition: 'background var(--dur-fast) var(--ease-out), color var(--dur-fast)'
      }
    }, opt.label);
  }));
}
Object.assign(__ds_scope, { PillTabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/PillTabs.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextInput.jsx
try { (() => {
const {
  useState
} = React;
function TextInput({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  size = 'md',
  error,
  style
}) {
  const [focus, setFocus] = useState(false);
  const lg = size === 'lg';
  const Tag = multiline ? 'textarea' : 'input';
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: 'var(--type-body-lg-size)',
      fontWeight: 'var(--type-body-lg-weight)',
      letterSpacing: 'var(--type-body-lg-ls)'
    }
  }, label), /*#__PURE__*/React.createElement(Tag, {
    value: value,
    rows: multiline ? rows : undefined,
    placeholder: placeholder,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      fontFamily: 'var(--font-sans)',
      fontSize: lg ? 24 : 'var(--type-body-size)',
      fontWeight: 'var(--type-body-weight)',
      letterSpacing: 'var(--type-body-ls)',
      lineHeight: 'var(--type-body-lh)',
      color: 'var(--text-primary)',
      background: 'var(--surface-canvas)',
      padding: lg ? '18px 20px' : '12px 14px',
      minHeight: lg ? 64 : 48,
      boxSizing: 'border-box',
      resize: 'none',
      border: '1px solid ' + (error ? 'var(--danger)' : focus ? 'var(--black)' : 'var(--border-hairline)'),
      borderRadius: 'var(--radius-md)',
      outline: 'none',
      boxShadow: focus ? '0 0 0 2px ' + (error ? 'var(--danger)' : 'var(--focus-ring)') : 'none',
      transition: 'box-shadow var(--dur-fast)'
    }
  }), error && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-caption-size)',
      letterSpacing: 'var(--type-caption-ls)',
      textTransform: 'uppercase',
      color: 'var(--danger)'
    }
  }, error));
}
Object.assign(__ds_scope, { TextInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextInput.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Ticker.jsx
try { (() => {
function Ticker({
  items = [],
  speed = 40,
  height = 48,
  style
}) {
  const row = items.concat(items);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height,
      overflow: 'hidden',
      background: 'var(--surface-inverse)',
      color: 'var(--text-inverse)',
      display: 'flex',
      alignItems: 'center',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 48,
      paddingLeft: 48,
      whiteSpace: 'nowrap',
      animation: 'kiosk-marquee ' + speed + 's linear infinite',
      willChange: 'transform'
    }
  }, row.map((t, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 48,
      fontSize: 18,
      fontWeight: 400,
      letterSpacing: '-0.14px'
    }
  }, t, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      width: 6,
      height: 6,
      borderRadius: 9999,
      background: 'currentColor',
      opacity: 0.5
    }
  })))));
}
Object.assign(__ds_scope, { Ticker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Ticker.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TopBar.jsx
try { (() => {
function TopBar({
  brand = 'Kiosk',
  center,
  right,
  height = 88,
  inverse,
  style
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      height,
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-lg)',
      padding: '0 var(--kiosk-gutter)',
      boxSizing: 'border-box',
      background: inverse ? 'var(--surface-inverse)' : 'var(--surface-canvas)',
      color: inverse ? 'var(--text-inverse)' : 'var(--text-primary)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      fontWeight: 540,
      letterSpacing: '-0.8px',
      lineHeight: 1
    }
  }, brand), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      justifyContent: 'center',
      minWidth: 0
    }
  }, center), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-sm)'
    }
  }, right));
}
Object.assign(__ds_scope, { TopBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TopBar.jsx", error: String((e && e.message) || e) }); }

// components/notes/StickyNote.jsx
try { (() => {
function StickyNote({
  children,
  author,
  time,
  tone = 2,
  rotate = 0,
  width = 280,
  minHeight = 220,
  onClick,
  style
}) {
  const bg = {
    1: 'var(--season-block-1)',
    2: 'var(--season-block-2)',
    3: 'var(--season-block-3)',
    4: 'var(--season-block-4)',
    soft: 'var(--season-soft)'
  }[tone] || tone;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      background: bg,
      width,
      minHeight,
      boxSizing: 'border-box',
      padding: 'var(--space-lg)',
      borderRadius: 'var(--radius-sm)',
      boxShadow: 'var(--shadow-2)',
      transform: 'rotate(' + rotate + 'deg)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: 'var(--space-md)',
      color: 'var(--text-primary)',
      cursor: onClick ? 'pointer' : undefined,
      transition: 'background var(--dur-season) var(--ease-in-out), transform var(--dur-base) var(--ease-out)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 400,
      lineHeight: 1.3,
      letterSpacing: '-0.3px',
      textWrap: 'pretty'
    }
  }, children), (author || time) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 8,
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-caption-size)',
      letterSpacing: 'var(--type-caption-ls)',
      textTransform: 'uppercase'
    }
  }, /*#__PURE__*/React.createElement("span", null, author), /*#__PURE__*/React.createElement("span", null, time)));
}
Object.assign(__ds_scope, { StickyNote });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/notes/StickyNote.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Banner.jsx
try { (() => {
function Banner({
  icon,
  title,
  body,
  actionLabel,
  onAction,
  tone = 4,
  style
}) {
  const bg = {
    1: 'var(--season-block-1)',
    2: 'var(--season-block-2)',
    3: 'var(--season-block-3)',
    4: 'var(--season-block-4)',
    soft: 'var(--season-soft)'
  }[tone] || tone;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-md) var(--space-lg)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-md)',
      color: 'var(--text-primary)',
      ...style
    }
  }, icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 28
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 540,
      letterSpacing: '-0.14px',
      lineHeight: 1.3
    }
  }, title), body && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-body-sm-size)',
      fontWeight: 'var(--type-body-sm-weight)',
      lineHeight: 'var(--type-body-sm-lh)'
    }
  }, body)), actionLabel && /*#__PURE__*/React.createElement(__ds_scope.Button, {
    variant: "accent",
    onClick: onAction
  }, actionLabel));
}
Object.assign(__ds_scope, { Banner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Banner.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Card.jsx
try { (() => {
const V = {
  hairline: {
    background: 'var(--surface-canvas)',
    boxShadow: 'var(--shadow-1)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--space-lg)'
  },
  soft: {
    background: 'var(--surface-soft)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-md)'
  },
  canvas: {
    background: 'var(--surface-canvas)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-lg)'
  },
  elevated: {
    background: 'var(--surface-canvas)',
    boxShadow: 'var(--shadow-2)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--space-lg)'
  }
};
function Card({
  variant = 'hairline',
  title,
  eyebrow,
  children,
  style,
  onClick
}) {
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    style: {
      ...V[variant],
      color: 'var(--text-primary)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-sm)',
      cursor: onClick ? 'pointer' : undefined,
      ...style
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-caption-size)',
      letterSpacing: 'var(--type-caption-ls)',
      textTransform: 'uppercase'
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-card-title-size)',
      fontWeight: 'var(--type-card-title-weight)',
      lineHeight: 'var(--type-card-title-lh)'
    }
  }, title), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Card.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/ColorBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  1: 'var(--season-block-1)',
  2: 'var(--season-block-2)',
  3: 'var(--season-block-3)',
  4: 'var(--season-block-4)',
  soft: 'var(--season-soft)',
  deep: 'var(--season-deep)',
  canvas: 'var(--surface-canvas)',
  ink: 'var(--surface-inverse)'
};
function ColorBlock({
  tone = 1,
  padding = 'var(--space-xxl)',
  radius = 'var(--radius-lg)',
  children,
  style,
  ...rest
}) {
  const dark = tone === 'deep' || tone === 'ink';
  return /*#__PURE__*/React.createElement("section", _extends({
    style: {
      background: TONES[tone] || tone,
      color: dark ? 'var(--text-on-deep)' : 'var(--text-primary)',
      borderRadius: radius,
      padding,
      boxSizing: 'border-box',
      transition: 'background var(--dur-season) var(--ease-in-out)',
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { ColorBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/ColorBlock.jsx", error: String((e && e.message) || e) }); }

// components/weather/ForecastDay.jsx
try { (() => {
function ForecastDay({
  day = 'Fri',
  icon = 'sun',
  high = 70,
  low = 52,
  precip,
  active,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      border: 0,
      cursor: onClick ? 'pointer' : 'default',
      font: 'inherit',
      color: 'var(--text-primary)',
      textAlign: 'center',
      background: active ? 'var(--surface-canvas)' : 'transparent',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--space-lg) var(--space-md)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 'var(--space-md)',
      minWidth: 112,
      transition: 'background var(--dur-fast)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-eyebrow-size)',
      letterSpacing: 'var(--type-eyebrow-ls)',
      textTransform: 'uppercase'
    }
  }, day), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 48,
    strokeWidth: 1.5
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 32,
      fontWeight: 480,
      letterSpacing: '-0.6px',
      lineHeight: 1.1
    }
  }, high, "\xB0"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20,
      fontWeight: 330,
      lineHeight: 1.2
    }
  }, low, "\xB0")), precip != null && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--type-caption-size)',
      letterSpacing: 'var(--type-caption-ls)',
      display: 'flex',
      gap: 4,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "droplet",
    size: 12
  }), precip, "%"));
}
Object.assign(__ds_scope, { ForecastDay });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/weather/ForecastDay.jsx", error: String((e && e.message) || e) }); }

// components/weather/WeatherNow.jsx
try { (() => {
function WeatherNow({
  location = 'Portland, OR',
  temp = 64,
  unit = 'F',
  condition = 'Partly cloudy',
  icon = 'cloud-sun',
  high,
  low,
  feelsLike,
  details = [],
  tone = 3,
  style
}) {
  const bg = {
    1: 'var(--season-block-1)',
    2: 'var(--season-block-2)',
    3: 'var(--season-block-3)',
    4: 'var(--season-block-4)',
    soft: 'var(--season-soft)',
    deep: 'var(--season-deep)'
  }[tone] || tone;
  const dark = tone === 'deep';
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--type-eyebrow-size)',
    letterSpacing: 'var(--type-eyebrow-ls)',
    textTransform: 'uppercase',
    lineHeight: 1.3
  };
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: bg,
      color: dark ? 'var(--text-on-deep)' : 'var(--text-primary)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-xxl)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-lg)',
      boxSizing: 'border-box',
      transition: 'background var(--dur-season) var(--ease-in-out)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: mono
  }, location), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-xl)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-temp-size)',
      fontWeight: 'var(--type-temp-weight)',
      lineHeight: 'var(--type-temp-lh)',
      letterSpacing: 'var(--type-temp-ls)',
      fontVariantNumeric: 'tabular-nums'
    }
  }, temp, "\xB0"), /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: icon,
    size: 112,
    strokeWidth: 1.25
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 40,
      fontWeight: 'var(--type-display-lg-weight)',
      lineHeight: 'var(--type-display-lg-lh)',
      letterSpacing: '-0.6px'
    }
  }, condition), (high != null || low != null) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--type-body-lg-size)',
      fontWeight: 480
    }
  }, "H ", high, "\xB0  \xB7  L ", low, "\xB0", feelsLike != null ? '  ·  Feels like ' + feelsLike + '°' : '')), details.length > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(' + details.length + ', minmax(0,1fr))',
      gap: 'var(--space-md)',
      paddingTop: 'var(--space-lg)',
      borderTop: '1px solid ' + (dark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.12)')
    }
  }, details.map(d => /*#__PURE__*/React.createElement("div", {
    key: d.label,
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...mono,
      fontSize: 'var(--type-caption-size)',
      letterSpacing: 'var(--type-caption-ls)',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, d.icon && /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: d.icon,
    size: 16
  }), d.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 480,
      letterSpacing: '-0.4px'
    }
  }, d.value)))));
}
Object.assign(__ds_scope, { WeatherNow });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/weather/WeatherNow.jsx", error: String((e && e.message) || e) }); }

// ui_kits/kiosk/CalendarScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const calNS = window.KioskDisplayDesignSystem_21b0bf;
function CalendarScreen({
  data
}) {
  const {
    ColorBlock,
    MonthGrid,
    EventRow,
    Eyebrow,
    IconButton
  } = calNS;
  const [day, setDay] = React.useState(data.today);
  const [month, setMonth] = React.useState(data.month);
  const inMonth = month === data.month;
  const events = inMonth && data.events[day] || [];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dow = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(data.year, month, day).getDay()];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '640px minmax(0,1fr)',
      gap: 24,
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(ColorBlock, {
    tone: "soft",
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      fontWeight: 340,
      letterSpacing: '-0.96px',
      lineHeight: 1.1
    }
  }, MONTHS[month]), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(IconButton, {
    icon: "chevron-left",
    variant: "canvas",
    size: "touch",
    label: "Previous month",
    onClick: () => setMonth(m => Math.max(0, m - 1))
  }), /*#__PURE__*/React.createElement(IconButton, {
    icon: "chevron-right",
    variant: "canvas",
    size: "touch",
    label: "Next month",
    onClick: () => setMonth(m => Math.min(11, m + 1))
  }))), /*#__PURE__*/React.createElement(MonthGrid, {
    year: data.year,
    month: month,
    today: inMonth ? data.today : undefined,
    selected: day,
    onSelect: setDay,
    marked: inMonth ? Object.keys(data.events).map(Number) : [],
    showTitle: false,
    cell: 72
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      padding: '16px 0',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, events.length ? events.length + (events.length === 1 ? ' event' : ' events') : 'No events'), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 86,
      fontWeight: 340,
      letterSpacing: '-1.72px',
      lineHeight: 1
    }
  }, dow, ", ", MONTHS[month].slice(0, 3), " ", day)), /*#__PURE__*/React.createElement("div", null, events.map((e, i) => /*#__PURE__*/React.createElement(EventRow, _extends({
    key: day + '-' + i
  }, e, {
    status: day === data.today && inMonth ? e.status : 'upcoming'
  })))), !events.length && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 26,
      fontWeight: 340
    }
  }, "Nothing scheduled. Rooms are open for booking at the front desk.")));
}
window.CalendarScreen = CalendarScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/kiosk/CalendarScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/kiosk/HomeScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const homeNS = window.KioskDisplayDesignSystem_21b0bf;
function HomeScreen({
  data,
  notes,
  go
}) {
  const {
    ColorBlock,
    Clock,
    EventRow,
    Eyebrow,
    WeatherNow,
    StickyNote,
    Button
  } = homeNS;
  const events = data.events[data.today];
  const next = events.find(e => e.status === 'now') || events[0];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '600px minmax(0,1fr) 560px',
      gap: 24,
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(ColorBlock, {
    tone: 1,
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement(Clock, {
    time: data.now
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Happening now"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      fontWeight: 340,
      lineHeight: 1.05,
      letterSpacing: '-0.96px'
    }
  }, next.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 330
    }
  }, next.location, " \xB7 until ", next.end)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 18,
      letterSpacing: '0.54px',
      textTransform: 'uppercase'
    }
  }, data.place)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Today \xB7 ", events.length, " events"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    iconRight: "arrow-right",
    onClick: () => go('Calendar')
  }, "Full calendar")), /*#__PURE__*/React.createElement("div", null, events.map((e, i) => /*#__PURE__*/React.createElement(EventRow, _extends({
    key: i
  }, e))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => go('Weather'),
    style: {
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement(WeatherNow, _extends({
    location: data.location
  }, data.weather, {
    details: []
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Notes"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    iconRight: "arrow-right",
    onClick: () => go('Notes')
  }, "All notes")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      padding: '0 8px'
    }
  }, notes.slice(0, 2).map(n => /*#__PURE__*/React.createElement(StickyNote, {
    key: n.id,
    tone: n.tone,
    rotate: n.rotate,
    author: n.author,
    time: n.time,
    width: 250,
    minHeight: 190
  }, n.text)))));
}
window.HomeScreen = HomeScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/kiosk/HomeScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/kiosk/KioskApp.jsx
try { (() => {
const appNS = window.KioskDisplayDesignSystem_21b0bf;
const seasonFor = m => m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'fall' : 'winter';
function KioskApp() {
  const {
    TopBar,
    PillTabs,
    IconButton,
    Ticker
  } = appNS;
  const data = window.KIOSK_DATA;
  const [tab, setTab] = React.useState(() => localStorage.getItem('kiosk.tab') || 'Today');
  const [seasonPick, setSeasonPick] = React.useState(() => localStorage.getItem('kiosk.season') || 'auto');
  const [settings, setSettings] = React.useState(false);
  const [notes, setNotes] = React.useState(data.notes);
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    localStorage.setItem('kiosk.tab', tab);
  }, [tab]);
  React.useEffect(() => {
    localStorage.setItem('kiosk.season', seasonPick);
  }, [seasonPick]);
  React.useEffect(() => {
    const f = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    f();
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  const season = seasonPick === 'auto' ? seasonFor(data.month) : seasonPick;
  const Screen = {
    Today: window.HomeScreen,
    Calendar: window.CalendarScreen,
    Weather: window.WeatherScreen,
    Notes: window.NotesScreen
  }[tab];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: '100vw',
      height: '100vh',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    "data-season": season,
    "data-screen-label": tab,
    style: {
      width: 1920,
      height: 1080,
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%) scale(' + scale + ')',
      background: 'var(--surface-canvas)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement(TopBar, {
    brand: "Kiosk",
    center: /*#__PURE__*/React.createElement(PillTabs, {
      size: "lg",
      style: {
        background: 'var(--surface-soft)'
      },
      options: ['Today', 'Calendar', 'Weather', 'Notes'],
      value: tab,
      onChange: setTab
    }),
    right: /*#__PURE__*/React.createElement(IconButton, {
      icon: "settings",
      label: "Settings",
      size: "touch",
      onClick: () => setSettings(true)
    })
  }), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minHeight: 0,
      padding: '8px 48px 48px',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement(Screen, {
    data: data,
    notes: notes,
    setNotes: setNotes,
    go: setTab
  })), /*#__PURE__*/React.createElement(Ticker, {
    items: data.ticker
  }), settings && /*#__PURE__*/React.createElement(SettingsSheet, {
    season: seasonPick,
    setSeason: setSeasonPick,
    onClose: () => setSettings(false)
  })));
}
if (document.getElementById('root') && document.getElementById('root').dataset.kioskDemo !== undefined) ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(KioskApp, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/kiosk/KioskApp.jsx", error: String((e && e.message) || e) }); }

// ui_kits/kiosk/NotesScreen.jsx
try { (() => {
const notesNS = window.KioskDisplayDesignSystem_21b0bf;
function NotesScreen({
  notes,
  setNotes
}) {
  const {
    StickyNote,
    Button,
    Eyebrow,
    TextInput,
    PillTabs
  } = notesNS;
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [name, setName] = React.useState('');
  const [tone, setTone] = React.useState('1');
  const post = () => {
    if (!text.trim()) return;
    const rot = [-2, 1.5, -1, 2.5, -1.5][notes.length % 5];
    setNotes([{
      id: Date.now(),
      text: text.trim(),
      author: name.trim() || 'Guest',
      time: 'Just now',
      tone: tone === 'soft' ? 'soft' : Number(tone),
      rotate: rot
    }, ...notes]);
    setText('');
    setName('');
    setOpen(false);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 32,
      height: '100%',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-end'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, notes.length, " notes"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 86,
      fontWeight: 340,
      letterSpacing: '-1.72px',
      lineHeight: 1
    }
  }, "Notice board")), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    icon: "plus",
    onClick: () => setOpen(true)
  }, "Add note")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 40,
      padding: '8px 12px',
      alignContent: 'flex-start',
      overflow: 'hidden',
      flex: 1
    }
  }, notes.map(n => /*#__PURE__*/React.createElement(StickyNote, {
    key: n.id,
    tone: n.tone,
    rotate: n.rotate,
    author: n.author,
    time: n.time,
    width: 300,
    minHeight: 240
  }, n.text))), open && /*#__PURE__*/React.createElement("div", {
    onClick: () => setOpen(false),
    style: {
      position: 'absolute',
      inset: -48,
      background: 'var(--scrim)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 760,
      background: 'var(--surface-canvas)',
      borderRadius: 32,
      padding: 48,
      boxShadow: 'var(--shadow-3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      fontWeight: 340,
      letterSpacing: '-0.96px',
      lineHeight: 1.1
    }
  }, "New note"), /*#__PURE__*/React.createElement(TextInput, {
    size: "lg",
    multiline: true,
    rows: 3,
    label: "Message",
    placeholder: "Leave a note for the team",
    value: text,
    onChange: setText
  }), /*#__PURE__*/React.createElement(TextInput, {
    size: "lg",
    label: "Your name",
    placeholder: "Optional",
    value: name,
    onChange: setName
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20,
      fontWeight: 330
    }
  }, "Color"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12
    }
  }, ['1', '2', '3', '4', 'soft'].map(t => /*#__PURE__*/React.createElement("button", {
    key: t,
    type: "button",
    "aria-label": 'Tone ' + t,
    onClick: () => setTone(t),
    style: {
      width: 56,
      height: 56,
      borderRadius: 9999,
      border: 0,
      cursor: 'pointer',
      background: t === 'soft' ? 'var(--season-soft)' : 'var(--season-block-' + t + ')',
      boxShadow: tone === t ? '0 0 0 3px var(--white), 0 0 0 5px var(--black)' : 'none'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    variant: "secondary",
    style: {
      boxShadow: 'var(--shadow-1)'
    },
    onClick: () => setOpen(false)
  }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
    size: "lg",
    disabled: !text.trim(),
    onClick: post
  }, "Post note")))));
}
window.NotesScreen = NotesScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/kiosk/NotesScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/kiosk/SettingsSheet.jsx
try { (() => {
const setNS = window.KioskDisplayDesignSystem_21b0bf;
function SettingsSheet({
  season,
  setSeason,
  onClose
}) {
  const {
    PillTabs,
    IconButton,
    Eyebrow
  } = setNS;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--scrim)',
      display: 'grid',
      placeItems: 'center',
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: 820,
      background: 'var(--surface-canvas)',
      borderRadius: 32,
      padding: 48,
      boxShadow: 'var(--shadow-3)',
      display: 'flex',
      flexDirection: 'column',
      gap: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 64,
      fontWeight: 340,
      letterSpacing: '-0.96px',
      lineHeight: 1.1
    }
  }, "Display settings"), /*#__PURE__*/React.createElement(IconButton, {
    icon: "x",
    label: "Close",
    size: "touch",
    onClick: onClose
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Season palette"), /*#__PURE__*/React.createElement(PillTabs, {
    size: "lg",
    style: {
      background: 'var(--surface-soft)',
      alignSelf: 'flex-start'
    },
    value: season,
    onChange: setSeason,
    options: [{
      value: 'auto',
      label: 'Auto'
    }, {
      value: 'spring',
      label: 'Spring'
    }, {
      value: 'summer',
      label: 'Summer'
    }, {
      value: 'fall',
      label: 'Fall'
    }, {
      value: 'winter',
      label: 'Winter'
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: 8
    }
  }, ['--season-block-1', '--season-block-2', '--season-block-3', '--season-block-4', '--season-deep', '--season-accent'].map(v => /*#__PURE__*/React.createElement("div", {
    key: v,
    style: {
      height: 56,
      borderRadius: 8,
      background: 'var(' + v + ')',
      transition: 'background var(--dur-season) var(--ease-in-out)'
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 320
    }
  }, "Auto follows the calendar: Spring Mar\u2013May, Summer Jun\u2013Aug, Fall Sep\u2013Nov, Winter Dec\u2013Feb."))));
}
window.SettingsSheet = SettingsSheet;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/kiosk/SettingsSheet.jsx", error: String((e && e.message) || e) }); }

// ui_kits/kiosk/WeatherScreen.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const wxNS = window.KioskDisplayDesignSystem_21b0bf;
function WeatherScreen({
  data
}) {
  const {
    WeatherNow,
    ColorBlock,
    ForecastDay,
    Eyebrow,
    Icon,
    Banner
  } = wxNS;
  const [sel, setSel] = React.useState(0);
  const d = data.forecast[sel];
  const w = sel === 0 ? data.weather : {
    ...data.weather,
    temp: d.high,
    icon: d.icon,
    high: d.high,
    low: d.low,
    condition: {
      sun: 'Sunny',
      cloud: 'Cloudy',
      'cloud-rain': 'Rain',
      'cloud-sun': 'Partly cloudy',
      'cloud-lightning': 'Thunderstorms'
    }[d.icon],
    feelsLike: undefined
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '720px minmax(0,1fr)',
      gap: 24,
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement(WeatherNow, _extends({
    location: data.location + (sel ? ' · ' + d.day : ' · Now')
  }, w, {
    style: {
      justifyContent: 'space-between'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 24,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Banner, {
    icon: "cloud-rain",
    title: "Rain moving in after 4 PM",
    body: "Umbrellas are available at the front desk.",
    tone: "soft"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "Next 8 hours"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(8, minmax(0,1fr))',
      gap: 8
    }
  }, data.hourly.map(([t, ic, tp]) => /*#__PURE__*/React.createElement("div", {
    key: t,
    style: {
      background: 'var(--surface-soft)',
      borderRadius: 8,
      padding: '20px 8px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 14,
      letterSpacing: '0.6px'
    }
  }, t), /*#__PURE__*/React.createElement(Icon, {
    name: ic,
    size: 36,
    strokeWidth: 1.5
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 28,
      fontWeight: 480,
      letterSpacing: '-0.4px'
    }
  }, tp, "\xB0"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Eyebrow, null, "7-day forecast"), /*#__PURE__*/React.createElement(ColorBlock, {
    tone: "soft",
    padding: 16,
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, minmax(0,1fr))',
      gap: 8,
      flex: 1
    }
  }, data.forecast.map((f, i) => /*#__PURE__*/React.createElement(ForecastDay, _extends({
    key: f.day
  }, f, {
    active: i === sel,
    onClick: () => setSel(i),
    style: {
      minWidth: 0
    }
  })))))));
}
window.WeatherScreen = WeatherScreen;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/kiosk/WeatherScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/kiosk/data.js
try { (() => {
window.KIOSK_DATA = {
  place: 'Northwind HQ · Lobby',
  location: 'Portland, OR',
  now: '2026-10-09T10:41:00',
  today: 9,
  month: 9,
  year: 2026,
  events: {
    9: [{
      start: '9:00',
      end: '9:30',
      title: 'Team standup',
      location: 'Huddle room 2',
      status: 'past'
    }, {
      start: '10:30',
      end: '11:15',
      title: 'Design review',
      location: 'Room 4B',
      status: 'now'
    }, {
      start: '12:00',
      end: '1:00',
      title: 'Lunch & learn: accessibility',
      location: 'Cafeteria',
      dot: 'var(--season-block-2)'
    }, {
      start: '2:00',
      end: '2:20',
      title: 'Fire drill',
      location: 'All floors',
      dot: 'var(--season-accent)'
    }, {
      start: '3:30',
      end: '4:30',
      title: 'Client visit — Ortiz & Co.',
      location: 'Room 1A',
      dot: 'var(--season-block-3)'
    }],
    2: [{
      start: '11:00',
      end: '12:00',
      title: 'All-hands',
      location: 'Atrium'
    }],
    14: [{
      start: '9:30',
      end: '10:30',
      title: 'Quarterly planning',
      location: 'Room 4B'
    }, {
      start: '4:00',
      end: '5:00',
      title: 'Book club',
      location: 'Library'
    }],
    22: [{
      start: '1:00',
      end: '3:00',
      title: 'Facilities walkthrough',
      location: 'Floors 2–4'
    }],
    28: [{
      start: '5:00',
      end: '7:00',
      title: 'Fall social',
      location: 'Roof deck'
    }]
  },
  weather: {
    temp: 64,
    condition: 'Partly cloudy',
    icon: 'cloud-sun',
    high: 68,
    low: 51,
    feelsLike: 62,
    details: [{
      label: 'Wind',
      value: '8 mph NW',
      icon: 'wind'
    }, {
      label: 'Humidity',
      value: '62%',
      icon: 'droplets'
    }, {
      label: 'UV index',
      value: '3',
      icon: 'sun'
    }, {
      label: 'Sunset',
      value: '6:42 PM',
      icon: 'sunset'
    }]
  },
  hourly: [['11 AM', 'cloud-sun', 64], ['12 PM', 'cloud-sun', 66], ['1 PM', 'cloud', 67], ['2 PM', 'cloud', 68], ['3 PM', 'cloud-drizzle', 65], ['4 PM', 'cloud-rain', 61], ['5 PM', 'cloud-rain', 58], ['6 PM', 'cloud', 56]],
  forecast: [{
    day: 'Today',
    icon: 'cloud-sun',
    high: 68,
    low: 51,
    precip: 20
  }, {
    day: 'Fri',
    icon: 'cloud-rain',
    high: 59,
    low: 48,
    precip: 80
  }, {
    day: 'Sat',
    icon: 'cloud',
    high: 61,
    low: 47,
    precip: 30
  }, {
    day: 'Sun',
    icon: 'sun',
    high: 66,
    low: 49
  }, {
    day: 'Mon',
    icon: 'sun',
    high: 69,
    low: 50
  }, {
    day: 'Tue',
    icon: 'cloud-sun',
    high: 65,
    low: 50,
    precip: 10
  }, {
    day: 'Wed',
    icon: 'cloud-lightning',
    high: 58,
    low: 46,
    precip: 70
  }],
  notes: [{
    id: 1,
    text: 'Coffee machine on 3 is fixed!',
    author: 'Maya',
    time: '8:12 AM',
    tone: 1,
    rotate: -2
  }, {
    id: 2,
    text: 'Packages for Ortiz waiting at reception.',
    author: 'Front desk',
    time: '9:05 AM',
    tone: 2,
    rotate: 1.5
  }, {
    id: 3,
    text: 'Windows cleaned Wednesday — please leave blinds up.',
    author: 'Facilities',
    time: 'Mon',
    tone: 3,
    rotate: -1
  }, {
    id: 4,
    text: 'Welcome Priya to the design team.',
    author: 'People ops',
    time: 'Tue',
    tone: 4,
    rotate: 2.5
  }, {
    id: 5,
    text: 'Bike room code changes Friday. Ask the desk.',
    author: 'Security',
    time: 'Tue',
    tone: 'soft',
    rotate: -1.5
  }],
  ticker: ['Fire drill today at 2:00 PM — use the east stairwell', 'Parking lot B closed for resurfacing through Monday', 'Welcome, Ortiz & Co. visitors', 'Rain expected after 4 PM']
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/kiosk/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Clock = __ds_scope.Clock;

__ds_ns.EventRow = __ds_scope.EventRow;

__ds_ns.MonthGrid = __ds_scope.MonthGrid;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Eyebrow = __ds_scope.Eyebrow;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.PillTabs = __ds_scope.PillTabs;

__ds_ns.TextInput = __ds_scope.TextInput;

__ds_ns.Ticker = __ds_scope.Ticker;

__ds_ns.TopBar = __ds_scope.TopBar;

__ds_ns.StickyNote = __ds_scope.StickyNote;

__ds_ns.Banner = __ds_scope.Banner;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ColorBlock = __ds_scope.ColorBlock;

__ds_ns.ForecastDay = __ds_scope.ForecastDay;

__ds_ns.WeatherNow = __ds_scope.WeatherNow;

})();
