import createUser from './entities/pacslider.js';
import createNull from './entities/null.js';
import createFood from './entities/food.js';
import createWall from './entities/wall.js';

let m = new Map(
  [
    [0, createNull],
    [1, createWall],
    [2, createFood],
    
    [5, createWall],

  ]);

export default function createSprite(tileID) {
  let createFunc = m.get(tileID);

  if (createFunc) {
    return createFunc(tileID);
  } else {
    return createNull();
  }
}

// ['null', createNull],
// ['food', createFood],
// ['wall', createWall],
// ['pacslider', createPacSlider]
// ['pacslider', createPacSlider]