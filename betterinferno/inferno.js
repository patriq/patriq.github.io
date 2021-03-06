// Entities enum
const PLAYER = 0;
const BAT = 1;
const BLOB = 2;
const SNAKE = 3;
const RANGER = 4;
const MAGER = 5;

// All entities
const ENTITY_INFOS = [
  {
    name: 'Player',
    size: 1,
    range: 10,
    cooldown: 0,
    color: 'cyan',
  },
  {
    name: 'Bat',
    size: 2,
    range: 4,
    cooldown: 3,
    color: 'grey',
  },
  {
    name: 'Blob',
    size: 3,
    range: 15,
    cooldown: 6,
    color: 'yellow',
  },

  {
    name: 'Snake',
    size: 4,
    range: 1,
    cooldown: 4,
    color: 'orange',
  },
  {
    name: 'Ranger',
    size: 3,
    range: 15,
    cooldown: 4,
    color: 'lime',
  },
  {
    name: 'Mager',
    size: 4,
    range: 15,
    cooldown: 4,
    color: 'red',
  },
];

const ZUK_SAFE_SPOTS = [[3, 0], [9, 0], [14, 0], [19, 0], [25, 0]];

// Spawns
const SPAWNS = [[1, 5], [22, 5], [3, 11], [23, 12], [16, 17], [5, 23], [23, 25], [1, 28], [15, 28]];
const SPAWN_SIZE = 4;
const NIBBLERS_SPAWN = [8, 13];
const NIBBLERS_SIZE = 3;

// Pillars
const PILLAR_WEST = 0;
const PILLAR_NORTH = 1;
const PILLAR_SOUTH = 2;
const PILLARS = [[0, 9], [17, 7], [10, 23]];
const PILLAR_SIZE = 3;

// Map constants
const TILE_SIZE = 25;
const MAP_TILE_WIDTH = 29;
const MAP_TILE_HEIGHT = 30;
const TAPE_TILE_WIDTH = 6;
const TAPE_SIZE = 6;
const MAP_WIDTH = TILE_SIZE * (MAP_TILE_WIDTH + TAPE_SIZE);
const MAP_HEIGHT = TILE_SIZE * MAP_TILE_HEIGHT;

// Element variables
let map = null;
let ctx = null;
let typeLabel = null;
let mage = null;
let range = null;
let melee = null;

// Main variables
let currentEntity = null;
let currentEntities = null;
let tape = null;
let pillarAlive = null;
let prayActive = null;
let nextTickPrayActive = null;

// Handlers
window.addEventListener('load', () => {
  // Fetch map and set it's size and register it's listeners
  map = document.getElementById('map');
  ctx = map.getContext('2d');
  map.width = MAP_WIDTH;
  map.height = MAP_HEIGHT;
  map.addEventListener('mousedown', onMapClick);

  // Fetch type label
  typeLabel = document.getElementById('type');

  // Add keyboard listener
  document.addEventListener('keydown', onKeyDown);

  // Add prayer listeners
  mage = document.getElementById('mage');
  range = document.getElementById('range');
  melee = document.getElementById('melee');
  mage.addEventListener('click', onPrayClick(0));
  range.addEventListener('click', onPrayClick(1));
  melee.addEventListener('click', onPrayClick(2));

  // Re-load and render
  window.onpopstate = onReload;
  onReload();
});

const onReload = () => {
  // Clear
  resetState();

  // Check if we have any state in the URL
  decodeStateFromUrl();

  // Render
  render();
};

const onMapClick = (event) => {
  const x = Math.floor(event.offsetX / TILE_SIZE);
  const y = Math.floor(event.offsetY / TILE_SIZE);
  if (x < MAP_TILE_WIDTH) {
    currentEntity.tile = [x, y];
    render();
  }
};

