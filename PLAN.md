# Plan — Threat Analysis Widget (Experience Builder)

Port du widget Web AppBuilder "Threat Analysis" vers ArcGIS Experience Builder.

## Phase 1 — Core (en cours)

- [x] Structure du projet (manifest, config, icon)
- [x] `src/config.ts` — types + données des menaces
- [x] `src/runtime/translations/default.ts`
- [x] `src/runtime/lib/style.ts`
- [x] `src/runtime/widget.tsx` — widget principal
- [x] `src/setting/setting.tsx` — panel de configuration ExB

### Fonctionnalités Phase 1
- Outils de dessin interactifs : Point, Polyline, Polygon (SketchViewModel)
- Sélecteur de type de menace (8 catégories prédéfinies)
- Sélecteur d'unités (Feet / Meters)
- Bouton "Create Zones" → double buffer geodésique
- Affichage Zone 1 : Mandatory Evacuation (rouge)
- Affichage Zone 2 : Preferred Evacuation (orange)
- Labels avec distances
- Bouton Clear

## Phase 2 — Config panel (à faire)

- [ ] Personnalisation des couleurs / transparence des zones
- [ ] Choix de l'unité par défaut
- [ ] Activation / désactivation de types de menaces

## Hors scope

- Publication vers hosted feature layer
- Saisie par coordonnées fixes
- Sélection depuis une couche existante

## Déploiement

Copier le dossier `threat-analysis/` dans :
`<ExB root>/client/your-extensions/widgets/`
