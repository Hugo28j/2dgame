/** Enemy balance tuning isolated from generic movement and boss logic. */
export const WORLD1_MOSSLING_SPEED_MULTIPLIER = 1.25;
export const BRAMBLE_GUNNER_HP_MULTIPLIER = 0.70;

/** Short rushes by small charger mobs (Horned Beetle, Icefang Wolf, etc.).
 * The warning reaches exactly as far as their actual un-slowed dash.
 */
export const CHARGER_DASH = Object.freeze({
  speed: 535,             // was 430
  durationMs: 410,        // was 360
  telegraphMs: 470,       // was 540
  rechargeMs: 2150,       // was 2300
  get distance(): number { return this.speed * this.durationMs / 1000; },
});
