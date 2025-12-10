let canvas, ctx;
let heroImg, enemyImg, ufoImg, lifeImg, laserImg, smallLaserImg;
let shieldImg, backgroundImg, fogImg;
let backgroundPattern;
let nextStageBtn;

let gameObjects = [];
let hero;
let gameLoopId = null;
let stageClearPending = false;
let totalScore = 0;

let currentStage = 1;
const MAX_STAGE = 3;

const Messages = {
  KEY_EVENT_UP: "KEY_EVENT_UP",
  KEY_EVENT_DOWN: "KEY_EVENT_DOWN",
  KEY_EVENT_LEFT: "KEY_EVENT_LEFT",
  KEY_EVENT_RIGHT: "KEY_EVENT_RIGHT",
  KEY_EVENT_SPACE: "KEY_EVENT_SPACE",
  KEY_EVENT_ENTER: "KEY_EVENT_ENTER",

  COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
  COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",

  GAME_END_LOSS: "GAME_END_LOSS",
  GAME_END_WIN: "GAME_END_WIN"
};

class EventEmitter {
  constructor() {
    this.listeners = {};
  }
  on(message, listener) {
    if (!this.listeners[message]) this.listeners[message] = [];
    this.listeners[message].push(listener);
  }
  emit(message, payload = null) {
    if (!this.listeners[message]) return;
    this.listeners[message].forEach(l => l(message, payload));
  }
  clear() {
    this.listeners = {};
  }
}

const eventEmitter = new EventEmitter();

function showNextButton() {
  if (!nextStageBtn) return;
  nextStageBtn.disabled = false;
  nextStageBtn.textContent = "Next Stage ▶";
  nextStageBtn.classList.add("ready");
}
function hideNextButton() {
  if (!nextStageBtn) return;
  nextStageBtn.disabled = true;
  nextStageBtn.textContent = "Next Stage";
  nextStageBtn.classList.remove("ready");
}

function loadTexture(path) {
  return new Promise(resolve => {
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

function rectFromGameObject(go) {
  return {
    top: go.y,
    left: go.x,
    bottom: go.y + go.height,
    right: go.x + go.width
  };
}

function clearObjectTimers(go) {
  ["timer", "moveTimer", "fireTimer", "supportTimer", "orbitTimer"].forEach(key => {
    if (go[key]) {
      clearInterval(go[key]);
      go[key] = null;
    }
  });
  if (go.shieldTimer) {
    clearTimeout(go.shieldTimer);
    go.shieldTimer = null;
  }
}

class GameObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
    this.type = "GameObject";
    this.width = 0;
    this.height = 0;
    this.img = null;
  }
  draw(ctx) {
    if (this.img) ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
  }
  rect() {
    return rectFromGameObject(this);
  }
}

class Hero extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 99;
    this.height = 75;
    this.type = "Hero";
    this.img = heroImg;

    this.life = 3;
    this.points = 0;

    this.cooldown = 0;
    this.shieldActive = false;
    this.shieldTimer = null;
    this.charge = 0;
    this.maxCharge = 100;

    this.startSupportFire();
  }

  canFire() {
    return this.cooldown === 0;
  }

  fire() {
    if (!this.canFire()) return;
    const lx = this.x + this.width / 2 - 4;
    const ly = this.y - 10;
    gameObjects.push(new Laser(lx, ly));
    this.cooldown = 300;
    const id = setInterval(() => {
      this.cooldown -= 100;
      if (this.cooldown <= 0) {
        this.cooldown = 0;
        clearInterval(id);
      }
    }, 100);
  }

  startSupportFire() {
    const scale = 0.6;
    const subW = this.width * scale;
    const subY = () => this.y + 10;
    this.supportTimer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.supportTimer);
        return;
      }
      const leftX = this.x - subW - 40 + subW / 2 - 3;
      const rightX = this.x + this.width + 40 + subW / 2 - 3;
      gameObjects.push(new SmallLaser(leftX, subY()));
      gameObjects.push(new SmallLaser(rightX, subY()));
    }, 1200);
  }

  incrementPoints(amount = 100) {
    this.points += amount;
    totalScore += amount;
  }

  decrementLife() {
    if (this.shieldActive) return;
    this.life--;
    if (this.life <= 0) {
      this.life = 0;
      this.dead = true;
    }
  }

  addCharge(amount) {
    if (this.shieldActive) return;
    this.charge = Math.min(this.maxCharge, this.charge + amount);
    if (this.charge >= this.maxCharge) this.activateShield();
  }

  activateShield() {
    this.charge = 0;
    this.shieldActive = true;
    if (this.shieldTimer) clearTimeout(this.shieldTimer);
    this.shieldTimer = setTimeout(() => {
      this.shieldActive = false;
    }, 3000);
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

    ctx.drawImage(img, 0, 0, img.width, img.height, leftX, subY, subW, subH);
    ctx.drawImage(img, 0, 0, img.width, img.height, rightX, subY, subW, subH);

    if (this.shieldActive) {
      ctx.strokeStyle = "cyan";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10, 10);
      ctx.stroke();
    }
  }

  hitBox() {
    const scale = 0.6;
    const subW = this.width * scale;
    const leftX = this.x - subW - 40;
    const rightX = this.x + this.width + 40 + subW;
    return { top: this.y, bottom: this.y + this.height, left: leftX, right: rightX };
  }
}

