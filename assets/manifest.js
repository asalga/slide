'use strict';

let dir = '../data';

export default {
  images: [{
      name: 'img',
      path: `assets/pac/images/eyes_up.png`
    },
    {
      name: 'food_strawberry',
      path: `assets/pac/images/food_strawberry.png`
    }
  ],

  audio: [{
      name: 'coin',
      path: 'assets/pac/audio/coin.mp3'
    },
    {
      name: 'switch',
      path: 'assets/pac/audio/switch.wav'
    },
    {
      name: 'explosion',
      path: 'assets/pac/audio/explosion.wav'
    }
  ],

  animations: [{
    name: 'pac_anim',
    atlas: 'pac_atlas',
    path: `assets/pac/animations/animations.json`
  }],

  atlases: [{
    name: 'pac_atlas',
    imgPath: `assets/pac/atlases/pac.png`,
    metaPath: `assets/pac/atlases/pac.json`
  }],

  tilesets: [{
    name: 'tileset',
    path: 'assets/pac/levels/tileset.json',
    image: 'assets/pac/levels/tileset.png'
  }],

  levels: [{
    name: 'level1',
    path: 'assets/pac/levels/level3.json',
    tilesheetRef: 'tileset'
  }]

  // {
  //     name: 'level1': {
  //       map: 'assets/pac/map1.json',
  //       img: 'assets/pac/tilesheet.png',
  //       meta: 'assets/pan/tilesheet.json'
  //     }
  //   },

  // levels: [{
  //   name: 'level0',
  //   data: 'assets/pac/levels/level0.json'
  // }]
};