export default function createFunc() {
  let e = new Entity({ name: 'null' });

  let s = new SpriteRender(e, {
    layer: 'background'
  });

  s.draw = function(p) {
    // p.fill(0, 255, 0,);
    // p.rect(this.entity.pos.x, this.entity.pos.y, 32, 32);
  }
  e.addComponent(s);

  return e;
}