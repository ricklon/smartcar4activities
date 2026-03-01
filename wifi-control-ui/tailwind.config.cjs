module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        appFrom: 'rgb(var(--app-from) / <alpha-value>)',
        appMid: 'rgb(var(--app-mid) / <alpha-value>)',
        appTo: 'rgb(var(--app-to) / <alpha-value>)',
        panel: 'rgb(var(--panel-bg) / <alpha-value>)',
        panelSoft: 'rgb(var(--panel-soft) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        ok: 'rgb(var(--ok) / <alpha-value>)',
        warn: 'rgb(var(--warn) / <alpha-value>)',
        bad: 'rgb(var(--bad) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)'
      }
    }
  },
  plugins: []
};
