# 82 Startup Summit 2027 website

- This new conference website lives in `summit-2027/`; the sibling `82_startup_3dmap/` remains an independent project.
- Use the supplied SVG logo with a dark-ink variant for light surfaces. The latest user correction explicitly supersedes the off-white theme introduced during the image update: restore the Blacksmith-inspired acid-yellow hero/header and CTA, pale-blue utility strip and marquee, warm-paper body, and dark ink. Preserve this theme during future image/font changes unless a theme change is explicitly requested. The latest header request supersedes the botanical hero image: the home hero is text-only with a very large Zen Dots (400) display title. Do not show artwork in the home hero. Keep the botanical artwork on the Speakers page and contour-gradient images on program cards. The latest font request explicitly supersedes every Google Sans and Pixelify Sans instruction: use IBM Plex Sans Medium (500) for regular English and the footer, with the latest home-title-only exception of Zen Dots (400), and explicitly load Google Noto Sans KR for Hangul; never leave Korean to the system fallback. Do not restore the old globe; apply the large Zen Dots display style to the current requested title, using uppercase display for all three title lines. The latest title layout supersedes the former two-line layout: the main H1 is exactly three lines: `82 Stratup`, `Summit 2027`, and `in San Francisco.`; preserve the user-specified `Stratup` spelling in this title. Keep the original organization name in other factual copy. Ticket selection is the primary action.
- All UI border radii must be zero across buttons, cards, images, badges, ticket options, form controls, dialogs, and pseudo-elements, including every responsive breakpoint. This latest instruction explicitly supersedes earlier rounded/pill styling.
- The bottom footer displays exactly `SUMMIT 2027` in oversized IBM Plex Sans Bold (700) in a color 10% darker than the yellow background across the yellow footer, with no bottom padding so the lettering meets the page bottom, replacing `BUILD WHAT’S NEXT.`. The corrected year is `2027`; this explicitly supersedes the earlier `2007` request. The latest IBM Plex Sans Medium reference supersedes both earlier Google Sans and pixel footer typography.
- Provide Home, Schedule, Speakers, Venue, and Tickets pages with responsive layouts and accessible navigation.
- The authorized event source is Google Doc `17y1qDkLbcckqAVcmE3tNaYxF-hMgSX3pbB3P-BWt2sY`: March 17–18, 2027 at Fort Mason Center for Arts & Culture, San Francisco; separate reception March 16; planned attendance 1,500 and reception 200. Do not expose internal operational notes or staff names.
- Schedule times, named speakers, prices, and checkout URL are unconfirmed. Label them as forthcoming. Do not invent these or represent ticket selection as a completed purchase. Ticket options: March 17, March 18, both days, with optional dinner; reception sold separately. The source mentions both Luma and WooMo; neither is a confirmed checkout destination. Configure `checkoutUrl` in `dist/app.js` only after an exact URL is authorized.
- Use the organizer-supplied `dist/assets/fort-mason-aerial-christopher-michel.jpg` on both the home venue teaser and Venue page, replacing the former SVG illustration. Preserve the full image aspect ratio and show photo credit to Christopher Michel.
- Venue address source: https://fortmason.org/visit/ . Maps and official venue links may open externally.
- Update this AGENTS.md and README whenever project logic changes; latest user-authorized behavior supersedes conflicting earlier instructions.
- Complete intended changes on the source repository's verified default branch, commit and push, and verify the exact remote commit before deployment. Never force push or create a PR unless requested.
- GitHub activity uses verified account randyjlee with verified email randyjlee.hj@gmail.com. Vercel, if used, requires verified account randyjlee.hj@gmail.com. Never use lee.randy@belonghome.com.
- The latest user request is LOCAL ONLY. This explicitly supersedes automatic Sites publication: run and open the local preview, keep it running for the user, and make future changes locally. Do not create/update/deploy hosted Sites or synchronize source to the hosted provider unless the user explicitly requests it. Existing `.openai/hosting.json` is historical deployment identity only; preserve it without using it to publish. Keep secrets, generated caches, and archives out of source control.

