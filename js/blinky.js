'use strict';

export default function createBlinky() {
  let e = new Entity({ name: 'blinky' });

  [e.pos.x, e.pos.y] = [random(200,300), 200];

  let anims = Assets.get('pac_anim');
  let atlas = Assets.get('pac_atlas');

  let swithedAniTime = 0;

  e.updateProxy = function(dt) {
    swithedAniTime += dt;

    if (swithedAniTime < 0.25) {
      return;
    }
    if (followBehaviour.desired.x > 0) {
      spriteRenderAni.play('blinky_right');
      swithedAniTime = 0;
    } else {
      spriteRenderAni.play('blinky_left');
      swithedAniTime = 0;
    }
  };

  let spriteRenderAni = new SpriteRenderAnimation(e, {
    layerName: 'sprite',
    atlas: atlas,
    animations: anims
  });
  spriteRenderAni.frameDelay = 100;

  let followBehaviour = new FollowBehaviour(e, {
    target: 'cursor',
    maxSpeed: 200,
    maxSteering: 2
  });

  let stayInBoundsBehaviour = new StayInBoundsBehaviour(e, {
    steerMag: 10,
    maxSpeed: 400,
    bounds: { x: 0, y: 0, w:width, h:height}
    // bounds: { x: 32, y: 32, w: scene.gameWidth - 64, h: scene.gameHeight - 64 }
  });

  let separateBehaviour = new SeparateBehaviour(e, {
    minDistance: 60
  });

  // e.addComponent(separateBehaviour);
  e.addComponent(stayInBoundsBehaviour);
  // e.addComponent(spriteAniDynamic);
  e.addComponent(spriteRenderAni);
  e.addComponent(followBehaviour);
  
  // e.addComponent(spriteRenderAni);

  return e;
}