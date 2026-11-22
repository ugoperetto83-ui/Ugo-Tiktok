# CLAUDE.md — Finance Viral (Remotion · TikTok 1080×1920 · 60 fps)

Générateur de vidéos verticales d'éducation financière / motivation, direction artistique
**« Dark Finance Minimalist »**. Une vidéo = **un fichier de données** (`scripts/video-data.ts`)
+ **une commande** :

```bash
npm run make -- out/<slug>.mp4
```

Cette commande enchaîne : voix off edge-tts → bruitages procéduraux → rendu Remotion MP4.
`npm run render` fait la même chose avec la sortie fixe `out/finance_viral.mp4`.

---

## 1. Démarrage d'une session (environnement neuf)

```bash
npm install                 # Remotion 4, React 18, tsx, TypeScript
npm run setup:voice         # crée .venv/ + pip install -r requirements.txt (edge-tts, mutagen)
```

Prérequis : Node ≥ 18, Python ≥ 3.9, accès réseau HTTPS à `speech.platform.bing.com` (edge-tts).

**Environnement cloud Claude Code :**
- Démarrer les sessions sur l'environnement personnel **« ugo-tiktok »** : il autorise
  `speech.platform.bing.com` et son script d'installation lance automatiquement
  `npm ci` + `.venv` + `pip install -r requirements.txt`. Vérifier en début de session que
  `node_modules/` et `.venv/` existent ; sinon lancer les deux commandes ci-dessus.
- Sur un autre environnement, edge-tts échoue en 403 tant que `speech.platform.bing.com` n'est pas
  dans les hôtes autorisés (`get_environment` puis `update_environment` / `switch_environment`).
- `generate_voice.py` passe automatiquement `HTTPS_PROXY` à edge-tts (aiohttp ignore le proxy sinon).
- `remotion.config.ts` utilise le Chromium headless préinstallé
  (`/opt/pw-browsers/chromium_headless_shell-1243/...`) s'il existe ; ailleurs, Remotion télécharge
  le sien. Ne pas lancer `playwright install`.
- Rendu : `--concurrency=4` sur 4 cœurs ; lancer en arrière-plan (plusieurs minutes pour ~23 s).

---

## 2. Structure

```
ugo-tiktok/ (racine du dépôt)
├── CLAUDE.md / README.md
├── package.json            scripts npm (voir §6)
├── requirements.txt        edge-tts, mutagen
├── remotion.config.ts      h264, CRF 16, yuv420p, jpeg 95, navigateur préinstallé
├── tsconfig.json           resolveJsonModule (import du manifeste voix)
├── scripts/
│   ├── videos/             archives des vidéos précédentes (copier sur video-data.ts pour re-rendre)
│   ├── video-data.ts       ★ LES DONNÉES : config, hypothèses, mots-clés, SCENES (seul fichier à éditer)
│   ├── voice-input.ts      exporte {voice, scenes:[{id,text}]} en JSON sur stdout → lu par Python
│   ├── generate_voice.py   edge-tts → public/voice/<id>.mp3 + scripts/voice-manifest.json
│   ├── voice-manifest.json GÉNÉRÉ : durée exacte + mots horodatés par scène (ne pas éditer)
│   └── generate-audio.ts   synthèse tick / whoosh / impact + mixage → public/sfx/soundtrack.wav
├── src/
│   ├── index.ts / Root.tsx Composition « FinanceViral » (durée = somme des scènes résolues)
│   ├── FinanceVideo.tsx    fond + Sequences de scènes + voix par scène + sous-titres + bande SFX
│   ├── Scenes.tsx          une vue par type : counter | split | chart | statement
│   ├── theme.ts            couleurs, police, zones sûres TikTok (SAFE), TABULAR
│   ├── lib/
│   │   ├── resolve.ts      ★ durées des scènes calées sur la voix, ajustement des animations
│   │   ├── timeline.ts     ★ source de vérité partagée React/Node : frames, easings, alignement
│   │   │                     voix↔sous-titres, découpage mot à mot, événements sonores
│   │   ├── format.ts       « 482 500 € » (espaces insécables), « 400 k€ »
│   │   └── fonts.ts        charge Inter depuis public/fonts (delayRender)
│   └── components/
│       ├── AnimatedCounter.tsx  compteur €, Easing.in(Easing.exp), tabular-nums, largeur réservée
│       ├── CompoundChart.tsx    2 courbes SVG en strokeDashoffset, aire dégradée néon, étiquettes
│       ├── SplitComparison.tsx  2 colonnes, barres verticales, badge d'écart doré
│       ├── Subtitles.tsx        mot par mot, uppercase 900, contour noir, mots-clés #10B981
│       ├── Background.tsx       #0A0A0C + grille opacité 0.06 qui dérive + vignette
│       ├── Halo.tsx             halo émeraude/doré derrière les chiffres clés
│       └── SceneContainer.tsx   entrée spring + flou / sortie rapide
├── public/
│   ├── fonts/              Inter Medium/Bold/ExtraBold/Black (.otf)
│   ├── voice/              GÉNÉRÉ : <scene-id>.mp3
│   └── sfx/                GÉNÉRÉ : tick.wav, whoosh.wav, impact.wav, soundtrack.wav
└── out/                    MP4 rendus
```