- The latest hero hierarchy explicitly supersedes the enlarged date and mixed-case title: display all three title lines uppercase; make the first `82 STRATUP` line 62% of the other title lines. Restore the original small date/location eyebrow to 11px desktop and 9px on smaller screens. Keep Zen Dots for the title.

- The latest footer request supersedes its Medium weight and bottom spacing: use weight 700 and place the large footer text flush against the bottom edge.

- The large bottom footer text now fills nearly the full viewport: 16.8vw up to 345px with 2% side insets, superseding its former smaller size. Keep bold weight and flush bottom placement.

- The large footer text color is the yellow background mixed with 10% black (`color-mix(in srgb, var(--yellow) 90%, black 10%)`, fallback `#d8e144`). This explicitly supersedes the earlier dark-ink footer lettering.

- Add a subtle inner shadow only within the large footer letterforms (SVG SourceAlpha inset filter, ~1px blur/offset), keeping the 10%-darker yellow fill, bold size, and flush bottom alignment. Do not shadow the entire footer panel.

- The latest user correction supersedes the scattered blue word highlights: keep sky blue only in the top utility strip and the single `1,500` attendance highlight. Remove blue behind headings, day count, venue teaser, CTA greeting, and marquee. Selected schedule tabs and ticket options use yellow again. Preserve the yellow theme, connected lines, and square corners.

- Add Firecrawl-inspired connected page lines: continuous side rails aligned to content, fine section boundaries, small crosshair junctions, contiguous program-card and ticket-option grids, ruled statistics, and a faint hero grid. Decorative markers are aria-hidden and pointer-events:none. Preserve existing colors, highlights, fonts, text hierarchy, square corners, images, and the local-only workflow. Collapse internal dividers sensibly on mobile without horizontal overflow. Reference: https://www.firecrawl.dev/ .

- Connected line intersections must use one stroke only: the shared section edge owns its horizontal rule; global rails own outer vertical edges. CTA has no duplicate side borders, and adjacent sections never stack bottom/top borders. Program panels and statistic rules extend to their intended outer rails. Side rails continue through the pre-footer spacer and footer. This supersedes overlapping independently bordered edges in the first grid implementation.

- Small accent points are all sky blue (`#8acbe7`): eyebrow squares, crosshair junctions, decorative link arrows, short underline accents, active-nav underline, and the hero note’s short vertical line. This supersedes their former black/gray colors without adding more blue text backgrounds. Continuous structural rules stay subtle neutral gray.

- The final structural grid has one owner: a page-wide, aria-hidden, pointer-transparent SVG measured from actual layout. All major horizontal rules run to both viewport edges; outer vertical rails run from the header through the footer bottom. Statistics and panel dividers connect exactly to those rows. Deduplicate row coordinates and disable former CSS borders, gradients, inset shadows, and per-section crosshairs to prevent parallel or truncated strokes. Recalculate after resize, fonts, images, and content height changes. This supersedes all earlier independently rendered structural line rules.

- Full-width statistic rules must sit below both the introduction heading and paragraph. Use a separate grid row on desktop so a horizontal line never intersects heading text.

- Latest exception: exclude the entire footer area from the page-line overlay. Stop rails at the footer’s top edge and do not draw a footer-top crosshair/rule. Keep the footer itself, its large lettering, yellow background, and inner shadow unchanged. This supersedes the earlier instruction to extend structural lines through the footer.

- Latest button exception supersedes blue arrow/underline accents for controls: button and link arrows inherit their text color, text-link underlines are removed, and the hero button-area dashed rule is removed. Keep blue square markers, structural crosshairs, and other non-control accent points.

- Footer menu links use readable 16px desktop/15px small-screen text, with inline-flex labels/arrows vertically centered on the same line. Footer metadata is 12–13px. Use a responsive grid so copyright, branding, and menu never collide. This supersedes the former tiny footer navigation and misaligned inline arrow.

- The header logo uses only the original supplied geometric symbol (`dist/assets/82startup-symbol.svg`), without its 82 STARTUP wordmark. Keep the complete original logo assets intact. Use an accessible home-link label and a 44px desktop / 38px mobile symbol. This supersedes use of the full wordmark in the header.

