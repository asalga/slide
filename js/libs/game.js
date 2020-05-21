'use strict';

'use strict';

/*
  Atlas.js
  
  cfg{
    name,
    p5Img,
    meta - string
  }
*/
function Atlas(cfg) {
  Object.assign(this, cfg);
  this.frames = {};
  this.split();
}

Atlas.prototype = {

  /*
    Do NOT use the filename extension (.png, .jpg);
  */
  get(str) {
    return this.frames[str];
  },

  /*
   */
  split() {
    let sheetData = JSON.parse(this.meta)['frames'];
    let arr;

    if (Array.isArray(sheetData)) {
      arr = sheetData;

      arr.forEach( f => {
        let filename = f.filename;
        let frame = f.frame;

        // remove '.png' part of filename, we don't need it.
        let imgName = filename.split('.')[0];
        this.frames[imgName] = this.p5Img.get(frame.x, frame.y, frame.w, frame.h);
      });

    } else {
      arr = Object.entries(sheetData);
      arr.forEach((f, i) => {
        let filename = f[0];
        let frame = f[1].frame;

        // remove '.png' part of filename, we don't need it.
        let imgName = filename.split('.')[0];
        this.frames[imgName] = this.p5Img.get(frame.x, frame.y, frame.w, frame.h);
      });
    }
  }
};

/*
	The purpose of a Level is to instantiate 
*/

class EntityIterator {
  constructor(level) {
    this.idx = 0;
    this.level = level;
  }

  next() {
    if (this.idx === this.level.data.layers[0].data.length) {
      return null;
    }

    let obj = this.level.data.layers[0].data[this.idx];

    this.idx++;
    return obj;
  }
}

class Level {

  constructor(name, data) {
    this.name = name;
    this.data = data;
  }

  getEntityIterator() {
    return new EntityIterator(this);
  }
}

class Tileset {

  constructor(meta, img) {
    Object.assign(this, meta);

    this._tiles = [];
    this._tiles.push({}); // 0 is null since Tiled starts at index 1

    for (let i = 0; i < this.tiles.length; i++) {

      let cvs = document.createElement('canvas');
      cvs.width = this.tilewidth;
      cvs.height = this.tileheight;
      let ctx = cvs.getContext('2d');
      let x = (i % this.columns) * 32;
      let y = Math.floor(i / this.columns) * 32;

      ctx.drawImage(img, x, y, this.tilewidth, this.tileheight, 0, 0, this.tilewidth, this.tileheight);
      this._tiles.push(cvs);
    }
  }

  /*
    id - Number or String?
  */
  get(id) {
    return this._tiles[id];
  }
};

'use strict';

let cbCalled = false;
let cb = function() {};

let assetTypes = {
  'image': {},
  'atlas': {},
  'tilesets': {},
  'animations': {},
  'audio': {},
  'json': {},
  'shaders': {},
  'levels': {}
};

let numAssetsLoaded = 0;
let totalAssetsToLoad = 0;

function logProgress() {
  console.log(`--> Asset preload progress: ${numAssetsLoaded}/${totalAssetsToLoad}`);
}

function increaseProgress(msg) {
  numAssetsLoaded++;
  console.log(msg);
  logProgress();
  Assets.isDone();
}

function loadImagePromise(url) {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.addEventListener('load', () => {
      resolve(img);
    });
    img.src = url;
  });
}

/*

*/
class Assets {

  static load(manifest, loadingDone) {

    cb = loadingDone;

    // Count how many we need to load so we can compare as we load the assets
    let assetsToLoad = Object.values(manifest);
    assetsToLoad.forEach(assetType => {
      totalAssetsToLoad += assetType.length;
    });

    //
    // ** IMAGES **
    //
    if (manifest.images) {
      manifest.images.forEach(v => {
        loadImage(v.path, p5img => {
          // that.images[v] = p5img;

          assetTypes['image'][v.name] = p5img;

          let msg = `Asset: loaded image: ${v.path}`;
          increaseProgress(msg);
        });
      });
    }

    //
    // ** ANIMATION
    //
    if (manifest.animations) {
      manifest.animations.forEach(j => {
        let n = j.name;

        fetch(j.path)
          .then(function(response) {
            return response.json().then(data => {
              return {
                n: j.name,
                animations: data
              }
            });
          })
          .then(function(data) {

            assetTypes['animations'][data.n] = data.animations;

            let msg = `Asset: loaded animation: ${j.name}`;
            increaseProgress(msg);
          });
      });
    }

    //
    // ** ATLASES
    //
    if (manifest.atlases) {
      manifest.atlases.forEach(a => {

        loadImage(a.imgPath, function(atlasImg) {
          // Once the image is loaded, get the meta file
          let xhr = new XMLHttpRequest();
          xhr.onload = function() {
            let atlas = new Atlas({
              name: a.name,
              p5Img: atlasImg,
              meta: xhr.responseText
            });

            assetTypes['atlas'][a.name] = atlas;

            increaseProgress(`Asset: loaded image: ${a.name}`);
          };
          xhr.open('GET', a.metaPath);
          xhr.send();
        });
      });
    }

    //
    // ** GENERIC GAME SPECIFIC JSON
    //
    if (manifest.json) {
      manifest.json.forEach(j => {
        let n = j.name;

        fetch(j.path)
          .then(function(response) {
            return response.json().then(data => {
              return {
                n: j.name,
                json: data
              }
            });
          })
          .then(function(data) {
            numAssetsLoaded++;
            assetTypes['json'][data.n] = data.json;

            let msg = `Asset: loaded json: ${j.name}`;
            increaseProgress(msg);
          });
      });
    }

    //
    // ** LEVELS
    //
    if (manifest.levels) {
      manifest.levels.forEach(l => {
        let name = l.name;

        console.log('name', name);

        fetch(l.path)
          .then(res => {
            return res.json().then(data => new Level(l.name, data))
          })
          .then(level => {
            assetTypes['levels'][level.name] = level;
            increaseProgress(`Asset: loaded level: ${level.name}`);
          });

      });
    }

    //
    // ** TILESETS
    //
    if (manifest.tilesets) {
      manifest.tilesets.forEach(ts => {
        let name = ts.name;

        Promise.all([
            fetch(ts.path),
            loadImagePromise(ts.image)
          ])
          .then(function(promises) {
            promises[0].json().then(function(meta) {
              assetTypes['tilesets'][name] = new Tileset(meta, promises[1]);
              increaseProgress(`Asset: loaded tileset: ${ts.path}`);
            });
          });
      });
    }

    //
    // ** SHADERS
    //
    if (manifest.shaders) {
      manifest.shaders.forEach(j => {
        let n = j.name;

        let v = fetch(j.vert)
          .then(function(res) {
            return res.text().then(function(shaderSource) {
              return { name: n, src: shaderSource };
            })
          });

        let f = fetch(j.frag)
          .then(function(res) {
            return res.text().then(function(shaderSource) {
              return { name: n, src: shaderSource };
            })
          });

        Promise.all([v, f]).then(function(shaders) {
          let n = shaders[0].name;
          assetTypes['shaders'][n] = {
            vert: shaders[0].src,
            frag: shaders[1].src
          };

          let msg = `Asset: loaded shader: n`;
          increaseProgress(msg);
        });
      });
    }

    //
    // ** AUDIO
    //
    manifest.audio.forEach(v => {
      let that = this;

      let h = new Howl({
        src: v.path,
        volume: 1,
        loop: false,
        autoplay: false,
        onload: _v => {
          increaseProgress(`Asset: loaded audio: ${v.name}`);
          assetTypes['audio'][v.name] = h;
        }
      });

      // that.audio[v.path] = h;

    });
  }

  /*
    
   */
  static get(...args) {

    if (args.length === 1) {
      let assetName = args[0];

      let assetKeys = Object.keys(assetTypes);

      for (let i = 0; i < assetKeys.length; i++) {
        let type = assetKeys[i];

        if (assetTypes[type][assetName]) {
          return assetTypes[type][assetName];
        }
      }
      console.error('Did not find asset:', assetName);
    }

    if (args.length === 2) {
      let type = args[0];
      let key = args[1];
      return assetTypes[type][key];
    }
  };

  /*
   */
  static isDone() {

    if (numAssetsLoaded === totalAssetsToLoad && cbCalled === false) {
      cbCalled = true;
      cb();
    }

    return numAssetsLoaded === totalAssetsToLoad;
  };
}

'use strict';
var test = 342;
class Vec2$1 {

  constructor() {
    let x, y;

    if (arguments.length === 0) {
      x = y = 0;
    } else if (arguments.length === 1) {
      x = arguments[0].x;
      y = arguments[0].y;
    } else {
      x = arguments[0];
      y = arguments[1];
    }
    this.set(x, y);
  }

  reset() {
    this.zero();
  }

  toArray() {
    return [this.x, this.y];
  }

  zero() {
    this.x = this.y = 0;
  }

  setV(a) {
    this.x = a.x;
    this.y = a.y;
    return this;
  }