const onKeyDown = (event) => {
  if (event.key === 'ArrowRight') {
    step();
  }
  if (event.key === 'ArrowLeft') {
    resetTape();
  }

  // All different NPCs
  if (event.key === '1') {
    switchCurrentEntityType(PLAYER);
  }
  if (event.key === '2') {
    switchCurrentEntityType(BAT);
  }
  if (event.key === '3') {
    switchCurrentEntityType(BLOB);
  }
  if (event.key === '4') {
    switchCurrentEntityType(SNAKE);
  }
  if (event.key === '5') {
    switchCurrentEntityType(RANGER);
  }
  if (event.key === '6') {
    switchCurrentEntityType(MAGER);
  }

  // Place NPC and clear NPCs
  if (event.key === ' ') {
    placeCurrentEntity();
    encodeStateToUrl();
  }
  if (event.key === 'Escape') {
    resetTape();
    resetState();
    encodeStateToUrl();
  }

  // Toggle pillars
  if (event.key === 'n') {
    togglePillar(PILLAR_NORTH);
    encodeStateToUrl();
  }
  if (event.key === 's') {
    togglePillar(PILLAR_SOUTH);
    encodeStateToUrl();
  }
  if (event.key === 'w') {
    togglePillar(PILLAR_WEST);
    encodeStateToUrl();
  }

  render();
};

const onPrayClick = (pray) => () => {
  // Make sure that when you select a prayer, the others get swapped
  const temp = [false, false, false];
  nextTickPrayActive[pray] = !nextTickPrayActive[pray];
  temp[pray] = nextTickPrayActive[pray];
  nextTickPrayActive = [...temp];
}

// Entity functions
const placeCurrentEntity = () => {
  if (currentEntity.type !== PLAYER) {
    // Prevent 2 mobs on same tile
    const [currentTileX, currentTileY] = currentEntity.tile;
    for (const entity of currentEntities) {
      const [tileX, tileY] = entity.tile;
      if (currentTileX === tileX && currentTileY === tileY) {
        return;
      }
    }

    // Add it
    const entity = JSON.parse(JSON.stringify(currentEntity)); // Hack to deep copy
    entity.cycle = 0;
    entity.originalTile = entity.tile;
    currentEntities.push(entity);
    currentEntities.sort((a, b) => {
      return b.type - a.type;
    });
  }
};

const switchCurrentEntityType = (newType) => {
  currentEntity.type = newType;
};

const resetState = () => {
  currentEntity = {tile: [16, 5], type: PLAYER};
  currentEntities = [];
  tape = [];
  pillarAlive = [true, true, true];
  prayActive = [false, false, false];
  nextTickPrayActive = [...prayActive];
};

const entityInfo = (entity) => entityTypeInfo(entity.type);

const entityTypeInfo = (type) => ENTITY_INFOS[type];

// Pillar
const togglePillar = (pillar) => {
  pillarAlive[pillar] = !pillarAlive[pillar];
}

// Collision functions
const collides = (tile1, size1, tile2, size2) => {
  const [tile1X, tile1Y] = tile1;
  const [tile2X, tile2Y] = tile2;

  // Check for non-collisions
  if (tile1X > (tile2X + size2 - 1)
    || (tile1X + size1 - 1) < tile2X
    || (tile1Y - size1 + 1) > tile2Y
    || (tile1Y < tile2Y - size2 + 1)) {
    return false;
  }
  return true;
};

const isPillar = (tile) => PILLARS.filter((pillarTile, pillarIndex) =>
  pillarAlive[pillarIndex] && collides(tile, 1, pillarTile, PILLAR_SIZE)).length > 0;

/**
 * Based on https://github.com/open-osrs/runelite/blob/80028a4624bcaa493ec1cc1552af4683d902dfe2/runelite-mixins/src/main/java/net/runelite/mixins/RSTileMixin.java#L120
 */
