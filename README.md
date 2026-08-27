# STAG Vizualizace Rozvrhu

Moderní interaktivní aplikace pro zobrazení rozvrhů z STAG systému FIM UHK.

## Funkce

- **Výběr programu** z předdefinovaného seznamu studijních programů
- **Interaktivní mřížka rozvrhu** s moderním designem
- **Filtrování** podle typu výuky (přednáška, cvičení, seminář, laboratoř)
- **Filtrování podle dne** v týdnu
- **Barevné rozlišení** typů výuky
- **Responzivní design** pro desktop i mobilní zařízení
- **Automatické načítání** dat z STAG systému

## Instalace

```bash
npm install
```

## Spuštění

```bash
npm run dev
```

Aplikace se otevře na `http://localhost:3000`

## Build pro produkci

```bash
npm run build
```

## Technologie

- **React 18** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Lucide React** - Ikony

## Struktura projektu

```
src/
├── components/
│   ├── ProgramSelector.jsx  - Komponenta pro výběr programu
│   └── ScheduleGrid.jsx     - Komponenta pro zobrazení rozvrhu
├── utils/
│   └── stagParser.js        - Parser pro STAG HTML data
├── App.jsx                  - Hlavní aplikace
├── main.jsx                 - Entry point
└── index.css                - Globální styly
```

## Poznámky

Aplikace načítá data přímo z STAG systému UHK. Pro správnou funkčnost je vyžadováno připojení k internetu.
