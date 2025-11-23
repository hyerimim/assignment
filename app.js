function loadTexture(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = path;
    img.onload = () => resolve(img);
  });
}

function createEnemies(ctx, canvas, enemyImg) {
  const MONSTER_TOTAL = 5;
  const MONSTER_WIDTH = MONSTER_TOTAL * enemyImg.width;
  const START_X = (canvas.width - MONSTER_WIDTH) / 2;
  const STOP_X = START_X + MONSTER_WIDTH;

  for (let x = START_X; x < STOP_X; x += enemyImg.width) {
    for (let y = 0; y < enemyImg.height * 5; y += enemyImg.height) {
      ctx.drawImage(enemyImg, x, y);
    }
  }
}

function createEnemies2(ctx, canvas, enemyImg) {
  const rows = 5;

  for (let row = 0; row < rows; row++) {
    const count = rows - row;
    const totalWidth = count * enemyImg.width;
    const startX = (canvas.width - totalWidth) / 2;

    for (let col = 0; col < count; col++) {
      const x = startX + col * enemyImg.width;
      const y = row * enemyImg.height;

      ctx.drawImage(enemyImg, x, y);
    }
  }
}

window.onload = async () => {
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");

  const heroImg = await loadTexture("assets/player.png");
  const enemyImg = await loadTexture("assets/enemyShip.png");

  const backgroundImg = await loadTexture("assets/Background/starBackground.png");

  const pattern = ctx.createPattern(backgroundImg, "repeat");
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const heroX = canvas.width / 2 - heroImg.width / 2;
  const heroY = canvas.height - canvas.height / 4;

  ctx.drawImage(heroImg, heroX, heroY);

  const subW = heroImg.width * 0.6;
  const subH = heroImg.height * 0.6;

  ctx.drawImage(
    heroImg,
    0, 0, heroImg.width, heroImg.height,
    heroX - subW - 40,
    heroY + 10,
    subW,
    subH
  );

  ctx.drawImage(
    heroImg,
    0, 0, heroImg.width, heroImg.height,
    heroX + heroImg.width + 40,
    heroY + 10,
    subW,
    subH
  );

  createEnemies2(ctx, canvas, enemyImg);
};
