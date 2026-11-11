# Brazil's Quantum Relations

A static, interactive map of Brazil's international relationships in quantum technologies. The interface is in Brazilian Portuguese. The map groups filtered records by continent at the global view, then by marker proximity as the user zooms in. Hover or focus a country marker to preview records; click to zoom in and open its bottom sheet, then close to return to the prior camera view. The initial records were normalized from a research CSV of official Brazilian government publications. Some entries still need manual review in `review-needed.md`.

- Repository: https://github.com/Poggioli/brazil-quantum-relations
- Expected website: https://Poggioli.github.io/brazil-quantum-relations/

## Stack

React, TypeScript, Vite, Tailwind CSS, shadcn/ui components built on Base UI, MapLibre GL JS, Zod, date-fns, and Lucide React. All map geometry, styles, records, scripts, and CSS are served from this repository. No backend, API key, or map tile provider is needed.

## Local development

Use Node.js 22 (see `.nvmrc`) and Corepack:

```sh
corepack enable
yarn install --immutable
yarn dev
```

Open the local URL printed by Vite. Check the production output with `yarn build` and `yarn preview`.

## Adding records

Edit `public/data/records.json`. Each object needs a unique nonempty `id`, nonempty `title`, original publication `link` (HTTP or HTTPS), `type` (`news` or `agreement`), ISO calendar `date` (`YYYY-MM-DD`), and ISO 3166-1 alpha-2 `country` code. Optional `description` and `source` add context. The country must exist in the bundled map data. Records are validated when the page loads; invalid data produces an error message.

Review each imported publication before using the dataset as a definitive inventory of agreements. The `agreement` type is reserved here for publications describing signed instruments or a formal joint partnership; other official statements are classified as `news`. Entries whose country, quantum relevance, date, or scope could not be resolved are listed in `review-needed.md`.

## Geographic data

The map uses [Natural Earth Admin 0 Countries, 1:50m](https://www.naturalearthdata.com/about/terms-of-use/) via the [Natural Earth vector repository](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson). Its public-domain GeoJSON is stored in `public/geo/countries.geojson` with unneeded properties removed. Natural Earth's label coordinates provide representative marker positions. Country names are displayed in Portuguese using `Intl.DisplayNames`, with the map's Portuguese name as a fallback. Natural Earth is credited in the interface.

## GitHub Pages

The Vite base path is `/brazil-quantum-relations/`. The workflow in `.github/workflows/deploy.yml` builds and deploys `dist` when `main` receives a push, and can also be started manually. In the repository, set **Settings → Pages → Build and deployment → Source → GitHub Actions**. Then push the changes to `main` when ready. This project does not push automatically.

Filtered views can be shared with `year`, `month`, and `type` URL parameters, such as `?year=2026&month=08&type=news`.
