const express = require('express');
const app = express();
require('dotenv').config();

// Socket.io setup
const { createServer } = require('node:http');
const server = createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { pingInterval: 2000, pingTimeout: 5000 });

const port = process.env.PORT || 3000;
let usernames = new Map();

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const backEndPlayers = {};
const backEndProjectiles = {};
const SPEED = 10
const RADIUS = 10
const MAX_BULLETS = 15;
const MAX_BOTS = 5; // Maximum number of bots
const nameList = [
  "PewDiePie", "MrBeast", "Ninja", "SSSniperWolf", "JennaMarbles", "KSI", "LoganPaul", "ShaneDawson",
  "PhilipDeFranco", "LillySingh", "MarquesBrownlee", "EmmaChamberlain",
  "JamesCharles", "DavidDobrik", "CaseyNeistat", "VanossGaming",
  "GoodMythicalMorning", "H3H3Productions", "Smosh", "Nigahiga", "iJustine",
  "RomanAtwood", "LizaKoshy", "JacksFilms", "RhettAndLink", "Vsauce", "LinusTechTips",
  "FazeRug", "AliA", "Preston", "Dream", "GeorgeNotFound", "TomSka",
  "Kurzgesagt", "UnboxTherapy", "MKBHD", "DudePerfect", "SSundee",
  "TheTryGuys", "JakePaul", "Squeezie", "Cyprien", "Norman", "Mister V", "Tibo InShape", "Amixem",
  "McFly et Carlito", "Le Rire Jaune", "Joueur du Grenier", "Natoo",
  "Wankil Studio", "Le Grand JD", "Seb la Frite", "La chaine de Jeremy",
  "Andy Raconte", "Pierre Croce", "Léna Situations", "HugoDécrypte",
  "Alexandre Calvez", "Dobby", "Doc Seven", "Poisson Fécond", "David Lafarge Pokémon",
  "Kemar", "Lufy", "Benjamin Verrecchia", "Siphano", "VodK", "Raska", "Maxime Musqua",
  "Romain Lanery", "Clemity Jane", "PewDiePhilippe", "El Hadj", "Les Parasites",
  "Le Tatou", "Jojol", "Valouzz", "Laink et Terracid", "Squeezie Gaming",
  "Fabrice le Physicien", "E-Penser", "Nota Bene", "PewDieFrenchie", "Charlie Danger",
  "VivaciousVulture", "WhimsicalWolf", "ZippyZeub", "BouncingBear", "CaperingCat",
  "DancingDog", "EffervescentEagle", "FrolickingFawn", "GigglingGazelle",
  "HoppingHamster", "JovialJackal", "KookyKangaroo", "LaughingLeopard", "MirthfulMole",
  "PeppyPenguin", "QuirkyQuokka", "RascallyRat", "SmilingSeal", "TeasingTurtle",
  "UpbeatUnicorn", "VibrantViper", "WackyWombat", "ZanyZebra", "BouncingBunny",
  "CacklingCoyote", "DrollDolphin", "EuphoricEel", "FrolickingFrog", "GleefulGnat",
  "HilariousHare", "JollyJellyfish", "KookyKiwi", "LaughingLynx", "MirthfulMink",
  "RireDuRenard", "BlagueDeBébé", "SourireSaucisse", "FarceurFlamant",
  "MonsieurMarrade", "RigoloRat", "PlaisantinPanda", "DroleDeDinde", "TêteDeToto",
  "ComiqueChouette", "RigolardRenard", "DrôleDauphin", "ClownChameau", "BouffonBélier",
  "FarceurFuret", "SourisSouriante", "BêtiseBaisant", "Singenoir", "RigoleurRenne",
  "FantaisisteFaucon", "JovialJaguar", "MarrantMouette", "GaiGorille", "LudiqueLynx",
  "RieurRat", "PlaisantPingouin", "FouFuret", "ClownCochon", "DrôleDeDodo",
  "BlagueurBlaireau", "ChicaneurChauve-souris", "EspritEspiègle", "HilarantHérisson",
  "ComiqueCrocodile", "SouriantScarabée", "GaiGnou", "RigoleurRhinocéros", "JovialJabiru",
  "LudiqueLoutre", "FarceurFaisan", "MarrantMouton", "RigoloteRaie", "PlaisantinPhoque",
  "DrôleDeDaim", "ClownCrabe", "SourireSinge", "JovialJaguarundi", "CapitaineCanard",
  "BlagueurBouquetin", "RieurRouge-gorge", "MarrantMoulin", "DrôleDeDromadaire", 
  "FantaisisteFaucon", "JovialJonquille", "LudiqueLémurien", "RigoloRat",
  "PlaisantinParesseux", "FarceurFaucon", "SouriantSerpent", "RieurRat", "SingeSouriant",
  "ComiqueCaille", "DrôleDeDindon", "CapitaineCâlin"  
];
function getRandomName() {
  const randomIndex = Math.floor(Math.random() * nameList.length);
  return nameList[randomIndex];
}

