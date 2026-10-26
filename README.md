# Dead End — One more street.

A single-player 2D horror survival game, with 37 unlocked missions, a campaign selector, persistent equipment, and a specimen museum. No backend, accounts, or package installation is required. The generated cinematic key art is bundled locally; optional web fonts fall back to system fonts offline.

## Play

Install Node.js, open this folder in a terminal, and run:

```sh
npm start
```

Open **http://127.0.0.1:5173** in desktop Chrome or Edge. Keep the server running while playing. Set `PORT` to use a different port.

## Campaign and museum

Choose **Campaign / Mission Select** to launch any of 37 missions across five regions, from ruined cities and industrial sites to frozen borders and eight off-world stations. All missions are unlocked for development review. Completed-stage equipment and shop upgrades can be taken back into easier missions; coins remain shared. Each mission has four safe houses. Buy the pistol once at the supply shelf; weapons do not respawn along the route. Mission hazards, gravity, weather and obstacle materials vary.

Open **Quarantine Museum** to inspect all 16 currently implemented weapons across melee, firearm and prototype families, thirteen infected types and two drivable vehicles, five survivor NPCs, supplies, safe-house variants and all 37 missions. Toggle infected poses, audition sounds, record local review notes and export them as JSON. Immersive mission preview includes a route slider and previous/next controls. Notes are separate from the game save.

Click anywhere to enable sound, and use **Fullscreen** for a desktop-game presentation. Master, music and sound effects have separate settings. Effects support up to 200% volume and a separate 100–300% amplification control. Visual strength, shake intensity and weather density are adjustable; reduced motion overrides shake and flashes.

## Presentation and feedback

The English title menu is centered and enlarged. The campaign screen has a persistent **Start Game** button. Gameplay uses a 1.5x camera zoom, enlarging survivors, infected, vehicles, shelters and supplies while retaining their shared collision geometry. Death, gate victory, shelter entry and exit have distinct visual and audio cues. All enabled menu buttons and page transitions produce sound feedback, controlled by the effects volume setting.

## Controls

| Key | Action |
| --- | --- |
| Left / Right | Move and face that direction |
| Up | Jump; enter or leave a house at its doorway |
| Space | Attack; hold to repeat |
| X / Z | Next / previous owned weapon |
| 1–9 | Equip the corresponding carried slot |
| R | Reload / refuel the equipped weapon |
| E | Talk to survivors and collect field rewards |
| C | Character ability |
| Escape | Pause / resume |

Start with a bat and fists. Buy the pistol from Armory / Supply Shelf; it is equipped immediately and persists. Move close to Biscuit's cage in the neighborhood to rescue him. Reach the gate, shop, and continue into remixed stages.

## Shelter rules

Green windows mean supplies remain; blue means empty. Crate houses provide immediate supplies; houses with plants offer an initial bundle and a second after 10 accumulated seconds inside; twin-mailbox houses offer a bundle on each of two visits; clinics require 5 accumulated seconds inside. Houses can collapse after repeated zombie attacks. Being inside costs 12 health when they collapse.

## Saves and retries

One save is stored in this browser. Every defeated infected awards money immediately; about 28% also drop collectible bonus coins. Funds are saved immediately and survive failed attempts; collecting the same coins on retries is allowed. Retrying or reloading an unfinished stage restores its layout and stage-entry equipment with full health. Acquisitions during the failed attempt reset. Shop purchases are saved immediately, and reloading a shop restores the shop. New Game asks before replacing a save.

Character abilities, health, supplies, spawning, prices, and upgrades are tunable in the source. Routes are now half their original length (24,000 world units). Continuous-motion smoke runs take about two minutes; combat, exploration and shelter stays add time. Difficulty increases with forward distance and the selected mission’s threat rating. The 37 missions have assigned survival, mayhem, arcade or mixed profiles. Mission objectives rotate between escape, power restoration, survivor escort and beacon defense; dedicated helicopter missions and bosses remain future work; optional buggies and tanks are playable. See ART-DIRECTION.md for the art, asset prompt, audio and museum workflow.

## Development and checks

```sh
npm test
npm run check:routes
npm run simulate
```

The game uses plain ES modules and Canvas 2D. `src/game.js` contains simulation and save logic without browser dependencies; `src/world.js` assembles seeded route sections; `src/render.js` draws the art; `src/main.js` connects menus, input, and persistence; `src/audio.js` exposes the Web Audio mixer. The generated main-menu painting is bundled in assets. Gameplay art is drawn locally. Music uses only the supplied recordings; short synthesized cues supplement missing sound effects. src/physics.js is the shared actor collision solver; src/levels.js defines the 37 missions; src/screens.js and src/catalog.js provide campaign selection, the museum and local reviews.

## Armory and field survivors

Open **Armory / Supply Shelf** from the title screen without completing a mission first. The shop displays recognizable illustrations on a physical rack and each purchase card. The service pistol costs 75 coins, shotgun 180, SMG 240 and rifle 320. Each firearm has a separate magazine and reserve; ammunition crates and field supplies refill every owned firearm. Damage and reload upgrades apply to all firearms. Use Equip in the shop or X while playing. Purchases, ammunition, and equipped selection survive saving and deployment. Older pistol-only saves migrate automatically.