- The latest footer wording is exactly `SUMMIT 2027`; remove `IN SF` while preserving its size, color, inner shadow, and bottom alignment. This supersedes the previous footer wording.

- The large `SUMMIT 2027` footer title is now 50% larger than the previous 11.2vw / 230px scale: use 16.8vw / 345px maximum. Other text sizes remain unchanged.

- At the 150% footer title scale, use -0.09em letter spacing to keep the one-line text within the page width.

- Center the enlarged `SUMMIT 2027` footer title horizontally within the full footer content width; preserve the 150% type scale and flush-bottom positioning.

- Section heading blocks need 32px of top padding (24px on smaller screens) between the structural grid rule and eyebrow labels, so labels never sit against the line. Preserve the connected grid endpoints.

- Add Google Maps links for Fort Mason in both the homepage WHERE block and venue teaser. The WHERE venue name also opens Maps. Use the existing verified venue query URL, open externally with target=_blank and rel=noopener, and retain the separate Venue page link.

- All rendered text must be at least 12px at every viewport. This supersedes earlier 8–11px labels, buttons, captions, date eyebrow, and mobile typography sizes. Font-size declarations enforce max(12px, intended size), shorthand sizes are at least 12px, and compact layouts may wrap rather than shrink type. Mobile menu anchors to its header instead of a fixed page offset.

- Apply a subtle regular dot pattern (roughly 1px dark dots, 24–26px spacing) to the header/home hero, footer, statistics, CTA, speaker announcement panel, and ticket summary. This latest request supersedes the former plain header/footer backgrounds but preserves colors, typography, clear text, square corners, and the connected structural lines; keep the footer free of structural rails. Do not pattern every section.

- The latest footer typography request supersedes negative tracking: use 10% letter spacing (0.1em), center the visible text, and fit the one-line footer to the available width (responsive 12vw, max 260px) without clipping. Keep the existing color and inner shadow.

- Align desktop header navigation to the right, directly before the ticket action, with margin-left:auto on the navigation and a modest 36px total separation to the ticket button. Header menu links use IBM Plex Sans Semibold (600), superseding their former regular/medium weight. Preserve the mobile collapsed-menu layout.

- Latest footer spacing correction supersedes 0.1em tracking: reduce it by eight percentage points to 0.02em (2%), with matching text-indent for visual centering. Preserve the current font size, color, weight, and inner shadow.

- Latest footer reference supersedes the 10%-darker lettering: use a subtler 5%-black mix with the existing yellow background, very fine soft light/dark edge shading, and reduce inset shadow opacity to 0.14 for an engraved tonal effect. Preserve IBM Plex Sans Bold, 2% tracking, existing centered size/layout, and yellow theme.

- Header navigation has symmetric internal rail spacing: padding-inline clamp(20px,2vw,36px) desktop and 16px mobile. The logo and far-right ticket/menu control sit equally inset from the outer structural rails. Preserve right-aligned desktop navigation, semibold labels, and the existing connected grid.