let projectileId = 0;
let botIdCounter = 0; // Counter to assign unique IDs to bots

// Initialize bots
function initBot() {
  const username = getRandomName()
  if (Object.keys(backEndPlayers).length < MAX_BOTS) {
    const botId = `bot-${botIdCounter++}`;
    backEndPlayers[botId] = {
      x: 1680 * Math.random(),
      y: 1050 * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username,
      bullets: MAX_BULLETS,
      radius: RADIUS,
      isBot: true,
      direction: { x: 0, y: -1 }, // Initial direction (up)
      directionChangeTime: Date.now() // Time to change direction
    };
  }
}

// Call initBot function to add bots initially
for (let i = 0; i < MAX_BOTS; i++) {
  initBot();
}

// Bot movement and shooting logic with bullet management
setInterval(() => {
  for (const id in backEndPlayers) {
    const player = backEndPlayers[id];
    if (player.isBot) {
      // Check if it's time to shoot and bot has bullets
      if (player.bullets > 0 && (100 * Math.random()) > 95) {
        const nearestPlayer = findNearestPlayer(player, backEndPlayers);
        if (nearestPlayer) {
          //setInterval(() => {
            const angleToPlayer = Math.atan2(nearestPlayer.y - player.y, nearestPlayer.x - player.x);

            // Introduce randomness to shooting direction
            const shootingAngle = angleToPlayer + (Math.random() - 0.5) * Math.PI / 8;
            const velocity = {
              x: Math.cos(shootingAngle) * 15,
              y: Math.sin(shootingAngle) * 15
            };

            // Create projectile
            projectileId++;
            backEndProjectiles[projectileId] = {
              x: player.x,
              y: player.y,
              velocity,
              playerId: id
            };

            // Decrease bullets count
            player.bullets--;
          //}, 3000)
        }
      }

      // Move towards the nearest player with randomized trajectory
      const nearestPlayer = findNearestPlayer(player, backEndPlayers);
      if (nearestPlayer) {
        const angleToPlayer = Math.atan2(nearestPlayer.y - player.y, nearestPlayer.x - player.x);
        const maxDeviationAngle = Math.PI / 6; // Maximum deviation angle
        const randomDeviation = (Math.random() - 0.5) * maxDeviationAngle;
        const movementAngle = angleToPlayer + randomDeviation;

        player.x += Math.cos(movementAngle) * 5;
        player.y += Math.sin(movementAngle) * 5;
      }

      // Ensure bots stay within bounds (assuming a game area of 1680x1050)
      player.x = Math.max(player.radius, Math.min(1680 - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(1050 - player.radius, player.y));
    }
  }
}, 15);

// Function to find the nearest player to a given bot
function findNearestPlayer(bot, players) {
  let minDistance = Infinity;
  let nearestPlayer = null;

  for (const id in players) {
    if (!players[id].isBot && id !== bot.id) { // Only consider human players
      const distance = Math.hypot(players[id].x - bot.x, players[id].y - bot.y);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPlayer = players[id];
      }
    }
  }

  return nearestPlayer;
}

// Function to calculate shooting probability based on distance to players
function calculateShootingProbability(bot, players) {
  const maxDistance = Math.hypot(1680, 1050); // Max distance from top-left to bottom-right
  const minProbability = 0.05; // Minimum probability to shoot
  let probability = minProbability;

  for (const id in players) {
    if (!players[id].isBot && id !== bot.id) { // Only consider human players
      const distance = Math.hypot(players[id].x - bot.x, players[id].y - bot.y);
      probability += (maxDistance - distance) / maxDistance * 0.1; // Adjust factor as needed
    }
  }

  // Limit probability between minProbability and 1
  probability = Math.min(1, Math.max(minProbability, probability));

  return probability;
}


// Function to calculate shooting probability based on distance to players
function calculateShootingProbability(bot, players) {
  // Example: Higher probability if close, lower if far
  const maxDistance = Math.hypot(1680, 1050); // Max distance from top-left to bottom-right
  const minProbability = 0.05; // Minimum probability to shoot
  let probability = minProbability;

  for (const id in players) {
    if (!players[id].isBot && id !== bot.id) { // Only consider human players
      const distance = Math.hypot(players[id].x - bot.x, players[id].y - bot.y);
      probability += (maxDistance - distance) / maxDistance * 0.1; // Adjust factor as needed
    }
  }

  return Math.min(1, Math.max(minProbability, probability));
}