class Enemy extends GameObject {
  constructor(x, y, speed = 5) {
    super(x, y);
    this.width = 98;
    this.height = 50;
    this.type = "Enemy";
    this.img = enemyImg;
    this.speed = speed;

    this.moveTimer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.moveTimer);
        return;
      }
      this.y += this.speed;
      if (this.y > canvas.height) {
        this.dead = true;
        clearInterval(this.moveTimer);
      }
    }, 400);
  }
}

class Boss extends GameObject {
  constructor() {
    const w = 150;
    const h = 90;
    const x = canvas.width / 2 - w / 2;
    const y = 40;
    super(x, y);
    this.width = w;
    this.height = h;
    this.type = "Boss";
    this.img = ufoImg;
    this.hp = 30;
    this.spreadAngle = 0;
    this.vx = 6;
    this.vy = 4;

    this.moveTimer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.moveTimer);
        return;
      }
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 40 || this.x + this.width > canvas.width - 40) {
        this.vx *= -1;
      }
      if (this.y < 20 || this.y + this.height > canvas.height / 2) {
        this.vy *= -1;
      }
    }, 120);

    this.fireTimer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.fireTimer);
        return;
      }
      const lx = this.x + this.width / 2 - 3;
      const ly = this.y + this.height / 2;
      const bulletCount = 6;
      const speed = 4; 
      this.spreadAngle += Math.PI / 10;
      for (let i = 0; i < bulletCount; i++) {
        const angle = this.spreadAngle + (Math.PI * 2 * i) / bulletCount;
        const dx = Math.cos(angle) * speed;
        const dy = Math.sin(angle) * speed;
        gameObjects.push(new BossLaser(lx, ly, dx, dy));
      }
    }, 4000);

    gameObjects.push(new OrbitingBlade(this, 0));
    gameObjects.push(new OrbitingBlade(this, Math.PI));
  }

  hit() {
    this.hp--;
    hero.incrementPoints(50);
    if (this.hp <= 0) {
      this.dead = true;
      hero.incrementPoints(500);
      eventEmitter.emit(Messages.GAME_END_WIN);
    }
  }

  draw(ctx) {
    super.draw(ctx);
    ctx.fillStyle = "red";
    ctx.fillRect(this.x, this.y - 10, this.width, 6);
    ctx.fillStyle = "lime";
    const ratio = this.hp / 30;
    ctx.fillRect(this.x, this.y - 10, this.width * ratio, 6);
  }
}

class Laser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 9;
    this.height = 33;
    this.type = "Laser";
    this.img = laserImg;
    this.timer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.timer);
        return;
      }
      this.y -= 15;
      if (this.y < -this.height) {
        this.dead = true;
        clearInterval(this.timer);
      }
    }, 60);
  }
}

class SmallLaser extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.width = 6;
    this.height = 20;
    this.type = "SupportLaser";
    this.img = smallLaserImg;
    this.timer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.timer);
        return;
      }
      this.y -= 12;
      if (this.y < -this.height) {
        this.dead = true;
        clearInterval(this.timer);
      }
    }, 80);
  }
}

class BossLaser extends GameObject {
  constructor(x, y, dx = 0, dy = 10) {
    super(x, y);
    this.width = 6;
    this.height = 20;
    this.type = "BossLaser";
    this.img = laserImg;
    this.dx = dx;
    this.dy = dy;
    this.timer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.timer);
        return;
      }
      this.x += this.dx;
      this.y += this.dy;
      if (
        this.y > canvas.height + this.height ||
        this.y < -this.height * 2 ||
        this.x < -this.width * 2 ||
        this.x > canvas.width + this.width * 2
      ) {
        this.dead = true;
        clearInterval(this.timer);
      }
    }, 80);
  }
}

