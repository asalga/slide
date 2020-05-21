export default function createFunc(tileID) {
  let e = new Entity({ name: 'switch' });

  let lastTimeHit = 0;
  let state = false;

  function hit(obj) {
    if (obj.other.name === 'pacslider' && millis() / 1000 - 0.5 > lastTimeHit) {
      lastTimeHit = millis() / 1000;
      Assets.get('switch').play();

      state = !state;
      if (state) {
        tile = Assets.get('tileset').get(10);
      } else {
        tile = Assets.get('tileset').get(9);
      }
    }
  }

  e.bounds = new BoundingCircle(e.pos, 16);
  e.addComponent(new Collidable(e, { type: 1, mask: 2 }));
  e.on('collision', hit, e, { onlySelf: true });

  // e.update = function(dt) {}

  let s = new SpriteRender(e, {
    layer: 'sprite'
  });

  let tileset = Assets.get('tileset');
  let tile = tileset.get(tileID);

  s.draw = function(p) {
    let ctx = p.canvas.getContext('2d');
    ctx.drawImage(tile, this.entity.pos.x, this.entity.pos.y);
  }
  e.addComponent(s);

  return e;
}