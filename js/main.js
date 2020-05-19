'use strict';

import manifest from '../assets/manifest.js';
import createPinky from './pinky.js';
import createBlinky from './blinky.js';
import createSprite from './createSprite.js';
import createUser from './entities/pacslider.js';

const TileWidth = 32;
const TileHeight = 32;

let e, scene;

function ready() {

  let e = createUser();
  e.pos.x = TileWidth;
  e.pos.y = 3 * TileHeight;
  scene.add(e);

  let level = Assets.get('level1');
  let iter = level.getEntityIterator();

  let tileId;
  let idx = 0;

  while ((tileId = iter.next()) !== null) {

    let e = createSprite(tileId);

    let x = idx % level.data.layers[0].width;
    let y = floor(idx / level.data.layers[0].width);
    e.pos.set(x * TileWidth, y * TileHeight);
    scene.add(e);
    idx++;
  }

}

window.preload = function() {
  Assets.load(manifest, () => {
    console.log('manifest loaded');
    ready();
  });
}

window.setup = function() {
  createCanvas(32 * 20, 32 * 15);
  Pool.init();
  Renderer.init(width, height);
  scene = new Scene(width, height);
  scene.restartGame();
  window.scene = scene;
}

window.draw = function() {
  background(0);
  scene.update(0.016);

  CollisionSystem.gatherCollidables();
  CollisionSystem.checkCollisions();

  Renderer.render(scene);
}
