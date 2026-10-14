const arena = document.querySelector(".arena");
const blueFighter = document.querySelector(".fighter--blue");
const redFighter = document.querySelector(".fighter--red");
const movementSpeed = 280;
const gravity = 1800;
const jumpSpeed = 680;
const heldKeys = new Set();
const redHeldKeys = new Set();

function createFighter(element, leftKey, rightKey, jumpKey) {
  const rect = element.getBoundingClientRect();
  return {
    element,
    leftKey,
    rightKey,
    jumpKey,
    x: 0,
    y: 0,
    velocityY: 0,
    grounded: true,
    baseLeft: rect.left,
    groundBottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

const blue = createFighter(blueFighter, "a", "d", "w");
const red = createFighter(redFighter, "ArrowLeft", "ArrowRight", "ArrowUp");
let animationFrame = null;
let previousFrameTime = 0;

function updateFighterStyle(fighter) {
  fighter.element.style.setProperty("--player-x", `${fighter.x}px`);
  fighter.element.style.setProperty("--player-y", `${fighter.y}px`);
}

function getBox(fighter, x = fighter.x, y = fighter.y) {
  const left = fighter.baseLeft + x;
  const top = fighter.groundBottom - y - fighter.height;
  return { left, right: left + fighter.width, top, bottom: top + fighter.height };
}

function overlapX(first, second) {
  return first.right > second.left && first.left < second.right;
}

function moveHorizontally(fighter, other, direction, elapsed) {
  if (!direction) return;

  const arenaRect = arena.getBoundingClientRect();
  const current = getBox(fighter);
  const otherBox = getBox(other);
  let nextX = fighter.x + direction * movementSpeed * elapsed;
  nextX = Math.max(arenaRect.left + 16 - fighter.baseLeft,
    Math.min(arenaRect.right - 16 - fighter.width - fighter.baseLeft, nextX));

  const nextBox = getBox(fighter, nextX);
  const verticalOverlap = nextBox.bottom > otherBox.top && nextBox.top < otherBox.bottom;
  if (verticalOverlap && overlapX(nextBox, otherBox) && !overlapX(current, otherBox)) {
    nextX = direction > 0
      ? otherBox.left - 24 - fighter.width - fighter.baseLeft
      : otherBox.right + 24 - fighter.baseLeft;
  }

  fighter.x = nextX;
}

function updateVertical(fighter, other, elapsed) {
  const previousBox = getBox(fighter);
  fighter.velocityY -= gravity * elapsed;
  const nextY = Math.max(0, fighter.y + fighter.velocityY * elapsed);
  const nextBox = getBox(fighter, fighter.x, nextY);
  const otherBox = getBox(other);

  if (fighter.velocityY <= 0 && overlapX(nextBox, otherBox)
      && previousBox.bottom <= otherBox.top && nextBox.bottom >= otherBox.top) {
    fighter.y = fighter.groundBottom - otherBox.top;
    fighter.velocityY = 0;
    fighter.grounded = true;
    return;
  }

  fighter.y = nextY;
  if (fighter.y === 0) {
    fighter.velocityY = 0;
    fighter.grounded = true;
  } else {
    fighter.grounded = false;
  }
}

function gameLoop(time) {
  const elapsed = previousFrameTime ? Math.min((time - previousFrameTime) / 1000, 0.032) : 0;
  previousFrameTime = time;

  const blueDirection = Number(heldKeys.has(blue.rightKey)) - Number(heldKeys.has(blue.leftKey));
  const redDirection = Number(redHeldKeys.has(red.rightKey)) - Number(redHeldKeys.has(red.leftKey));
  moveHorizontally(blue, red, blueDirection, elapsed);
  moveHorizontally(red, blue, redDirection, elapsed);

  // Resolve the lower fighter first so the upper fighter can land on its new position.
  if (blue.y <= red.y) {
    updateVertical(blue, red, elapsed);
    updateVertical(red, blue, elapsed);
  } else {
    updateVertical(red, blue, elapsed);
    updateVertical(blue, red, elapsed);
  }

  updateFighterStyle(blue);
  updateFighterStyle(red);

  const active = heldKeys.size || redHeldKeys.size || !blue.grounded || !red.grounded;
  if (active) {
    animationFrame = requestAnimationFrame(gameLoop);
  } else {
    animationFrame = null;
    previousFrameTime = 0;
  }
}

function ensureGameLoop() {
  if (animationFrame === null) {
    previousFrameTime = 0;
    animationFrame = requestAnimationFrame(gameLoop);
  }
}

function jump(fighter) {
  if (!fighter.grounded) return;
  fighter.velocityY = jumpSpeed;
  fighter.grounded = false;
  fighter.element.classList.add("is-jumping");
  window.setTimeout(() => fighter.element.classList.remove("is-jumping"), 100);
  ensureGameLoop();
}

document.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const allKeys = [blue.leftKey, blue.rightKey, blue.jumpKey, red.leftKey, red.rightKey, red.jumpKey];
  if (!allKeys.includes(key)) return;

  event.preventDefault();
  if (key === blue.jumpKey || key === red.jumpKey) {
    if (!event.repeat) jump(key === blue.jumpKey ? blue : red);
    return;
  }

  const keys = key === blue.leftKey || key === blue.rightKey ? heldKeys : redHeldKeys;
  const fighter = keys === heldKeys ? blue : red;
  keys.add(key);
  fighter.element.classList.add("is-walking");
  ensureGameLoop();
});

document.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const keys = key === blue.leftKey || key === blue.rightKey ? heldKeys : redHeldKeys;
  keys.delete(key);
  if (key === blue.leftKey || key === blue.rightKey) {
    blueFighter.classList.toggle("is-walking", heldKeys.size > 0);
  } else if (key === red.leftKey || key === red.rightKey) {
    redFighter.classList.toggle("is-walking", redHeldKeys.size > 0);
  }
});

window.addEventListener("blur", () => {
  heldKeys.clear();
  redHeldKeys.clear();
  blueFighter.classList.remove("is-walking");
  redFighter.classList.remove("is-walking");
});

window.addEventListener("resize", () => {
  for (const fighter of [blue, red]) {
    const rect = fighter.element.getBoundingClientRect();
    fighter.baseLeft = rect.left - fighter.x;
    fighter.groundBottom = rect.bottom + fighter.y;
    fighter.width = rect.width;
    fighter.height = rect.height;
  }
  ensureGameLoop();
});