Règle d'architecture : **aucun texte ni chiffre de scénario dans `src/`**. Tout passe par
`scripts/video-data.ts`. Le code visuel ne fait que lire les scènes résolues.

---

## 3. Pipeline (ce que fait `npm run make`)

```
video-data.ts ──► voice-input.ts ──► generate_voice.py ──► public/voice/*.mp3
                                                     └──► scripts/voice-manifest.json
                                                              │
            resolve.ts (durées + animations) ◄────────────────┘
                 │
                 ├──► generate-audio.ts ──► public/sfx/soundtrack.wav  (ticks/whoosh/impacts)
                 └──► Remotion (Root/FinanceVideo) ──► out/<slug>.mp4
```

### 3.1 Voix off — `npm run voice`
- Commande : `.venv/bin/python scripts/generate_voice.py [--force]`
- Voix : `VIDEO_CONFIG.voice.name` = **fr-FR-RemyMultilingualNeural**, `rate` = **+12%** ;
  repli automatique `fallbackName` = **fr-FR-HenriNeural**.
- Texte lu : `scene.voiceText ?? scene.subtitle`.
- edge-tts est appelé avec `boundary="WordBoundary"` → horodatage de chaque mot (offset/durée en
  unités de 100 ns, convertis en secondes).
- Durée **exacte** du fichier mesurée avec `mutagen` (`MP3(...).info.length`).
- **Cache** : clé = sha1(voix|débit|texte). Seules les scènes modifiées sont régénérées.
  `--force` régénère tout (obligatoire après un changement de voix ou de débit pour tout rafraîchir).

### 3.2 Synchronisation des durées — `src/lib/resolve.ts`
Pour chaque scène, si le manifeste contient une entrée dont `text` == texte lu actuel :
- `durée scène = leadIn (1re scène seulement) + durée MP3 + padding (+ endHold sur la dernière)`
  avec `leadIn 0.1 s`, `padding 0.08 s`, `endHold 0.7 s` (dans `VIDEO_CONFIG.voice`).
- La voix est posée dans la scène via `<Sequence from={offset}><Audio/></Sequence>`.
- Animations (`counter`, `split`, `chart`) :
  - `animation.endAtWord` → l'animation se termine au milieu du mot prononcé
    (ex. le compteur du hook atterrit sur « 240 000 € » → impact sonore au même instant) ;
  - sinon, si `delay + duration` > `durée − 0.45 s`, l'animation est compressée proportionnellement.
- `statement.impactAt` est borné à `durée − 0.6 s`.

Si l'entrée manque ou que le texte a changé depuis la génération → **repli** sur
`durationInSeconds` (durée de secours) et sous-titres répartis proportionnellement.
➜ Toujours relancer `npm run voice` après avoir modifié un texte (`make` le fait).

### 3.3 Sous-titres — `buildSubtitles` dans `timeline.ts`
- Mots = `subtitle` découpé **uniquement sur les espaces ordinaires** : une espace insécable
  ` ` garde un groupe soudé (`'240 000 €'`, `'8 %'`).
- `alignToVoice` aligne chaque mot sur les segments edge-tts en comparant les lettres/chiffres
  (edge-tts groupe parfois « 10 ans » ou « 240 000 € » ; on interpole au prorata des caractères).
  En cas de divergence (texte ≠ voix, `voiceText` défini) → répartition proportionnelle sur la durée
  de la voix.