io.on('connection', (socket) => {
  console.log('A user connected: ', socket.id);
  io.emit('updatePlayers', backEndPlayers);

  socket.on('checkUsername', (data) => {
    const username = data.username;
    if (usernames.has(username)) {
      socket.emit('usernameStatus', { available: false });
    } else {
      socket.emit('usernameStatus', { available: true });
    }
  });

  socket.on('shoot', ({x, y, angle}) => {
    if (backEndPlayers[socket.id].bullets > 0) {
      projectileId++
      const velocity = {
        x: Math.cos(angle) * 15,
        y: Math.sin(angle) * 15
      }
      backEndProjectiles[projectileId] = {x, y, velocity, playerId: socket.id}
      backEndPlayers[socket.id].bullets--
    }
  })

  socket.on('initGame', ({username, width, height}) => {
    if (!usernames.has(username)) {
      usernames.set(username, socket.id);
      console.log(usernames)
    }
    backEndPlayers[socket.id] = {
      x: 1680 * Math.random(),
      y: 1050 * Math.random(),
      color: `hsl(${360 * Math.random()}, 100%, 50%)`,
      sequenceNumber: 0,
      score: 0,
      username: username,
      bullets: 15
    }

    backEndPlayers[socket.id].canvas = {
      width,
      height
    }

    backEndPlayers[socket.id].radius = RADIUS
  })

  socket.on('disconnect', (reason) => {
    console.log('A user disconnected: ', socket.id);
    if (backEndPlayers[socket.id]) {
      const username = backEndPlayers[socket.id].username;
      usernames.delete(username);
      delete backEndPlayers[socket.id];
    } else {
      for (const [username, id] of usernames) {
        if (id === socket.id) {
          usernames.delete(username);
          break;
        }
      }
    }
    console.log(usernames);
    io.emit('updatePlayers', backEndPlayers);
  });
  

  socket.on('keydown', ({keycode, sequenceNumber}) => {
    const backEndPlayer = backEndPlayers[socket.id]
    if (backEndPlayers[socket.id]) {
      backEndPlayers[socket.id].sequenceNumber = sequenceNumber
      switch (keycode) {
        case 'keyW':
          backEndPlayers[socket.id].y -= SPEED;
          break;
        case 'keyA':
          backEndPlayers[socket.id].x -= SPEED;
          break;
        case 'keyS':
          backEndPlayers[socket.id].y += SPEED;
          break;
        case 'keyD':
          backEndPlayers[socket.id].x += SPEED;
          break;
      }
      const playerSides = {
        left: backEndPlayer.x - backEndPlayer.radius,
        right: backEndPlayer.x + backEndPlayer.radius,
        top: backEndPlayer.y - backEndPlayer.radius,
        bottom: backEndPlayer.y + backEndPlayer.radius
      }

      if (playerSides.left < 0) {
        backEndPlayer.x = backEndPlayer.radius
      }
      if (playerSides.right > 1680) {
        backEndPlayer.x = 1680 - backEndPlayer.radius
      }
      if (playerSides.top < 0) {
        backEndPlayer.y = backEndPlayer.radius
      }
      if (playerSides.bottom > 1050) {
        backEndPlayer.y = 1050 - backEndPlayer.radius
      }
  }
  });
});

setInterval(() => {
  //Update projectiles position
  for (const id in backEndProjectiles) {
    backEndProjectiles[id].x += backEndProjectiles[id].velocity.x
    backEndProjectiles[id].y += backEndProjectiles[id].velocity.y

    const PROJECTILE_RADIUS = 5
    if (
      backEndProjectiles[id].x - PROJECTILE_RADIUS >= backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.width ||
      backEndProjectiles[id].x + PROJECTILE_RADIUS <= 0 ||
      backEndProjectiles[id].y - PROJECTILE_RADIUS >= backEndPlayers[backEndProjectiles[id].playerId]?.canvas?.height ||
      backEndProjectiles[id].y + PROJECTILE_RADIUS <= 0
    ) {
      delete backEndProjectiles[id]
      continue
    }

    for (const playerId in backEndPlayers) {
      const backEndPlayer = backEndPlayers[playerId]

      const DISTANCE = Math.hypot(
        backEndProjectiles[id].x - backEndPlayer.x,
        backEndProjectiles[id].y - backEndPlayer.y
      )

      if (DISTANCE < PROJECTILE_RADIUS + backEndPlayer.radius && backEndProjectiles[id].playerId !== playerId) {
        if (backEndPlayers[backEndProjectiles[id].playerId]) {
          backEndPlayers[backEndProjectiles[id].playerId].score++
        }
        if (backEndPlayer.isBot) {
          botIdCounter--
        }
        delete backEndProjectiles[id]
        delete backEndPlayers[playerId]
        break
      }
    }
  }
  if (botIdCounter === 0) {
  console.log('t')
  for (let i = 0; i < MAX_BOTS; i++) {
    initBot();
  }
}
  io.emit('updateProjectiles', backEndProjectiles);
  io.emit('updatePlayers', backEndPlayers);
}, 15);

setInterval(() => {
  for (const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id]
    if (backEndPlayer.bullets < 15) {
      backEndPlayer.bullets += 1
    }
  }
}, 750)

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

console.log("Server running");
