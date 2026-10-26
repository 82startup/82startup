# 82 Startup Summit 2027

A responsive, buildless conference website with soft abstract botanical and contour-gradient images, the restored Blacksmith acid-yellow/pale-blue theme with warm-paper sections, and IBM Plex Sans Medium with Google Noto Sans KR for Korean. The latest user correction restores the earlier yellow/blue atmosphere, superseding the off-white theme introduced with the image update. Image or font changes must preserve the chosen theme unless explicitly requested. The requested main title is three lines: “82 Stratup” / “Summit 2027” / “in San Francisco.” (spelling preserved as requested). Serve `dist/` with any static HTTP server. Pages: index.html, schedule.html, speakers.html, venue.html, tickets.html.

Event details come from the organizer's Google Doc. Session details, speakers, prices, and checkout URL are awaiting confirmation. Tickets allow selecting a day pass, optional dinner, or the separately sold reception; this is not a reservation or payment. Set the `checkoutUrl` constant in `dist/app.js` to an organizer-approved checkout URL to enable the external purchase action.

Venue details: https://fortmason.org/visit/ . SVG logo supplied by the organizer. The venue photo is supplied by the organizer and credited to Christopher Michel; it replaces the former illustration on both the homepage and Venue page. The hero and program-card images are generated raster artwork.

Local preview is the current delivery workflow: run `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist` from this folder, then open http://127.0.0.1:4173 . Keep the preview running while reviewing. No dependencies or build step required. The latest user request supersedes automatic publication; do not deploy or synchronize to the hosted provider without an explicit new request. `.openai/hosting.json` retains the previous deployment identity only.

Artwork was created with the built-in ImageGen tool and saved in `dist/assets/summit-botanical-gradient.png` and `dist/assets/summit-contour-gradient.png`. Prompts are recorded in ASSETS.md.

The home hero is now text-only: large Zen Dots title with the restored yellow/blue theme. This explicitly supersedes the hero botanical image; that asset remains in use on Speakers. Body text uses IBM Plex Sans Medium and Korean Noto Sans KR.

All interface corners are square (`border-radius: 0`) across all pages and responsive breakpoints; this supersedes all former rounded-button, pill, and rounded-card styles.

Bottom footer wording is exactly `SUMMIT 2027` in very large, IBM Plex Sans Medium in a color 10% darker than the yellow background, as explicitly requested. This replaces the former footer slogan and does not change the event dates elsewhere.

The latest typography reference supersedes all prior Google Sans and Pixelify Sans treatments: IBM Plex Sans Medium (500) is used for regular English and the footer; the latest home-title-only exception is Zen Dots (400), with uppercase display per the latest request. Korean retains Noto Sans KR.

The home hero date/location label is restored to its original small scale: 11px desktop and 9px on smaller screens. The three-line Zen Dots title is uppercase, with `82 STRATUP` at 62% size.

The large footer uses IBM Plex Sans Bold (700), with bottom padding removed and a tight line box so the lettering sits against the page bottom. This supersedes its earlier Medium weight and padded placement.

The large footer lettering scales to 16.8vw (maximum 345px), with 2% side insets to fill nearly the entire viewport.

Large footer text color: yellow background darkened by 10% with black; size, bold weight, and bottom alignment remain unchanged.

The large footer lettering has a subtle SVG inner-shadow filter for a recessed edge; its yellow fill and layout remain unchanged.

The latest color correction reduces sky blue to the top utility strip and the single 1,500 attendance highlight. Headings, day count, venue teaser, CTA, and marquee no longer have blue backgrounds; selected controls use yellow.

Connected line treatment inspired by Firecrawl: content-aligned side rails, section rules and crosshair junctions, a faint hero grid, and connected program/stat/ticket panels. Markers are decorative and do not intercept input. Existing visual identity remains unchanged.

Line-grid correction: shared section boundaries have a single rule, outer rails are drawn once, CTA side borders are removed, card/statistic rules reach the rails, and side rails continue through the footer spacer. This supersedes the first overlapping-border grid treatment.

