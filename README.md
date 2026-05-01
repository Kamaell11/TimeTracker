# TimeTracker

A cross-platform time tracking app with automatic net salary calculation based on Polish tax law.

## Features

- **Timer** — start/stop work sessions with live earnings estimate
- **Manual entries** — log hours worked without the timer
- **Tax calculator** — quick gross → net breakdown
- **Work history** — browse, review and delete past sessions
- **Monthly summary** — totals by day, week or month
- **Multi-currency** — PLN, EUR, GBP, USD
- **Bilingual** — English and Polish interface

## Supported employment types

| Type | Description |
|---|---|
| Employment contract | Standard employer-employee (umowa o pracę) |
| Contract of mandate | Freelance-style (umowa zlecenie) |
| B2B – Linear tax | 19% flat rate |
| B2B – Progressive scale | 12%/32% brackets |
| B2B – Lump sum | Fixed rate on revenue (ryczałt) |

## Tech stack

- [Expo](https://expo.dev) (React Native)
- [Expo Router](https://expo.github.io/router) — file-based navigation
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) — local data, no backend
- [i18next](https://www.i18next.com) — internationalisation

## Getting started

```bash
npm install
npm run start      # opens Expo dev tools
npm run web        # runs in browser
npm run android    # opens on Android device/emulator
```

## Data & privacy

All data is stored locally on the device. Nothing is sent to any server. Uninstalling the app removes all data.

## Tax calculations

Calculations are based on Polish tax law (2024/2025):
- Tax-free amount: 30,000 PLN/year
- First bracket: 12% up to 120,000 PLN/year
- Second bracket: 32% above 120,000 PLN/year
- B2B linear: 19% flat

> Calculations are estimates. Consult a tax advisor for official figures.