  setXY(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  set() {

    if (arguments.length === 1) {
      this.x = arguments[0].x;
      this.y = arguments[0].y;
      return this;
    }

    if (arguments.length === 2) {
      this.x = arguments[0];
      this.y = arguments[1];
      return this;
    }
  }

  add(v) {
    switch (arguments.length) {
      case 1:
        this.x += arguments[0].x;
        this.y += arguments[0].y;
        break;
      case 2:
        this.x += arguments[0];
        this.y += arguments[1];
    }
    return this;
  }

  limit(s) {
    let len = this.length();
    if (len > s) {
      this.normalize().scale(s);
    }
    return this;
  }

  scale(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  clone() {
    return new Vec2$1(this.x, this.y);
  }

  mult(s) {
    this.x *= s;
    this.y *= s;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  length() {
    return Math.sqrt(Vec2$1.dot(this, this));
  }

  mag() {
    return this.length();
  }

  lengthSq() {
    return Vec2$1.dot(this, this);
  }

  normalize() {
    let len = this.length();
    if (len !== 0) {
      this.x /= len;
      this.y /= len;
    }
    return this;
  }

  div(s){
    this.x /= s;
    this.y /= s;
    return this;
  }

  static create() {
    return new Vec2$1();
  }

  static zero(v) {
    this.x = this.y = 0;
  }

  static multSelf(v, s) {
    v.x *= s;
    v.y *= s;
  }

  static addSelf(v1, v2) {
    v1.x += v2.x;
    v1.y += v2.y;
  }

  static subSelf(v1, v2) {
    v1.x -= v2.x;
    v1.y -= v2.y;
  }

  static sub(res, v1, v2) {
    res.x = v1.x - v2.x;
    res.y = v1.y - v2.y;
    // return new Vec2(v1.x - v2.x, v1.y - v2.y);
  }

  /*
    Assign v a random normalized direction
  */
  static randomDir(v) {
    v.x = Math.random() * 2 - 1;
    v.y = Math.random() * 2 - 1;
    v.normalize();
  }

  static rand() {
    let x = Math.random() * 2 - 1;
    let y = Math.random() * 2 - 1;
    return new Vec2$1(x, y);
  }

  static add(v1, v2) {
    return new Vec2$1(v1.x + v2.x, v1.y + v2.y);
  }

  static dot(v1, v2) {
    return v1.x * v2.x + v1.y * v2.y;
  }
}

'use strict';

let id = -1;

class Utils {
  static getEl(selector) {
    return document.getElementById(selector);
  }

  static noop() {}

  static getId() {
    return ++id;
  }

  /*
    returns true if the circle is completely contained inside the rectangle
  */
  static isCircleInsideRect(c, r) {
    return c.x - c.r > r.x &&
      c.x + c.r < r.x + r.w &&
      c.y - c.r > r.y &&
      c.y + c.r < r.y + r.h;
  }

  /*
   */
  static isPointIntersectingCircles(p, arr) {
    return arr.some(c => Utils.isPointInsideCircle(p, c));
  }

  static isPointInsideCircle(p, c) {
    _len = distance(p, c);
    return _len < c.radius;
  }

  /*
    c - circle
    r - rect
    max - max radius
  */
  static constrainCircleInRect(c, r, max) {
    let _r = max;
    let _right = Infinity;
    let _left = Infinity;
    let _up = Infinity;
    let _lower = Infinity;

    // right
    if (c.x + c.r > r.x + r.w) {
      _r = min(_r, r.x + r.w - c.x);
    }

    // left
    if (c.x - c.r < r.x) {
      _r = min(_r, c.x - r.x);
    }

    // lower
    if (c.y + c.r > r.y + r.h) {
      _r = min(_r, r.y + r.h - c.y);
    }

    // upper
    if (c.y - c.r < r.y){
     _r = min(_r, c.y - r.y);
    }

    c.r = _r;
    // if (_r < max) {
    //   c.r = _r;
    // }
  }

  /*
   */
  static isPointInsideRect(p, r) {
    return p.x >= r.x &&
      p.x <= r.x + r.w &&
      p.y >= r.y &&
      p.y <= r.y + r.h;
  }

  /*
   */
  static isCircleIntersectingRect(c, r) {
    let circleDistance = { x: 0, y: 0 };

    circleDistance.x = abs(c.x - (r.x + r.w / 2));
    circleDistance.y = abs(c.y - (r.y + r.h / 2));

    if (circleDistance.x > (r.w / 2 + c.r)) {
      return false;
    }
    if (circleDistance.y > (r.h / 2 + c.r)) {
      return false;
    }

    if (circleDistance.x <= (r.w / 2)) {
      return true;
    }
    if (circleDistance.y <= (r.h / 2)) {
      return true;
    }

    let cornerDistance_sq =
      (circleDistance.x - r.w / 2) * (circleDistance.x - r.w / 2) +
      (circleDistance.y - r.h / 2) * (circleDistance.y - r.h / 2);

    return (cornerDistance_sq <= (c.r * c.r));
  }

  static isCircleIntersectingCircle(c1, c2) {
    let x = c1.x - c2.x;
    let y = c1.y - c2.y;
    let len = sqrt(x * x + y * y);

    return len < (c1.r + c2.r);
  }

  static get undef() {
    return undefined;
  }

  static repeat(arr, count) {
    let arrCopy = arr.slice(0);

    for (let i = 0; i < count; ++i) {
      arr = arr.concat(arrCopy);
    }
    return arr;
  }

  /*
    Returns Array
  */
  static strIntersection(str1, str2) {
    let setB = new Set(str2);
    let res = [...new Set(str1)].filter(x => setB.has(x));
    return res;
  }

  static removeDuplicateChars(string) {
    return string
      .split('')
      .filter((item, pos, self) => {
        return self.indexOf(item) == pos;
      })
      .join('');
  }

  static applyProps(ctx, def, cfg) {

    Object.keys(def).forEach(k => {
      // if (ctx[k]) {
      // console.log(`${ctx[k]} already exists. Overwriting`);
      // }
      ctx[k] = def[k];
    });

    if (cfg) {
      Object.keys(cfg).forEach(k => {
        // if (ctx[k]) {
        // console.log(`${ctx[k]} already exists. Overwriting`);
        // }
        ctx[k] = cfg[k];
      });
    }
  }

  static distance(p1, p2, d) {
    let res = Vec2.sub(p1, p2);
    d = res.mag();
  }

  // playing around with perf testing
  // .length = [] vs allocating new array
  static clearArray(arr) {
    window.clearArrayCalls++;
    // arr = [];
    arr.length = 0;
  }

  // this is shit
  static removeFromArray(arr, el) {
    let idx = -1;
    for (let i = arr.length - 1; i > -1; --i) {
      if (el === arr[i]) {
        idx = i;
        break;
      }
    }

    if (idx === -1) {
      return false;
    }

    arr.splice(idx, 1);
    return true;
  }
}

'use strict';

let instance = null;

class EventSystem {
  constructor() {
    if (instance === null) {
      instance = this;

      this.listeners = {};
      this.onlyOnceEvents = new Map();
    }

    return instance;
  }

  arrToKey(arr) {
    return arr.sort().join(':');
  }

  listenerListEmpty(evtName) {
    return typeof this.listeners[evtName] === 'undefined';
    // console.warn(`${e.data.name} is not listening to "${evtName}"`);
    // console.warn(`There isn't anything listening to: "${evtName}"`);
    // return;
    // }
  }

  // The collision system doesn't know about how the
  // listeners will consume the data, so it's up to the event
  // system to order the values nicely for the listeners.
  // This makes the logic in the collision listeners much cleaner.
  orderEntities(data, evtObj) {
    if (data.self === evtObj.ctx) { return; }
    [data.other, data.self] = [data.self, data.other];
  }

  // Occurs on the WeaponSwitcher
  eventsAreOffForEntity(ctx) {
    if (!ctx.entity) { return false; }
    return !ctx.entity.eventsOn;
  }

  printDebug() {
    Debug.add('Event System');

    Object.keys(this.listeners).forEach(listener => {
      let list = this.listeners[listener];
      Debug.add(`  ${listener} : ${list.size} `);
    });

    Debug.add(`onlyOnce entries: ${this.onlyOnceEvents.size}`);
  }

  /*
    Register an event

    returns an id which we can use to turn the event off.
  */
  on(evtName, cb, ctx, cfg) {

    if (this.listenerListEmpty(evtName)) {
      this.listeners[evtName] = new Map();
    }

    let id = Utils.getId();
    this.listeners[evtName].set(id, { cb, ctx, cfg });

    return id;
  }

  fire(e) {
    let evtName = e.evtName;

    if (this.listenerListEmpty(evtName)) { return; }

    let evtObjs = this.listeners[evtName];

    evtObjs.forEach((evtObj, id) => {
      let data = e.data;

      // if(e.data.name === 'mouse'){
      // debugger;  
      // }


      // If there isn't a context, just invoke the callback
      if (!evtObj.ctx) {
        evtObj.cb(data);
        return;
      }

      if (this.eventsAreOffForEntity(evtObj.ctx)) { return; }

      this.orderEntities(data, evtObj);

      if (evtObj.cfg) {
        let cfg = evtObj.cfg;

        if (cfg.onlySelf) {
          // TODO: shouldn't we be checking for ctx === 'self'??
          let res = Object.values(data).filter(v => v === evtObj.ctx);

          // TODO: clean this up.
          if (res.length === 0 && data !== evtObj.ctx) {
            return;
          }
        }

        if (cfg.onlyOnce) {
          let key = this.arrToKey(cfg.onlyOnce(data));
          if (this.onlyOnceEvents.has(key)) { return; }
          this.onlyOnceEvents.set(key, id);
        }
      }

      evtObj.cb.call(evtObj.ctx, data);
    });
  }

  /*
    This method is a bit aggressive in that it doesn't 
    check if the id is associated with an onlyOnce event.
    But since events are unique, this shouldn't be a problem(?)
  */
  removeFromOnlyOnce(searchId) {
    this.onlyOnceEvents.forEach(function(id, key, m) {
      if (searchId === id) {
        m.delete(key);
      }
    });
  }

  /*
   */
  off(id) {
    let res = false;
    let eventNames = Object.values(this.listeners);

    eventNames.forEach(li => {
      if (li.has(id)) {
        res = li.delete(id);
      }
    });

    this.removeFromOnlyOnce(id);
    return res;
  }

  clear() {
    // be super careful when calling this!
    /*jshint -W087 */
    debugger;
    this.listeners = {};
  }
}

'use strict';

class Event {
  constructor(data) {
    this.data = data;
    this.es = new EventSystem();
  }
  fire() {
    this.es.fire(this.data);
  }
}

'use strict';

/*
  Req.
   - Must be extendible
   If we create a new Object type, we should be able to integrate Pool easily

   - Must be Testable
   We need to be able to toggle the pool to see if we are getting any of its benefits

  - Should be fast
  Acquiring a new object type should run at O(1) or O(log N)
*/

let pools = {};

class Pool {

  static init(cfg) {
    // cfg.forEach({
    Pool.allocate({ name: 'vec2', type: Vec2$1, count: 500 });
    // });
  }

  /*
    cfg
      name {String}
      type {Function}
      count {Number}
  */
  static allocate(cfg) {
    let n = cfg.name;

    pools[n] = new Array(cfg.count);
    let newPool = pools[n];

    Pool.callCreateFuncs(newPool, 0, cfg.count, cfg);
  }

  static callCreateFuncs(p, s, e, cfg) {
    for (let i = s; i < e; i++) {

      if (cfg.createFunc) {
        p[i] = cfg.createFunc();
      } else {
        p[i] = new cfg.type;
      }

      p[i]._pool = {
        available: true,
        idx: i,
        name: cfg.name
      };
    }
  }

  /*
   */
  static grow(n) {
    let pool = pools[n];
    let oldSize = pool.length;

    let newSize = oldSize * 2;
    pool.length = newSize;
    console.info(`Pool: No free slots for "${n}". Growing to: ${newSize}.`);

    Pool.callCreateFuncs(pool, oldSize, newSize * 2, { name: 'vec2', type: Vec2$1 });
  }

  static free(obj) {
    let meta = obj._pool;
    if(meta){
      pools[meta.name][meta.idx]._pool.available = true;
    }
  }

  static get(n) {
    // is this here for testing?
    // return new Vec2();
    let pool = pools[n];

    for (let i = 0; i < pool.length; ++i) {
      if (pool[i]._pool.available) {

        // if (n === 'bullet') {
        //   window.count--;
        // }

        let obj = pool[i];
        obj._pool.available = false;
        obj.reset();
        return obj;
      }
    }

    Pool.grow(n);

    return Pool.get(n);
  }
}

'use strict';

//////
let _temp = Vec2$1.create();

class Entity {
  constructor(cfg) {
    this.cfg = cfg;

    // TODO: fix
    this.speed = 1;
    this.timeScale = 1;
    this.components = [];
    this.children = [];
    this.parent = null;
    this.tags = [];

    this.reset();
  }

  /*
    When we reset an object, we'll also need to generate a new ID
  */
  reset() {

    let defaults = {
      opacity: 1,
      visible: true
    };
    Utils.applyProps(this, defaults, this.cfg);

    this.eventsOn = true;
    this.registeredEvents = [];
    this.rot = 0;

    this.pos = Pool.get('vec2');
    this.vel = Pool.get('vec2');
    this.acc = Pool.get('vec2');
    this.distance = Pool.get('vec2');
    this.worldCoords = Pool.get('vec2');

    this.id = Utils.getId();

    this.children.forEach(ch => {
      ch.reset();
      ch.resetProxy && ch.resetProxy();
    });

    this.components.forEach(c => {
      c.reset();
      c.resetProxy && c.resetProxy();
    });

    //
    this.resetProxy && this.resetProxy();
  }

  setup() {}

  draw() {
    // now taken care of in the Renderer
    // if (!this.visible) { return; }
    p3.save();

    this.renderProxy && this.renderProxy(p3);
    // this.children.forEach(c => c.draw());

    // TODO: fix
    if (this.name === 'bhvrandomselector') debugger;
    this.components.forEach(c => { c.draw && c.draw(); });
    p3.restore();
  }

  // TODO: yup, implement this too
  setPropertyRecursive(name, v) {
    /*jshint -W087 */
    debugger;
  }

  /*
   */
  update(dt) {

    // TODO: replace with assert
    if (Number.isNaN(this.vel.x)) {
      /*jshint -W087 */
      debugger;
    }

    this.updateProxy && this.updateProxy(dt);


    let c;
    for (let i = 0; i < this.components.length; i++) {
      c = this.components[i];
      c.update && c.update(dt, this);
      c.updateProxy && c.updateProxy(dt);
    }

    // this.components.forEach(c => {
    //   // ok if no update method?
    //   // add in entity on creation or update?
    //   c.update && c.update(dt, this);
    //   c.updateProxy && c.updateProxy(dt);
    // });

    // 
    if (this.vel) {
      this.pos.x += this.vel.x * dt * this.timeScale;
      this.pos.y += this.vel.y * dt * this.timeScale;

      // Currently, this is only for animation
      this.distance.x += Math.abs(this.vel.x) * dt;
      this.distance.y += Math.abs(this.vel.y) * dt;
    }

    for (let i = 0, len = this.children.length; i < len; i++) {
      this.children[i].update(dt);
    }
  }

  /*
    c - child entity
  */
  add(c) {
    c.parent = this;
    this.children.push(c);
    new Event({ evtName: 'childaddedtoparent', data: { parent: this, child: c } }).fire();
  }

  /*
    Move node from parent to scene/root
  */
  detachFromParent() {
    scene.add(this);
    this.parent.removeDirectChild(this);
  }

  /*
    Free any resources from Pools.
  */
  free() {
    Pool.free(this.pos);
    Pool.free(this.vel);
    Pool.free(this.acc);
    Pool.free(this.distance);
    Pool.free(this.worldCoords);
  }

  /*
    If a component needs to remove the associated entity,
    give it a method that abstracts out whether the entity
    is in a scenegraph or directly in the scene.
  */
  removeSelf() {
    if (this.parent) {
      this.parent.removeDirectChild(this);
    } else {
      scene.remove(this);
    }
  }

  /*

  */
  removeDirectChild(e) {
    let res = Utils.removeFromArray(this.children, e);
    e.parent = null;
    return res;
  }

  removeChild(e) {
    /*jshint -W087 */
    debugger;
  }

  // TODO: fix
  hasChild(name) {
    let found = false;

    for (let i = 0; i < this.children.length; ++i) {
      if (this.children[i].name === name) {
        return true;
      }

      if (this.children[i].children.length > 0) {
        return this.children.children.hasChild(name);
      }
    }
    return false;
  }

  updateWorldCoords() {
    this.worldCoords.zero();
    this.getWorldCoords(this.worldCoords);
  }

  getRoot() {
    if (this.parent === null) {
      return this;
    }
    return this.parent.getRoot();
  }

  addComponent(c) {
    if (this[c.name]) {
      console.warn(`Warning: ${this.name} already has ${c.name}`);
    }
    this.components.push(c);
    this[c.name] = c;
  }

  removeComponent(c) {
    Utils.removeFromArray(this.components, c);
    this.components[c.name] = undefined;
  }

  removeComponentByName(str) {
    // let c = this.components[str];debugger;

    let c = this.components.find(o => o.name === str);
    if (c) {
      Utils.removeFromArray(this.components, c);
      this[str] = undefined;
      return true;
    }
    return false;
  }

  findComponentByName(str) {
    let c = this.components.find(o => o.name === str);
    return c;
  }

  findComponentsByTagName(str) {
    let arr = [];

    for (let c of this.components) {

      let idx = c.tags.indexOf(str);
      if (idx > -1) {
        arr.push(this.components[idx]);
      }
    }

    return arr;
  }

  findComponentByTagName(str) {

    for (let c of this.components) {

      let idx = c.tags.indexOf(str);

      if (idx > -1) {
        return this.components[idx];
      }

      return null;
    }
  }

  init() {
    this.components.forEach(c => c.init());

    this.children.forEach(e => {
      e.init();

      e.components.forEach(c => {
        c.init();
      });
    });
  }

  getChildrenWithComponentTagName(str) {
    let arr = [];
    this.children.forEach(c => {
      if (c.findComponentByTagName(str)) {
        arr.push(c);
      }
    });
    return arr;
    // debugger;
  }

  setEvents(b) {
    this.eventsOn = b;
  }

  /*
    Zero out the vector prior to calling this method
    v {Vec2} - out
  */
  getWorldCoords(v) {
    if (this.parent) {
      Vec2$1.addSelf(this.parent.getWorldCoords(v), this.pos);
    } else {
      Vec2$1.addSelf(v, this.pos);
    }
    return v;
  }

  /*
    Returns the event ID which the calling code can use
    to turn the event off
  */
  on(evtName, cb, ctx, cfg) {
    let id = Events.on(evtName, cb, ctx, cfg);
    this.registeredEvents.push(id);
    return id;
  }

  off(id) {
    Utils.removeFromArray(this.registeredEvents, id);
    Events.off(id);
  }

  /*
    Called once the scene has removed the entity from the scene.
  */
  indicateRemove() {

    if (!this._pool) {
      this.free();
      this.children.forEach(c => c.indicateRemove());
      this.components.forEach(c => c.indicateRemove());

      // don't call off(), since we don't want to modify an
      // array while we iterate over it.
      this.registeredEvents.forEach(id => Events.off(id));
      Utils.clearArray(this.registeredEvents);
    }
    // If this object is memory managed
    else {
      this.free();
      Pool.free(this);
    }
  }
}

'use strict';

class Component {
  constructor(e, name) {
    this.entity = e;
    this.name = name;
    this.tags = [];
  }

  update(dt) {
    this.updateProxy && this.updateProxy(dt);
  }

  // on(evtName, func, ctx) {
  // this.eventFilter(evtName, func, ctx);
  // (new EventSystem()).on(evtName, function() {
  //   if (this.eventsOn === false) { return; }
  //   func.call(this, arguments[0], arguments[1], arguments[2]);
  // }.bind(this), ctx);
  // }

  on(evtName, func, ctx) {
    (new EventSystem()).on(evtName, func, ctx);
  }

  free(){
    console.log('super free called');
  }

  // call after creation 
  init(){
    // console.log('super init called');
  }

  setEvents(b) {
    this.eventsOn = b;
  }

  /*
    v {Vec2} - out
  */
  getWorldCoords(v){
    this.entity.getWorldCoords(v);
    // return this.entity.getWorldCoords();
  }

  /*
    When the associated entity is removed from the scene,
    we give the component a chance to do any cleanup such
    as removing event listeners
  */
  indicateRemove() {}
}

'use strict';

/*
  We provide a layer to which the component renders to
  cfg
    layer {String}
*/
class SpriteRender extends Component {
  constructor(e, cfg) {
    super(e, 'spriterender');
    this.cfg = cfg || {};
    this.reset();
  }

  reset() {
    this.renderable = true;
    this.visible = true;
    this.opacity = 1;
    this.layerName = this.cfg && this.cfg.layer || 0;
    Utils.applyProps(this, this.cfg);

    this.dirty = true;
    this.sprite = this.cfg.cvs;
  }

  draw(p) {
    this.drawProxy && this.drawProxy(p);
    // this.drawProxy();
  }
}

'use strict';

/*
  We provide a layer to which the component renders to

  cfg:
    layerName {String}
    atlas {String}
    frames {Array}
    animation {String}
*/
class SpriteRenderAnimation extends Component {
  constructor(e, cfg) {
    super(e, 'spriterender');
    this.cfg = cfg;
    this.reset();
  }

  reset() {
    this.renderable = true;
    this.visible = true;
    this.opacity = 1;
    this.layer = this.cfg && this.cfg.layer || 0;
    Utils.applyProps(this, this.cfg);

    this.t = 0;
    this.delay = null;
    this.currAnimation = null;
    this.isPlaying = false;
    this.timeOffset = 0;
  }

  play() {
    if(this.isPlaying) return;

    this.isPlaying = true;
    this.t = 0;//millis();
  }

  pause() {
    this.isPlaying = false;
  }

  set frameDelay(f) {
    this.delay = Math.max(0, f);
  }

  routeFrame() {
    let msPerFrame = this.delay || this.animations[this.animation].time;
    let frames = this.animations[this.animation].frames;

    let t = this.t + this.timeOffset;
    // console.log(this.timeOffset);
    let idx = floor(t * 1000 / msPerFrame) % frames.length;

    let imgName = frames[idx];
    return this.atlas.get(imgName);
  }

  draw(p) {
    if (!this.animation) return;

    p.image(this.routeFrame(), this.entity.pos.x, this.entity.pos.y);

    this.drawProxy && this.drawProxy();
  }

  update(dt) {
    if (this.isPlaying) {
      this.t += dt;
    }
  }
}

'use strict';

class PriorityQueue {
  constructor() {
    this.items = [];
  }

  clear(){
    Utils.clearArray(this.items);
  }

  size(){
    return this.items.length;
  }

  enqueue(obj, priority) {
    let contains = false;
    let item = { obj, priority };

    for (let i = 0, len = this.items.length; i < len; ++i) {
      if (this.items[i].priority > item.priority) {
        this.items.splice(i, 0, item);
        contains = true;
        break;
      }
    }

    if (contains === false) {
      this.items.push(item);
    }
  }

  printPQueue() {
    var str = '';
    for (var i = 0; i < this.items.length; i++){
      str += this.items[i].obj + ' ';
    }
    return str;
  }
  
  isEmpty() {
    return this.items.length === 0;
  }

  dequeue() {
    return this.items.shift().obj;
  }
}

'use strict';

function createLayer(n,w,h) {
  let cvs = document.createElement('canvas');
  [cvs.width, cvs.height] = [w,h];

  let p = createGraphics(cvs.width, cvs.height);
  return p;
}

// Change the order of these tags to change rendering order
let layerConfig = [
  { name: 'background', cfg: { 'clearFrame': false } },
  { name: 'spriteprops', cfg: { 'clearFrame': true } },
  { name: 'sprite', cfg: { 'clearFrame': true } },
  { name: 'bullet', cfg: { 'clearFrame': true } },
  { name: 'effect', cfg: { 'clearFrame': true } },
  { name: 'ui', cfg: { 'clearFrame': true } },
  { name: 'debug', cfg: { 'clearFrame': true } }
];

let layerMap = new Map();
let layers = [];

class Renderer {

  static init(w,h) {
    layerConfig.forEach(obj => {
      let layer = {
        'name': obj.name,
        'p3': createLayer(obj.name,w,h),
        'cfg': obj.cfg,
        'renderables': new PriorityQueue()
      };

      layers.push(layer);
      layerMap.set(obj.name, layer);
    });
  }

  static render(scene) {
    let i, layer;

    // TODO: remove?
    // p3.clear();

    // Place entities in their respective layers
    scene.entities.forEach(e => {

      if (e.visible === false || e.opacity === 0) { return; }

      // TODO: this needs to be recursive!
      // CHILDREN
      // e.children.forEach(e => {
      //   //  e.opacity = rootOpacity;
      //   if (e.components) {
      //     e.components.forEach(c => {

      //       //  c.opacity = rootOpacity;
      //       if (c.renderable && c.visible) {
      //         let layer = layerMap.get(c.layerName);
      //         // Layer may not exist if we are debugging
      //         layer && layer.renderables.enqueue(c, c.zIndex);
      //       }
      //     });
      //   }
      // });


      for (i = 0; i < e.children.length; i++) {
        let e = e.children[i];

        if (e.components) {

          for (let c = 0; c < e.components.length; i++) {
            // e.components.forEach(c => {
            //  c.opacity = rootOpacity;
            if (c.renderable && c.visible) {
              let layer = layerMap.get(c.layerName);
              // Layer may not exist if we are debugging
              layer && layer.renderables.enqueue(c, c.zIndex);
            }
            // });
          }
          // e.components.forEach(c => {

          //   //  c.opacity = rootOpacity;
          //   if (c.renderable && c.visible) {
          //     let layer = layerMap.get(c.layerName);
          //     // Layer may not exist if we are debugging
          //     layer && layer.renderables.enqueue(c, c.zIndex);
          //   }
          // });
        }
      }




      for (let i = 0; i < e.components.length; i++) {
        let c = e.components[i];
        if (c.renderable && c.visible) { // && c.opacity > 0
          // c.opacity = rootOpacity;
          layer = layerMap.get(c.layerName);
          layer && layer.renderables.enqueue(c, c.zIndex);
        }
      }

      // // COMPONENTS
      // e.components.forEach(c => {
      //   if (c.renderable && c.visible) { // && c.opacity > 0
      //     // c.opacity = rootOpacity;
      //     let layer = layerMap.get(c.layerName);
      //     layer && layer.renderables.enqueue(c, c.zIndex);
      //   }
      // });

    });



  // // Draw the entities onto their layers
    for(let i = 0; i < layers.length; i++){
      let _layer = layers[i];
      let _p3 = _layer.p3;

      if (_layer.cfg.clearFrame) {
        // _p3.clearAll(); ???
        _p3.clear();
      }

      let q = _layer.renderables;
      while (q.isEmpty() === false) {
        let c = q.dequeue();
        c.draw(_p3);
      }
    }
    // // Draw the entities onto their layers
    // layers.forEach(_layer => {
    //   let _p3 = _layer.p3;

    //   if (_layer.cfg.clearFrame) {
    //     // _p3.clearAll(); ???
    //     _p3.clear();
    //   }

    //   let q = _layer.renderables;
    //   while (q.isEmpty() === false) {
    //     let c = q.dequeue();
    //     c.draw(_p3);
    //   }
    // });


    // Draw all the layers onto the main canvas
    // layers.forEach(layer => image(layer.p3, 0, 0));
    for (let i = 0; i < layers.length; i++) {
      image(layers[i].p3, 0, 0);
    }
  }

  static preRender() {}
  static postRender() {}
}

'use strict';

function Assert(condition) {
  if (!condition) {
    console.error('Assertion Failed');
    debugger;
  }
}

'use strict';

class Scene {

  constructor(w,h) {
    this.entities = new Set();
    this.user = null;
    this.restartGameCallback = function() {};

    this.gameWidth = w;
    this.gameHeight = h;

    this.entitiesAddedOrRemovedDirty = false;
    this.deleteQueue = [];
    this.eventsToFireNextFrame = [];
  }

  findEntity(name) {
    let entity = null;
    let found = false;

    scene.entities.forEach(e => {
      if (e.name === name && found === false) {
        entity = e;
        found = true;
      }
    });
    return entity;
  }

  update(dt) {

    // We can't fire events while we are iterating of the 
    // objects being removed, it breaks everything.
    this.eventsToFireNextFrame.forEach(e => e.fire());
    Utils.clearArray(this.eventsToFireNextFrame);

    // Seems like this is the best place for this flag to be turned on.
    if (this.deleteQueue.length > 0) {
      this.entitiesAddedOrRemovedDirty = true;

      // let the children do any cleanup.
      this.deleteQueue.forEach(e => {
        new Event({ evtName: 'death', data: e }).fire();

        // The seekTarget relies on this event and tries to get a new 
        // target. but if the entity is still alive, it may return
        // a target that will be removed next frame.
        let rm = new Event({ evtName: 'remove', data: e });

        this.eventsToFireNextFrame.push(rm);
      });

      this.deleteQueue.forEach(e => {
        this.entities.delete(e);
      });

      // Allow the entities to do any cleanup
      this.deleteQueue.forEach(e => e.indicateRemove());

      Utils.clearArray(this.deleteQueue);
    }

    // this.entities.forEach(e => e.update(dt));
    for( let o of this.entities){
      o.update(dt);
    }
  }

  clearFlags() {
    this.entitiesAddedOrRemovedDirty = false;
  }

  add(e) {
    this.entities.add(e);
    this.entitiesAddedOrRemovedDirty = true;
    new Event({ evtName: 'entityadded', data: e }).fire();
  }

  restartGame() {
    this.entities.clear();
    this.deleteQueue = [];

    this.restartGameCallback();
    // let kblistener = EntityFactory.create('keyboardlistener');

    // this.add(EntityFactory.create('audioeventlistener'));

    // this.add(EntityFactory.create('background'));

    // this.add(EntityFactory.create('ui'));
  }

  /*
    Implement me
  */
  entityIterator(){
    debugger;
  }

  remove(e) {
    Assert(e);

    for (let i = 0; i < this.deleteQueue.length; i++) {
      if (e === this.deleteQueue[i]) {
        continue;
        // TODO: Entities are being put in this list more than once
      }
    }

    this.deleteQueue.push(e);
    // this.entitiesAddedOrRemovedDirty = true;
  }

  // nope, this is too specific!
  // getUser() {
  //   return this.user;
  // }
}

'use strict';

class StayInBoundsBehaviour extends Component {

  /*
    cfg
      bounds {x,y,w,h}
  */
  constructor(e, cfg) {
    super(e, 'stayinbounds');

    this.acc = Pool.get('vec2');
    this.steer = Pool.get('vec2');
    this.desired = Pool.get('vec2');

    let defaults = {
      maxSpeed: 100,
      steerMag: 1
    };
    Utils.applyProps(this, defaults, cfg);

    // Maybe move this to accept something from cfg?
    Vec2$1.randomDir(e.vel);
    e.vel.mult(this.maxSpeed);
  }

  update(dt, entity) {
    this.stayInBounds();

    this.entity.vel.add(this.acc);
    this.limitMaxVelocity();
    this.acc.zero();
  }

  applyForce(a) {
    this.acc.add(a);
  }

  limitMaxVelocity() {
    if (this.entity.vel.length() > this.maxSpeed) {
      this.entity.vel.normalize();
      this.entity.vel.mult(this.maxSpeed);
    }
  }

  applyDesired() {
    this.steer.setV(this.desired.sub(this.entity.vel));
    this.steer.limit(this.steerMag);
    this.acc.add(this.steer);
  }

  stayInBounds() {

    if (this.entity.pos.x < this.bounds.x) {
      this.desired.setXY(this.maxSpeed, this.entity.vel.y);
      this.applyDesired();
    }

    if (this.entity.pos.y < this.bounds.y) {
      this.desired.setXY(this.entity.vel.x, this.maxSpeed);
      this.applyDesired();
    }

    if (this.entity.pos.x > this.bounds.w) {
      this.desired.setXY(-this.maxSpeed, this.entity.vel.y);
      this.applyDesired();
    }

    if (this.entity.pos.y > this.bounds.h) {
      this.desired.setXY(this.entity.vel.x, -this.maxSpeed);
      this.applyDesired();
    }

    this.applyForce(this.acc);
  }

  free() {
    debugger;
  }

  indicateRemove() {
    Pool.free(this.acc);
    Pool.free(this.steer);
    Pool.free(this.desired);
  }
}

'use strict';

class FollowBehaviour extends Component {

  /*
    cfg
      cursor | Entity
  */
  constructor(e, cfg) {
    super(e, 'follow');

    this.acc = Pool.get('vec2');
    this.targetPos = Pool.get('vec2');
    this.toTarget = Pool.get('vec2');
    this.desired = Pool.get('vec2');
    this.steer = Pool.get('vec2');
    this.str = 'cursor';

    let defaults = {
      maxSpeed: 200,
      maxSteering: 1
    };
    Utils.applyProps(this, defaults, cfg);
  }

  update(dt, entity) {

    if (this.target === this.str) {
      this.targetPos.set(mouseX, mouseY);
    } 
    else {
      this.targetPos.setV(this.target.pos);
    }

    this.seek();

    this.entity.vel.add(this.acc);

    if(this.entity.vel.length() > this.maxSpeed){
      this.entity.vel.normalize();
      this.entity.vel.mult(this.maxSpeed);
    }

    this.acc.mult(0);
  }

  applyForce(a){
    this.acc.add(a);
  }

  seek() {
    this.toTarget.setXY(this.targetPos.x - this.entity.pos.x, this.targetPos.y - this.entity.pos.y);

    this.desired.setV(this.toTarget);
    this.desired.normalize();
    this.desired.mult(this.maxSpeed);

    this.steer.setXY(this.desired.x - this.entity.vel.x, this.desired.y - this.entity.vel.y);

    if(this.steer.length() > this.maxSteering){
      this.steer.normalize();
      this.steer.mult(this.maxSteering);
    }

    this.applyForce(this.steer);
  }

  free(){
    debugger;
  }

  indicateRemove(){
    Pool.free(this.acc);
    Pool.free(this.targetPos);
  }
}

'use strict';

class WanderBehaviour extends Component {

  /*
    cfg
  */
  constructor(e, cfg) {
    super(e, 'wander');

    this.acc = Pool.get('vec2');
    this.steer = Pool.get('vec2');
    this.desired = Pool.get('vec2');
    this.d = Pool.get('vec2');

    let defaults = {
      maxSpeed: 100,
      steerMag: 1
    };
    Utils.applyProps(this, defaults, cfg);
    this.timer = 0;

    // Maybe move this to accept something from cfg?
    Vec2$1.randomDir(e.vel);
    e.vel.mult(this.maxSpeed);
  }

  wander(){
    Vec2$1.randomDir(this.d);
    this.d.mult(100);
    this.applyForce(this.d);
  }

  update(dt, entity) {
    this.timer += dt;
    if(this.timer > .1){
      this.timer = 0;
      this.wander();
    }

    this.entity.vel.add(this.acc);
    this.limitMaxVelocity();
    this.acc.zero();
  }

  applyForce(a) {
    this.acc.add(a);
  }

  limitMaxVelocity() {
    if (this.entity.vel.length() > this.maxSpeed) {
      this.entity.vel.normalize();
      this.entity.vel.mult(this.maxSpeed);
    }
  }

  free() {
    debugger;
  }

  indicateRemove() {
    Pool.free(this.d);
    Pool.free(this.acc);
    Pool.free(this.steer);
    Pool.free(this.desired);
  }
}

'use strict';

class SeparateBehaviour extends Component {

  /*
    cfg
      distance {Number}
  */
  constructor(e, cfg) {
    super(e, 'separate');

    this.acc = Pool.get('vec2');
    this.steer = Pool.get('vec2');
    this.desired = Pool.get('vec2');
    this.res = Pool.get('vec2');
    this._mag = Pool.get('vec2');
    this._temp = Pool.get('vec2');

    this.otherSprites = null;

    let defaults = {
      maxSpeed: 100,
      steerMag: 1
    };
    Utils.applyProps(this, defaults, cfg);

    // Maybe move this to accept something from cfg?
    Vec2$1.randomDir(e.vel);
    e.vel.mult(this.maxSpeed);
  }

  update(dt, entity) {
    this.separate();

    this.entity.vel.add(this.acc);
    // this.limitMaxVelocity();
    this.acc.zero();
  }

  applyForce(a) {
    this.acc.add(a);
  }

  // limitMaxVelocity() {
  //   if (this.entity.vel.length() > this.maxSpeed) {
  //     this.entity.vel.normalize();
  //     this.entity.vel.mult(this.maxSpeed);
  //   }
  // }

  applyDesired() {
    this.steer.setV(this.desired.sub(this.entity.vel));
    this.steer.limit(this.steerMag);
    this.acc.add(this.steer);
  }

  /*
    Separate from all other entities in the scene
  */
  separate() {
    this.res.zero();

    let m;
    let count = 0;
    scene.entities.forEach(e => {
      if (e !== this.entity) {
        
        Vec2$1.sub(this._temp, this.entity.pos, e.pos);
        m = this._temp.mag();

        if (m < this.minDistance && m > 0) {
          count++;
          this._temp.normalize();
          this._temp.div(m);
          this.res.add(this._temp.x, this._temp.y);
        }
      }
    });

    if (count > 0) {
      this.res.div(count);
      this.res.normalize();
      this.res.mult(100);//window.maxSteer);

      let steer = this.res.clone();
      steer.sub(this.entity.vel);

      steer.limit(window.maxTest);

      this.applyForce(steer);
    }
  }

  free() {
    debugger;
  }

  indicateRemove() {
    Pool.free(this.acc);
    Pool.free(this.steer);
    Pool.free(this.desired);
    Pool.free(this.res);
    Pool.free(this._mag);
    Pool.free(this._temp);
  }
}

const PRESSED = 1;
const RELEASED = 0;

class KeyboardState {

  constructor() {
    this.keyStates = new Map;
    this.keyMap = new Map;
  }

  addMapping(code, cb) {
    this.keyMap.set(code, cb);
    // console.log(this.keyMap);
  }

  handleEvent(evt) {
    let { code, type } = evt;

    // If there's no mapping, just ignore it
    if (!this.keyMap.has(code)) return;

    evt.preventDefault();

    const keystate = type === 'keydown' ? PRESSED : RELEASED;

    // Only chnage state if necessary
    if (keystate === this.keyStates.get(code)) return;

    this.keyStates.set(code, keystate);
    this.keyMap.get(code)(keystate);
  }

  listenTo(w) {
    w.addEventListener('keydown', evt => this.handleEvent(evt));
    w.addEventListener('keyup', evt => this.handleEvent(evt));
  }
}

'use strict';

class Component$1 {
  constructor(e, name) {
    this.entity = e;
    this.name = name;
    this.tags = [];
  }

  update(dt) {
    this.updateProxy && this.updateProxy(dt);
  }

  // on(evtName, func, ctx) {
  // this.eventFilter(evtName, func, ctx);
  // (new EventSystem()).on(evtName, function() {
  //   if (this.eventsOn === false) { return; }
  //   func.call(this, arguments[0], arguments[1], arguments[2]);
  // }.bind(this), ctx);
  // }

  on(evtName, func, ctx) {
    (new EventSystem()).on(evtName, func, ctx);
  }

  free(){
    console.log('super free called');
  }

  // call after creation 
  init(){
    // console.log('super init called');
  }

  setEvents(b) {
    this.eventsOn = b;
  }

  /*
    v {Vec2} - out
  */
  getWorldCoords(v){
    this.entity.getWorldCoords(v);
    // return this.entity.getWorldCoords();
  }

  /*
    When the associated entity is removed from the scene,
    we give the component a chance to do any cleanup such
    as removing event listeners
  */
  indicateRemove() {}
}

'use strict';

class Collidable extends Component$1 {
  constructor(e, cfg) {
    super(e, 'collidable');
    this.cfg = cfg;
    this.reset();
  }

  reset() {
    this.enabled = true;
    this.type = (this.cfg && this.cfg.type) || 0x0;
    this.mask = (this.cfg && this.cfg.mask) || 0x0;
  }

}

'use strict';

class BoundingCircle {
  constructor(pos, radius) {
    this.pos = pos;
    this.radius = radius;
  }
}

'use strict';

let strings = [];
let isOn = true;

class Debug$1 {

  static init(cfg) {
    document.addEventListener('keydown', function(evt) {
      if (evt.code === cfg.toggleKey) {
       // Debug.setOn(window.debug);
      }
    });
  }

  static add(str) {
    if (!isOn) {
      return;
    }
    strings.push(str);
  }

  static setOn(v) {
    isOn = v;
  }

  static draw() {
    if (!isOn) {
      return;
    }

    push();
    noStroke();
    fill(0, 255, 0);

    let y = 20;
    let ySpacing = 18;

    strings.forEach(s => {
      text(s, 10, y);
      y += ySpacing;
    });

    pop();
  }

  static postRender() {
    if (!isOn) {
      return;
    }
    Utils.clearArray(strings);
  }
}

let isOn$1 = true;
let list = [];
let firstTime = true;
let checks = 0;
let debugChecks = [];
let _v = Vec2$1.create();

class CollisionSystem {

  static gatherCollidables() {
    // debugger;
    if (!isOn$1) { return; }

    // if no object were added or removed, we can avoid doing this work
    if (firstTime || scene.entitiesAddedOrRemovedDirty) {
      firstTime = false;
      Utils.clearArray(list);

      scene.entities.forEach(e => {
        if (e.collidable) { list.push(e); }

        e.children.forEach(ch => {
          if (ch.collidable) {
            list.push(ch);
          }
        });
      });

      // TODO: shouldn't this be done sooner?
      // list = list.filter(e => e.collidable);
      scene.clearFlags();
    }
  }

  // circle_Circle
  // circle_AABB
  // circle_lineSegment

  // AABB_AABB
  // AABB_lineSegment

  // lineSegment_lineSegment

  /*
    TODO: this should be more generic.
  */
  static circleCircleTest(e1, e2) {
    let radTotal = e1.bounds.radius + e2.bounds.radius;
    _v.set(e1.worldCoords);
    Vec2$1.subSelf(_v, e2.worldCoords);
    return _v.length() <= radTotal;
  }

  static setOn(b) {
    isOn$1 = b;
  }

  static checkCollisions() {

    if (!isOn$1) { return; }

    checks = 0;

    if (window.debug) {
      Utils.clearArray(debugChecks);
    }

    let e1, e2;

    list.forEach(obj => obj.updateWorldCoords());

    for (let i = 0; i < list.length; ++i) {
      for (let j = i + 1; j < list.length; ++j) {

        e1 = list[i];
        e2 = list[j];

        if (!e1.collidable.enabled || !e2.collidable.enabled) {
          continue;
        }

        let typeA = e1.collidable.type;
        let maskB = e2.collidable.mask;

        let maskA = e1.collidable.mask;
        let typeB = e2.collidable.type;

        if ((typeA & maskB) !== 0 && (typeB & maskA) !== 0) {
          // debugChecks.push(`${e1.name} <-> ${e2.name}`);

          if (CollisionSystem.circleCircleTest(e1, e2)) {

            let e = new Event({
              evtName: 'collision',
              data: { self: e1, other: e2 }
            });
            e.fire();

          }
          checks++;
        }
      }
    }

    Debug$1.add(`Collision Checks: ${checks}`);
    if (window.debug) {
      debugChecks.forEach(s => {
        Debug$1.add(debugChecks);
      });
    }

  }
}
// for (let i = 0; i < list.length; ++i) {
// let obj = list[i];
// obj.updateWorldCoords();
// _compCoords.zero();
// ch.getWorldCoords(_compCoords);
// ch._collisionTransform.set(_compCoords);
// }

window.Events = new EventSystem();

/*! howler.js v2.2.0 | (c) 2013-2020, James Simpson of GoldFire Studios | MIT License | howlerjs.com */
!function(){"use strict";var e=function(){this.init();};e.prototype={init:function(){var e=this||n;return e._counter=1e3,e._html5AudioPool=[],e.html5PoolSize=10,e._codecs={},e._howls=[],e._muted=!1,e._volume=1,e._canPlayEvent="canplaythrough",e._navigator="undefined"!=typeof window&&window.navigator?window.navigator:null,e.masterGain=null,e.noAudio=!1,e.usingWebAudio=!0,e.autoSuspend=!0,e.ctx=null,e.autoUnlock=!0,e._setup(),e},volume:function(e){var o=this||n;if(e=parseFloat(e),o.ctx||_(),void 0!==e&&e>=0&&e<=1){if(o._volume=e,o._muted)return o;o.usingWebAudio&&o.masterGain.gain.setValueAtTime(e,n.ctx.currentTime);for(var t=0;t<o._howls.length;t++)if(!o._howls[t]._webAudio)for(var r=o._howls[t]._getSoundIds(),a=0;a<r.length;a++){var u=o._howls[t]._soundById(r[a]);u&&u._node&&(u._node.volume=u._volume*e);}return o}return o._volume},mute:function(e){var o=this||n;o.ctx||_(),o._muted=e,o.usingWebAudio&&o.masterGain.gain.setValueAtTime(e?0:o._volume,n.ctx.currentTime);for(var t=0;t<o._howls.length;t++)if(!o._howls[t]._webAudio)for(var r=o._howls[t]._getSoundIds(),a=0;a<r.length;a++){var u=o._howls[t]._soundById(r[a]);u&&u._node&&(u._node.muted=!!e||u._muted);}return o},stop:function(){for(var e=this||n,o=0;o<e._howls.length;o++)e._howls[o].stop();return e},unload:function(){for(var e=this||n,o=e._howls.length-1;o>=0;o--)e._howls[o].unload();return e.usingWebAudio&&e.ctx&&void 0!==e.ctx.close&&(e.ctx.close(),e.ctx=null,_()),e},codecs:function(e){return (this||n)._codecs[e.replace(/^x-/,"")]},_setup:function(){var e=this||n;if(e.state=e.ctx?e.ctx.state||"suspended":"suspended",e._autoSuspend(),!e.usingWebAudio)if("undefined"!=typeof Audio)try{var o=new Audio;void 0===o.oncanplaythrough&&(e._canPlayEvent="canplay");}catch(n){e.noAudio=!0;}else e.noAudio=!0;try{var o=new Audio;o.muted&&(e.noAudio=!0);}catch(e){}return e.noAudio||e._setupCodecs(),e},_setupCodecs:function(){var e=this||n,o=null;try{o="undefined"!=typeof Audio?new Audio:null;}catch(n){return e}if(!o||"function"!=typeof o.canPlayType)return e;var t=o.canPlayType("audio/mpeg;").replace(/^no$/,""),r=e._navigator&&e._navigator.userAgent.match(/OPR\/([0-6].)/g),a=r&&parseInt(r[0].split("/")[1],10)<33;return e._codecs={mp3:!(a||!t&&!o.canPlayType("audio/mp3;").replace(/^no$/,"")),mpeg:!!t,opus:!!o.canPlayType('audio/ogg; codecs="opus"').replace(/^no$/,""),ogg:!!o.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,""),oga:!!o.canPlayType('audio/ogg; codecs="vorbis"').replace(/^no$/,""),wav:!!o.canPlayType('audio/wav; codecs="1"').replace(/^no$/,""),aac:!!o.canPlayType("audio/aac;").replace(/^no$/,""),caf:!!o.canPlayType("audio/x-caf;").replace(/^no$/,""),m4a:!!(o.canPlayType("audio/x-m4a;")||o.canPlayType("audio/m4a;")||o.canPlayType("audio/aac;")).replace(/^no$/,""),m4b:!!(o.canPlayType("audio/x-m4b;")||o.canPlayType("audio/m4b;")||o.canPlayType("audio/aac;")).replace(/^no$/,""),mp4:!!(o.canPlayType("audio/x-mp4;")||o.canPlayType("audio/mp4;")||o.canPlayType("audio/aac;")).replace(/^no$/,""),weba:!!o.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/,""),webm:!!o.canPlayType('audio/webm; codecs="vorbis"').replace(/^no$/,""),dolby:!!o.canPlayType('audio/mp4; codecs="ec-3"').replace(/^no$/,""),flac:!!(o.canPlayType("audio/x-flac;")||o.canPlayType("audio/flac;")).replace(/^no$/,"")},e},_unlockAudio:function(){var e=this||n;if(!e._audioUnlocked&&e.ctx){e._audioUnlocked=!1,e.autoUnlock=!1,e._mobileUnloaded||44100===e.ctx.sampleRate||(e._mobileUnloaded=!0,e.unload()),e._scratchBuffer=e.ctx.createBuffer(1,1,22050);var o=function(n){for(;e._html5AudioPool.length<e.html5PoolSize;)try{var t=new Audio;t._unlocked=!0,e._releaseHtml5Audio(t);}catch(n){e.noAudio=!0;break}for(var r=0;r<e._howls.length;r++)if(!e._howls[r]._webAudio)for(var a=e._howls[r]._getSoundIds(),u=0;u<a.length;u++){var i=e._howls[r]._soundById(a[u]);i&&i._node&&!i._node._unlocked&&(i._node._unlocked=!0,i._node.load());}e._autoResume();var d=e.ctx.createBufferSource();d.buffer=e._scratchBuffer,d.connect(e.ctx.destination),void 0===d.start?d.noteOn(0):d.start(0),"function"==typeof e.ctx.resume&&e.ctx.resume(),d.onended=function(){d.disconnect(0),e._audioUnlocked=!0,document.removeEventListener("touchstart",o,!0),document.removeEventListener("touchend",o,!0),document.removeEventListener("click",o,!0);for(var n=0;n<e._howls.length;n++)e._howls[n]._emit("unlock");};};return document.addEventListener("touchstart",o,!0),document.addEventListener("touchend",o,!0),document.addEventListener("click",o,!0),e}},_obtainHtml5Audio:function(){var e=this||n;if(e._html5AudioPool.length)return e._html5AudioPool.pop();var o=(new Audio).play();return o&&"undefined"!=typeof Promise&&(o instanceof Promise||"function"==typeof o.then)&&o.catch(function(){console.warn("HTML5 Audio pool exhausted, returning potentially locked audio object.");}),new Audio},_releaseHtml5Audio:function(e){var o=this||n;return e._unlocked&&o._html5AudioPool.push(e),o},_autoSuspend:function(){var e=this;if(e.autoSuspend&&e.ctx&&void 0!==e.ctx.suspend&&n.usingWebAudio){for(var o=0;o<e._howls.length;o++)if(e._howls[o]._webAudio)for(var t=0;t<e._howls[o]._sounds.length;t++)if(!e._howls[o]._sounds[t]._paused)return e;return e._suspendTimer&&clearTimeout(e._suspendTimer),e._suspendTimer=setTimeout(function(){if(e.autoSuspend){e._suspendTimer=null,e.state="suspending";var n=function(){e.state="suspended",e._resumeAfterSuspend&&(delete e._resumeAfterSuspend,e._autoResume());};e.ctx.suspend().then(n,n);}},3e4),e}},_autoResume:function(){var e=this;if(e.ctx&&void 0!==e.ctx.resume&&n.usingWebAudio)return "running"===e.state&&"interrupted"!==e.ctx.state&&e._suspendTimer?(clearTimeout(e._suspendTimer),e._suspendTimer=null):"suspended"===e.state||"running"===e.state&&"interrupted"===e.ctx.state?(e.ctx.resume().then(function(){e.state="running";for(var n=0;n<e._howls.length;n++)e._howls[n]._emit("resume");}),e._suspendTimer&&(clearTimeout(e._suspendTimer),e._suspendTimer=null)):"suspending"===e.state&&(e._resumeAfterSuspend=!0),e}};var n=new e,o=function(e){var n=this;if(!e.src||0===e.src.length)return void console.error("An array of source files must be passed with any new Howl.");n.init(e);};o.prototype={init:function(e){var o=this;return n.ctx||_(),o._autoplay=e.autoplay||!1,o._format="string"!=typeof e.format?e.format:[e.format],o._html5=e.html5||!1,o._muted=e.mute||!1,o._loop=e.loop||!1,o._pool=e.pool||5,o._preload="boolean"!=typeof e.preload&&"metadata"!==e.preload||e.preload,o._rate=e.rate||1,o._sprite=e.sprite||{},o._src="string"!=typeof e.src?e.src:[e.src],o._volume=void 0!==e.volume?e.volume:1,o._xhr={method:e.xhr&&e.xhr.method?e.xhr.method:"GET",headers:e.xhr&&e.xhr.headers?e.xhr.headers:null,withCredentials:!(!e.xhr||!e.xhr.withCredentials)&&e.xhr.withCredentials},o._duration=0,o._state="unloaded",o._sounds=[],o._endTimers={},o._queue=[],o._playLock=!1,o._onend=e.onend?[{fn:e.onend}]:[],o._onfade=e.onfade?[{fn:e.onfade}]:[],o._onload=e.onload?[{fn:e.onload}]:[],o._onloaderror=e.onloaderror?[{fn:e.onloaderror}]:[],o._onplayerror=e.onplayerror?[{fn:e.onplayerror}]:[],o._onpause=e.onpause?[{fn:e.onpause}]:[],o._onplay=e.onplay?[{fn:e.onplay}]:[],o._onstop=e.onstop?[{fn:e.onstop}]:[],o._onmute=e.onmute?[{fn:e.onmute}]:[],o._onvolume=e.onvolume?[{fn:e.onvolume}]:[],o._onrate=e.onrate?[{fn:e.onrate}]:[],o._onseek=e.onseek?[{fn:e.onseek}]:[],o._onunlock=e.onunlock?[{fn:e.onunlock}]:[],o._onresume=[],o._webAudio=n.usingWebAudio&&!o._html5,void 0!==n.ctx&&n.ctx&&n.autoUnlock&&n._unlockAudio(),n._howls.push(o),o._autoplay&&o._queue.push({event:"play",action:function(){o.play();}}),o._preload&&"none"!==o._preload&&o.load(),o},load:function(){var e=this,o=null;if(n.noAudio)return void e._emit("loaderror",null,"No audio support.");"string"==typeof e._src&&(e._src=[e._src]);for(var r=0;r<e._src.length;r++){var u,i;if(e._format&&e._format[r])u=e._format[r];else {if("string"!=typeof(i=e._src[r])){e._emit("loaderror",null,"Non-string found in selected audio sources - ignoring.");continue}u=/^data:audio\/([^;,]+);/i.exec(i),u||(u=/\.([^.]+)$/.exec(i.split("?",1)[0])),u&&(u=u[1].toLowerCase());}if(u||console.warn('No file extension was found. Consider using the "format" property or specify an extension.'),u&&n.codecs(u)){o=e._src[r];break}}return o?(e._src=o,e._state="loading","https:"===window.location.protocol&&"http:"===o.slice(0,5)&&(e._html5=!0,e._webAudio=!1),new t(e),e._webAudio&&a(e),e):void e._emit("loaderror",null,"No codec support for selected audio sources.")},play:function(e,o){var t=this,r=null;if("number"==typeof e)r=e,e=null;else {if("string"==typeof e&&"loaded"===t._state&&!t._sprite[e])return null;if(void 0===e&&(e="__default",!t._playLock)){for(var a=0,u=0;u<t._sounds.length;u++)t._sounds[u]._paused&&!t._sounds[u]._ended&&(a++,r=t._sounds[u]._id);1===a?e=null:r=null;}}var i=r?t._soundById(r):t._inactiveSound();if(!i)return null;if(r&&!e&&(e=i._sprite||"__default"),"loaded"!==t._state){i._sprite=e,i._ended=!1;var d=i._id;return t._queue.push({event:"play",action:function(){t.play(d);}}),d}if(r&&!i._paused)return o||t._loadQueue("play"),i._id;t._webAudio&&n._autoResume();var _=Math.max(0,i._seek>0?i._seek:t._sprite[e][0]/1e3),s=Math.max(0,(t._sprite[e][0]+t._sprite[e][1])/1e3-_),l=1e3*s/Math.abs(i._rate),c=t._sprite[e][0]/1e3,f=(t._sprite[e][0]+t._sprite[e][1])/1e3;i._sprite=e,i._ended=!1;var p=function(){i._paused=!1,i._seek=_,i._start=c,i._stop=f,i._loop=!(!i._loop&&!t._sprite[e][2]);};if(_>=f)return void t._ended(i);var m=i._node;if(t._webAudio){var v=function(){t._playLock=!1,p(),t._refreshBuffer(i);var e=i._muted||t._muted?0:i._volume;m.gain.setValueAtTime(e,n.ctx.currentTime),i._playStart=n.ctx.currentTime,void 0===m.bufferSource.start?i._loop?m.bufferSource.noteGrainOn(0,_,86400):m.bufferSource.noteGrainOn(0,_,s):i._loop?m.bufferSource.start(0,_,86400):m.bufferSource.start(0,_,s),l!==1/0&&(t._endTimers[i._id]=setTimeout(t._ended.bind(t,i),l)),o||setTimeout(function(){t._emit("play",i._id),t._loadQueue();},0);};"running"===n.state&&"interrupted"!==n.ctx.state?v():(t._playLock=!0,t.once("resume",v),t._clearTimer(i._id));}else {var h=function(){m.currentTime=_,m.muted=i._muted||t._muted||n._muted||m.muted,m.volume=i._volume*n.volume(),m.playbackRate=i._rate;try{var r=m.play();if(r&&"undefined"!=typeof Promise&&(r instanceof Promise||"function"==typeof r.then)?(t._playLock=!0,p(),r.then(function(){t._playLock=!1,m._unlocked=!0,o||(t._emit("play",i._id),t._loadQueue());}).catch(function(){t._playLock=!1,t._emit("playerror",i._id,"Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction."),i._ended=!0,i._paused=!0;})):o||(t._playLock=!1,p(),t._emit("play",i._id),t._loadQueue()),m.playbackRate=i._rate,m.paused)return void t._emit("playerror",i._id,"Playback was unable to start. This is most commonly an issue on mobile devices and Chrome where playback was not within a user interaction.");"__default"!==e||i._loop?t._endTimers[i._id]=setTimeout(t._ended.bind(t,i),l):(t._endTimers[i._id]=function(){t._ended(i),m.removeEventListener("ended",t._endTimers[i._id],!1);},m.addEventListener("ended",t._endTimers[i._id],!1));}catch(e){t._emit("playerror",i._id,e);}};"data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"===m.src&&(m.src=t._src,m.load());var y=window&&window.ejecta||!m.readyState&&n._navigator.isCocoonJS;if(m.readyState>=3||y)h();else {t._playLock=!0;var g=function(){h(),m.removeEventListener(n._canPlayEvent,g,!1);};m.addEventListener(n._canPlayEvent,g,!1),t._clearTimer(i._id);}}return i._id},pause:function(e){var n=this;if("loaded"!==n._state||n._playLock)return n._queue.push({event:"pause",action:function(){n.pause(e);}}),n;for(var o=n._getSoundIds(e),t=0;t<o.length;t++){n._clearTimer(o[t]);var r=n._soundById(o[t]);if(r&&!r._paused&&(r._seek=n.seek(o[t]),r._rateSeek=0,r._paused=!0,n._stopFade(o[t]),r._node))if(n._webAudio){if(!r._node.bufferSource)continue;void 0===r._node.bufferSource.stop?r._node.bufferSource.noteOff(0):r._node.bufferSource.stop(0),n._cleanBuffer(r._node);}else isNaN(r._node.duration)&&r._node.duration!==1/0||r._node.pause();arguments[1]||n._emit("pause",r?r._id:null);}return n},stop:function(e,n){var o=this;if("loaded"!==o._state||o._playLock)return o._queue.push({event:"stop",action:function(){o.stop(e);}}),o;for(var t=o._getSoundIds(e),r=0;r<t.length;r++){o._clearTimer(t[r]);var a=o._soundById(t[r]);a&&(a._seek=a._start||0,a._rateSeek=0,a._paused=!0,a._ended=!0,o._stopFade(t[r]),a._node&&(o._webAudio?a._node.bufferSource&&(void 0===a._node.bufferSource.stop?a._node.bufferSource.noteOff(0):a._node.bufferSource.stop(0),o._cleanBuffer(a._node)):isNaN(a._node.duration)&&a._node.duration!==1/0||(a._node.currentTime=a._start||0,a._node.pause(),a._node.duration===1/0&&o._clearSound(a._node))),n||o._emit("stop",a._id));}return o},mute:function(e,o){var t=this;if("loaded"!==t._state||t._playLock)return t._queue.push({event:"mute",action:function(){t.mute(e,o);}}),t;if(void 0===o){if("boolean"!=typeof e)return t._muted;t._muted=e;}for(var r=t._getSoundIds(o),a=0;a<r.length;a++){var u=t._soundById(r[a]);u&&(u._muted=e,u._interval&&t._stopFade(u._id),t._webAudio&&u._node?u._node.gain.setValueAtTime(e?0:u._volume,n.ctx.currentTime):u._node&&(u._node.muted=!!n._muted||e),t._emit("mute",u._id));}return t},volume:function(){var e,o,t=this,r=arguments;if(0===r.length)return t._volume;if(1===r.length||2===r.length&&void 0===r[1]){t._getSoundIds().indexOf(r[0])>=0?o=parseInt(r[0],10):e=parseFloat(r[0]);}else r.length>=2&&(e=parseFloat(r[0]),o=parseInt(r[1],10));var a;if(!(void 0!==e&&e>=0&&e<=1))return a=o?t._soundById(o):t._sounds[0],a?a._volume:0;if("loaded"!==t._state||t._playLock)return t._queue.push({event:"volume",action:function(){t.volume.apply(t,r);}}),t;void 0===o&&(t._volume=e),o=t._getSoundIds(o);for(var u=0;u<o.length;u++)(a=t._soundById(o[u]))&&(a._volume=e,r[2]||t._stopFade(o[u]),t._webAudio&&a._node&&!a._muted?a._node.gain.setValueAtTime(e,n.ctx.currentTime):a._node&&!a._muted&&(a._node.volume=e*n.volume()),t._emit("volume",a._id));return t},fade:function(e,o,t,r){var a=this;if("loaded"!==a._state||a._playLock)return a._queue.push({event:"fade",action:function(){a.fade(e,o,t,r);}}),a;e=Math.min(Math.max(0,parseFloat(e)),1),o=Math.min(Math.max(0,parseFloat(o)),1),t=parseFloat(t),a.volume(e,r);for(var u=a._getSoundIds(r),i=0;i<u.length;i++){var d=a._soundById(u[i]);if(d){if(r||a._stopFade(u[i]),a._webAudio&&!d._muted){var _=n.ctx.currentTime,s=_+t/1e3;d._volume=e,d._node.gain.setValueAtTime(e,_),d._node.gain.linearRampToValueAtTime(o,s);}a._startFadeInterval(d,e,o,t,u[i],void 0===r);}}return a},_startFadeInterval:function(e,n,o,t,r,a){var u=this,i=n,d=o-n,_=Math.abs(d/.01),s=Math.max(4,_>0?t/_:t),l=Date.now();e._fadeTo=o,e._interval=setInterval(function(){var r=(Date.now()-l)/t;l=Date.now(),i+=d*r,i=d<0?Math.max(o,i):Math.min(o,i),i=Math.round(100*i)/100,u._webAudio?e._volume=i:u.volume(i,e._id,!0),a&&(u._volume=i),(o<n&&i<=o||o>n&&i>=o)&&(clearInterval(e._interval),e._interval=null,e._fadeTo=null,u.volume(o,e._id),u._emit("fade",e._id));},s);},_stopFade:function(e){var o=this,t=o._soundById(e);return t&&t._interval&&(o._webAudio&&t._node.gain.cancelScheduledValues(n.ctx.currentTime),clearInterval(t._interval),t._interval=null,o.volume(t._fadeTo,e),t._fadeTo=null,o._emit("fade",e)),o},loop:function(){var e,n,o,t=this,r=arguments;if(0===r.length)return t._loop;if(1===r.length){if("boolean"!=typeof r[0])return !!(o=t._soundById(parseInt(r[0],10)))&&o._loop;e=r[0],t._loop=e;}else 2===r.length&&(e=r[0],n=parseInt(r[1],10));for(var a=t._getSoundIds(n),u=0;u<a.length;u++)(o=t._soundById(a[u]))&&(o._loop=e,t._webAudio&&o._node&&o._node.bufferSource&&(o._node.bufferSource.loop=e,e&&(o._node.bufferSource.loopStart=o._start||0,o._node.bufferSource.loopEnd=o._stop)));return t},rate:function(){var e,o,t=this,r=arguments;if(0===r.length)o=t._sounds[0]._id;else if(1===r.length){var a=t._getSoundIds(),u=a.indexOf(r[0]);u>=0?o=parseInt(r[0],10):e=parseFloat(r[0]);}else 2===r.length&&(e=parseFloat(r[0]),o=parseInt(r[1],10));var i;if("number"!=typeof e)return i=t._soundById(o),i?i._rate:t._rate;if("loaded"!==t._state||t._playLock)return t._queue.push({event:"rate",action:function(){t.rate.apply(t,r);}}),t;void 0===o&&(t._rate=e),o=t._getSoundIds(o);for(var d=0;d<o.length;d++)if(i=t._soundById(o[d])){t.playing(o[d])&&(i._rateSeek=t.seek(o[d]),i._playStart=t._webAudio?n.ctx.currentTime:i._playStart),i._rate=e,t._webAudio&&i._node&&i._node.bufferSource?i._node.bufferSource.playbackRate.setValueAtTime(e,n.ctx.currentTime):i._node&&(i._node.playbackRate=e);var _=t.seek(o[d]),s=(t._sprite[i._sprite][0]+t._sprite[i._sprite][1])/1e3-_,l=1e3*s/Math.abs(i._rate);!t._endTimers[o[d]]&&i._paused||(t._clearTimer(o[d]),t._endTimers[o[d]]=setTimeout(t._ended.bind(t,i),l)),t._emit("rate",i._id);}return t},seek:function(){var e,o,t=this,r=arguments;if(0===r.length)o=t._sounds[0]._id;else if(1===r.length){var a=t._getSoundIds(),u=a.indexOf(r[0]);u>=0?o=parseInt(r[0],10):t._sounds.length&&(o=t._sounds[0]._id,e=parseFloat(r[0]));}else 2===r.length&&(e=parseFloat(r[0]),o=parseInt(r[1],10));if(void 0===o)return t;if("loaded"!==t._state||t._playLock)return t._queue.push({event:"seek",action:function(){t.seek.apply(t,r);}}),t;var i=t._soundById(o);if(i){if(!("number"==typeof e&&e>=0)){if(t._webAudio){var d=t.playing(o)?n.ctx.currentTime-i._playStart:0,_=i._rateSeek?i._rateSeek-i._seek:0;return i._seek+(_+d*Math.abs(i._rate))}return i._node.currentTime}var s=t.playing(o);s&&t.pause(o,!0),i._seek=e,i._ended=!1,t._clearTimer(o),t._webAudio||!i._node||isNaN(i._node.duration)||(i._node.currentTime=e);var l=function(){t._emit("seek",o),s&&t.play(o,!0);};if(s&&!t._webAudio){var c=function(){t._playLock?setTimeout(c,0):l();};setTimeout(c,0);}else l();}return t},playing:function(e){var n=this;if("number"==typeof e){var o=n._soundById(e);return !!o&&!o._paused}for(var t=0;t<n._sounds.length;t++)if(!n._sounds[t]._paused)return !0;return !1},duration:function(e){var n=this,o=n._duration,t=n._soundById(e);return t&&(o=n._sprite[t._sprite][1]/1e3),o},state:function(){return this._state},unload:function(){for(var e=this,o=e._sounds,t=0;t<o.length;t++)o[t]._paused||e.stop(o[t]._id),e._webAudio||(e._clearSound(o[t]._node),o[t]._node.removeEventListener("error",o[t]._errorFn,!1),o[t]._node.removeEventListener(n._canPlayEvent,o[t]._loadFn,!1),n._releaseHtml5Audio(o[t]._node)),delete o[t]._node,e._clearTimer(o[t]._id);var a=n._howls.indexOf(e);a>=0&&n._howls.splice(a,1);var u=!0;for(t=0;t<n._howls.length;t++)if(n._howls[t]._src===e._src||e._src.indexOf(n._howls[t]._src)>=0){u=!1;break}return r&&u&&delete r[e._src],n.noAudio=!1,e._state="unloaded",e._sounds=[],e=null,null},on:function(e,n,o,t){var r=this,a=r["_on"+e];return "function"==typeof n&&a.push(t?{id:o,fn:n,once:t}:{id:o,fn:n}),r},off:function(e,n,o){var t=this,r=t["_on"+e],a=0;if("number"==typeof n&&(o=n,n=null),n||o)for(a=0;a<r.length;a++){var u=o===r[a].id;if(n===r[a].fn&&u||!n&&u){r.splice(a,1);break}}else if(e)t["_on"+e]=[];else {var i=Object.keys(t);for(a=0;a<i.length;a++)0===i[a].indexOf("_on")&&Array.isArray(t[i[a]])&&(t[i[a]]=[]);}return t},once:function(e,n,o){var t=this;return t.on(e,n,o,1),t},_emit:function(e,n,o){for(var t=this,r=t["_on"+e],a=r.length-1;a>=0;a--)r[a].id&&r[a].id!==n&&"load"!==e||(setTimeout(function(e){e.call(this,n,o);}.bind(t,r[a].fn),0),r[a].once&&t.off(e,r[a].fn,r[a].id));return t._loadQueue(e),t},_loadQueue:function(e){var n=this;if(n._queue.length>0){var o=n._queue[0];o.event===e&&(n._queue.shift(),n._loadQueue()),e||o.action();}return n},_ended:function(e){var o=this,t=e._sprite;if(!o._webAudio&&e._node&&!e._node.paused&&!e._node.ended&&e._node.currentTime<e._stop)return setTimeout(o._ended.bind(o,e),100),o;var r=!(!e._loop&&!o._sprite[t][2]);if(o._emit("end",e._id),!o._webAudio&&r&&o.stop(e._id,!0).play(e._id),o._webAudio&&r){o._emit("play",e._id),e._seek=e._start||0,e._rateSeek=0,e._playStart=n.ctx.currentTime;var a=1e3*(e._stop-e._start)/Math.abs(e._rate);o._endTimers[e._id]=setTimeout(o._ended.bind(o,e),a);}return o._webAudio&&!r&&(e._paused=!0,e._ended=!0,e._seek=e._start||0,e._rateSeek=0,o._clearTimer(e._id),o._cleanBuffer(e._node),n._autoSuspend()),o._webAudio||r||o.stop(e._id,!0),o},_clearTimer:function(e){var n=this;if(n._endTimers[e]){if("function"!=typeof n._endTimers[e])clearTimeout(n._endTimers[e]);else {var o=n._soundById(e);o&&o._node&&o._node.removeEventListener("ended",n._endTimers[e],!1);}delete n._endTimers[e];}return n},_soundById:function(e){for(var n=this,o=0;o<n._sounds.length;o++)if(e===n._sounds[o]._id)return n._sounds[o];return null},_inactiveSound:function(){var e=this;e._drain();for(var n=0;n<e._sounds.length;n++)if(e._sounds[n]._ended)return e._sounds[n].reset();return new t(e)},_drain:function(){var e=this,n=e._pool,o=0,t=0;if(!(e._sounds.length<n)){for(t=0;t<e._sounds.length;t++)e._sounds[t]._ended&&o++;for(t=e._sounds.length-1;t>=0;t--){if(o<=n)return;e._sounds[t]._ended&&(e._webAudio&&e._sounds[t]._node&&e._sounds[t]._node.disconnect(0),e._sounds.splice(t,1),o--);}}},_getSoundIds:function(e){var n=this;if(void 0===e){for(var o=[],t=0;t<n._sounds.length;t++)o.push(n._sounds[t]._id);return o}return [e]},_refreshBuffer:function(e){var o=this;return e._node.bufferSource=n.ctx.createBufferSource(),e._node.bufferSource.buffer=r[o._src],e._panner?e._node.bufferSource.connect(e._panner):e._node.bufferSource.connect(e._node),e._node.bufferSource.loop=e._loop,e._loop&&(e._node.bufferSource.loopStart=e._start||0,e._node.bufferSource.loopEnd=e._stop||0),e._node.bufferSource.playbackRate.setValueAtTime(e._rate,n.ctx.currentTime),o},_cleanBuffer:function(e){var o=this,t=n._navigator&&n._navigator.vendor.indexOf("Apple")>=0;if(n._scratchBuffer&&e.bufferSource&&(e.bufferSource.onended=null,e.bufferSource.disconnect(0),t))try{e.bufferSource.buffer=n._scratchBuffer;}catch(e){}return e.bufferSource=null,o},_clearSound:function(e){/MSIE |Trident\//.test(n._navigator&&n._navigator.userAgent)||(e.src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");}};var t=function(e){this._parent=e,this.init();};t.prototype={init:function(){var e=this,o=e._parent;return e._muted=o._muted,e._loop=o._loop,e._volume=o._volume,e._rate=o._rate,e._seek=0,e._paused=!0,e._ended=!0,e._sprite="__default",e._id=++n._counter,o._sounds.push(e),e.create(),e},create:function(){var e=this,o=e._parent,t=n._muted||e._muted||e._parent._muted?0:e._volume;return o._webAudio?(e._node=void 0===n.ctx.createGain?n.ctx.createGainNode():n.ctx.createGain(),e._node.gain.setValueAtTime(t,n.ctx.currentTime),e._node.paused=!0,e._node.connect(n.masterGain)):n.noAudio||(e._node=n._obtainHtml5Audio(),e._errorFn=e._errorListener.bind(e),e._node.addEventListener("error",e._errorFn,!1),e._loadFn=e._loadListener.bind(e),e._node.addEventListener(n._canPlayEvent,e._loadFn,!1),e._node.src=o._src,e._node.preload=!0===o._preload?"auto":o._preload,e._node.volume=t*n.volume(),e._node.load()),e},reset:function(){var e=this,o=e._parent;return e._muted=o._muted,e._loop=o._loop,e._volume=o._volume,e._rate=o._rate,e._seek=0,e._rateSeek=0,e._paused=!0,e._ended=!0,e._sprite="__default",e._id=++n._counter,e},_errorListener:function(){var e=this;e._parent._emit("loaderror",e._id,e._node.error?e._node.error.code:0),e._node.removeEventListener("error",e._errorFn,!1);},_loadListener:function(){var e=this,o=e._parent;o._duration=Math.ceil(10*e._node.duration)/10,0===Object.keys(o._sprite).length&&(o._sprite={__default:[0,1e3*o._duration]}),"loaded"!==o._state&&(o._state="loaded",o._emit("load"),o._loadQueue()),e._node.removeEventListener(n._canPlayEvent,e._loadFn,!1);}};var r={},a=function(e){var n=e._src;if(r[n])return e._duration=r[n].duration,void d(e);if(/^data:[^;]+;base64,/.test(n)){for(var o=atob(n.split(",")[1]),t=new Uint8Array(o.length),a=0;a<o.length;++a)t[a]=o.charCodeAt(a);i(t.buffer,e);}else {var _=new XMLHttpRequest;_.open(e._xhr.method,n,!0),_.withCredentials=e._xhr.withCredentials,_.responseType="arraybuffer",e._xhr.headers&&Object.keys(e._xhr.headers).forEach(function(n){_.setRequestHeader(n,e._xhr.headers[n]);}),_.onload=function(){var n=(_.status+"")[0];if("0"!==n&&"2"!==n&&"3"!==n)return void e._emit("loaderror",null,"Failed loading audio file with status: "+_.status+".");i(_.response,e);},_.onerror=function(){e._webAudio&&(e._html5=!0,e._webAudio=!1,e._sounds=[],delete r[n],e.load());},u(_);}},u=function(e){try{e.send();}catch(n){e.onerror();}},i=function(e,o){var t=function(){o._emit("loaderror",null,"Decoding audio data failed.");},a=function(e){e&&o._sounds.length>0?(r[o._src]=e,d(o,e)):t();};"undefined"!=typeof Promise&&1===n.ctx.decodeAudioData.length?n.ctx.decodeAudioData(e).then(a).catch(t):n.ctx.decodeAudioData(e,a,t);},d=function(e,n){n&&!e._duration&&(e._duration=n.duration),0===Object.keys(e._sprite).length&&(e._sprite={__default:[0,1e3*e._duration]}),"loaded"!==e._state&&(e._state="loaded",e._emit("load"),e._loadQueue());},_=function(){if(n.usingWebAudio){try{"undefined"!=typeof AudioContext?n.ctx=new AudioContext:"undefined"!=typeof webkitAudioContext?n.ctx=new webkitAudioContext:n.usingWebAudio=!1;}catch(e){n.usingWebAudio=!1;}n.ctx||(n.usingWebAudio=!1);var e=/iP(hone|od|ad)/.test(n._navigator&&n._navigator.platform),o=n._navigator&&n._navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/),t=o?parseInt(o[1],10):null;if(e&&t&&t<9){var r=/safari/.test(n._navigator&&n._navigator.userAgent.toLowerCase());n._navigator&&!r&&(n.usingWebAudio=!1);}n.usingWebAudio&&(n.masterGain=void 0===n.ctx.createGain?n.ctx.createGainNode():n.ctx.createGain(),n.masterGain.gain.setValueAtTime(n._muted?0:n._volume,n.ctx.currentTime),n.masterGain.connect(n.ctx.destination)),n._setup();}};"function"==typeof define&&define.amd&&define([],function(){return {Howler:n,Howl:o}}),"undefined"!=typeof exports&&(exports.Howler=n,exports.Howl=o),"undefined"!=typeof global?(global.HowlerGlobal=e,global.Howler=n,global.Howl=o,global.Sound=t):"undefined"!=typeof window&&(window.HowlerGlobal=e,window.Howler=n,window.Howl=o,window.Sound=t);}();
