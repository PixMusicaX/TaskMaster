# Credits

TaskMaster is a personal, non-commercial showcase. The Persona days (see `src/lib/persona.ts`)
borrow the look of ATLUS's *Persona 3 Reload*, *Persona 4 Golden* and *Persona 5*. Every
character, logo, name and piece of art from those games belongs to **ATLUS / SEGA**. The files
listed below were collected for this showcase only. Check each licence before reusing them or
publishing this repository.

## Character art (`public/persona/`)

| File | What | Source | Changes |
|---|---|---|---|
| `p3-makoto.webp` | Makoto Yuki, *Persona 3 Reload* official character render | Official site, [p3re.jp/en](https://p3re.jp/en/) (`img_character1_….webp`) © ATLUS / SEGA | Trimmed, rotated 180° for the upside-down underwater pause menu, resized, WebP |
| `p4-yu.webp` | Yu Narukami, *Persona 4* protagonist render | [Megami Tensei Wiki – File:P4 Protagonist.png](https://megamitensei.fandom.com/wiki/File:P4_Protagonist.png) (uploaded by VeskScans) © ATLUS | Trimmed, resized, WebP |
| `p5-joker.webp` | Joker, *Persona 5* Phantom Thief render | [Megami Tensei Wiki – File:Phantom render.png](https://megamitensei.fandom.com/wiki/File:Phantom_render.png) (uploaded by AzureJay) © ATLUS | Trimmed, WebP |

The pause-menu layouts are recreated in HTML and CSS (`src/components/persona/persona-pause-menu.tsx`).
The P3 one follows *Persona 3 Reload*'s menu, where Makoto sinks upside down through water.

## Fonts (`public/fonts/persona/`)

| File | Font | Author / source | Licence |
|---|---|---|---|
| `p5-ransom.otf` | Earwig Factory | Ray Larabie, [Typodermic Fonts](https://typodermicfonts.com/), via [dafont](https://www.dafont.com/earwig-factory.font) | Typodermic free desktop EULA. Web embedding may need a separate licence, so check before publishing |
| `p3-hud.ttf` | BM Space | BitmapMania, via [dafont](https://www.dafont.com/bm-space.font) | Freeware: personal and homepage use; no bundling into commercial products without permission. *Persona 3 Reload* uses it in its HUD |

These lookalikes come from Google Fonts under the SIL Open Font License, loaded only on Persona days: Anton,
Oswald, Jost, M PLUS Rounded 1c, Archivo Black and Permanent Marker.

The games' own commercial faces, Fontworks **Skip Std B** (P4/P3R) and **FOT-NewRodin Pro** /
**FOT-Rodin Pro** (P3R/P5), aren't bundled. `src/app/persona.css` uses them if they're installed on
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
