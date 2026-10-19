export const GAME_TITLE = 'Dungeon Ascent';
export const BOOT_SCENE_KEY = 'BootScene';
export const GAME_SCENE_KEY = 'GameScene';
export const GAME_OVER_SCENE_KEY = 'GameOverScene';
export const MENU_SCENE_KEY = 'MainMenuScene';
export const PLAYER_TEXTURE_KEY = 'player-placeholder';
export const ARROW_TEXTURE_KEY = 'arrow-placeholder';
export const TARGET_TEXTURE_KEY = 'target-placeholder';
export const SLIME_TEXTURE_KEY = 'slime-placeholder';
export const ENEMY_BULLET_TEXTURE_KEY = 'enemy-bullet';

// Portrait on phones, wider field on PCs. No change to the mobile logical size.
export const MOBILE_GAME_WIDTH = 390;
export const DESKTOP_GAME_WIDTH = 760;
export const GAME_HEIGHT = 844;

export function viewportWidthForScreen(screenWidth: number, finePointer: boolean): number {
  return screenWidth >= 900 && finePointer ? DESKTOP_GAME_WIDTH : MOBILE_GAME_WIDTH;
}

export const GAME_WIDTH = viewportWidthForScreen(
  typeof window === 'undefined' ? 0 : window.innerWidth,
  typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches,
);
