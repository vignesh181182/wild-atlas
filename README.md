# Wild Atlas

Search any living thing — animal, bird, insect, plant, fungus, or something long
extinct — read about it, and keep the ones you like in groups of your own.

Built from the Claude Design project
[Wild Atlas](https://claude.ai/design/p/392a6f19-524e-4c02-ad9c-efd8033f87b4),
using its **Classical** design system.

## What it does

- **Search** every named organism on Earth, as you type, with suggestions.
- **Read** a creature's page: photographs, full taxonomy, IUCN conservation
  status, a description, and three facts — plus a recording of the animal where
  a naturalist has uploaded one.
- **Save** creatures into groups you create, rename and delete. Saved creatures
  persist in your browser; anything you don't save disappears with the search.
- **Today's surprise** — one creature a day, the same for everyone, chosen from
  a curated list. It waits until you read or discard it.

## Where the data comes from

No API keys and no accounts. Two open sources, combined server-side:

| Source | Provides |
| --- | --- |
| [iNaturalist](https://api.inaturalist.org/v1/docs/) | Taxon search, taxonomy, photographs, conservation status, sighting counts, sound recordings |
| [Wikipedia](https://www.mediawiki.org/wiki/API:Extracts) | The "About them" description and the "Amazing facts" |

Every photograph carries its photographer's credit, and each creature page
links back to both sources. Facts are real sentences quoted from the article,
never generated — see [`lib/wikipedia.ts`](lib/wikipedia.ts) for how they are
chosen.

## Running it

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:3000>. There is nothing to configure.

```bash
npm run build
```

```bash
npm run typecheck
```

## How it's laid out

```
app/
  layout.tsx              Document shell, fonts, metadata
  page.tsx                The five app states and the navigation between them
  globals.css             Application layout, built on the design-system tokens
  api/
    search/route.ts       GET /api/search?q=…      → ranked search results
    creature/[id]/route.ts GET /api/creature/:id   → one assembled creature page
    surprise/route.ts     GET /api/surprise        → the creature of the day

components/               One file per piece of the screen
  Sidebar · SearchBar · SurpriseView · QuietView · ResultsView
  DetailView · LibraryView · SaveMenu · GalleryOverlay · Plate · icons

hooks/
  useLibrary.ts           Saved creatures and groups, persisted to localStorage
  useSearch.ts            Debounced, abortable search-as-you-type
  useCreature.ts          Creature fetching with a per-tab cache
  useSurprise.ts          The daily creature and whether it has been read
  useToast.ts             The single line of feedback at the bottom
  useDebouncedValue.ts

lib/                      Server-side data layer — no React in here
  inaturalist.ts          iNaturalist client, mapping, and search ranking
  wikipedia.ts            Article fetching, lead extraction, fact selection
  creatures.ts            Combines both sources into one creature page
  taxonomy.ts             Taxonomy codes → plain English
  surprise.ts             The curated list and the date-derived daily pick
  api-client.ts           Browser-side calls to this app's own routes
  summary.ts · types.ts

styles/
  classical.css           The design system, imported verbatim — do not edit
```

The rule the layout follows: `lib/` never imports React, `components/` never
fetches, and `app/page.tsx` owns navigation and nothing else.

### Two things worth knowing

**Search ranking is ours, not iNaturalist's.** iNaturalist orders by how often a
thing has been recorded, so searching "elephant" returns a moth and three
houseplants before any elephant. `lib/inaturalist.ts` re-ranks on the fact that
English common names put the head noun last: an *Elephant Hawkmoth* is a
hawkmoth, an *African Savanna Elephant* is an elephant.

**Saving is local.** `hooks/useLibrary.ts` is the only module that touches
storage. Swapping localStorage for a database means changing its `read` and
`write` functions and nothing else.

## Differences from the design file

The design was drawn at a fixed 1194×834 inside a device frame. Three things
had to change to become a real app, each marked with a comment where it happens:

- The device frame is gone and the shell fills the window; below 860px the
  sidebar stacks above the main column.
- The results grid auto-fills instead of being locked to three columns.
- The save menu is positioned under the Save button rather than at a fixed
  offset, since the header height now varies with the window.

The design's twelve fixed stats (lifespan, weight, height, diet…) are not
available from any open API, so the Detail grid shows what the sources actually
know: taxonomy, conservation status, sighting counts and alternative names.
Nothing on a creature page is invented.
