# Credits

TaskMaster is a personal, non-commercial showcase. The Persona days (see `src/lib/persona.ts`)
borrow the look of ATLUS's *Persona 3 Reload*, *Persona 4 Golden* and *Persona 5*. Every
character, logo, name and piece of art from those games belongs to **ATLUS / SEGA**. The files
listed below were collected for this showcase only. Check each licence before reusing them or
publishing this repository.

## Pause-menu art (`public/persona/`)

| File | What | Source | Changes |
|---|---|---|---|
| `p3-menu.mp4` | *Persona 3 Reload* pause-menu background loop (Makoto upside down under water), desktop | From the official P3R website, via [deltea/p3r-pause-menu](https://github.com/deltea/p3r-pause-menu) (`static/background.mp4`) © ATLUS / SEGA | None |
| `p3-menu-mobile.mp4` | The same loop, smaller (306 KB) for phones | [Cikibber/Cikibber.github.io](https://github.com/Cikibber/Cikibber.github.io) (`assets/mobile/bg-loop.mp4`) © ATLUS / SEGA | None |
| `p3-menu-poster.webp` | First frame, shown while the video loads | Same repo (`assets/mobile/bg-loop.jpg`) | Converted to WebP |
| `p3-menu-move.wav` | The menu's cursor sound | [deltea/p3r-pause-menu](https://github.com/deltea/p3r-pause-menu) (`static/sfx/navigation.wav`) © ATLUS / SEGA | None |
| `p4-yu.webp` | Yu Narukami, *Persona 4* protagonist render | [Megami Tensei Wiki – File:P4 Protagonist.png](https://megamitensei.fandom.com/wiki/File:P4_Protagonist.png) (uploaded by VeskScans) © ATLUS | Trimmed, resized, WebP |
| `p5-joker.webp` | Joker, *Persona 5* Phantom Thief render | [Megami Tensei Wiki – File:Phantom render.png](https://megamitensei.fandom.com/wiki/File:Phantom_render.png) (uploaded by AzureJay) © ATLUS | Trimmed, WebP |

The menus are recreated in HTML and CSS (`src/components/persona/persona-pause-menu.tsx`):

- **P3:** follows deltea's recreation: the fanned rotations, the cyan option colours, the white-and-pink slash cursor that turns the selected word red, the "Command" caption and the side numeral.
- **P4 and P5:** follow the games' menu screens (the yellow and purple P4 menu with serif options; P5's white hand, ransom-note options, Joker and "COMMAND").

None of these repos state a licence.

## Fonts (`public/fonts/persona/`)

| File | Font | Author / source | Licence |
|---|---|---|---|
| `p5-ransom.otf` | Earwig Factory | Ray Larabie, [Typodermic Fonts](https://typodermicfonts.com/), via [dafont](https://www.dafont.com/earwig-factory.font) | Typodermic free desktop EULA. Web embedding may need a separate licence, so check before publishing |
| `p3-hud.ttf` | BM Space | BitmapMania, via [dafont](https://www.dafont.com/bm-space.font) | Freeware: personal and homepage use; no bundling into commercial products without permission. *Persona 3 Reload* uses it in its HUD |

These lookalikes come from Google Fonts under the SIL Open Font License, loaded only on Persona days: Anton,
Oswald, Jost, M PLUS Rounded 1c, M PLUS 1p, DM Serif Display, Archivo Black and Permanent Marker.

The games' own commercial faces, Fontworks **Skip Std B** (P4/P3R) and **FOT-NewRodin Pro** /
**FOT-Rodin Pro** (P3R/P5, including the Rodin Pro UB of the P3R menu), aren't bundled, even though
some GitHub recreations include them. `src/app/persona.css` uses them if they're installed on
the device ([Fontworks](https://en.fontworks.co.jp/)). The font list for each game comes from
[Game Font Library](https://www.gamefontlibrary.com/games/persona-3-reload).

## Music (`public/music/persona/`)

The special map on each Persona day plays `p3.mp3`, `p4.mp3` or `p5.mp3` from this folder. The
tracks aren't included: add your own copies (for example from the official soundtracks) and list
them here.

| File | Track | Source |
|---|---|---|
| `p3.mp3` | *(your pick, e.g. "Mass Destruction" or "Iwatodai Dorm")* | |
| `p4.mp3` | *(your pick, e.g. "Your Affection" or "Reach Out to the Truth")* | |
| `p5.mp3` | *(your pick, e.g. "Beneath the Mask" or "Life Will Change")* | |

## Sound effects

All UI sounds are synthesized in the browser with Web Audio (`src/lib/sfx.ts`). There are no audio
files.

## References

- [deltea.space: Persona 3 pause menu](https://www.deltea.space/blog/p3r-pause-menu) and
  [Ultipuk/persona_3_reload_pause_menu](https://github.com/Ultipuk/persona_3_reload_pause_menu):
  write-ups on how the *Persona 3 Reload* pause menu is built.