Small accent points (square markers, crosshairs, arrows, short emphasis rules) share sky blue #8acbe7; structural grid lines remain neutral, and no new large blue highlights are added.

Structural lines are drawn once by a measured page-wide SVG: horizontal rules reach both viewport edges, vertical rails span the entire document, and shared row coordinates are deduplicated. It redraws after layout/font/image changes; earlier independent structural borders and hero grid are disabled to eliminate short ends and double strokes.

The desktop statistics occupy a separate grid row below the heading and paragraph, keeping the full-width rules clear of text.

The footer is exempt from the line grid: structural rails stop at its top edge, leaving the footer lettering and background free of crossing lines. The footer content remains intact.

Button/link arrows inherit their text color; decorative text-link underlines and the dashed hero button-area divider are removed. Blue remains on non-control accent points.

Footer navigation uses 16px desktop / 15px mobile text and inline-flex alignment for labels/arrows. Branding, links, and copyright use a responsive grid to prevent wrapping or baseline collisions.

Header branding now uses only the original logo symbol, extracted as an SVG without modifying its paths; the full logo assets are preserved.

The large SUMMIT 2027 footer title is enlarged by 50%; other type sizes are unchanged.

The enlarged footer title is horizontally centered, with tightened letter spacing to fit the page width.

Section heading blocks have 32px top clearance from the grid line (24px on smaller screens).

Google Maps links are available in the homepage WHERE block and venue teaser, opening Fort Mason in a new tab. The separate Venue page link remains available.

Minimum font size is 12px across every page and breakpoint, including labels, captions, buttons, and mobile text. Compact layouts wrap instead of shrinking text.

Selected surfaces use a fine 24–26px-spaced dot pattern: header/home hero, footer, statistics, CTA, speaker announcement, and ticket summary. Plain content sections provide contrast; the structural grid remains intact.

Footer tracking is now 0.1em (10%), with responsive sizing adjusted to keep the full centered line visible. This supersedes its former tightened negative letter spacing.

Header navigation is right aligned beside Get Tickets on desktop; navigation text uses IBM Plex Sans Semibold (600). The mobile menu retains its responsive layout.

Latest footer adjustment: tracking is 0.02em (2%), superseding the previous 10%; other footer styling is preserved.

Footer lettering now follows the supplied tonal engraved reference: 5%-darker yellow fill, soft fine edge highlights and a lighter inset shadow. Existing typography and layout remain.

Header contents now have matching left/right insets from the structural rails (20–36px desktop, 16px mobile).

Scroll motion follows the Little Plains reference with soft staggered content reveals and a small parallax drift within abstract program artwork. Native scroll, connected grid boundaries, full venue imagery and existing theme stay intact; reduced-motion preferences disable motion.

