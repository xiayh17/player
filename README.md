# Airalogy Player

Experimental Protocol Management Application built with Tauri 2.x + Vue 3.

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm tauri dev

# Build for production
pnpm tauri build
```

## Project Structure

```
player/
├── src/                    # Vue 3 frontend
│   ├── components/         # Vue components
│   ├── pages/             # Page components
│   ├── stores/             # Pinia stores
│   ├── locales/           # i18n translations
│   ├── styles/            # Global styles
│   └── router/            # Vue Router config
├── src-tauri/             # Rust backend
│   ├── src/
│   │   ├── commands/      # Tauri commands
│   │   ├── main.rs
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```
