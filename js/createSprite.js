import createUser from './entities/pacslider.js';
import createNull from './entities/null.js';
import createFood from './entities/food.js';
import createWall from './entities/wall.js';
import createBrick from './entities/brick.js';
import createFruit from './entities/fruit.js';
import createCoinBox from './entities/coinbox.js';
import createSwitch from './entities/switch.js';

let m = new Map(
  [
    [0, createNull],
    [1, createWall],
    [2, createFood],
    
    [5, createBrick],
    [6, createFruit],

    [7, createCoinBox],
    [8, createUser],
    [9, createSwitch]
  ]);

export default function createSprite(tileID) {
  let createFunc = m.get(tileID);

  if (createFunc) {
    return createFunc(tileID);
  } else {
    return createNull();
  }
}

// use string?
// ['null', createNull],
// ['food', createFood],
// ['wall', createWall],
// ['pacslider', createPacSlider]
// ['pacslider', createPacSlider]