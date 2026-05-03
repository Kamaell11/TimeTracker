# TimeTracker

A cross-platform time tracking app with automatic net salary calculation. Supports Polish, Norwegian, British and German tax systems.

## Features

- **Timer** — start/stop work sessions with live gross/net earnings estimate
- **Manual entries** — log hours worked without the timer, with optional note
- **Break handling** — automatic break deduction (configurable) or manual override on every stop
- **Projects** — tag sessions to client/project for organised history
- **Work goals** — set weekly or monthly hour targets with a progress bar
- **Tax calculator** — quick gross → net breakdown for any amount
- **Work history** — sessions grouped by day and month, with per-day totals
- **Summary** — totals and bar chart by today/week/month
- **CSV export** — share session data for external processing
- **Daily reminder** — push notification at a configurable time
- **Dark mode** — automatic or manual light/dark theme
- **Multi-currency** — PLN, NOK, GBP, EUR, USD
- **Bilingual** — English and Polish interface

## Supported countries & employment types

| Country | Type |
|---|---|
| 🇵🇱 Poland | Employment contract, Contract of mandate, B2B (linear 19%, progressive scale, lump sum) |
| 🇳🇴 Norway | Employee (ansatt), Self-employed — incl. holiday pay mode (Kongens tillegg) |
| 🇬🇧 United Kingdom | Employee (PAYE), Self-employed |
| 🇩🇪 Germany | Employee (Arbeitnehmer) |

## Tech stack

- [Expo](https://expo.dev) (React Native) — iOS, Android, Web from one codebase
- [Expo Router](https://expo.github.io/router) — file-based navigation
- [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) — local data, no backend required
- [i18next](https://www.i18next.com) — internationalisation (EN / PL)
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) — daily reminders
- [expo-linear-gradient](https://docs.expo.dev/versions/latest/sdk/linear-gradient/) — UI gradients

## Getting started

```bash
npm install
npm run start      # opens Expo dev tools (scan QR with Expo Go)
npm run web        # runs in browser at localhost:8081
npm run android    # opens on Android device/emulator
npm run ios        # opens on iOS simulator (macOS only)
```

## Data & privacy

All data is stored locally on the device using AsyncStorage. Nothing is sent to any server. Uninstalling the app removes all data.

## Tax calculations

### Poland
- Tax-free amount: 30,000 PLN/year
- First bracket: 12% up to 120,000 PLN/year
- Second bracket: 32% above 120,000 PLN/year
- B2B linear: 19% flat
- B2B lump sum: configurable rate (8.5%, 12%, 14%, 15%, 17%)

### Norway
- National Insurance: 7.8%
- Holiday pay mode: configurable supplement % + Kongens tillegg

### United Kingdom
- Personal Allowance: £12,570/year
- Basic rate: 20%, Higher rate: 40%
- National Insurance: 8%

### Germany
- Progressive income tax + solidarity surcharge approximation

> Calculations are estimates. Consult a tax advisor for official figures.
