# Abstract visual assets

Generated using the built-in ImageGen tool; these are new artwork inspired by the organizer's screenshots, not screenshot crops. The original SVG organizer logo remains intact alongside its dark-ink derivative.

## dist/assets/summit-botanical-gradient.png

Prompt: Create one refined portrait abstract photographic color-field artwork, inspired by soft defocused natural light and translucent botanical forms. Full bleed, no borders. Ethereal sky blue, pale cyan, mint green, luminous chartreuse and warm white blending through soft blur, with subtle fine analog film grain. Several large translucent leaf-like curved planes, softly out of focus, a luminous pale region upper left, richer teal lower right. Elegant quiet contemporary technology conference aesthetic. No text, no logos, no people, no UI, no mockup. Portrait aspect ratio 4:5. The image itself is the final website asset.

## dist/assets/summit-contour-gradient.png

Prompt: Create a single full-bleed refined abstract color-field artwork, no text. Warm coral orange light in the lower left blends into soft dusty lavender, periwinkle and rose in the upper right, with a deeper indigo corner. Beautiful fine photographic film grain evenly over the image. Delicate off-white curved topographic contour lines flow across the composition, organically bent grid and gently rounded nested shapes. Modern elegant editorial technology conference aesthetic, understated colors with warm luminosity, no hard geometric blocks, no objects, no logos, no UI, no borders. Landscape aspect ratio 3:2.

Program cards reuse this image with different CSS color treatments; no factual event claims are embedded in the image.

## Typography

Google Fonts stylesheet serves IBM Plex Sans at 400/500/600/700 (Medium 500 is the primary English weight) and Noto Sans KR at 400/500/600/700. This supersedes the prior Google Sans and Pixelify Sans choices. The latter is the explicit Google Korean-script fallback. No system-only Korean font dependency.

## dist/assets/fort-mason-aerial-christopher-michel.jpg

Organizer-supplied photo, copied unchanged from `FMCAC_aerial_by_Christopher_Michel_1280x989.jpg`. Credit: Christopher Michel. Used on the homepage venue teaser and Venue page, with its full aspect ratio preserved; supersedes the original SVG illustration.

The home hero title alone uses Google Fonts Zen Dots (400), as explicitly requested. Other English text remains IBM Plex Sans Medium. Reference: https://fonts.google.com/specimen/Zen+Dots .