const hasLineOfSight = (tile1, tile2, size = 1, range = 1, isNPC = false) => {
  const [tile1X, tile1Y] = tile1;
  const [tile2X, tile2Y] = tile2;

  let dx = tile2X - tile1X;
  let dy = tile2Y - tile1Y;
  if (isPillar(tile1) || isPillar(tile2) || collides(tile1, size, tile2, 1)) {
    return false;
  }

  // Assume range 1 is melee
  if (range === 1) {
    return (dx < size && dx >= 0 && (dy === 1 || dy === -size)) || (dy > -size && dy <= 0 && (dx === -1 || dx === size));
  }

  if (isNPC) {
    const tx = Math.max(tile1X, Math.min(tile1X + size - 1, tile2X));
    const ty = Math.max(tile1Y - size + 1, Math.min(tile1Y, tile2Y));
    return hasLineOfSight(tile2, [tx, ty], 1, range, false);
  }

  // Check if out of range
  let dxAbs = Math.abs(dx);
  let dyAbs = Math.abs(dy);
  if (dxAbs > range || dyAbs > range) {
    return false;
  }

  if (dxAbs > dyAbs) {
    let startX = tile1X;
    let startY = (tile1Y << 16) + 0x8000;
    let slope = Math.trunc((dy << 16) / dxAbs); // Integer division
    let xIncrement = (dx > 0) ? 1 : -1;
    if (dy < 0) {
      startY -= 1; // For correct rounding
    }
    while (startX !== tile2X) {
      startX += xIncrement;
      let tileY = startY >>> 16;
      if (isPillar([startX, tileY])) {
        return false;
      }
      startY += slope;
      let newTileY = startY >>> 16;
      if (newTileY !== tileY && isPillar([startX, newTileY])) {
        return false;
      }
    }
  } else {
    let startY = tile1Y;
    let startX = (tile1X << 16) + 0x8000;
    let slope = Math.trunc((dx << 16) / dyAbs); // Integer division
    let yIncrement = (dy > 0) ? 1 : -1;
    if (dx < 0) {
      startX -= 1; // For correct rounding
    }
    while (startY !== tile2Y) {
      startY += yIncrement;
      let tileX = startX >>> 16;
      if (isPillar([tileX, startY])) {
        return false;
      }
      startX += slope;
      let newTileX = startX >>> 16;
      if (newTileX !== tileX && isPillar([newTileX, startY])) {
        return false;
      }
    }
  }
  return true;
};

// Walking functions
const legalPosition = (entity, newTile) => {
  const info = entityInfo(entity);
  const [x, y] = newTile;

  // Check if goes out of bounds
  if (y - (info.size - 1) < 0 || x + (info.size - 1) > (MAP_TILE_WIDTH - 1)) {
    return false;
  }
  // Check if collides with any pillar
  for (let pillar = 0; pillar < PILLARS.length; pillar++) {
    if (pillarAlive[pillar]) {
      if (collides(newTile, info.size, PILLARS[pillar], PILLAR_SIZE)) {
        return false;
      }
    }
  }
  // Check if collides with another entity
  for (const e of currentEntities) {
    if (entity !== e) {
      const i = entityInfo(e);
      if (collides(newTile, info.size, e.tile, i.size)) {
        return false;
      }
    }
  }
  return true;
};

const step = () => {
  if (currentEntity.type !== PLAYER || currentEntities.length === 0)
    return;

  // Pray
  prayActive = [...nextTickPrayActive];

  const line = [];
  for (const entity of currentEntities) {
    entity.cycle--;
    line.push(-entity.type);

    // Move
    const info = entityInfo(entity);
    if (!hasLineOfSight(entity.tile, currentEntity.tile, info.size, info.range, true)) {
      const [playerTileX, playerTileY] = currentEntity.tile;
      const [entityTileX, entityTileY] = entity.tile;

      // Calculate the new position based on the direction of the player and the entity
      let newX = entityTileX + Math.sign(playerTileX - entityTileX);
      let newY = entityTileY + Math.sign(playerTileY - entityTileY);

      // Allows corner safe spotting
      if (collides([newX, newY], info.size, currentEntity.tile, 1)) {
        newY = entityTileY;
      }

      // Check all positions
      if (legalPosition(entity, [newX, newY])) {
        entity.tile = [newX, newY];
      } else if (legalPosition(entity, [newX, entityTileY])) {
        entity.tile = [newX, entityTileY];
      } else if (legalPosition(entity, [entityTileX, newY])) {
        entity.tile = [entityTileX, newY];
      }
    }

    // Attack
    if (hasLineOfSight(entity.tile, currentEntity.tile, info.size, info.range, true)) {
      if (entity.cycle <= 0) {
        line[line.length - 1] *= -1;
        entity.cycle = info.cooldown;
      }
    }
  }

  tape.push(line);
};

