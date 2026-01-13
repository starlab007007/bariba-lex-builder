// Votre code existant reste intact, vous ajoutez juste :

// Au démarrage
const assetManager = new AssetManager();
await assetManager.preloadEssentials();
const effectsRenderer = new EffectsRenderer(canvas, assetManager);

// Dans render loop
if (beat && beat.strength >= 0.6) {
  effectsRenderer.triggerLensFlare(beat);
}
if (beat && beat.strength >= 0.8) {
  effectsRenderer.triggerLightLeak(beat);
}
effectsRenderer.render();