Home masthead: React Bits Gradient Blinds (https://reactbits.dev/backgrounds/gradient-blinds), ported from the original shader to vanilla WebGL2 without React dependencies. Yellow/lime colors preserve the existing palette; the light follows the pointer. Animation pauses offscreen or in hidden tabs; reduced motion renders a static frame and unavailable WebGL falls back to the yellow dotted background. License: dist/licenses/react-bits.txt.

Current background comparison: Gradient Blinds is kept in the project but its script is not loaded. The homepage uses an original particle-ocean approximation of the public Contour Tide demo. React Bits Pro source requires paid access in the current session; this is not that proprietary component. The preview preserves yellow styling and accessibility, with adaptive particle counts, reduced-motion support and offscreen pausing. Restore gradient-blinds.js in the homepage script tag to return to blinds.

Active hero experiment: custom Glyph Ember-inspired ASCII fire (glyph-ember-preview.js), anchored at the hero bottom. Public demo reference: https://pro.reactbits.dev/docs/components/glyph-ember . This is an independent implementation, not the paid React Bits Pro source. Prior blinds and particle-ocean files remain available but are not loaded. Motion responds to the pointer/background clicks, respects reduced motion, and pauses offscreen/hidden.

Final background selection supersedes the comparison instructions above: the prior Gradient Blinds and Contour Tide implementations have been removed. Only ASCII fire remains, using green body glyphs, sky-blue hot glyphs and sparks, and a soft blue light near the bottom; the yellow theme is unchanged.

Ember refinement: roughly one-third taller flames, still anchored at the bottom, with smooth green/mint/teal/sky-blue transitions and restrained lavender accents. Soft matching light and taller sparks retain the yellow theme and readable foreground.

Rising sparks are now distinct 14–17px plus/star glyphs with a contrasting teal-blue core, sky-blue halo and short trail. The upper mask is removed so rising embers remain visible against yellow.

Latest refinement softens spark size/contrast and flame opacity; the palette now continuously shifts through green, mint, teal, sky and lavender with subtle rose/coral tones. Height and bottom alignment are unchanged.

The homepage headline now uses an independent Ghost Type-inspired typing and ghost-completion entrance (https://pro.reactbits.dev/docs/components/ghost-type). Exact title copy, Zen Dots and the three-line layout remain. The effect runs once when visible, preserves line widths, and respects reduced motion. It replaces the generic headline reveal; the existing flame background remains active.

Latest title selection supersedes Ghost Type/typing: Glyph Lottery-inspired vertical character reels now settle left-to-right into the existing exact three-line Zen Dots title. ghost-type-preview.js was removed. Natural final text geometry and accessibility are preserved; motion plays once and respects reduced-motion settings. Reference: https://pro.reactbits.dev/docs/components/glyph-lottery . Independent implementation, not paid Pro source.

Ember palette now explicitly includes red, white and green alongside mint/sky/lavender; floating sparks also use this range. Subdued intensity and existing height remain unchanged.

Flame colors now interpolate by hue at consistent saturation to avoid grey midpoint blends. White is limited to isolated sparks and the hottest cores; broad pastel illumination is reduced.

Title reels now settle deliberately in strict row order: all rows initially spin, rows below keep looping until the prior row has finished, and each character lands with a white highlight. This supersedes the fast blue-accented lock timing.

Title timing is now 2× the preceding version, preserving sequential row completion. Brief title-lock highlights are white only; no blue title flash is used.

Current background appearance supersedes all previous multicolor descriptions: the full animated background (flames, sparks, trails, halos and atmosphere) is neutral dark grey, RGB(48,48,48), with varying transparency for depth. The yellow theme and title animation are unchanged.

Title lock highlights/glow are removed; characters remain ink colored. Locking and landing now complete 50% faster, with idle rotation and sequential row completion preserved.

Homepage spacing: statistics occupy a full-width row, removing the empty left cell. Extra padding bands after the intro and before the program are removed. The shared center rule has one owner in each row to keep line intersections clean.

Introduction columns now use equal-width rail-aligned cells with matching 28px internal insets, replacing the asymmetric percentage gap. Statistics use the same alignment.

Program panels now share the paper surface with transparent bodies and paper date labels. Image/body/action boundaries and the grid bottom connect through the measured full-width divider system; flex layout aligns desktop actions.

Title effect reverted from Glyph Lottery to the original Ghost Type-inspired character typing. The faint suggestion text reserves line width; each line types character by character with a neutral caret. No colored/white flash remains; the grey ember background and all layout refinements stay intact.

Corrected title revert: Ghost Type is removed too. The title uses its original soft fade/rise entrance, with no typing or slot reels. Hero support copy and the bottom note have stronger ink contrast and subtle yellow halos to stay readable over the grey flame pattern.

Desktop introduction now vertically centers both text blocks within one shared row, with matching 48px top/bottom padding and 28px side insets. Removed the former asymmetric section top padding and gap before statistics.

Venue detail cleanup removes the redundant separator above map/directions actions, retaining factual-row dividers and a clean 30px action gap.

Venue page now includes an interactive 3D floorplan in its middle, derived from the supplied local 82_startup_3dmap project without changing that project. Building and floor selectors plus view controls sit above the map; the website viewer hides editor/export tools and keeps the standalone original intact. Gateway/1F is the initial website view. The map is illustrative, lazy-loaded, and wheel zoom requires clicking it first. Three.js license is included in dist/venue-map/.

Venue hierarchy: the photo and visit facts are now a compact overview, while the 3D map spans the viewport and approximately a full screen in height. The embedded model camera fits the visible building bounds with a small framing allowance so the floorplan reads larger. Original model files and full-aspect photo remain preserved.

The website map starts at a shallower diagonal to make better use of its wide stage while preserving the whole building and manual rotation.

All shared page dividers and map toolbar separators now have 30% lower visual intensity through alpha, preserving connected endpoints and control outlines.

The Venue Google Maps button now opens in a new tab, preserving the local venue page.

3D venue controls now share identical button sizes in a unified responsive grid (64px desktop, 60px mobile). The stage is larger with tighter framing, and the toolbar uses less space above it.

Map menu order: Festival Pavilion (메인 행사장), then Gateway (스타트업 부스+푸드코트). These role labels remain visible on mobile; all controls keep uniform sizes.

Website map 3D/plan toggle is removed. The map stays in 3D; six remaining top controls use an equal-size responsive grid.

Festival Pavilion is now limited to 1F in the website viewer. Floor selection is Gateway-only and grouped alongside Gateway on desktop; the last selected Gateway floor is restored when switching back.

Map UX refinement: the module is contained within the page rails. Two stable building tabs replace the mixed button row, with a separate center action and a consistent secondary row for Gateway floors or Pavilion ground-floor status. Model framing now centers the correct floor volume with breathing room to prevent initial clipping. Keyboard tab navigation and selection states are included.

Portrait map views use a steeper initial/reset angle to fill the frame more effectively without cropping the building.

Venue overview cleanup: compact top-aligned photo with a single credit line, one venue heading and introduction, followed by aligned Address/Dates facts and external links. Duplicate venue labels are removed; factual copy and full photo remain.

Venue overview is larger again, with a generous photo and existing clean information hierarchy. The in-page 3D preview now launches a full-screen interactive modal; close/Escape returns to the same page position. Selection is retained on reopening, and hidden maps stop rendering. Preview mode stays static until resized.

Homepage event gallery: six large previews and a full-screen viewer containing all 13 organizer-supplied DSC/ukf photographs. WebP variants keep originals intact, images load lazily, and the gallery supports keyboard navigation/close with focus restoration. The section identifies these as past-event moments. Venue/stock images in the same folder are excluded.

- The homepage venue teaser includes a View 3D map button that opens the same shared full-screen venue map dialog directly, without navigating away. Reuse venue viewer behavior: lazy iframe loading, selection retained across reopenings, pause rendering on close, Escape support, scroll preservation and focus restoration. Keep existing venue-page and Google Maps links.

- Homepage hero title keeps its existing three-line Zen Dots typography and fade/rise entrance, with an additional intermittent character-local slice/offset glitch. Start after the entrance settles (1.3–1.8 seconds), then play a brief <=560ms burst at random 0.9–1.8 second intervals. Apply each burst to only 2–5 randomly chosen letters/digits, with independent 0–90ms delays; never jitter the full line. Preserve original text shaping/layout using narrow DOM-Range-measured decorative glyph windows. Do not replace or scramble text, add white flashes, or change layout. Use subtle translucent pink/red only on the narrow selected-glyph fragments during bursts; the base title stays ink and the background remains monochrome. Decorative layers must be aria-hidden; pause timers offscreen/in hidden tabs, skip bursts while a modal is open, and disable for reduced motion.

- Large page section mastheads (.page-head h1 on Venue, Schedule, Speakers and Tickets) use Zen Dots regular 400, matching the homepage hero typeface. Keep their authored copy/capitalization and existing entrance motion; use responsive sizing/line height so long titles fit the page rails on desktop and mobile. Body text, small eyebrow labels and navigation retain their existing fonts.

- The homepage 02 / WHERE event-summary cell also includes View 3D map beside Google Maps. All map launch buttons share the same lazy-loaded dialog/viewer; closing must restore focus to the specific button that opened it. Allow the quick actions to wrap within narrow cells.

- Remove the 3D map toolbar center/reset button entirely (including its unused column and click binding). Building tabs fill the available toolbar width. Keep automatic initial camera fitting, building/floor selection and manual zoom/rotation. This supersedes prior instructions to show a separate center action; original 82_startup_3dmap source remains unchanged.

- Map and photo fullscreen dialogs use a consistent icon-only close button: a clean thin-stroke X, no visible 닫기 text or resting border, 44px square hit area, subtle hover fill. Keep descriptive Korean aria-labels, visible keyboard focus, native Escape behavior and opener focus restoration.

- Move Gateway floor controls (1층, 2층, 전체) out of the building toolbar and into the map canvas upper-left, immediately below the stage heading/description. Use compact 36px-high controls, maintain clickability under the otherwise pointer-transparent heading, and preserve floor selection/memory and Pavilion 1F-only behavior. The toolbar contains only the two building tabs. This supersedes the prior secondary-row placement below Gateway.

- Simplify the map modal top into a single compact building-tab strip. Remove the visible modal-title row while retaining its accessible dialog name; float the icon-only X at the upper right in the same strip. Use intrinsic-width text tabs on desktop (two flexible tabs on mobile), no large outlined/yellow-filled boxes, and a thin ink underline for selection. Keep the Korean purpose subtitles and compact floor controls inside the upper-left canvas. Reserve space for the 44px close target. This supersedes the separate title bar and large equal-width building boxes.

- Simplify the venue-page map teaser to a compact 3D venue map heading, a small layout-reference note, and an inline fullscreen action. Remove the redundant eyebrow, oversized heading and large central overlay CTA. Use a shorter clean preview (260–400px desktop, 260px mobile), hide the preview-only stage heading, and let the entire preview remain an accessible fullscreen launcher. Retain the same interactive modal and actual-trigger focus restoration. This supersedes the large map teaser treatment.

- Replace the homepage editorial photo grid with an image-only animated horizontal carousel using all 13 supplied event photos. Remove visible gallery marketing headlines/intros, photo badges/captions, the all-photos CTA and modal captions; retain descriptive alt text and hidden accessible headings. Show three images at a time on wide screens, two on tablets and one with a peek on phones, slide automatically every 3 seconds with seamless forward wrap, support swipe/previous/next, and provide an icon pause/play control. Pause offscreen, on mouse hover/keyboard focus, in hidden tabs and while dialogs are open; disable autoplay/smooth motion for reduced motion. Preserve click-to-enlarge, keyboard navigation, Escape and focus restoration. Draw only static carousel perimeter dividers, never grid lines through moving photos. This supersedes the six-preview editorial grid and visible photo copy.

- A fresh 3D viewer and static preview default to Festival Pavilion, its event layout and 1F only. Initialize both the rendered model and selected tab consistently. Gateway remains selectable with its own remembered floor/layout, and reopening an already-loaded modal retains the user selection. This supersedes the previous Gateway startup default.

- Remove all visible focus-outline rings, including the blue browser/site outline around map previews, throughout the site and derived 3D viewer. Do not replace them with a different colored ring. Keep focus management, keyboard operability, labels, selected states and hover behavior intact. This explicit user preference supersedes earlier requirements to display a focus ring on buttons, images and dialog controls; the original map source is unchanged.

- Separate the homepage program cards from the photo carousel with 48px of paper breathing room (32px on mobile). Let the existing single-owner SVG divider mark the program bottom and carousel image top, with continuous outer rails. Do not add visible gallery copy or captions. This supersedes attaching the carousel directly to the program action row.

- Each of the three homepage program cards has its own prominent Get tickets link, in addition to its existing Explore the program link. Use noninteractive article card containers so the two anchors are not nested. Ticket links pass day=16/17/18; the ticket page preselects the separate Reception option or matching day respectively. Preserve manual pass changes and the existing no-checkout behavior until an approved checkout URL is supplied. Align all three purchase buttons and program action rows; retain the photo-section gap.

- Replace the homepage IDEAS/PEOPLE text marquee with a continuously scrolling monochrome tech-company logo strip (Google, Meta, NVIDIA, Anthropic, Figma, GitHub, Stripe, Vercel). Use locally stored SVG marks from a pinned Simple Icons revision, preserving its CC0 license and source record. Duplicate the group inert/aria-hidden for a seamless 36-second loop, with a pause/play control, hover/focus pause, offscreen/hidden-tab/dialog pause and reduced-motion support. Preserve the shared divider styling. Do not label these illustrative logos as confirmed sponsors, partners or attendees.

- Place the tech-company logo slider immediately after the homepage hero/header section, before the 01/WHEN–02/WHERE–03/WHO event-summary strip. Remove its former placement between photos and the venue teaser. Load the small local logo SVGs eagerly to avoid blank marks during continuous motion. This supersedes the former text-marquee position.

- Provide consistent subtle hover feedback across all actionable buttons/links, including primary/outline ticket buttons, text and program links, navigation, menu toggle, pass/day options, photo/logo controls, modal X buttons, map preview, building tabs, floor controls and zoom buttons. Use the existing ink/yellow palette, ~180–220ms color transitions, small arrow movement and restrained image/icon scale; retain square corners and existing selected states. Keep layout/dividers stationary, add no focus rings, and disable hover movement/transitions for reduced motion. Apply new hover treatments only on hover-capable pointers.

- Use a broad printable-ASCII repertoire in the homepage ember background: uppercase/lowercase letters, digits, punctuation, brackets and operators. Choose from density-based pools with staggered per-cell variation, instead of repeating a single short ramp; use a system monospace font so mixed glyphs fit the grid. Preserve the existing neutral RGB(48,48,48) alpha treatment, spark behavior, canvas size, frame-rate budget, visibility pause and reduced-motion behavior; do not add colored/white flashes or affect the hero title typography.

- Program-card artwork uses soft, grainy CSS radial gradients instead of the former contour-line image: multi-hue lavender/coral/plum, mint/cobalt/violet/peach, and apricot/lilac/rose/teal palettes. Apply the locally authored procedural summit-grain.svg as a pronounced coarse static texture with stronger noise contrast and larger grains; preserve square corners, date labels, card copy, ticket links and dividers. The photo carousel uses four inert wrap copies so its three-across desktop view loops seamlessly, retains the 3-second advance, and remains responsive.

- The hero ASCII field uses 1–2 simultaneous large outward-only radial wave fronts, all starting at the fixed exact hero center (50% width/50% height), with randomized start times, broad widths (13–17% of the shorter hero dimension, minimum 42px) and faster 2.6–3.8s travel durations. Each radius increases monotonically beyond the farthest hero corner and fades out; never contract or reverse a wave. Blend overlaps softly with bounded opacity and push glyphs radially outward. Replace finished waves at irregular intervals while maintaining at most two active fronts. Preserve the 94-glyph repertoire, gray-only background, subtle sparks, readable title/CTAs, responsive geometry, 30fps cap, reduced motion and visibility pause. This supersedes the single breathing/expanding-contracting circle.

- Add Join Kakaotalk to the shared top navigation on all pages, after Venue, linking to https://open.kakao.com/o/gn88dnPe in a new tab with noopener noreferrer. Include it in the mobile menu; use tighter desktop nav spacing at intermediate widths so navigation and the ticket CTA fit within the existing equal insets. Do not add it to the footer or change ticket/navigation destinations.

- Use neutral light gray #ededed for the derived 3D map document, stage, WebGL scene, neutral control surfaces, static preview and iframe/modal loading backgrounds. Preserve the building/model material colors, selected-tab/floor accents and the warm paper surface elsewhere on the website. This supersedes the map’s previous #f6f5ed background; original 82_startup_3dmap sources remain unchanged.

- Display the event-name order as SUMMIT 2027 in the main hero and large footer wordmark; synchronize browser titles. This supersedes the previous 2027 SUMMIT wording. Preserve all typography and motion.

- Set the program-art grain overlay opacity to 0.34, reducing its previous 0.68 strength by 50%. Preserve the coarse grain size and mixed-color gradients; this supersedes the stronger texture treatment.

## Luma event integration

The program and ticket pages now share `dist/event-data.js`; see [EVENTS.md](EVENTS.md) for the verified dates, venues, prices and four official registration links. The calendar contains four events across March 16–18 (Summit spans March 17–18), with all displayed times in San Francisco PDT. Homepage event buttons and schedule purchase links open each event’s Luma page in a new tab. Tickets is a four-event directory with published USD tiers; local checkout forms, dinner/pass combinations and purchase-information dialogs have been removed. The March 16 opening is at Salesforce Tower, separately from the Fort Mason Summit/evenings and map. These rules supersede the earlier provisional ticket and reception details.

### March 19 and timeline update

The organizer supplied the fifth event, [82 Night: VIP After Party](https://luma.com/yu4fof7p), on March 19, 18:00–21:00 PDT at The Ameswell Hotel in Mountain View ($100 limited tickets). The site now covers four dates, March 16–19, and five events. This supersedes the four-event snapshot above. Tickets is a chronological date-rail timeline, and Schedule includes a March 19 tab. Every event purchase action opens its own official Luma registration page in a new tab.

### Program card title placement

Homepage event titles sit inside their gradient artwork, below the date label, using the main header’s Zen Dots regular uppercase style. Keep descriptions and ticket actions below the artwork; do not duplicate titles there. A restrained bottom shade supports white title contrast while preserving the existing multicolor grain. This supersedes the former below-image IBM Plex card title placement.

### Homepage program and VIP feature layout

Supersedes the previous five-card 3/2/1 homepage layout: display the four March 16–18 events as 4/2/1 columns at desktop/tablet/mobile widths. Follow with a full-width March 19 VIP After Party feature, with dark blue grain artwork, Zen Dots title inside the artwork, event information and its own Luma ticket link. Keep all five events in the chronological ticket timeline and schedule. Preserve the title-inside-artwork rule for the four standard cards.

### Schedule default date

Opening schedule.html without a valid day query selects March 16 by default, superseding the former March 17 fallback. Valid day=16/17/18/19 links continue selecting their requested date.

### 3D map double-click zoom

In the derived interactive viewer, primary-button double-click magnifies 1.6× around the clicked world point, capped at the existing 12× limit. Preserve drag, wheel, pinch, plus/minus and keyboard zoom. Static preview still opens the full-screen viewer; do not modify the original 82_startup_3dmap source. Map cache version is 18.

### Continuous ticket timeline divider

The single date-rail divider spans the full ticket timeline (top:0; bottom:0), touching both boundary rules at all responsive widths. Do not inset its ends by card padding or add per-card duplicate rails. This supersedes the original 44/40px desktop and 32/28px mobile rail end offsets.

### Compact VIP feature and grid alignment

The March 19 homepage feature uses equal desktop columns so its center divider aligns with the boundary between main cards two and three. Reduce its artwork minimum height from 380px to 266px (30%) and compact spacing/type while retaining the 12px minimum, event facts and both actions. Mobile remains stacked. This supersedes the prior 1.25fr/1fr split and taller feature sizing.

### Attendance stat highlight

Render the homepage 1,500 expected-attendees number as plain ink text with no sky-blue highlight/background. Keep its size, dot pattern and surrounding layout. This supersedes the prior blue attendance-number highlight.

### Photo section heading

Show “82 startup history” as the visible homepage photo-section h2 above the slider, styled like the existing large section headings. This explicitly supersedes the previous no-visible-photo-section-copy rule for this heading only; individual photos remain without captions and retain three-column / three-second carousel behavior.

### Two-line IBM program titles

The four standard homepage artwork titles use IBM Plex Sans medium, uppercase, with explicit two-line splits: Opening / Night; Summit / 2027; Founders & / Funders; Community / Evening. Keep their bottom edges aligned. This supersedes the Zen Dots rule for these four titles only; hero and VIP feature typography remain unchanged.

### Ticket location links

Each ticket timeline WHERE entry links its venue name and address to Google Maps search using that event’s full venue and address. Open in a new tab with noopener noreferrer, show a restrained external arrow, and preserve separate Luma purchase destinations.

### Matching photo and program section headers

The photo heading uses the same shared section-top structure and spacing as the program header: sky-blue square eyebrow “OUR STORY”, followed by “82 startup history” in the normal large IBM heading style. Remove photo-specific compact header padding and zero title margin so both header blocks have matching sizing. This supersedes the initial title-only compact photo header.

### Photo section editorial title

Use “Every connection has a story.” as the visible photo-section title, replacing “82 startup history”. Keep the OUR STORY eyebrow, shared program-header sizing, slider behavior and caption-free photos. This supersedes earlier photo-title copy only.

### Homepage hero Week title hierarchy

The homepage hero reads 82 STRATUP / WEEK 2027 / IN SAN FRANCISCO. Keep the first two lines at the same full Zen Dots size (first line 1em, replacing the former .62em). Make the location line .5em with a 12px minimum. Preserve uppercase, glitch behavior and other section/footer/event names; this change is specific to the hero.

### Equal hero title line sizes

All three homepage hero lines (82 STRATUP / WEEK 2027 / IN SAN FRANCISCO.) use the same 1em Zen Dots font size. This immediately supersedes the .5em location size from the previous instruction.

### VIP title in IBM Plex Sans

Use IBM Plex Sans medium for the two-line 82 NIGHT / VIP AFTER PARTY title, preserving its position, size and white color. This supersedes the previous Zen Dots typography for the VIP artwork title only.

### Venue page opening-night section removed

Do not show the standalone Salesforce Tower opening-night section on venue.html. This supersedes the earlier instruction to include that separate venue block. Keep Opening Night and its correct venue, ticket and Google Maps links in the homepage program, schedule and ticket timeline. Preserve the Fort Mason overview and 3D map.

### Dotted spacer boxes

Fill the homepage gap above the photo section, the photo carousel control strip, and the top spacer before the venue teaser with the existing neutral dot pattern (same dot spacing/opacity as the other dotted areas). Restrict spacer patterns to padding areas; preserve photos, section-heading surfaces, connected dividers and control interactions.

### Footer wordmark copy

The large centered footer wordmark reads “82 STARTUP WEEK 2027”, superseding “SUMMIT 2027”. Scale the longer single-line phrase responsively to fit its container while retaining the existing IBM face, subtle yellow inset treatment and centered alignment.

### Larger footer wordmark

Increase the 82 STARTUP WEEK 2027 footer wordmark font by 30% from the previous responsive sizes (8.97vw, desktop cap145.6px). Preserve center alignment and the inset color treatment. This supersedes the immediately preceding 6.9vw sizing.

### Final footer wording and alignment

The large footer wordmark now reads “82 STARTUP WEEK” without a year, centered horizontally. Retain the latest 30% font increase. This supersedes “82 STARTUP WEEK 2027” in the immediately preceding footer instructions.

### Sponsor/logo section temporarily hidden

The homepage company-logo strip is temporarily hidden via showSponsorSection=false in dist/app.js. Retain its markup, assets and slider logic for later reopening, but render no section or spacer while hidden. Re-enable only when the user asks to open it. This supersedes the requirement to always show the logo strip immediately under the hero. Existing logos remain illustrative and do not establish confirmed sponsorship.

### Footer wordmark second 30% increase

Increase the current 82 STARTUP WEEK footer wordmark font by another 30% (11.661vw; desktop cap189.28px), preserving horizontal centering. This supersedes the preceding 8.97vw size. Keep the complete phrase visible within the footer.

### Footer text-run centering correction

Center the actual large footer text run with a flex container (justify-content:center), not only text-align, so a long nowrap line cannot fall back to left alignment. Retain the second 30% font increase; tighten tracking to -.065em (-.08em below 360px) to keep the full phrase visible. This supersedes the earlier .02em tracking for this wordmark.