class EnemyLaser extends GameObject {
  constructor(x, y, speed = 7) {
    super(x, y);
    this.width = 6;
    this.height = 16;
    this.type = "EnemyLaser";
    this.img = smallLaserImg;
    this.dy = speed;
    this.timer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.timer);
        return;
      }
      this.y += this.dy;
      if (this.y > canvas.height + this.height) {
        this.dead = true;
        clearInterval(this.timer);
      }
    }, 80);
  }
}

class OrbitingBlade extends GameObject {
  constructor(boss, angle = 0) {
    super(boss.x, boss.y);
    this.width = 12;
    this.height = 12;
    this.type = "Blade";
    this.img = laserImg;
    this.angle = angle;
    this.radius = 120;
    this.speed = 0.05;
    this.boss = boss;
    this.orbitTimer = setInterval(() => {
      if (this.dead || this.boss.dead) {
        this.dead = true;
        clearInterval(this.orbitTimer);
        return;
      }
      this.angle += this.speed;
      this.x = this.boss.x + this.boss.width / 2 + Math.cos(this.angle) * this.radius;
      this.y = this.boss.y + this.boss.height / 2 + Math.sin(this.angle) * this.radius;
    }, 40);
  }
}

class FogOverlay extends GameObject {
  constructor() {
    super(0, 0);
    this.type = "Fog";
    this.width = canvas.width;
    this.height = canvas.height;
    this.opacity = 0.28;
    this.vx = 0.5;
    this.vy = 0.15;
    this.timer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.timer);
        return;
      }
      this.x += this.vx;
      if (this.x > 20 || this.x < -20) this.vx *= -1;
      this.y += this.vy;
      if (this.y > canvas.height + 30) {
        this.dead = true;
        clearInterval(this.timer);
      }
    }, 80);
  }
  draw(ctx) {
    if (!fogImg) return;
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.drawImage(fogImg, this.x, this.y, this.width, this.height);
    ctx.restore();
  }
}

class EnergyOrb extends GameObject {
  constructor(x, y) {
    super(x, y);
    this.type = "EnergyOrb";
    this.width = 20;
    this.height = 20;
    this.img = shieldImg;
    this.vy = 3;
    this.timer = setInterval(() => {
      if (this.dead) {
        clearInterval(this.timer);
        return;
      }
      this.y += this.vy;
      if (this.y > canvas.height + this.height) {
        this.dead = true;
        clearInterval(this.timer);
      }
    }, 60);
  }
}

function spawnFog() {
  gameObjects.push(new FogOverlay());
}

function createStageEnemies() {
  if (currentStage === 1) {
    const rows = 4;
    const cols = 7;
    const gapX = 100;
    const enemyW = 98;
    const totalW = enemyW + (cols - 1) * gapX;
    const startX = (canvas.width - totalW) / 2;
    const startY = 60;
    const gapY = 60;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const e = new Enemy(startX + c * gapX, startY + r * gapY, 4);
        gameObjects.push(e);
      }
    }
  } else if (currentStage === 2) {
    const rows = 5;
    for (let row = 0; row < rows; row++) {
      const count = rows - row;
      const totalW = count * 98;
      const startX = (canvas.width - totalW) / 2;
      const y = 50 + row * 60;
      for (let i = 0; i < count; i++) {
        const e = new Enemy(startX + i * 98, y, 6);
        gameObjects.push(e);
      }
    }
  } else if (currentStage === 3) {
    const boss = new Boss();
    gameObjects.push(boss);
  }
}

function isHeroDead() {
  return hero.life <= 0;
}

function aliveEnemies() {
  return gameObjects.filter(go => go.type === "Enemy" && !go.dead);
}

function isEnemiesDead() {
  return aliveEnemies().length === 0 && !gameObjects.some(go => go.type === "Boss" && !go.dead);
}

function drawPoints() {
  ctx.font = "20px Arial";
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.fillText("Points: " + totalScore, 10, canvas.height - 20);
}

function drawLife() {
  const START_POS = canvas.width - 180;
  for (let i = 0; i < hero.life; i++) {
    ctx.drawImage(
      lifeImg,
      START_POS + 45 * (i + 1),
      canvas.height - 40,
      32,
      32
    );
  }
}

function drawStageInfo() {
  ctx.font = "20px Arial";
  ctx.fillStyle = "yellow";
  ctx.textAlign = "center";
  ctx.fillText(`Stage ${currentStage} / ${MAX_STAGE}`, canvas.width / 2, 30);
}

