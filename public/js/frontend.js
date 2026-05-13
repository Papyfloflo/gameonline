const canvas = document.querySelector('canvas')
const c = canvas.getContext('2d')

const socket = io()

const scoreEl = document.querySelector('#scoreEl')

const devicePixelRatio = window.devicePixelRatio || 1

canvas.width = 1680 * devicePixelRatio
canvas.height = 1050 * devicePixelRatio

c.scale(devicePixelRatio, devicePixelRatio)

const x = canvas.width / 2
const y = canvas.height / 2

const frontEndPlayers = {}
const frontEndProjectiles = {}
let username = ""

socket.on('updateProjectiles', (backEndProjectiles) => {
  for (const id in backEndProjectiles) {
    const backEndProjectile = backEndProjectiles[id]
    if (!frontEndProjectiles[id]) {
      frontEndProjectiles[id] = new Projectile({x: backEndProjectile.x, y: backEndProjectile.y, radius: 5, color: frontEndPlayers[backEndProjectile.playerId]?.color, velocity: backEndProjectile.velocity})
    } else {
      frontEndProjectiles[id].x += backEndProjectiles[id].velocity.x
      frontEndProjectiles[id].y += backEndProjectiles[id].velocity.y
    }
  }

  for (const frontEndProjectileId in frontEndProjectiles) {
    if (!backEndProjectiles[frontEndProjectileId]) {
      delete frontEndProjectiles[frontEndProjectileId];
    }
  }
})

socket.on('updatePlayers', (backEndPlayers) => {
  for (const id in backEndPlayers) {
    const backEndPlayer = backEndPlayers[id];

    if (backEndPlayer === backEndPlayers[socket.id]) {
      document.querySelector('#bullets-left').innerHTML = `Bullets left: ${backEndPlayers[socket.id].bullets}`
    }
    if (!frontEndPlayers[id]) {
      frontEndPlayers[id] = new Player({
        x: backEndPlayer.x,
        y: backEndPlayer.y,
        radius: 10,
        color: backEndPlayer.color,
        username: backEndPlayer.username
      });
      document.querySelector('#playerLabels').innerHTML += `<div data-id="${id}" data-score="${backEndPlayer.score}">${backEndPlayer.username}: ${backEndPlayer.score}</div>`
    } else {
      document.querySelector(`div[data-id="${id}"]`).innerHTML = `${backEndPlayer.username}: ${backEndPlayer.score}`
      document.querySelector(`div[data-id="${id}"]`).setAttribute('data-score', backEndPlayer.score)
      const parentDiv = document.querySelector('#playerLabels')
      const childDivs = Array.from(parentDiv.querySelectorAll('div'))

      childDivs.sort((a, b) => {
        const scoreA = Number(a.getAttribute('data-score'))
        const scoreB = Number(b.getAttribute('data-score'))
        return scoreB - scoreA
      })

      childDivs.forEach(div => {
        parentDiv.removeChild(div)
      })

      childDivs.forEach(div => {
        parentDiv.appendChild(div)
      })

      frontEndPlayers[id].target = {
        x: backEndPlayer.x,
        y: backEndPlayer.y
      }

      if (id === socket.id) {
        const lastBackendInputIndex = playerInputs.findIndex(input => backEndPlayer.sequenceNumber === input.sequenceNumber);

        if (lastBackendInputIndex > -1) {
          playerInputs.splice(0, lastBackendInputIndex + 1);
        }

        playerInputs.forEach(input => {
          frontEndPlayers[id].target.x += input.dx;
          frontEndPlayers[id].target.y += input.dy;
        });
      }
    }
  }
  for (const id in frontEndPlayers) {
    if (!backEndPlayers[id]) {
      delete frontEndPlayers[id];
      const divToDelete = document.querySelector(`div[data-id="${id}"]`)
      divToDelete.parentNode.removeChild(divToDelete)

      if (id === socket.id) {
        document.querySelector('#restartButton').style.display = 'block'
        document.querySelector('#game-over').style.display = 'block'
      }
    }
  }
});

