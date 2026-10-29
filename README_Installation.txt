ARMY3 / Grenade throwing + NPC rifle B  sound update
==================================================
Baseline: Vmylife/ARMY3 main 2026-10-29 (GitHub source checked).
This is a changed-files-only overlay. Do not remove any other repository files.

Overwrite into repository root, keeping folders:
  index.html                            : cache-bust the rifle audio module
  grenade-score.js                      : updates the workshop SFX import version
  src/systems/grenadeWorkshopSfx.js     : ratchet wheel clicks and SFX handoff
  src/systems/grenadeArenaSfx.js        : 3D meter, locking, flight, landing and collapses
  src/training/rangeTraining.js         : B rifle instead of 0.1-second low-frequency triangle
  assets/audio/grenade/*.mp3            : seven new effects
  assets/audio/rifle/npc_rifle_B.mp3    : selected B sound

Changes:
* Wheel rotation: dry ratchet clacks tied to clockwise angle; no electronic ringing.
* Left/right meter: gentle repeated mechanical tick while moving.
* Up/down meter: same mechanic; lock-in emits a click (also when tapping the screen).
* Throw: airy continuous whoosh, faded at actual landing.
* Landing: solid impact sound triggered by the landed state.
* Buildings: rubble/cracking audio whenever the game detects new destroyed buildings,
  batching closely spaced collapses to prevent clipping.
* NPC shooting range: user-selected B rifle at existing shot timing, distance attenuation.
* Existing explosion remains, no scoring, 3D physics or camera changes.
* Grenade sound mute state continues to use existing speaker toggle and saved preference.

Notes:
- First sound needs an actual touch on iPhone. Wait for game audio to preload if slow.
- If an older browser cached sound modules, refresh/reopen the game after deploying.
- This package does NOT re-include BGM or map: those were already uploaded to GitHub.
- New mini-game BGM is NOT included; choose an approach before producing it.