- Groupes de 1 à 3 mots (≤ 18 caractères, coupure après ponctuation). Mot actif agrandi ;
  mots de `KEYWORDS` en vert émeraude (comparaison insensible à la casse, `'` ≡ `’`).

### 3.4 Bruitages — `npm run audio`
- `tsx scripts/generate-audio.ts`, Node pur, PRNG à graine fixe → rendu déterministe, libre de droits.
- Événements dérivés des animations résolues (`buildSfxEvents`) :
  tick à chaque palier du compteur (s'accélère avec l'easing expo, ≤ 30/s), tick doux par année
  sur le graphique, whoosh dont le pic tombe sur chaque coupe (anticipé de 0.22 s),
  impact grave en fin de compteur / badge du split / `impactAt` du statement.
- Mixé en WAV 48 kHz stéréo, limiteur doux, normalisé à −1 dBFS ; joué à `VIDEO_CONFIG.sfxVolume`
  (0.55) sous la voix.
- **Doit tourner après `npm run voice`** (dépend des durées résolues).

### 3.5 Rendu — Remotion
```bash
npm run make -- out/<slug>.mp4        # tout le pipeline
# ou, assets déjà à jour :
npx remotion render src/index.ts FinanceViral out/<slug>.mp4 --concurrency=4
npm run studio                        # aperçu interactif
npx remotion still src/index.ts FinanceViral /chemin/f.png --frame=300 --scale=0.5   # contrôle visuel
```

---

## 4. Modèle de données (`scripts/video-data.ts`)