let animationId
function animate() {
  animationId = requestAnimationFrame(animate)
  //c.fillStyle = 'rgba(0, 0, 0, 0.1)'
  c.clearRect(0, 0, canvas.width, canvas.height)

  for (const id in frontEndPlayers) {
    const frontEndPlayer =  frontEndPlayers[id]
    if (frontEndPlayer.target) {
      frontEndPlayer.x += (frontEndPlayer.target.x - frontEndPlayer.x) * 0.5
      frontEndPlayer.y += (frontEndPlayer.target.y - frontEndPlayer.y) * 0.5
    }
    frontEndPlayer.draw()
  }

  for (const id in frontEndProjectiles) {
    const frontEndProjectile =  frontEndProjectiles[id]
    frontEndProjectile.draw()
  }
}
animate()

const keys = {
  w: {
    pressed: false
  },
  a: {
    pressed: false
  },
  s: {
    pressed: false
  },
  d: {
    pressed: false
  }  
}

const SPEED = 10
const playerInputs = []
let sequenceNumber = 0
setInterval(() => {
  if (keys.w.pressed) {
    sequenceNumber++
    playerInputs.push({sequenceNumber, dx: 0, dy: -SPEED})
    frontEndPlayers[socket.id].y -= SPEED
    socket.emit('keydown', {keycode:'keyW', sequenceNumber})
  }

  if (keys.a.pressed) {
    sequenceNumber++
    playerInputs.push({sequenceNumber, dx: -SPEED, dy: 0})
    frontEndPlayers[socket.id].x -= SPEED
    socket.emit('keydown', {keycode:'keyA', sequenceNumber})
  }

  if (keys.s.pressed)  {
    sequenceNumber++
    playerInputs.push({sequenceNumber, dx: 0, dy: SPEED})
    frontEndPlayers[socket.id].y += SPEED
    socket.emit('keydown', {keycode:'keyS', sequenceNumber})
  }

  if (keys.d.pressed) {
    sequenceNumber++
    playerInputs.push({sequenceNumber, dx: SPEED, dy: 0})
    frontEndPlayers[socket.id].x += SPEED
    socket.emit('keydown', {keycode: 'keyD', sequenceNumber})
  }
}, 15)

window.addEventListener('keydown', (event) => {
  if (frontEndPlayers[socket.id]) {
    switch (event.code) {
      case 'KeyW':
        keys.w.pressed = true
        break

      case 'KeyA':
        keys.a.pressed = true
        break

      case 'KeyS':
        keys.s.pressed = true
        break

      case 'KeyD':
        keys.d.pressed = true
        break
    }
  }
})

window.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'KeyW':
      keys.w.pressed = false
      break

    case 'KeyA':
      keys.a.pressed = false
      break

    case 'KeyS':
      keys.s.pressed = false
      break

    case 'KeyD':
      keys.d.pressed = false
      break
  }
})

document.querySelector('#usernameForm').addEventListener('submit', (event) => {
  event.preventDefault();
  username = document.querySelector('#usernameInput').value;

  // Émettre un événement pour vérifier la disponibilité du nom d'utilisateur
  socket.emit('checkUsername', { username });
  
  // Écouter la réponse du serveur concernant la disponibilité du nom d'utilisateur
  socket.on('usernameStatus', (data) => {
    if (data.available) {
      // Si le nom d'utilisateur est disponible, initialiser le jeu
      document.querySelector('#usernameForm').style.display = 'none';
      socket.emit('initGame', {
        width: canvas.width,
        height: canvas.height,
        devicePixelRatio,
        username
      });
    } else {
      // Si le nom d'utilisateur est pris, afficher un message d'erreur et réafficher le formulaire
      document.querySelector('#username-error').innerHTML = "Username already in use"
    }
  });
});


document.querySelector('#restartButton').addEventListener('click', (event) => {
  event.preventDefault()
  document.querySelector('#restartButton').style.display = 'none'
  document.querySelector('#game-over').style.display = 'none'
  socket.emit('initGame', {
    width: canvas.width,
    height: canvas.height,
    devicePixelRatio,
    username
})
}
)