## ASCII ember background
`dist/glyph-ember-preview.js` is independently written canvas ASCII fire inspired by the public Glyph Ember demo (https://pro.reactbits.dev/docs/components/glyph-ember), not copied from React Bits Pro source. Selected palette: green flame body, sky-blue hot glyphs/sparks and soft blue light over the existing yellow theme. The former Gradient Blinds and Contour Tide experiments and their unused license copy have been removed at the user's request.

Latest ember palette expands to green, mint, teal, sky blue and a small lavender accent, with matching light. The original canvas simulation now reaches about one-third higher.

The ember palette now continuously cycles, adding muted rose/coral accents to the cool green/blue colors. Floating sparks and flame opacity have been softened following user feedback.

## Slot-reel headline entrance
`dist/glyph-lottery-preview.js` is independently implemented from the public Glyph Lottery concept (https://pro.reactbits.dev/docs/components/glyph-lottery), not the paid React Bits Pro source. Uses existing Zen Dots and sky-blue settling accents. Replaces the removed Ghost Type experiment.

Current fire and spark palette: green, mint, white, red, coral, sky blue and lavender. This supersedes the previous cool-only floating-spark colors.

Color rendering now uses a saturated hue ramp for the flame body; white is reserved for sparks/rare hot cores, preventing washed grey bands from complementary RGB mixing.

Glyph Lottery-inspired title now locks one full row at a time with white landing highlights; this supersedes its previous sky-blue accent.

Latest palette supersedes all preceding ember color notes: all animated flame glyphs, floating sparks, trails and atmosphere use only dark grey RGB(48,48,48), with alpha variation. No colored/white highlights remain in the background animation.

Latest headline styling removes all white landing highlights and glow; title reels settle directly into ink at a 50% faster completion rate.

Latest title selection restores the independent Ghost Type-inspired character typing implementation and removes glyph-lottery-preview.js. The reference remains https://pro.reactbits.dev/docs/components/ghost-type ; no paid source is used.

Title clarification supersedes all recent text-experiment notes: Ghost Type and Glyph Lottery scripts are removed. Only the original CSS/IntersectionObserver soft entrance remains for the title.

## Embedded venue floorplan
`dist/venue-map/index.html` derives from the user-supplied `82_startup_3dmap/output/floorplan/Fort-Mason-3D.html`. Original model data and Three.js are embedded; the source project remains unchanged. Website-only changes move the requested controls to the top, hide editor tools, use the site theme and Gateway startup layout by default. License retained at `dist/venue-map/THREE-LICENSE.txt`. Event furniture is an illustrative arrangement, not confirmed operations.

## Event gallery photographs
13 organizer-supplied DSC/ukf event JPEGs from `dist/assets/imgs` are used in the homepage gallery. Original files remain unchanged. EXIF-oriented, metadata-free 720px and 1800px WebP display variants live in `dist/assets/event-photos`. No photographer identities, attendee identities or event locations are inferred. Venue aerial and Unsplash stock images are excluded from this gallery.

- Replace the homepage editorial photo grid with an image-only animated horizontal carousel using all 13 supplied event photos. Remove visible gallery marketing headlines/intros, photo badges/captions, the all-photos CTA and modal captions; retain descriptive alt text and hidden accessible headings. Show three images at a time on wide screens, two on tablets and one with a peek on phones, slide automatically every 3 seconds with seamless forward wrap, support swipe/previous/next, and provide an icon pause/play control. Pause offscreen, on mouse hover/keyboard focus, in hidden tabs and while dialogs are open; disable autoplay/smooth motion for reduced motion. Preserve click-to-enlarge, keyboard navigation, Escape and focus restoration. Draw only static carousel perimeter dividers, never grid lines through moving photos. This supersedes the six-preview editorial grid and visible photo copy.

- Replace the homepage IDEAS/PEOPLE text marquee with a continuously scrolling monochrome tech-company logo strip (Google, Meta, NVIDIA, Anthropic, Figma, GitHub, Stripe, Vercel). Use locally stored SVG marks from a pinned Simple Icons revision, preserving its CC0 license and source record. Duplicate the group inert/aria-hidden for a seamless 36-second loop, with a pause/play control, hover/focus pause, offscreen/hidden-tab/dialog pause and reduced-motion support. Preserve the shared divider styling. Do not label these illustrative logos as confirmed sponsors, partners or attendees.

- Place the tech-company logo slider immediately after the homepage hero/header section, before the 01/WHEN–02/WHERE–03/WHO event-summary strip. Remove its former placement between photos and the venue teaser. Load the small local logo SVGs eagerly to avoid blank marks during continuous motion. This supersedes the former text-marquee position.

- Program-card artwork uses soft, grainy CSS radial gradients instead of the former contour-line image: multi-hue lavender/coral/plum, mint/cobalt/violet/peach, and apricot/lilac/rose/teal palettes. Apply the locally authored procedural summit-grain.svg as a pronounced coarse static texture with stronger noise contrast and larger grains; preserve square corners, date labels, card copy, ticket links and dividers. The photo carousel uses four inert wrap copies so its three-across desktop view loops seamlessly, retains the 3-second advance, and remains responsive.

- Set the program-art grain overlay opacity to 0.34, reducing its previous 0.68 strength by 50%. Preserve the coarse grain size and mixed-color gradients; this supersedes the stronger texture treatment.

## Optimized public delivery assets

- Selected social artwork: `public/assets/og-startup-week-2027-zen-dots.jpg`, 1200×630 JPEG, approximately110KB, encoded from the supplied/generated Zen Dots PNG master. Used by static Open Graph and Twitter tags across all five landing documents. Preserve PNG masters.
- Existing botanical and contour artwork now use sibling `.webp` delivery variants; originals remain for source fidelity.
- Derived hosted map plans are `public/venue-map/assets/plan-<content hash>.webp`, extracted from the original embedded JPEGs at the same pixel dimensions. Three.js r128 is extracted unchanged under `public/venue-map/vendor/three-r128.min.js`; its MIT notice and THREE-LICENSE.txt remain included.
- The original self-contained map project is archived outside the active repository and remains unchanged. Public map HTML now references the extracted local HTTP assets.

### Homepage speaker portrait reference sources
User authorized the four speakers from their screenshot. Local portrait files were retrieved from these published sources (no generated portraits):
- First speaker: user-supplied name 김정상 is retained; show an initial placeholder because an available Duke portrait names a different person. Do not pair it with this name. Original screenshot portrait file is not available on disk.
- edward-kim.png: https://d2xo500swnpgl1.cloudfront.net/uploads/web/Eddie_0018-1603788029918.png (ELC speaker profile).
- cal-henderson.jpg: https://www.indexventures.com/media/images/Cal_Henderson_.original.format-jpeg.jpg (Index Ventures profile).
- eric-kim.jpeg: https://images.squarespace-cdn.com/content/v1/5fbc42d5bc2a9d5c6d239a3c/1624940105364-22YYX70V4I9MQCEYO5BW/File_000%2B%281%29.jpeg (Across the Lines interview).
Sponsor company names and tiers come from the organizer's 2026 screenshot; use text wordmarks.

IONQ speaker photo supplied directly by user: https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJnKlGpQzadeEsXJjrkADdo0la7CA8ZkuT4c9sbLRsQiXOTw3bca3RcDt2&s=10 → public/assets/speakers/ionq-speaker.jpg. This supersedes the first-speaker placeholder; preserve user-provided identity text.

### Edward Kim portrait replacement
Use the exact user-selected TechCrunch image (https://techcrunch.com/wp-content/uploads/2024/10/edward-kim.jpg), saved as public/assets/speakers/edward-kim-techcrunch.jpg, instead of the earlier red-sweater photo. Frame it to the shared portrait eye-line and preserve grayscale. This supersedes the earlier Edward photo source/framing only. Keep changes local.

### Black sponsor SVG sources
- public/assets/sponsor-logos/naver.svg: https://commons.wikimedia.org/wiki/File:Naver_Logotype.svg (original NAVER homepage logotype, public-domain text logo). Official black variant reference: https://www.navercorp.com/en/company/brandGuide.
- public/assets/sponsor-logos/altos.svg: official https://altos.vc/ inline SVG id svg250910726_4204, extracting the original letter paths and removing the square background.
- public/assets/sponsor-logos/kova.svg: official https://test.venture.or.kr/kova/upload/newsletter/mailtpl/240605_KOVA_Brochure.pdf, page 1 bottom vector signature. Extracted vector outlines, cropped viewBox, removed embedded raster elements, converted colored ink to black while retaining white cutouts.
All logos remain trademarks of their respective owners. No new sponsorship or affiliation is asserted beyond the user-provided sponsor list.

### Altos horizontal lockup
Use the user-selected horizontal Altos logo form: white ALTOS lettering in a black square, with black VENTURES lettering to its right. Local assets/sponsor-logos/altos-lockup.svg reuses the official ALTOS letter paths and outlines the accompanying VENTURES word; transparent surroundings, no embedded raster or font dependencies. This supersedes the previous standalone ALTOS wordmark. Preserve no-link sponsor behavior and keep changes local.
