# Credits

TaskMaster is a personal, non-commercial showcase. The Persona days (see `src/lib/persona.ts`)
borrow the look of ATLUS's *Persona 3 Reload*, *Persona 4 Revival* and *Persona 5*. Every
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
| `p4-yu.webm` | Yu Narukami adjusting his glasses, transparent looping clip (*Persona 4 Revival*) | Official site, [p4re.jp](https://p4re.jp/) (`resources/video/top_fv_chara_sp.webm`) © ATLUS / SEGA | None |
| `p4-yu.webp` | A still frame of the same clip, for Safari and iOS (no transparent WebM there) and reduced motion | Captured from `p4-yu.webm` | Cropped to the figure, WebP with alpha |
| `p4-sky.mp4`, `p4-sky-poster.webp` | Blue sky and clouds loop behind the menu's top-right wedge, and its first frame | Official site, [p4re.jp](https://p4re.jp/) (`resources/video/bluesky.mp4`) © ATLUS / SEGA | Poster captured from the video |
| `p4-flower-white.webp` | The white flower with the red and green fringe | Official site, [p4re.jp](https://p4re.jp/) (`resources/img/top/deco_flower_white.webp`) © ATLUS / SEGA | None |
| `p5-menu-bg.webp` | *Persona 5* pause-menu screen: the hand, Joker with the red claw, the sign collage, COMMAND | 1280×720 screenshot found via the Pinterest pin [Examining Persona 5's Menus](https://www.pinterest.com/pin/examining-persona-5s-menus-video-notes-on-p5s-ui--15481192459230552/) (image: `i.pinimg.com/originals/3f/56/69/3f56692680039952c7376be3ab4726ab.jpg`) © ATLUS | The game's menu words and caption cleaned out, so the buttons sit in their place; WebP. `p5-menu-bg-blur.webp` is a blurred copy that fills tall phone screens |
| `p5-btn-guard.webp`, `p5-btn-order.webp`, `p5-btn-item.webp`, `p5-btn-persona.webp`, `p5-btn-sword.webp`, `p5-btn-gun.webp` | The *Persona 5* battle-menu commands, used as the pause menu's six buttons | A fan-made sticker sheet, Pinterest pin [persona 5 battle menu](https://in.pinterest.com/pin/648166571416785092/) (image: `i.pinimg.com/736x/d7/88/55/d788557efa3605861c37a3ea65d44ffb.jpg`), after the game's battle UI © ATLUS | Each command cut out of the sheet, enlarged four times and snapped back to flat black, red and white; white surround made transparent |
| `p5-menu-icon.webp` | The MENU plate that opens the pause menu on Persona 5 days | A fan-made app icon, Pinterest pin [persona 5 settings 2](https://in.pinterest.com/pin/1829656092363624/) (image: `i.pinimg.com/originals/81/56/bf/8156bf27ab708fccc99de9338d166b7a.jpg`) | Black surround made transparent, cropped; WebP |
| `p5-transition.mp4` | The page wipe on Persona 5 days: a two-second cut (21.3 to 23.3 s) of Joker's *Super Smash Bros. Ultimate* reveal animation, "Take Your Heart" | Pinterest pin [Super Smash Bros. Ultimate](https://in.pinterest.com/pin/135319163799172031/) (video: `v1.pinimg.com/videos/mc/720p/d6/76/a4/d676a4c4fd537fa5f397dffa657dcafc.mp4`) © Nintendo / ATLUS / SEGA | None: the whole 61-second clip is stored, and only that cut is played (sped up, muted) |
| `p5-menu-move.mp3` | *Persona 5* menu select sound | [ffaneto/persona5-website-theme](https://github.com/ffaneto/persona5-website-theme) (`public/audio/select.mp3`) © ATLUS | None |
| `tarot-back.webp` | Velvet Room tarot card back, shown as the rank-up arcana card flips | [ffaneto/persona5-website-theme](https://github.com/ffaneto/persona5-website-theme) (`src/assets/card.png`) © ATLUS | Resized, WebP |

The menus are recreated in HTML and CSS (`src/components/persona/persona-pause-menu.tsx`):

- **P3:** follows deltea's recreation: the fanned rotations, the cyan option colours, the white-and-pink slash cursor that turns the selected word red, the "Command" caption and the side numeral.
- **P4:** follows *Persona 4 Revival*'s menu screen, built from the official site's own pieces (above): the sky wedge, the yellow field and purple band, Yu on the left, flowers, and heavy serif options down the diagonal with the game's red and green colour fringe. The yellow and black flowers are redrawn as vectors.
- **P5:** the game's own menu screen (`p5-menu-bg.webp`), with the battle-menu commands (`p5-btn-*.webp`) as its buttons where its menu words were; the selected one carries the page's name in Persona5main (from [ffaneto/persona5-website-theme](https://github.com/ffaneto/persona5-website-theme)). The selector, a red and a cyan quad whose corners jump every 120 ms with the cyan screen-blended, follows Drew Powers' [Persona 5 Menu UI](https://codepen.io/dangodev/pen/qXdxOO) pen.

None of these repos state a licence.

## Fonts (`public/fonts/persona/`)

| File | Font | Author / source | Licence |
|---|---|---|---|
| `p5-ransom.otf` | Earwig Factory | Ray Larabie, [Typodermic Fonts](https://typodermicfonts.com/), via [dafont](https://www.dafont.com/earwig-factory.font) | Typodermic free desktop EULA. Web embedding may need a separate licence, so check before publishing |
| `p5-menu.ttf` | Persona5main | Fan-made recreation of the P5 menu lettering ("Copyright (c) 2022, MYPC"; A–Z, a–z, 0–9, !), via [ffaneto/persona5-website-theme](https://github.com/ffaneto/persona5-website-theme) | None stated |
| `p3-hud.ttf` | BM Space | BitmapMania, via [dafont](https://www.dafont.com/bm-space.font) | Freeware: personal and homepage use; no bundling into commercial products without permission. *Persona 3 Reload* uses it in its HUD |

These lookalikes come from Google Fonts under the SIL Open Font License, loaded only on Persona days: Anton,
Oswald, Jost, M PLUS Rounded 1c, M PLUS 1p, Playfair Display, Archivo Black and Permanent Marker.

The games' own commercial faces, Fontworks **Skip Std B** (P4/P3R) and **FOT-NewRodin Pro** /
**FOT-Rodin Pro** (P3R/P5, including the Rodin Pro UB of the P3R menu), aren't bundled, even though
some GitHub recreations include them. `src/app/persona.css` uses them if they're installed on
the device ([Fontworks](https://en.fontworks.co.jp/)). The font list for each game comes from
[Game Font Library](https://www.gamefontlibrary.com/games/persona-3-reload).

## Music (`public/persona/`)

The special map on each Persona day plays `p3.mp3`, `p4.mp3` or `p5.mp3` from this folder. The
tracks aren't included: add your own copies (for example from the official soundtracks) and list
them here.

| File | Track | Source |
|---|---|---|
| `p3.mp3` | Color your night | |
| `p4.mp3` | Backside of the TV | |
| `p5.mp3` | Last Surprise | |

## Sound effects

All UI sounds are synthesized in the browser with Web Audio (`src/lib/sfx.ts`). There are no audio
files.

## References

- [deltea.space: Persona 3 pause menu](https://www.deltea.space/blog/p3r-pause-menu) and
  [Ultipuk/persona_3_reload_pause_menu](https://github.com/Ultipuk/persona_3_reload_pause_menu):
  write-ups on how the *Persona 3 Reload* pause menu is built.