Every mission includes four protected survivor lookouts. Press E nearby: Ada rewards eight kills with 50 coins; Dr. Vale restores 35 health when injured; Mason provides ammunition; Rowan shares a 25-coin emergency cache. Each reward can be taken once per attempt. Retrying resets these encounters. Morgan operates the safe-zone shelf. All five survivors and the new weapons have museum dossiers.

## Wildlands

The **05 / Wildlands** region contains five additional unlocked playable missions: Whispering Pines (dense forest, mist, logs and thorns), White Silence (snowy alpine peaks, blizzard and slippery ice), Drowned Trail (cypress marsh, moss, spores and corrosive pools), Bone Dunes (sand, cacti, rocks and ground fires), and Wreckwater (surf, sea stacks, storm and electrical hazards). They have distinct environment painters used by previews and gameplay, four shelters each, and the same shorter route length. Campaign counts and previous/next controls derive from the level data.

Supply placement checks solid terrain, including the floating animation margin. Obstructed supplies and bonus coins move to reachable obstacle tops. NPC lookouts, shelter doors, and the dog rescue area stay clear of solid obstacles. Map preview hides the title menu and HUD while inspecting the route.

## Expanded combat and equipped weapon display

The combat dock shows a large illustration of the equipped weapon, its family, magazine/fuel/cells, reserve and reload progress. Carried slots highlight the active selection. Click a slot, use X/Z to cycle, or use 1–9 for direct slots. The survivor also holds the selected weapon. Switching cancels reloading and is disabled during a soldier burst, shelter and safe-zone combat lockout.

There are 16 weapons: fists, bat, machete, spear, demolition hammer, chainsaw; pistol, shotgun, SMG, marksman rifle, heavy revolver, grenade launcher, flamethrower; Tesla arc caster, cryogenic projector and plasma lance. New mechanics include bleeding, two-target thrusts, interrupting stuns, fuel-powered cutting, area explosions, burning, three-target chain arcs, 65% frost slow and three-body armor-piercing bolts. Solid terrain stops attacks and shields enemies from explosions and electric chains. Melee damage upgrades affect every melee weapon; firearm damage/reload upgrades affect powered ranged weapons. Refill crates supply each owned powered weapon using its own ammunition scale.

The armory and museum have family filters. In the museum, select any weapon and choose **Try in training bay**. All weapons are available in the isolated bay without purchases or save changes. Use Space or Fire / swing, R, Repeat, Reset bay, and previous/next weapon controls. Four scenarios cover a firing line, dense crowd, solid cover and moving threats. Select any of the thirteen infected species, toggle automatic reloading/target respawning, and inspect attacks, hits, actual damage, DPS and kills. Scenario/species changes preserve ammunition and statistics; Reset bay restores both. Moving targets cannot damage the trainee.

Six new infected join the original four: Crawler (low silhouette), Riot husk (55% frontal ballistic reduction), Leaper (telegraphed physical jump), Siren (telegraphed nearby rage buff), Rot carrier (five-second corrosive death pool) and Night stalker (distant concealment, revealed by damage/frost). Encounter composition changes with progress and environment, retaining the existing active cap. Their museum records include appearance, stats and countermeasures.

## Supplied audio pack

The audio folder was supplied by the user from the original Zombieville game. It is kept unchanged. The game currently decodes 34 distinct files used for weapon attacks, melee, hit/death feedback, doors, equipment switches, purchases, empty weapons, victory, defeat and the menu soundtrack. ZombievilleIntro.mp3 plays only in menus and stops immediately when gameplay, training, shelter, pause, the shop or death begins. death.mp3 remains in the supplied pack but is not used as background music. The generated soundtrack and continuous noise ambience have been removed; unavailable music remains silent. The engine start and loop recordings now power drivable vehicles; other unused recordings are reserved for future features. See AUDIO-CREDITS.md.

Settings include **Use recorded sound effects**, a ready-clip count, supplied soundtrack names and playback status, independent master/music/effects levels, effect amplification and sound audition. The effects toggle does not replace or disable the supplied music. Clips are decoded once and reused, routed through the existing volume buses, and limited to 20 effect voices. Short synthesized effect cues cover missing recordings or decoding failures, so audio cannot block play. Chainsaw and flamethrower attacks reuse one continuous recording per held attack, fading out on release, reload, pause or lost focus. Background tabs mute immediately.

## Combat and shelter polish

Projectile contacts resolve in distance order within each frame. Bodies before cover take damage, bodies behind it are protected, muzzle positions stop at adjacent cover, and grenades explode at the actual impact surface. Piercing cannot cross terrain. Leapers commit to their launch direction. Cosmetic particles and growls use separate random streams from encounters and drops.

