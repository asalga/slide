export default function createFunc(tileID) {
  let e = new Entity({ name: 'coinbox' });

  e.bounds = new BoundingCircle(e.pos, 16);
  e.addComponent(new Collidable(e, { type: 1, mask: 2 }));

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