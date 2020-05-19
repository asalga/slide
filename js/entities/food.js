export default function createFunc() {
  let e = new Entity({ name: 'food' });

  function hit(obj) {
    if (obj.other.name === 'pacslider') {
      Assets.get('coin').play();
      scene.remove(this);
    }
  }
  e.bounds = new BoundingCircle(e.pos, 16);
  e.addComponent(new Collidable(e, { type: 1, mask: 2 }));

  e.on('collision', hit, e, { onlySelf: true });

  let tileset = Assets.get('tileset');
  let tile = tileset.get(2);

  let s = new SpriteRender(e, {
    layer: 'sprite'
  });

  s.draw = function(p) {
    let ctx = p.canvas.getContext('2d');
    ctx.drawImage(tile, this.entity.pos.x, this.entity.pos.y);
  }
  e.addComponent(s);

  return e;
}