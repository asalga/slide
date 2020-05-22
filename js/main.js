'use strict';

import manifest from '../assets/manifest.js';
import createPinky from './pinky.js';
import createBlinky from './blinky.js';
import createSprite from './createSprite.js';
import createUser from './entities/pacslider.js';
// import NeedsCollectionChecker from './entites/NeedsCollectionChecker.js';
import NeedsCollecting from './entities/components/NeedsCollecting.js';

const TileWidth = 32;
const TileHeight = 32;

let e, scene;

function ready() {

  // let e = new Entity({ name: 'NeedsCollectionChecker' });
  // // e.addComponent(new NeedsCollecting(e));
  // e.on('collection', data => {

  //   let entities = window.scene.entities;
  //   window.setTimeout(() => {
  //     let cnt = 0;
  //     let allDone = true;
  //     for (let e of entities) {
  //       if (e['needscollecting']) {
  //         allDone = false;
  //         cnt++;
  //       }
  //     }
  //     console.log(cnt);
  //     if (allDone) {
  //       alert('congrats');
  //     }
  //   }, 1000);


  // }, e);




  let level = Assets.get('level1');
  let iter = level.getEntityIterator();

  let tileId;
  let tileIdx = 0;

  while ((tileId = iter.next()) !== null) {

    let x = tileIdx % level.data.layers[0].width;
    let y = floor(tileIdx / level.data.layers[0].width);

    let e = createSprite(tileId, x, y); //, properties);
    e.pos.set(x * TileWidth, y * TileHeight);
    scene.add(e);
    tileIdx++;
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
  CollisionSystem.checkCollisions();

  let entities = scene.entities;
  let allDone = true;
  for (let e of entities) {
    if (e['needscollecting']) {
      allDone = false;
    }
  }

  if(allDone){
    scene.restartGame();
    ready();
  }


  Renderer.render(scene);

  document.getElementById('collisionChecks').innerHTML = CollisionSystem.collisionChecks;
  // document.getElementById('collisionTime').innerHTML = CollisionSystem.collisionTime;
}