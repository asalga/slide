export default class SlideBehaviour extends Component {
  /*
    cfg
      - vel
  */
  constructor(e, cfg) {
    super(e, 'slide');

    let defaults = {
      speed: 400
    };
    Utils.applyProps(this, defaults, cfg);

    let input = new KeyboardState();
    input.addMapping('ArrowRight', k => this.slide(1, 0));
    input.addMapping('ArrowLeft', k => this.slide(-1, 0));
    input.addMapping('ArrowUp', k => this.slide(0, -1));
    input.addMapping('ArrowDown', k => this.slide(0, 1));

    input.listenTo(window);
  }

  update(dt, entity) {
    this.stayInViewport();
  }

  stayInViewport() {
    let e = this.entity;

    if (e.pos.x < 0 && e.vel.x < 0) {
      e.vel.x = 0;
      e.pos.x = 0;
    }
    if (e.pos.x > width - 32 * 2 && e.vel.x > 0) {
      e.vel.x = 0;
      e.pos.x = width - 32 * 2;
    }

    if (e.pos.y < 32) {
      e.pos.y = 32;
      e.vel.y = 0;
    }
    if (e.pos.y > height - 32 * 2) {
      e.pos.y = height - 32 * 2;
      e.vel.y = 0;
    }
  }

  slide(x, y) {
    // prevent going left/right if we're already going up/down and vise versa
    if (abs(x) > 0 && abs(this.entity.vel.y) || abs(y) > 0 && abs(this.entity.vel.x)) {
      return;
    }

    // prevent flashing 1 frame of animation
    if (this.entity.pos.y === 0 && y < 0) return;
    if (this.entity.pos.y === height - 32 && y > 0) return;
    if (this.entity.pos.x === 0 && x < 0) return;
    if (this.entity.pos.x === width - 32 && x > 0) return;

    this.entity.vel.x = x * this.speed;
    this.entity.vel.y = y * this.speed;
  }

  free() {
    debugger;
  }

  indicateRemove() {}
}