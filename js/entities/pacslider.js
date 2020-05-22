import SlideBehaviour from './components/SlideBehaviour.js';

export default function createFunc() {
  let e = new Entity({ name: 'pacslider' });

  function hit(obj) {

    if (obj.other.tags.includes('wall')) {
      if (e.vel.x > 0) {
        if (obj.other.pos.y === obj.other.pos.y) {
          e.vel.x = 0;
          e.pos.x = obj.other.pos.x - 32;
        }
      } else if (e.vel.x < 0) {
        if (obj.other.pos.y === obj.other.pos.y) {
          e.vel.x = 0;
          e.pos.x = obj.other.pos.x + 32;
        }
      }

      if (e.vel.y > 0) {
        if (obj.other.pos.x === obj.other.pos.x) {
          e.vel.y = 0;
          e.pos.y = obj.other.pos.y - 32;
        }
      } else if (e.vel.y < 0) {
        if (obj.other.pos.x === obj.other.pos.x) {
          e.vel.y = 0;
          e.pos.y = obj.other.pos.y + 32;
        }
      }
    }
  }
  e.bounds = new BoundingCircle(e.pos, 15);
  e.addComponent(new Collidable(e, { type: 2, mask: 1 }));
  e.on('collision', hit, e);

  let anims = Assets.get('pac_anim');
  let atlas = Assets.get('pac_atlas');

  e.updateProxy = function(dt) {

    if (e.vel.x < 0) {
      spriteRenderAni.animation = 'blinky_left';
    } else if (e.vel.x > 0) {
      spriteRenderAni.animation = 'blinky_right';
    } else if (e.vel.y < 0) {
      spriteRenderAni.animation = 'blinky_up';
    } else if (e.vel.y > 0) {
      spriteRenderAni.animation = 'blinky_down';
    }

    if (abs(e.vel.x) > 0.01 || abs(e.vel.y) > 0.01) {
      spriteRenderAni.play();
    } else {
      spriteRenderAni.pause();
    }
  };

  let slide = new SlideBehaviour(e, {});
  e.addComponent(slide);

  let spriteRenderAni = new SpriteRenderAnimation(e, {
    layerName: 'sprite',
    atlas: atlas,
    animations: anims
  });
  spriteRenderAni.animation = 'blinky_right';
  spriteRenderAni.frameDelay = 100;

  e.addComponent(spriteRenderAni);

  return e;
}