const resetTape = () => {
  for (const entity of currentEntities) {
    entity.tile = JSON.parse(JSON.stringify(entity.originalTile));
    entity.cycle = 0;
  }
  tape = [];
  prayActive = [false, false, false];
  nextTickPrayActive = [...prayActive];
}

// Render functions
const render = () => {
  renderMap();
  renderCurrentType();
  renderPrayButtons();
};

const renderPrayButtons = () => {
  // Update each button
  const renderPray = (index, button) => {
    if (prayActive[index] !== button.classList.contains("active")) button.classList.toggle("active");
  }
  renderPray(0, mage);
  renderPray(1, range);
  renderPray(2, melee);
};

const renderCurrentType = () => {
  typeLabel.innerHTML = entityInfo(currentEntity).name;
};

const renderMap = () => {
  // Clear
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

  // Fill the background
  renderBackground();

  // Render the pillars
  renderPillars();

  // Render spawns, nibblers and zuk
  ctx.globalAlpha = 0.4;
  renderSpawns();
  renderNibblersSpawn();
  renderZukSafeSpots();

  // Render entities
  ctx.globalAlpha = 1;
  renderEntities();

  // Render tape
  renderTape();
};

const renderTape = () => {
  // Render background
  const tapeOffset = MAP_TILE_WIDTH;
  ctx.fillStyle = 'white';
  fillStripRectangle([tapeOffset, 0], TAPE_TILE_WIDTH, MAP_TILE_HEIGHT);

  for (let y = 0; y < tape.length; y++) {
    // Draw the background of the line
    ctx.fillStyle = (y % 2) ? '#ddd' : '#eee';
    fillStripRectangle([tapeOffset, y], TAPE_TILE_WIDTH, 1);

    // Draw the contents of the line
    for (let x = 0; x < tape[y].length; x++) {
      const entityType = tape[y][x];
      if (entityType > 0) {
        ctx.fillStyle = entityTypeInfo(entityType).color;
        fillStripRectangle([tapeOffset + x, y], 1, 1);
      } else if (entityType === -BLOB && y >= 3 && tape[y - 3][x] === 2) {
        ctx.fillStyle = 'black';
        fillStripRectangle([tapeOffset + x, y], 1, 1);
      }
    }
  }
};

const renderEntities = () => {
  // Draw the current entity
  const info = entityInfo(currentEntity);
  ctx.fillStyle = ctx.strokeStyle = info.color;
  fillTileArea(currentEntity.tile, 1);
  strokeTileArea(currentEntity.tile, info.size);

  // Draw all entities
  for (const entity of currentEntities) {
    const info = entityInfo(entity);
    ctx.fillStyle = ctx.strokeStyle = info.color;
    fillTileArea(entity.tile, 1);
    strokeTileArea(entity.tile, info.size);

    // Render if it can see the player
    if (currentEntity.type === PLAYER && hasLineOfSight(entity.tile, currentEntity.tile, info.size, info.range, true)) {
      ctx.fillStyle = 'black';
      fillTileArea(entity.tile, 1 / 4);
    }
  }

  // Render line of sight
  renderLineOfSight(currentEntity);
};

const renderLineOfSight = (entity, color = 'red') => {
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = color;

  const info = entityInfo(entity);
  for (let tileIndex = 0; tileIndex < MAP_TILE_WIDTH * MAP_TILE_HEIGHT; tileIndex++) {
    const tile = [tileIndex % MAP_TILE_WIDTH, Math.floor(tileIndex / MAP_TILE_WIDTH)];
    if (hasLineOfSight(entity.tile, tile, info.size, info.range, entity.type !== PLAYER)) {
      fillTileArea(tile, 1);
    }
  }

  ctx.globalAlpha = 1;
};

