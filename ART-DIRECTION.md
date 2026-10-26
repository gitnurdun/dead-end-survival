# Dead End: horror revision

The current direction is a dark 2D survival game: wet streets, broken architecture, cold fog, sparse practical lights, desaturated characters, gaunt infected silhouettes, and restrained interface ornament. Menus use a full-screen campaign presentation rather than a website hero-and-cards layout.

The 37 missions use shared procedural environment painters, different geometry families, weather, obstacle materials, encounter profiles, environmental hazards and gravity. They are playable missions, not 37 painted still images. Their street-to-shelter-to-gate routes now include escape, generator, escort and beacon-defense objectives; optional rescue buggies and armed tanks are playable along the route; bespoke boss encounters and dedicated flight missions remain future work.

Gameplay geometry is authoritative: survivors, infected and Biscuit share the same rigid obstacle solver; zombies climb by jumping instead of passing through cars. Animation phase follows distance traveled rather than wall-clock leg cycles. Idle infected keep their feet still.

## Key art asset

- Final asset: `assets/dead-end-keyart.png`.
- Generation: built-in image generation tool, using the imagegen skill; no external image API or CLI fallback.
- Used as the main-menu cinematic backdrop. In-game environments and museum samples are rendered by the game itself.

Exact generation prompt:

> Use case: stylized-concept. Asset type: cinematic background art for a dark 2D zombie survival desktop game main menu, landscape 16:9. An abandoned rain-soaked urban street at midnight, decaying apartment blocks, dangling power cables, a ruined car, abandoned quarantine fencing, cold fog, sparse sickly amber lamps, tiny distant shambling infected silhouettes. Detailed hand-painted gothic horror game concept art, layered silhouettes, dramatic chiaroscuro, dirty teal charcoal palette with muted rust and one distant burning red flare. Ominous, oppressive, lonely, no cozy feeling, no cute cartoon features. Composition: keep the left third very dark and uncluttered for menu typography, concentrate ruined architecture and an intimidating leaning infected silhouette in the middle-right, atmospheric depth and wet road reflections. No readable text, no UI, no logos, no watermark. No graphic gore.

## Audio

The supplied ZombievilleIntro.mp3 plays only in menus; gameplay, training, shelter, shop, pause and death have no background music. Procedural music and continuous noise ambience have been removed following listening feedback. Weapon attacks, impacts, infected deaths, doors, switches, purchases and victory use matching supplied recordings. Short unmatched cues use synthesis. Music and effects have independent volume controls. The browser starts audio after the first interaction.

## Museum review workflow

Open the main menu's Quarantine Museum, select a category and specimen, inspect the live image and movement poses, audition its sound, then record a review status and notes. Notes save locally under a separate key from game progress. Export reviews downloads a JSON file with stable specimen IDs, names, categories, status, notes and timestamps. New Game does not erase museum notes. No notes are automatically transmitted.

Mission photos and thumbnails use the same environment painter as gameplay. Immersive preview shows the generated route itself, with a route-position slider, previous/next mission controls and direct launch. Review horror quality, legibility and sound by playing; automated checks cannot judge those subjective qualities.


## Shorter-route revision

The entire interface and catalog are in English. The centered title menu and 1.5x gameplay camera improve readability. Missions use 24,000-unit routes, with the four shelters retained. Each kill awards and saves its base reward immediately; optional bonus coins remain physical pickups. Shelter entry/exit, gate victory and death emit distinct transient effects. Death effects are allowed to play before the result dialog. Delegated click handling covers dynamic buttons, while page changes use a separate transition cue.

## Armory and Wildlands revision

Weapon illustrations are shared between the world shelf, interactive shop and museum through src/armory-art.js. Each new firearm has a distinct silhouette, magazine, rate of fire, sound and gameplay behavior. The rack no longer uses colored placeholder packets for weapons. Five additional natural biomes have layered scenery, distinct ground treatments and weather in src/wilderness.js; forest and snow shelters receive moss or snow details. Five protected survivor NPCs are represented in the museum, with four finite-reward field encounters on every route.

Effects default to stronger visual feedback and independent audio amplification. Settings include master volume, effect volume and amplification, visual effect strength, shake and weather density, plus test buttons. Existing audio preferences remain intact. Music uses supplied recordings; short effects combine supplied clips with fallback cues. Subjective quality requires listening and iteration.

## Feedback and inspection revision

Hit markers, combined damage numbers, brief falling bodies, a subtle flashlight, hurt edges and occupied-shelter warnings clarify combat. Terrain contacts resolve in travel order and explosions stay at their impact surface. Training supports thirteen target species, four combat scenarios, harmless moving threats, automatic reload/respawn and real damage statistics without touching the campaign save. Forest firs have irregular branch outlines; alpine snow and mountain fractures add silhouette detail.

## New threat and vehicle pass

Amber landing ellipses, cyan ground-wave lanes and rust-colored charge lanes make three new attacks readable before impact. Each new infected has a distinct sac, plated forearms or ram helmet. Buggies and tanks have reusable layered Canvas art, visible occupants, animated wheels/tracks and low-hull smoke, shared by gameplay and museum. Menu feedback uses an independent short click/page cue. Chainsaw loopEnd is fixed to 60% of the supplied clip duration.

## Six improvements completed

Salvage is rare: a seeded 30% chance of one vehicle. Terrain-adapted vehicle art includes tracked snow buggies, pale polar armor and antenna-equipped planetary rovers. Vehicle recoil, hurt flashes, suspension motion, skids and dust/snow accompany physical acceleration, braking and crash damage.

Interactive scene art marks explosive drums and their blast radius, a wired circuit switch, suspended cargo with a landing warning and toppling barricades. Required objectives add generator crank/progress lights, an escorted survivor/extraction frame and a radio beacon/defense zone. Mission selection shows objectives and the actual seeded salvage outcome.

Infected color, clothing, wounds, build and gait vary deterministically. Strong subtype features such as riot plates, throat sacs and ram helmets remain visible. Museum appearance buttons and vehicle terrain previews support developer review.