- `ASSUMPTIONS` + helpers `futureValue(monthly, annualRate, years)` (versements annuels en fin
  d'année) et `growthSeries(...)` → **les montants sont calculés, jamais saisis à la main**.
- `VIDEO_CONFIG` : `id`, 1080×1920, `fps 60`, `soundtrack`, `sfxVolume`, `voice{...}`.
- `KEYWORDS` : expressions surlignées en émeraude.
- `SCENES: Scene[]`, champs communs : `id` (sert aussi de nom de MP3), `durationInSeconds`
  (secours), `subtitle` (= texte lu), `voiceText?`, `accent: 'emerald' | 'gold'`, `whooshIn?`.

| `visual`    | Champs spécifiques | Rendu |
|-------------|--------------------|-------|
| `counter`   | `from`, `to`, `eyebrow`, `caption?`, `animation`, `impactAtEnd?` | gros compteur € + mini-courbe expo + halo |
| `split`     | `left`/`right` (`title`, `detail`, `from`, `to`, `invested`, `style: winner\|loser`), `gapLabel`, `gapValue`, `animation` | 2 colonnes + barres + badge d'écart |
| `chart`     | `title`, `xValues`, `xTicks`, `xLabelSuffix`, `series[{label, style: muted\|neon, values}]`, `animation` | courbes dessinées en direct |
| `statement` | `lines[{text, highlight?}]`, `caption?`, `disclaimer?`, `impactAt?` | texte qui claque + impact |

`animation = {delay, duration, endAtWord?}` en secondes, relatif au début de la scène.

---

## 5. Créer une nouvelle vidéo (procédure pour Claude)

1. Demander/valider le thème, les hypothèses chiffrées, la durée visée (~20–25 s), la voix.
2. **Garder l'exemple existant** : si l'utilisateur veut conserver plusieurs vidéos, copier
   `scripts/video-data.ts` en `scripts/videos/<ancien-slug>.ts` (archive) avant de le réécrire.
3. Réécrire `ASSUMPTIONS`, `KEYWORDS`, `SCENES` dans `scripts/video-data.ts` :
   - calculer les chiffres avec les helpers ; vérifier la cohérence texte ↔ chiffre
     (ex. « près de 240 000 € » pour 238 106 €) ;
   - structure virale type : hook chiffré (counter, accent `gold`) → comparaison (split) →
     preuve (chart) → chiffre final (counter) → CTA (statement + disclaimer « pas un conseil
     en investissement ») ;
   - répliques courtes : ~2,8 mots/s à +12 % (≈ 10–14 mots par scène de 4–5 s) ;
   - `' '` dans les nombres/unités ; ajouter `endAtWord` sur le chiffre clé du hook.
4. Lancer `npm run make -- out/<slug>.mp4` (en arrière-plan ; vérifier la sortie console :
   durées par scène, nombre de ticks/impacts).
5. Vérifier : quelques `remotion still` à `--scale=0.5` (milieu/fin de chaque scène) assemblés en
   planche ; `ffprobe` (1080×1920, 60 fps, h264 + aac) ; `silencedetect` pour confirmer la voix.
6. Envoyer le MP4 à l'utilisateur.

### Style « pop » (sticker + personnage) — `VIDEO_CONFIG.style: 'pop'`
- Vues dans `src/pop/` : `PopScenes.tsx` (fond crème à pois, cartes sticker à contour noir 6 px
  et ombre décalée, rayons de soleil sur les chiffres clés), `Character.tsx` (personnage SVG :
  bonnet, sweat violet, respiration, clignements), `theme.ts` (palette `POP`, police **Fredoka**).
- `style: 'dark'` garde l'identité « Dark Finance Minimalist » d'origine.
- Personnage fil rouge par scène : `character: {pose, then?, holdsCup?}`, poses
  `idle | order | shock | think | happy | point` ; `then` est pris (ressort + petit saut) à la fin
  de l'animation principale.
- Scène `visual: 'order'` (accroche au comptoir) : `bubble`, `priceLabel`, `cupAt`, puis compteur
  `from → to` (champs d'un `counter`). En style sombre, elle s'affiche comme un `counter`.
- `SplitSide.investedLabel` (défaut « Versé »), `CounterScene.trend: 'down'` (mini-courbe descendante).
- Sous-titres pop : Fredoka 700, contour 13 % de la taille, mots-clés jaunes.
- `KEYWORDS` : écrire les nombres avec `\u00A0` (ex. `'160\u00A0000\u00A0€'`).

### Contraintes de mise en page (vérifiées)
- Zones sûres (`theme.ts › SAFE`) : visuels entre y=230 et y=1220 ; sous-titres centrés y=1395 ;
  rien sous y≈1500 (UI TikTok) ni dans les 150 px de droite.
- Compteur 168 px : ≤ 9 caractères (« 413 560 € »). Au-delà, réduire `fontSize` dans `Scenes.tsx`.
- Statement 132 px uppercase : ≤ ~12 caractères par ligne (« AUJOURD'HUI. »).
- Split : titres courts (« Dès 20 ans »), valeurs ≤ 9 caractères.
- Graphique : éviter des `xTicks` trop rapprochés (ex. 50 et 55 se chevauchent).

---

## 6. Scripts npm

| Commande | Effet |
|---|---|
| `npm run setup:voice` | crée `.venv` + installe edge-tts/mutagen |
| `npm run voice` | voix off (cache) → `public/voice/*.mp3` + `voice-manifest.json` |
| `npm run audio` | bruitages + `public/sfx/soundtrack.wav` |
| `npm run build:assets` | `voice` puis `audio` |
| `npm run make -- out/x.mp4` | **tout le pipeline → MP4 nommé** |
| `npm run render` | idem vers `out/finance_viral.mp4` |
| `npm run studio` | assets + Remotion Studio |
| `npm run typecheck` | `tsc --noEmit` |

Windows : remplacer `.venv/bin/python` par `.venv\Scripts\python` dans `package.json`.

---

## 7. Pièges connus

- Remotion : l'easing exponentiel s'appelle **`Easing.exp`** (pas `Easing.expo`) ;
  `Easing.in(Easing.exp)` est normalisé dans `counterEasing` (+10 % linéaire pour bouger dès le début).
- `splitWords` ne coupe pas sur ` ` ; ne pas utiliser `\s` (qui inclut les insécables).
- Modifier un `subtitle` sans relancer la voix → la scène retombe sur sa durée de secours.
- Les anciens MP3 de scènes supprimées restent dans `public/voice/` (inoffensif ; nettoyer si besoin).
- `paint-order` n'est pas utilisé pour le contour des sous-titres : double couche (stroke derrière).
- La prononciation de sigles (« S&P 500 ») n'a pas été vérifiée à l'oreille ; corriger via `voiceText`
  (ex. `'le S and P 500'`) — l'alignement passe alors en mode proportionnel pour cette scène.
