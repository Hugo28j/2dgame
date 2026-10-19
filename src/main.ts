import Phaser from 'phaser';

import { gameConfig } from './config/gameConfig';
import './style.css';

const game = new Phaser.Game(gameConfig);

const pauseWhenHidden = (): void => {
  if (document.hidden) {
    game.loop.sleep();
  } else {
    game.loop.wake();
  }
};

document.addEventListener('visibilitychange', pauseWhenHidden);

window.addEventListener('pagehide', () => {
  game.loop.sleep();
});

window.addEventListener('pageshow', () => {
  if (!document.hidden) {
    game.loop.wake();
  }
});
