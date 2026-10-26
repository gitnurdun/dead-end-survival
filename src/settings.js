export function normalizeSettings(value = {}, reducedMotion = false) {
  const number = (key, fallback, min, max) => Number.isFinite(value?.[key]) ? Math.max(min, Math.min(max, value[key])) : fallback;
  return {
    recordedAudio: value?.recordedAudio !== false,
    damageNumbers: value?.damageNumbers !== false, hitMarkers: value?.hitMarkers !== false, flashlight: value?.flashlight !== false,
    master: number('master', 1, 0, 1), music: number('music', .65, 0, 1),
    effects: number('effects', .9, 0, 2), effectsBoost: number('effectsBoost', 1.8, 1, 3), ambience: number('ambience', .5, 0, 1),
    fxIntensity: number('fxIntensity', 1.4, .5, 2), shakeIntensity: number('shakeIntensity', 1, 0, 1.5), weatherDensity: number('weatherDensity', 1, .25, 1.5),
    reducedShake: typeof value?.reducedShake === 'boolean' ? value.reducedShake : reducedMotion,
  };
}
