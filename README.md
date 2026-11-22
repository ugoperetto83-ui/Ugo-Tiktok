# Finance Viral — Remotion (TikTok 1080×1920 · 60 fps)

Vidéos verticales d'éducation financière, direction artistique **Dark Finance Minimalist**.

```bash
npm install
npm run setup:voice   # crée .venv/ et installe edge-tts + mutagen (requirements.txt)
npm run studio        # aperçu interactif (génère d'abord voix + bruitages)
npm run make -- out/ma_video.mp4   # tout le pipeline → MP4 nommé
npm run render        # → out/finance_viral.mp4
npm run voice         # voix off seule (cache : seules les scènes modifiées sont régénérées)
npm run audio         # bruitages + bande-son mixée seuls
```

> Windows : remplacer `.venv/bin/python` par `.venv\Scripts\python` dans package.json.

## Voix off (edge-tts)

`scripts/generate_voice.py` lit le `subtitle` (ou `voiceText`) de chaque scène avec
**fr-FR-RemyMultilingualNeural à +12 %** (repli automatique sur **fr-FR-HenriNeural**),
réglables dans `VIDEO_CONFIG.voice`. Il écrit `public/voice/<scène>.mp3` et
`scripts/voice-manifest.json` (durée exacte de chaque fichier + horodatage de chaque mot).

Au rendu, `src/lib/resolve.ts` :
- fixe la **durée de chaque scène = durée exacte de son audio** + `padding`
  (+ `leadIn` sur la 1re scène, + `endHold` sur la dernière) ;
- cale les **sous-titres sur les horodatages réels** de la voix (les segments groupés
  par edge-tts comme « 240 000 € » sont réalignés au caractère près) ;
- compresse les animations si la scène raccourcit, ou les termine sur un mot précis
  via `animation.endAtWord` (le compteur du hook atterrit sur « 240 000 € ») ;
- revient aux `durationInSeconds` de secours si le texte a changé depuis la génération.

Les bruitages (`npm run audio`) sont recalculés sur ces mêmes durées.

## Architecture

```
scripts/
  video-data.ts       ← LES DONNÉES : scènes, durées, sous-titres, valeurs, mots-clés, voix
  generate_voice.py   ← voix off edge-tts → public/voice/*.mp3 + voice-manifest.json
  voice-input.ts      ← exporte les textes des scènes vers le script Python
  generate-audio.ts   ← synthèse procédurale tick / whoosh / impact + mixage sur la timeline
src/
  lib/resolve.ts      ← durées des scènes calées sur la voix off
  lib/timeline.ts     ← source de vérité partagée (frames, easings, sous-titres, événements sonores)
  lib/format.ts       ← formatage « 482 500 € »
  lib/fonts.ts        ← chargement d'Inter (public/fonts)
  components/
    AnimatedCounter   ← compteur € (Easing.in(Easing.exp)), chiffres tabulaires, largeur réservée
    CompoundChart     ← courbes SVG dessinées en strokeDashoffset + aire dégradée néon
    SplitComparison   ← écran divisé, barres verticales synchronisées
    Subtitles         ← mot par mot, ultra-bold, contour noir, mots-clés en #10B981
    Background, Halo, SceneContainer
  Scenes.tsx          ← une vue par type de visuel (counter | split | chart | statement)
  FinanceVideo.tsx    ← assemblage + audio
```

Le code visuel ne contient **aucun chiffre ni texte du scénario** : pour une nouvelle vidéo,
modifiez uniquement `scripts/video-data.ts` (les montants sont calculés par `futureValue`).

## Synchronisation audio

`generate-audio.ts` importe la même `timeline.ts` que le rendu : les ticks tombent exactement
quand le compteur change de palier (ils s'accélèrent avec l'easing exponentiel), le whoosh
culmine sur chaque coupe, et l'impact grave frappe sur la valeur finale.

## Hypothèses de l'exemple

200 €/mois (2 400 €/an, versés en fin d'année), 8 %/an, jusqu'à 55 ans :
dès 20 ans → 413 560 € ; dès 30 ans → 175 454 € ; écart → 238 106 € (≈ 240 000 €).