const renderSpawns = () => {
  ctx.fillStyle = '#999';
  for (const spawn of SPAWNS) {
    fillTileArea(spawn, SPAWN_SIZE);
  }
};

const renderNibblersSpawn = () => {
  ctx.fillStyle = 'blue';
  fillTileArea(NIBBLERS_SPAWN, NIBBLERS_SIZE);
};

const renderZukSafeSpots = () => {
  ctx.fillStyle = 'green';
  for (const zukSafeSpot of ZUK_SAFE_SPOTS) {
    fillTileArea(zukSafeSpot, 1);
  }
};

const renderPillars = () => {
  ctx.fillStyle = '#3c3c3c';
  for (let pillar = 0; pillar < PILLARS.length; pillar++) {
    if (pillarAlive[pillar]) {
      fillTileArea(PILLARS[pillar], PILLAR_SIZE);
    }
  }
};

const renderBackground = () => {
  for (let tileIndex = 0; tileIndex < MAP_TILE_WIDTH * MAP_TILE_HEIGHT; tileIndex++) {
    ctx.fillStyle = (tileIndex % 2) ? '#fff' : '#eee';
    const tile = [tileIndex % MAP_TILE_WIDTH, Math.floor(tileIndex / MAP_TILE_WIDTH)];
    fillTileArea(tile, 1);
  }
};

const strokeTileArea = (tile, size) => {
  const [tileX, tileY] = tile;
  ctx.strokeRect(tileX * TILE_SIZE, (tileY + 1) * TILE_SIZE, size * TILE_SIZE, -size * TILE_SIZE);
};

const fillTileArea = (tile, size) => {
  const [tileX, tileY] = tile;
  ctx.fillRect(tileX * TILE_SIZE, (tileY + 1) * TILE_SIZE, size * TILE_SIZE, -size * TILE_SIZE);
};

const fillStripRectangle = (tile, width, height) => {
  const [tileX, tileY] = tile;
  ctx.fillRect(tileX * TILE_SIZE, tileY * TILE_SIZE, width * TILE_SIZE, height * TILE_SIZE);
};

const encodeStateToUrl = () => {
  // Encode entities
  let encodedState = `${currentEntities.length},`;
  for (let entity of currentEntities) {
    encodedState += `${entity.type},${entity.originalTile[0]},${entity.originalTile[1]},`;
  }
  // Encode pillars
  const encodedPillars = ((pillarAlive[0] | 0) << 0) | ((pillarAlive[1] | 0) << 1) | ((pillarAlive[2] | 0) << 2);
  encodedState += `${encodedPillars}`;
  // Add to URL
  const url = new URL(window.location.href);
  url.searchParams.set('s', encodedState);
  window.history.pushState("", "", url.toString());
}

const decodeStateFromUrl = () => {
  // Check if we have any get parameters
  const urlParams = window.location.search;
  const args = new URLSearchParams(urlParams);
  if (!args.has('s')) {
    return;
  }
  const state = args.get('s');
  // Decode entities
  const exploded = state.split(',');
  let size = parseInt(exploded[0]);
  for (let i = 0; i < size; i++) {
    const entityBase = (i * 3) + 1;
    const tile = [parseInt(exploded[entityBase + 1]), parseInt(exploded[entityBase + 2])];
    const entity = {
      type: parseInt(exploded[entityBase]),
      tile,
      originalTile: tile,
      cycle: 0
    };
    currentEntities.push(entity);
  }
  // Decode pillars
  const pillars = parseInt(exploded[exploded.length - 1]);
  pillarAlive[0] = ((pillars & (0x1 << 0)) >> 0) && true;
  pillarAlive[1] = ((pillars & (0x1 << 1)) >> 1) && true;
  pillarAlive[2] = ((pillars & (0x1 << 2)) >> 2) && true;
}