- Add Little Plains-inspired scroll motion (reference https://littleplains.com/): one-time soft fade/up/blur reveals for headings, copy, program contents and footer, short sibling stagger, and subtle scroll-linked drift limited to clipped abstract program artwork. Keep native scrolling and all structural section/card boundaries stationary so the connected measured SVG grid stays aligned. Do not crop or move the full venue photograph. Use passive scroll events with requestAnimationFrame, respect live prefers-reduced-motion, and reveal keyboard-focused contents immediately. This supersedes the earlier blanket no-animation styling for these explicit motion targets.

- Home masthead background now uses the actual React Bits Gradient Blinds shader, adapted to dependency-free WebGL2 in dist/gradient-blinds.js (source and license retained in dist/licenses/react-bits.txt). This supersedes the plain yellow/dots-only hero background. Use yellow/lime stops, subtle multiply blending, cursor-following light and slow blind sway; retain the existing yellow theme, sparse dots, title typography, stationary grid, and accessible controls above the noninteractive canvas. Navigation stays unchanged. Respect prefers-reduced-motion with a static render, pause offscreen/hidden, cap DPR at 1.5, and fall back to the existing CSS background when WebGL2 is unavailable.

- Temporarily disable Gradient Blinds by removing its script from the homepage while preserving its JS, CSS and license for restoration. The current hero comparison is an independently written particle-ocean preview (dist/contour-tide-preview.js), inspired by the public Contour Tide demo at https://pro.reactbits.dev/docs/components/contour-tide . The paid original source is unavailable in the current signed-out session; do not claim this preview is the original Pro component. Keep yellow theme, stationary grid and accessible foreground controls; use subtle olive particle crests, pointer parallax, reduced-motion static rendering, offscreen pausing, adaptive particle count, DPR cap 1.5 and plain yellow fallback. This supersedes active Gradient Blinds until the user selects a background.

- Current hero background comparison is a custom ASCII-fire effect in dist/glyph-ember-preview.js inspired by the public Glyph Ember demo (https://pro.reactbits.dev/docs/components/glyph-ember), not the proprietary Pro component/source. Preserve but do not load either Gradient Blinds or Contour Tide. Flames remain anchored to the hero bottom, following the user’s bottom-alignment steering, with olive glyphs rising against yellow. Glyphs are decorative/aria-hidden and at least 12px. Pointer proximity suppresses the heat; clicking non-control background briefly stokes it. Keep native scroll, grid, typography and buttons intact. Cap at 30fps/DPR1.5, pause offscreen/hidden and render a still frame for reduced motion. This supersedes the active particle-ocean experiment.

- Final background choice: keep only the custom ASCII fire. Remove Gradient Blinds and Contour Tide scripts, unused CSS, and the unused React Bits license copy; this explicitly supersedes instructions to retain those comparison files. Flame body is green, blending into sky-blue hot glyphs/sparks with soft blue illumination near the bottom. Preserve the yellow page theme and the approved bottom-anchored motion, typography and layout.

- Latest ember refinement raises the flame reach about one third (heat cooling uses rows*0.60 rather than 0.45), while keeping its base attached to the hero bottom. Replace the two-color flame with slowly blended green, mint, teal and sky-blue glyphs plus restrained lavender accents and matching soft light. Sparks may rise farther; maintain readability by fading the upper edge, preserving existing glyph opacity and foreground typography. This supersedes the prior lower green/sky-only flame.

- Rising ember sparks must be clearly visible on the light yellow background: 14–17px plus/star glyphs, teal-blue cores with sky-blue halos and short trailing pinpricks, rising from the bottom across most of the hero. Remove the canvas-wide upper mask so it does not erase floating sparks; flame heat already fades naturally. Preserve the multi-color flame and existing motion preferences. This supersedes the earlier faint punctuation-only sparks and upper masking.

- Latest correction softens the overly sharp floating embers: use 12–14px glyphs, lower core/trail/halo opacity and gentler glow, while keeping upward motion legible. Slightly soften flame-body opacity too. Color must evolve continuously over time (not merely oscillate in place), cycling through green/mint/teal/sky/lavender with restrained rose/coral transitions. This supersedes the previous high-contrast 14–17px spark specification; preserve taller bottom-anchored flames.

- Home title now uses a custom Ghost Type-inspired one-time entrance: first line types in, then remaining exact title lines stream as faint ghost suggestions and accept into solid ink with a subtle sky-blue caret/sweep. This supersedes the earlier generic rise/fade reveal on hero title spans only. Preserve Zen Dots, uppercase rendering, exact copy and three-line sizes/spacing by reserving each full line’s width. Do not invent alternative conference titles or add hint UI. The original Pro source remains unavailable; this is independently implemented in ghost-type-preview.js. Use one accessible full H1 label, hide duplicate decorative text/caret from accessibility, pause when offscreen/hidden, and show static full text for reduced motion.

- Latest title request replaces Ghost Type and its typing/caret/suggestion effects with a custom Glyph Lottery-inspired slot-reel entrance. Remove ghost-type-preview.js and its CSS; use glyph-lottery-preview.js to roll each character vertically and lock it left-to-right with a restrained sky-blue accent and tiny settling bounce. Preserve exact title, Zen Dots, 3-line layout and natural final kerning by reserving the real text geometry and restoring the untouched full text after the one-time animation. One accessible full H1 label; all reel duplicates decorative. Respect reduced motion, pause hidden/offscreen animations, and finish cleanly on resize. This is an independent implementation of the public demo concept, not the paid Pro source. This supersedes the intervening character-by-character typing request.

- Latest ember palette explicitly includes red, white and green, with mint, sky blue and lavender transitions. Apply this range to both the flame glyphs and floating spark cores/trails/halos, preserving the existing subdued opacity, taller bottom alignment and yellow theme. This supersedes cool-only spark coloring and the earlier restrained-coral-only warm accent.

- Avoid grey-looking ember fields: interpolate flame colors by hue with consistently strong saturation, rather than blending complementary RGB values or inserting broad white bands. Keep red/green/teal/blue/purple hues distinct; reserve white for rare hottest cores and isolated sparks. Reduce the broad pastel light wash. Preserve soft spark opacity, yellow background and all motion/layout settings. This supersedes the previous white-inclusive RGB flame ramp.

- Latest title motion timing supersedes the rapid all-lines lock sequence: all three title lines spin from the start, while only one line locks at a time, strictly first line then second then third. Lower rows continue looping until the preceding row and its settling flashes have fully finished. Use a slower 1.2s idle loop, 1.1s+90ms/character settle durations, 300ms landing and 240ms line gap. Lock accents/halos must be WHITE, replacing the earlier sky-blue title accent; leave background fire colors unchanged. Pausing/reduced motion/resizing behavior remains.

- Latest timing refinement doubles title-animation playback speed while retaining strict top-to-bottom line completion and continuous spinning below. Use playbackRate=2 consistently for idle loops, waits, locking and landing (effective times are half the previous specification). The title lock flash is white only, with no blue color or blue halo; do not change the separately approved background flame palette. This supersedes the immediately preceding slower playback timing.

- Latest background palette request supersedes ALL prior colorful flame/spark/white-core/halo instructions: the entire background animation, including flames, rising sparks, trails and atmospheric gradients, uses only neutral dark grey RGB(48,48,48). Use variable alpha for depth and pulse rather than hue or colored highlights. Flames have approximately 0.03–0.25 alpha and sparks approximately 0.16–0.34 before fading. Keep the yellow page background, stationary blue UI accents, title effect and approved motion/layout unchanged.

- Latest title refinement removes the white lock flash and all text glow: reels retain the title’s ink color throughout settling. Character lock and landing durations are divided by 1.5 (50% faster completion) on top of the existing playbackRate=2. Keep idle reel speed and the strict first/second/third-line completion order unchanged. This supersedes the earlier white landing highlight.

- Remove empty bands between the homepage intro/stats and program heading: set intro bottom padding and the following program section top padding to zero. Desktop stats span the whole introduction row, extending to the outer rails with balanced cell padding, rather than leaving the left half empty. Mobile stats also reach both rails. The intro central divider stops at the stats top; the stats divider owns the rest to prevent overlapping strokes. Keep 32px/24px heading-block top breathing room and the existing copy/styles. This supersedes the prior right-column-only stats layout and doubled section spacing.

- Align desktop intro columns symmetrically: remove the percentage column gap, extend both cells to the actual outer rails, and give each cell the same 28px horizontal inset. Heading/description/statistic text align with their respective cell insets and the center divider stays exactly halfway between the rails. Preserve mobile stacking and the compact full-width stats layout. This supersedes the prior 7% intro column gap.

- Homepage program cards no longer have white panel backgrounds: use transparent bodies over paper; date labels use paper rather than pure white. Cards share connected full-width SVG rules at image/body, body/action and grid-bottom boundaries, with existing vertical cell dividers. Use flex column cards so action dividers align on desktop; action insets are 28px desktop/16px mobile. Remove inset CSS action borders. Animate only the inner program headings/copy (not their measured container) to keep structural lines fixed. Program arrows inherit ink. This supersedes white program panels and inset disconnected action rules.

- Latest title request REVERTS Glyph Lottery to the original Ghost Type-inspired typing entrance. Remove slot-reel code/CSS; restore ghost-type-preview.js with character-by-character typing, faint full-width ghost suggestions and a neutral ink caret, one line after another. No white/blue lock flash or glow. Preserve exact copy, Zen Dots and 3-line layout. One-time entrance, reduced-motion static text, offscreen/hidden pause, stable accessible H1 label. This supersedes all lottery playback/timing instructions.

- Corrected interpretation: the user wants the effect BEFORE Ghost Type, not Ghost Type restored. Remove all typing/ghost/reel scripts and CSS. Restore the original generic one-time soft fade/rise entrance on the three home-title spans, preserving its 110ms line stagger, exact title, Zen Dots and layout. This explicitly supersedes all earlier title typing/lottery instructions. Also improve hero support-copy, note and secondary-link readability with ink color/semibold weight and subtle yellow text halos that mute the pattern immediately around letters. Preserve the grey flame background itself.

- Desktop intro top row must have symmetric vertical padding and centered contents: remove section-level top padding and the 30px stats row gap; give both left heading cell and right description cell 48px top/bottom padding and flex vertical centering. Wrap description text in one span to preserve line breaks in the flex paragraph. Keep equal 28px horizontal insets, exact middle rule and full-width statistics below. This supersedes the previous top-aligned intro blocks with uneven section/row spacing.

- Venue action links must not add a second separator under the final DATES information row. Remove venue-links border-top and its extra top padding; retain the 30px action gap, factual row dividers and button outlines. This supersedes the earlier extra venue-links divider styling.

- Venue now embeds the existing 82_startup_3dmap/output/floorplan/Fort-Mason-3D.html model between visit details and the ticket CTA. Preserve that source project unchanged. The derived dist/venue-map/index.html retains embedded Three.js/model geometry and license, defaults to Gateway/startup/1F to match the requested reference, and places building/floor/3D-plan-center controls above the central map. Hide unrelated sidebar layers, source/export/memo editing controls in the website viewer only. Match square-corner paper/yellow website controls and >=12px UI text; retain full original standalone editor separately. Mark event arrangement as illustrative. Lazy-load the iframe; wheel zoom activates only after clicking the map so scrolling the venue page is not trapped.

- Make the venue map the dominant feature: compact the preceding photo/visit information into a 230–340px photo column plus a three-column facts row and inline map/directions actions; preserve full photo aspect ratio and credit. The map breaks out to full viewport width and is roughly one screen tall (780–1160px desktop; at least 740px mobile). Fit the 3D camera to projected building bounds with 10% framing allowance instead of the original loose length-based bounds, so the model fills its stage without losing whole-building context. These are derived-viewer changes only; keep the original 3D project unchanged. This supersedes the large photograph section and smaller map frame.

- Website map default camera uses a shallower diagonal azimuth (-0.35 radians) to fill the wide stage with a larger, more readable whole-building plan. Users retain full rotation controls; this changes only the derived website viewer.

- Reduce divider visual intensity by 30% across all pages: structural grid alpha 0.18 -> 0.126, secondary line color alpha 1 -> 0.7, junction opacity 0.7, and the embedded map toolbar separator likewise at 70% opacity. Preserve widths, endpoints, geometry and button/control outlines. This supersedes their former stronger opacity values.

- Google Maps buttons generated by the shared button helper open externally in a new tab with target=_blank and rel=noopener noreferrer, including the Venue page Open in Google Maps action. Preserve ordinary internal ticket navigation.

- Latest map sizing: enlarge the iframe to 900–1400px/110svh desktop and at least 850px/105svh mobile, with tighter 4% camera framing. All eight top map controls (buildings, floors, views, center) use identical grid cell widths and 64px heights, 60px on small screens. Flatten their wrappers into one 8-column desktop/4-column smaller toolbar; hide redundant group headings and small-screen building subtitles. Preserve all selection behavior and readable text >=12px. This supersedes differently sized building/floor/view groups and earlier map dimensions.

- Website map building choices are ordered Festival Pavilion first (left), then Gateway. Their subtitles are respectively 메인 행사장 and 스타트업 부스+푸드코트, superseding floor descriptors. Keep these role labels visible on mobile too; increase all small-screen map toolbar buttons equally to 76px to accommodate the subtitles without shrinking below 12px. Building selection IDs/model data are unchanged, and this ordering request does not change the existing default selected building.

- Remove the website map 3D/plan toggle buttons. Keep the map in its default 3D view and preserve building/floor selection, center and zoom controls. The remaining six top controls use six equal columns desktop and three columns on smaller viewports, maintaining uniform button dimensions without empty slots. This supersedes retaining the 3D/plan controls and the eight-button grid. The standalone original remains untouched.

- Website Festival Pavilion view is ground-floor-only: enforce lower level whenever selected/built and hide its floor selector. Floor choices belong exclusively to the Gateway group, visually grouped to its right on desktop; compact layouts keep the same ordered controls without overflow. Remember the last Gateway floor selection when switching away/back. Preserve equal button sizing and the untouched standalone original. This supersedes allowing Pavilion upper/both views in the website.

- Latest map UX replaces the equal-sized mixed six-button toolbar: use two stable equal-width building tabs (Pavilion left, Gateway right), a separate compact center action, and a dedicated secondary row. Gateway floor buttons live below Gateway; Pavilion shows a static ground-floor status instead. Keep the toolbar height and building-tab widths constant when switching buildings. Add tab roles/selected state/arrow-key navigation and pressed state for floor buttons. This explicitly supersedes forcing building tabs, floors and utility actions into identical cells.
- Contain the entire map iframe/toolbar within the same left/right rails as the section heading; remove full-viewport breakout. Fit/center the building bounding box with 10% breathing room, including the correct floor height center, so the initial model stays inside its canvas. Preserve large stage height, manual zoom/rotation, Gateway floor memory and Pavilion 1F-only behavior. This supersedes the full-bleed frame and overly tight framing.

- On initial/reset views narrower than 600px, use a steeper diagonal camera azimuth (-1.25 radians) so the long pier occupies the portrait stage. Wider views retain -0.35. Manual camera controls remain available.

- Refine venue overview hierarchy: top-align a compact 300px photo column with a single credit line; put one proper venue heading, Korean introduction, a two-column Address/Dates row, and aligned external links in the right column. Remove the redundant VENUE label/name row and repeated photo-caption venue name. Preserve the supplied photo full aspect ratio/Christopher Michel credit, all factual copy, and new-tab Google Maps behavior. Use a shared subtle rule above facts, consistent spacing and mobile stacking with a photo capped at 240px. This supersedes the centered three-fact-column overview that left a floating content island.

- Latest venue request restores a generous overview: photo/content roughly equal-width columns with 64px vertical padding and larger heading/body/facts; preserve the cleaned hierarchy and full photo aspect ratio. Mobile uses a full-width photo. This supersedes the compact 300px photo treatment.
- The venue map on the page is now a static rendered 3D preview with one accessible full-surface launch button. Clicking it opens a native full-viewport dialog containing the interactive viewer and a clearly labeled close action. Preserve the underlying page scroll position, trap focus natively, support Escape (including from inside the iframe), restore launch-button focus on close, and retain viewer selection between reopenings. Load the interactive iframe only on first open; pause its rendering while closed. Preview mode hides controls and renders only on load/resize, avoiding two running maps. This supersedes inline interactive controls. Original source project remains unchanged.

- Add a homepage event-photo section after the program and before the marquee/venue teaser. Use the 13 supplied DSC/ukf event photos from dist/assets/imgs; exclude venue/Unsplash stock images from this event gallery. Preserve all originals and generate optimized 720/1800px WebP display variants in assets/event-photos. Show six editorial grid previews with connected single-owner SVG edges; clicking a photo or the all-photos action opens a native full-screen 13-photo viewer. Preserve image aspect ratio in the viewer, use descriptive alt text, previous/next/arrow-key navigation, Escape/close, scroll lock and focus restoration. Label as past event moments, never as photos of the future 2027 event or claim unverified attendee identities/venues. Match paper/yellow theme, square corners, >=12px text, shared divider strength and mobile layout.

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

## Official Luma event and ticket source — supersedes prior event rules

- Follow EVENTS.md and the shared dist/event-data.js, verified October 25, 2026. There are four events across March 16–18 in San Francisco; Summit itself spans March 17–18. Never invent a fourth event date. Display times explicitly in venue-local PDT.
- Opening Night (Mar 16, 17:00–21:00) is at Salesforce Tower and links to https://luma.com/8faq28ez ($200). Summit (Mar 17 09:00–Mar 18 18:00) is at Fort Mason and links to https://luma.com/sell0ikl (Early Bird $25 / Standard $50). Founders & Funders Evening (Mar 17, 18:30–21:30) links to https://luma.com/9qj9ujht (Early Bird $50 / Standard $100). Community Evening (Mar 18, 18:30–21:30) links to https://luma.com/6vy0xhk9 (Early Bird $50 / Standard $100); both evenings are at Fort Mason.
- Ticket sales happen only on Luma. Contextual buy buttons open the corresponding event URL in a new tab with noopener noreferrer; generic ticket buttons go to the four-event ticket directory. Remove local pass/dinner forms, checkout handlers, purchase-information popups, and “prices coming soon” messaging. This explicitly supersedes all older approved-checkout-url, Day only/Day + Dinner, Both Days selector and date-query preselection instructions.
- The schedule has real date tabs Mar 16/17/18: Opening Night on the 16th; Summit + Founders & Funders on the 17th; Summit continuation + Community Evening on the 18th. Do not invent session times or a day-two opening hour. Homepage uses four event cards, 4/2/1 columns across desktop/tablet/mobile, each with a distinct ticket destination. Keep single-owner dividers deduplicated in every grid arrangement.
- Explain Salesforce Tower separately on Venue; Fort Mason’s 3D map is not a Salesforce floor plan. Preserve the existing design and motion choices unless explicitly changed.

## March 19 addition and chronological tickets — current authoritative rules

- Supersedes the immediately preceding four-event / March 16–18 snapshot: include five ticketed events over four dates March 16–19. Add 82 Night: VIP After Party, March 19 18:00–21:00 PDT, The Ameswell Hotel, 800 Moffett Blvd, Mountain View CA 94043; limited tickets $100, invited VIP guests; https://luma.com/yu4fof7p. Follow the event location block, not its body’s outdated San Francisco label.
- Tickets is a single chronological timeline with a connected date rail, event details and individual Luma purchase actions. Do not use the previous two-column ticket grid or local purchase forms. Schedule has March 16/17/18/19 tabs, and day=19 selects the VIP event. All five ticket destinations open a new tab. Shared event data also keeps homepage dates/count/cards consistent (five cards, 3/2/1 columns); this supersedes the earlier four-card 4/2/1 rule. Preserve all other visual and animation choices.

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

## Repository integration override
The current canonical landing source is ../../public/ in 82startup/82startup. Historical dist/ paths refer to public/ now. Root AGENTS.md controls integration, temporary community UI gating, direct default-branch pushes and deployment policy, superseding conflicting historical workflow instructions above. The sibling Summit project is retained as the original local reference.

### Unified footer centering
The current user correction centers the single footer text span with grid place-items:center in public/style.css. This supersedes the preceding text-only flex implementation; preserve typography, color and bottom alignment.

### Compact hero and push hold
Root AGENTS.md now prohibits all pushes/deployments until the user explicitly requests them again, superseding historical release rules. The homepage hero is approximately 10% shorter using reduced padding/margins and a 5% smaller Zen Dots title. Preserve copy, equal line sizes and other styling.

### Archived original source
The original Summit folder now lives at `/Users/randy/project/_old/summit-2027`. Work only in `/Users/randy/project/82_2027summit/82startup`; this supersedes the earlier sibling-source reference. Do not push or deploy until explicitly requested again.

Latest hero spacing is approximately 15% shorter again, retaining title size; root AGENTS.md records the authoritative spacing. This supersedes prior hero padding/margins. The archive and push hold remain unchanged.

The latest user request explicitly authorizes pushing the completed integration and visual changes as randyjlee, superseding the prior push hold for this change set. Root AGENTS.md controls protected-main delivery; no hosting deployment is requested.
