const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",
  KEY_EVENT_SPACE: "KEY_EVENT_SPACE",
  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",
};

function loadTexture(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.onload = () => resolve(img);
  });
}

function intersectRect(r1, r2) {
  return !(
    r2.left > r1.right ||
    r2.right < r1.left ||
    r2.top > r1.bottom ||
    r2.bottom < r1.top
  );
}

class EventEmitter {
  constructor() {
    this.listeners = {};
  }
  on(message, listener) {
    if (!this.listeners[message]) {
      this.listeners[message] = [];
    }
    this.listeners[message].push(listener);
  }
  emit(message, payload = null) {
    if (this.listeners[message]) {
      this.listeners[message].forEach((l) => l(message, payload));
    }
  }
}

let heroImg,
  enemyImg,
  laserImg,
  smallLaserImg,
  explosionImg,
  canvas,
  ctx,
  backgroundImg,
  backgroundPattern,
  gameObjects = [],
  hero,
  eventEmitter = new EventEmitter();

class GameObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
    this.type = "";
    this.width = 0;
    this.height = 0;
    this.img = undefined;
  }
  rectFromGameObject() {
    return {
      top: this.y,
      left: this.x,
      bottom: this.y + this.height,
      right: this.x + this.width,
    };
  }
  draw(ctx) {
    ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }
}

class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 99;
    this.height = 75;
    this.type = "Hero";
    this.cooldown = 0;      
    this.supportIntervalId = null;
    this.startSupportFire();  
  }

  fire() {
    if (this.canFire()) {
      gameObjects.push(
        new Laser(this.x + this.width / 2 - 4, this.y - 10)
      );
      this.cooldown = 500; 

      let id = setInterval(() => {
        if (this.cooldown > 0) {
          this.cooldown -= 100;
        } else {
          clearInterval(id);
        }
      }, 100);
    }
  }

  canFire() {
    return this.cooldown === 0;
  }

  startSupportFire() {
    this.supportIntervalId = setInterval(() => {
      if (this.dead) {
        clearInterval(this.supportIntervalId);
        return;
      }
      const scale = 0.6;
      const subW = this.width * scale;
      const subY = this.y + 10;
      const leftX = this.x - subW - 40 + subW / 2 - 3;
      const rightX = this.x + this.width + 40 + subW / 2 - 3;

      gameObjects.push(new SmallLaser(leftX, subY));
      gameObjects.push(new SmallLaser(rightX, subY));
    }, 700); 
  }
  
  draw(ctx) {
    super.draw(ctx);

    const img = this.img;
    const scale = 0.6;
    const subW = this.width * scale;
    const subH = this.height * scale;
    const subY = this.y + 10;
    const leftX = this.x - subW - 40;
    const rightX = this.x + this.width + 40;

    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      leftX,
      subY,
      subW,
      subH
    );

    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      rightX,
      subY,
      subW,
      subH
    );
  }
}

class Enemy extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";

    let id = setInterval(() => {
      if (this.dead) {
        clearInterval(id);
        return;
      }
      if (this.y < canvas.height - this.height - 200) {
        this.y += 5;
      } else {
        clearInterval(id);
      }
    }, 300);
  }
}

class Laser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 9;
    this.height = 33;
    this.type = "Laser";
    this.img = laserImg;

    let id = setInterval(() => {
      if (this.dead) {
        clearInterval(id);
        return;
      }
      if (this.y > 0) {
        this.y -= 15;
      } else {
        this.dead = true;
        clearInterval(id);
      }
    }, 100);
  }
}

class SmallLaser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 6;
    this.height = 20;
    this.type = "SupportLaser";
    this.img = smallLaserImg;

    let id = setInterval(() => {
      if (this.dead) {
        clearInterval(id);
        return;
      }
      if (this.y > 0) {
        this.y -= 12;
      } else {
        this.dead = true;
        clearInterval(id);
      }
    }, 100);
  }
}

class Explosion extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 100;
    this.height = 100;
    this.type = "Explosion";
    this.img = explosionImg;


    setTimeout(() => {
      this.dead = true;
    }, 300); 
  }
}

function createHero() {
  hero = new Hero(
    canvas.width / 2 - 45,
    canvas.height - canvas.height / 4
  );
  hero.img = heroImg;
  gameObjects.push(hero);
}

function createEnemies2() {
  const rows = 5;

  for (let row = 0; row < rows; row++) {
    const count = rows - row; 
    const totalWidth = count * 98;
    const startX = (canvas.width - totalWidth) / 2;

    for (let col = 0; col < count; col++) {
      const x = startX + col * 98;
      const y = row * 50;

      const enemy = new Enemy(x, y);
      enemy.img = enemyImg;
      gameObjects.push(enemy);
    }
  }
}

function drawGameObjects(ctx) {
  gameObjects.forEach((go) => go.draw(ctx));
}

function updateGameObjects() {
  const enemies = gameObjects.filter((go) => go.type === "Enemy");
  const lasers = gameObjects.filter(
    (go) => go.type === "Laser" || go.type === "SupportLaser"
  );

  lasers.forEach((l) => {
    enemies.forEach((m) => {
      if (
        intersectRect(
          l.rectFromGameObject(),
          m.rectFromGameObject()
        )
      ) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, {
          first: l,
          second: m,
        });
      }
    });
  });

  gameObjects = gameObjects.filter((go) => !go.dead);
}

function initGame() {
  gameObjects = [];
  createEnemies2();
  createHero();

  eventEmitter.on(Messages.KEY_EVENT_UP, () => {
    hero.y -= 5;
  });
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => {
    hero.y += 5;
  });
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => {
    hero.x -= 5;
  });
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => {
    hero.x += 5;
  });
  eventEmitter.on(Messages.KEY_EVENT_SPACE, () => {
    if (hero.canFire()) {
      hero.fire();
    }
  });

  eventEmitter.on(
    Messages.COLLISION_ENEMY_LASER,
    (_, { first, second }) => {
      first.dead = true;  
      second.dead = true; 

      const exX = second.x + second.width / 2 - 50;
      const exY = second.y + second.height / 2 - 50;
      const explosion = new Explosion(exX, exY);
      gameObjects.push(explosion);
    }
  );
}

window.addEventListener("keyup", (evt) => {
  if (evt.key === "ArrowUp") {
    eventEmitter.emit(Messages.KEY_EVENT_UP);
  } else if (evt.key === "ArrowDown") {
    eventEmitter.emit(Messages.KEY_EVENT_DOWN);
  } else if (evt.key === "ArrowLeft") {
    eventEmitter.emit(Messages.KEY_EVENT_LEFT);
  } else if (evt.key === "ArrowRight") {
    eventEmitter.emit(Messages.KEY_EVENT_RIGHT);
  } else if (evt.keyCode === 32) {
    eventEmitter.emit(Messages.KEY_EVENT_SPACE);
  }
});

window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");

  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  laserImg = await loadTexture("assets/laserRed.png");
  smallLaserImg = await loadTexture("assets/laserGreen.png");
  explosionImg = await loadTexture("assets/explosion.png");

  backgroundImg = await loadTexture("assets/Background/starBackground.png");
  backgroundPattern = ctx.createPattern(backgroundImg, "repeat");

  initGame();

  setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (backgroundPattern) {
      ctx.fillStyle = backgroundPattern;
      } else {
      ctx.fillStyle = "black";
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGameObjects(ctx);
    updateGameObjects();
  }, 100);
};