function drawCharge() {
  const gaugeW = 220;
  const gaugeH = 16;
  const gaugeX = 10;
  const gaugeY = 20;

  const percent = Math.floor((hero.charge / hero.maxCharge) * 100);

  ctx.textAlign = "left";
  ctx.font = "14px Arial";
  ctx.fillStyle = "white";
  ctx.fillText("Charge", gaugeX, gaugeY - 6);

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(gaugeX, gaugeY, gaugeW, gaugeH);

  ctx.fillStyle = hero.shieldActive ? "#66ccff" : "#7df57d";
  ctx.fillRect(gaugeX, gaugeY, gaugeW * (percent / 100), gaugeH);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(gaugeX, gaugeY, gaugeW, gaugeH);

  ctx.fillStyle = "black";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${percent}%`, gaugeX + gaugeW / 2, gaugeY + gaugeH - 3);
}

function displayMessage(message, color = "red") {
  ctx.font = "26px Arial";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function goNextStageOrWin() {
  stageClearPending = false;
  hideNextButton();
  if (currentStage < MAX_STAGE) {
    currentStage++;
    initGame(true);
  } else {
    eventEmitter.emit(Messages.GAME_END_WIN);
  }
}

function endGame(win) {
  clearInterval(gameLoopId);
  gameObjects.forEach(clearObjectTimers);
  if (hero) clearObjectTimers(hero);
  hideNextButton();
  setTimeout(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (win) {
      displayMessage("Victory! Press [Enter] to play again.", "green");
    } else {
      displayMessage("You died... Press [Enter] to try again.");
    }
  }, 200);
}

function resetGameAll() {
  currentStage = 1;
  totalScore = 0;
  initGame(false);
}

function startGameLoop() {
  if (gameLoopId) clearInterval(gameLoopId);
  gameLoopId = setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (backgroundPattern) {
      ctx.fillStyle = backgroundPattern;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    updateGameObjects();
    drawGameObjects(ctx);

    drawStageInfo();
    drawCharge();
    drawPoints();
    drawLife();

    if (stageClearPending) {
      ctx.font = "26px Arial";
      ctx.fillStyle = "#ffcc66";
      ctx.textAlign = "center";
      ctx.fillText("Stage Clear! Click Next ▶", canvas.width / 2, canvas.height / 2);
    }
  }, 100);
}

function drawGameObjects(ctx) {
  gameObjects.forEach(go => go.draw(ctx));

  if (currentStage >= 2) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    if (fogImg) ctx.drawImage(fogImg, 0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function updateGameObjects() {
  const enemies = gameObjects.filter(go => go.type === "Enemy");
  const boss = gameObjects.find(go => go.type === "Boss" && !go.dead);
  const lasers = gameObjects.filter(go =>
    go.type === "Laser" || go.type === "SupportLaser"
  );
  const bossLasers = gameObjects.filter(go => go.type === "BossLaser");
  const enemyLasers = gameObjects.filter(go => go.type === "EnemyLaser");
  const blades = gameObjects.filter(go => go.type === "Blade");
  const orbs = gameObjects.filter(go => go.type === "EnergyOrb");

  if (!hero.dead) {
    const perTick = currentStage === 1 ? 0.6 : currentStage === 2 ? 0.8 : 1.0;
    hero.addCharge(perTick);
  }

  lasers.forEach(l => {
    enemies.forEach(e => {
      if (!l.dead && !e.dead && intersectRect(l.rect(), e.rect())) {
        eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, { first: l, second: e });
      }
    });
    if (boss && !boss.dead && intersectRect(l.rect(), boss.rect())) {
      l.dead = true;
      boss.hit();
    }
  });

  bossLasers.forEach(bl => {
    if (!bl.dead && !hero.dead && intersectRect(bl.rect(), hero.hitBox())) {
      bl.dead = true;
      eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy: bl });
    }
  });

  enemyLasers.forEach(el => {
    if (!el.dead && !hero.dead && intersectRect(el.rect(), hero.hitBox())) {
      el.dead = true;
      eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy: el });
    }
  });

  blades.forEach(bl => {
    if (!bl.dead && !hero.dead && intersectRect(bl.rect(), hero.hitBox())) {
      bl.dead = true;
      eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy: bl });
    }
  });

  orbs.forEach(orb => {
    if (!orb.dead && !hero.dead && intersectRect(orb.rect(), hero.hitBox())) {
      orb.dead = true;
      hero.addCharge(30);
      hero.incrementPoints(200);
    }
  });

  enemies.forEach(e => {
    if (!e.dead && !hero.dead && intersectRect(e.rect(), hero.hitBox())) {
      eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy: e });
    }
  });

  const shootChance = currentStage === 1 ? 0.004 : 0.007;
  enemies.forEach(e => {
    if (!e.dead && Math.random() < shootChance) {
      const lx = e.x + e.width / 2 - 3;
      const ly = e.y + e.height;
      gameObjects.push(new EnemyLaser(lx, ly, currentStage === 1 ? 6 : 8));
    }
  });

  if (Math.random() < 0.0009) {
    const x = 80 + Math.random() * (canvas.width - 160);
    gameObjects.push(new EnergyOrb(x, -20));
  }

  gameObjects = gameObjects.filter(go => !go.dead);
}

function initGame(keepStage) {
  if (!keepStage) {
    currentStage = currentStage || 1;
    totalScore = 0;
  }

  gameObjects.forEach(clearObjectTimers);
  if (hero) clearObjectTimers(hero);
  gameObjects = [];
  stageClearPending = false;
  hideNextButton();
  hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
  gameObjects.push(hero);

  createStageEnemies();

  eventEmitter.clear();

  eventEmitter.on(Messages.KEY_EVENT_UP, () => (hero.y -= 10));
  eventEmitter.on(Messages.KEY_EVENT_DOWN, () => (hero.y += 10));
  eventEmitter.on(Messages.KEY_EVENT_LEFT, () => (hero.x -= 10));
  eventEmitter.on(Messages.KEY_EVENT_RIGHT, () => (hero.x += 10));
  eventEmitter.on(Messages.KEY_EVENT_SPACE, () => hero.fire());

  eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
    first.dead = true;
    second.dead = true;
    hero.incrementPoints();

    if (isEnemiesDead() && !hero.dead && currentStage < MAX_STAGE) {
      stageClearPending = true;
      showNextButton();
    }
  });

  eventEmitter.on(Messages.COLLISION_ENEMY_HERO, (_, { enemy }) => {
    enemy.dead = true;
    hero.decrementLife();
    if (isHeroDead()) {
      eventEmitter.emit(Messages.GAME_END_LOSS);
      return;
    }
    if (isEnemiesDead() && currentStage < MAX_STAGE) {
      stageClearPending = true;
      showNextButton();
    }
  });

  eventEmitter.on(Messages.GAME_END_WIN, () => endGame(true));
  eventEmitter.on(Messages.GAME_END_LOSS, () => endGame(false));

  eventEmitter.on(Messages.KEY_EVENT_ENTER, () => {
    resetGameAll();
    startGameLoop();
  });

  startGameLoop();
}
window.addEventListener("keyup", evt => {
  if (evt.key === "ArrowUp") eventEmitter.emit(Messages.KEY_EVENT_UP);
  else if (evt.key === "ArrowDown") eventEmitter.emit(Messages.KEY_EVENT_DOWN);
  else if (evt.key === "ArrowLeft") eventEmitter.emit(Messages.KEY_EVENT_LEFT);
  else if (evt.key === "ArrowRight") eventEmitter.emit(Messages.KEY_EVENT_RIGHT);
  else if (evt.key === " ") eventEmitter.emit(Messages.KEY_EVENT_SPACE);
  else if (evt.key === "Enter") eventEmitter.emit(Messages.KEY_EVENT_ENTER);
});

window.onload = async () => {
  canvas = document.getElementById("myCanvas");
  ctx = canvas.getContext("2d");
  nextStageBtn = document.getElementById("nextStageBtn");
  nextStageBtn.addEventListener("click", () => {
    if (stageClearPending) goNextStageOrWin();
  });

  heroImg = await loadTexture("assets/player.png");
  enemyImg = await loadTexture("assets/enemyShip.png");
  ufoImg = await loadTexture("assets/enemyUFO.png");
  lifeImg = await loadTexture("assets/life.png");
  laserImg = await loadTexture("assets/laserRed.png");
  smallLaserImg = await loadTexture("assets/laserGreen.png");
  shieldImg = await loadTexture("assets/shield.png");
  backgroundImg = await loadTexture("assets/Background/starBackground.png");
  fogImg = await loadTexture("assets/fog.png");

  backgroundPattern = ctx.createPattern(backgroundImg, "repeat");

  hideNextButton();
  initGame(false);
};