Damage totals exclude overkill; recent damage numbers combine, hit markers distinguish armor and kills, and defeated infected fall and fade with a bounded corpse count. Settings toggle numbers, markers and the flashlight (also L). Jump buffering and a short coyote window improve platform control while fresh doorway input keeps priority. Barricades cannot be placed inside the survivor or solid obstacles.

The route HUD marks all four shelters, tracks occupied-house integrity and warns once when it becomes critical. It shows nearby doorway interaction and finite scout-contract progress. These cues add no shelter countdown and no text above buildings.

Playtest balance: fists deal 6 damage to one target; the bat deals 18 damage to at most two targets with reduced knockback. Held chainsaw input drives a continuous motor and animated chain, with contact damage at its own rate; releasing Space, shelter, reloading and empty fuel stop it.

## Dodge threats and drivable vehicles

Three new infected bring the total to 13. Acid lobbers commit to an amber-marked landing spot, lob over low cover and leave a three-second acid pool. Tremors telegraph low ground shockwaves that can be jumped or blocked by cover. Rammers mark a charge lane, commit to their direction and become stunned after hitting a solid obstacle. New species enter the forward-progress encounter pool, and all are available as moving training targets and museum dossiers.

Each seeded route has a 30% chance of one salvage vehicle; the other 70% have none. Its type and clear location are randomized once with the stage seed. Snow maps use snow crawlers and polar tanks; space maps use rovers and expedition crawlers. E boards/exits, arrows drive, Down brakes, Up hops over low obstacles, Space fires the mounted weapon and R reloads it. Hull, fuel and mounted ammunition are finite and independent of carried weapons. The buggy is faster and lighter; the tank has heavier armor and explosive cannon shells. Vehicles share physical collision with the world, can ram enemies at speed, take enemy attacks, eject on empty fuel or destruction, and park outside the sealed gate. Biscuit rides with the survivor. Vehicles reset with the same route on retry; they are not permanent inventory.

Museum → Vehicles → Try vehicle in training bay opens an isolated trial with no campaign/save changes. Both vehicles have live art, specifications, controls and review notes. The equipped weapon dock switches to the mounted gun while riding.

Menu activation and page changes use clear short effects, including the first click while the audio device resumes. Music remains menu-only. Held chainsaw playback loops only the first 60% of chainsaw.wav, avoiding its silent tail; vehicle engines reuse one loop and stop on pause or leaving the tab.

## Six-part gameplay revision

Vehicle generation is an independent seeded 30% roll per stage, with at most one vehicle. Type, position, terrain skin and vehicle presence agree in mission details, immersive preview, retries and refresh. Training vehicles remain available on demand. Vehicles accelerate, coast, brake and reverse gradually; ice reduces traction, marsh/snow/sand change speed, high-speed wall impacts damage the hull, firing adds recoil and wheels/tracks kick up dust or snow. Museum and trials preview road, snow and space variants; the trial also offers marsh/desert.

A shared attack director allows at most two active special attack commitments, including shots still in flight, and spaces new warnings by 1.15 seconds. Offscreen special starts are denied. Spitters show an aim line and commit to the warned point. The same budget covers lobbers, tremors, rammers, leapers and sirens. Killing or stunning a winding-up enemy frees its commitment; existing shots remain dangerous.

Every route includes four explosive drums, a circuit breaker controlling a real electrical strip, suspended cargo and a loose barricade. Shoot/strike drums to start a marked 0.55-second fuse; blasts can hurt players, kill infected and chain through other drums. E toggles the circuit; shooting its panel cuts power permanently. E at the cargo release or shooting its latch releases a crate after a 0.7-second warning. Falling cargo crushes enemies and becomes solid 42-unit cover. E or damage topples the barricade, damaging nearby enemies once and leaving a low obstacle. All reset with the seeded attempt. Mechanisms have their own museum category.

The 37 missions now use four objective types, displayed in selection and on the HUD: escape (10), power (9), escort (9), holdout (9). Power missions require holding E for three seconds at each of two generators. Escort missions require meeting a survivor and reaching extraction together; the survivor follows shared physical terrain, takes enemy/hazard damage, rides vehicles and shelters safely. Losing the escort ends the attempt and retry restores them. Holdout missions require activating the beacon and defending its radius for 18 seconds on foot; time pauses outside the zone, in shelter or while driving. Required goals lock the exit gate until completed. Non-escape goals grant a one-time 60-coin attempt reward. Refresh restarts objectives with the stage-entry loadout and retained funds.

Balance: fists stay emergency single-target damage; bat stays modest two-target control. Machete is 24 damage / 0.42s, hammer 64 / 1.1s and chainsaw 12 / 0.12s. Pistol is 75 coins, health is 40 and melee upgrades begin at 80. Universal ammunition crates start at 25 coins and add 28% of base price for each additional powered weapon. Harder sectors increase kill rewards by 12% per difficulty step. Shop cards display role, effective damage, cadence and range/reach.

Infected have deterministic coat, skin, trousers, headwear, damage/rip, build and gait variations. Variants retain subtype features and do not consume encounter/drop randomness. Museum Look 1–3 controls preview multiple appearances.
