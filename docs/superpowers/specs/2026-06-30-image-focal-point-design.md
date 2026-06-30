# Image Focal Point — Design

**Date:** 2026-06-30
**Branch:** `fix+catalog-tx`
**Status:** Approved

## Problem

Admin uploads a move image, but cannot control which part of it stays
visible on cards. The same image is rendered with `object-cover` in
several places, each with a **different aspect ratio**:

| Place              | Aspect ratio |
| ------------------ | ------------ |
| MoveCard (mobile)  | `16:9`       |
| MoveCard (desktop) | `4:5`        |
| MoveHero (detail)  | `16:9`       |
| RelatedMoves       | `4:3`        |

With `object-cover` the browser crops to the container and currently
anchors to the **center**, so the subject (e.g. a face/pose) can get cut
off differently in each place.

## Approach

Store a **focal point** (a single anchor of interest), not a crop
rectangle. A point works automatically across every aspect ratio via the
CSS `object-position` property layered on top of the existing
`object-cover` — this is the "hotspot" model used by Sanity/WordPress.

Rejected alternatives:

- **Crop rectangle (x/y/w/h):** a fixed rectangle cannot satisfy 16:9,
  4:5 and 4:3 simultaneously, so the browser would re-crop on top of it.
  More fields, more complex UI, no real benefit here.
- **Bake crop into Cloudinary URL (`c_fill,g_xy_…`):** generates per-size
  URL variants, breaks the current `img.youtube.com` thumbnail fallback,
  and the byte savings are negligible for this project. CSS
  `object-position` keeps one source URL and works with the fallback too.

The focal point applies **everywhere** the image is cropped (MoveCard,
MoveHero, RelatedMoves), for a consistent look across the app.

## Data model

Add two fields to `Move` (`prisma/schema.prisma`):

```prisma
focalX Float @default(0.5)   // 0..1 horizontal fraction
focalY Float @default(0.5)   // 0..1 vertical fraction
```

`@default(0.5)` (center) reproduces today's behavior exactly, so the
Prisma migration backfills existing rows with no visible change and no
data migration script.

## Components and changes

1. **Prisma schema + migration** — add `focalX`, `focalY`.

2. **Shared helper (`src/features/moves/lib/` or a focal util) + test**
   - `focalToObjectPosition(x, y): string` → `"50% 50%"`, clamps inputs
     to `0..1`. Single source of truth for the CSS value.
   - Vitest unit tests: center, corners, out-of-range clamp.

3. **Validation + types**
   - Zod schema in `src/features/admin/actions.ts`:
     `focalX/focalY: z.number().min(0).max(1).default(0.5)`.
   - `src/features/admin/types.ts`: add `focalX`/`focalY` to
     `CreateMoveInput`, `UpdateMoveInput`, `FullAdminMove`.
   - The **public catalog `Move` type** and the Prisma `select`/queries
     that feed MoveCard must include `focalX`/`focalY`, otherwise cards
     won't receive them.

4. **Server actions** — `createMoveAction` / `updateMoveAction` persist
   `focalX`/`focalY`.

5. **Admin UI (`MoveModal.tsx`, `ImageDropZone`)**
   - When an image is present, overlay a draggable focal-point marker on
     the existing preview. Pointer down/drag/click sets `focalX`/`focalY`
     into react-hook-form state (clamped 0..1).
   - A small live preview frame in card aspect ratio (`4:5`) shows the
     resulting crop.
   - When no image is set, the control is hidden.

6. **Display (apply `object-position`)**
   - `MoveCardImage` accepts `focalX`/`focalY` props and applies
     `style={{ objectPosition: focalToObjectPosition(...) }}`.
   - `MoveCard`, `MoveHero`, `RelatedMoves` pass the move's values
     through. Default center keeps YouTube-thumbnail fallback and legacy
     rows unchanged.

## Data flow

```
Move row {focalX, focalY}
  → catalog query select / admin fetch
  → card & hero components
  → focalToObjectPosition()
  → <Image style={{ objectPosition }} /> over object-cover
```

No Cloudinary transforms; one image source URL as today.

## Error handling / edge cases

- Out-of-range or missing values → clamped/defaulted to center by the
  helper and the Zod schema.
- No image (YouTube fallback) → focal point still applies harmlessly;
  default center matches current rendering.

## Testing

- Unit: `focalToObjectPosition` (center, corners, clamp).
- Extend existing `admin/actions.test.ts` if it asserts the create/update
  payload shape, to cover the new fields and their defaults.

## Backward compatibility

Default `0.5/0.5` = center = current behavior. Existing images and the
YouTube-thumbnail fallback render identically until an admin moves the
point.
