class Game {
  constructor() {
    this.leadeboardTitle = createElement("h2");

    this.leader1 = createElement("h2");
    this.leader2 = createElement("h2");

    this.playerMoving = false;
    this.blast = false;
    this.leftKeyActive = false;
  }

  getState(secret_word) {
    var gameStateRef = db.ref(`users/${secret_word}/game_state/`);
    gameStateRef.on("value", function(data) {
      gameState = data.val();
    });
  }

  update(state) {
    db.ref(`users/${secret_word}/`).update({
      game_state: state
    });
  }

  async start() {
    // Cuando el usuario ingresa a la página
    if (gameState === null) {
      welcome.display();
    }

    // //Cuando el usuario inició sesión exitosamente
    if (gameState === 0) {
      var playerCountRef = await db
        .ref(`users/${secret_word}/player_count/`)
        .once("value");

      if (playerCountRef.exists()) {
        playerCount = playerCountRef.val();
        player.getCount();
      }
    }
  }

  handleElements() {
    welcome.logo.position(40, 50);
    welcome.logo.class("gameTitleAfterEffect");

    this.leadeboardTitle.html("Tabla de Posiciones");
    this.leadeboardTitle.class("resetText");
    this.leadeboardTitle.position(width / 3 - 60, 40);

    this.leader1.class("leadersText");
    this.leader1.position(width / 3 - 50, 80);

    this.leader2.class("leadersText");
    this.leader2.position(width / 3 - 50, 130);
  }

  showLife() {
    push();
    image(lifeImage, width / 2 - 130, height - player.positionY - 400, 20, 20);
    fill("white");
    rect(width / 2 - 100, height - player.positionY - 400, 185, 20);
    fill("#f50057");
    rect(width / 2 - 100, height - player.positionY - 400, player.life, 20);
    noStroke();
    pop();
  }

  showFuel() {
    push();
    image(fuelImage, width / 2 - 130, height - player.positionY - 350, 20, 20);
    fill("white");
    rect(width / 2 - 100, height - player.positionY - 350, 185, 20);
    fill("#ffc400");
    rect(width / 2 - 100, height - player.positionY - 350, player.fuel, 20);
    noStroke();
    pop();
  }

  play() {
    this.handleElements();

    Player.getPlayerInfo();
    player.getCarsAtEnd();

    if (allPlayers !== undefined) {
      background(backgroundImage);
      image(track, 0, -height * 5, width, height * 6);

      //Índice del arreglo (array)
      var index = 0;

      for (var plr in allPlayers) {
        //Agrega 1 al índice por cada iteración
        index = index + 1;

        var x = allPlayers[plr].positionX;
        var y = height - allPlayers[plr].positionY;

        var life = allPlayers[plr].life;
        if (life <= 0) {
          cars[index - 1].changeAnimation("blast");
          cars[index - 1].scale = 0.3;
        }

        cars[index - 1].position.x = x;
        cars[index - 1].position.y = y;

        if (index === player.index) {
          stroke(10);
          fill("red");
          ellipse(x, y, 60, 60);

          this.handleFuel(index);
          this.handlePowerCoins(index);
          this.handleCarACollisionWithCarB(index);
          this.handleObstacleCollision(index);

          if (player.life <= 0) {
            this.blast = true;
            this.playerMoving = false;
          }

          // Cambio en la posición de la cámara en la dirección y 
          camera.position.y = cars[index - 1].position.y;
        }
      }

      if (this.playerMoving) {
        player.positionY += 5;
        player.update();
      }

      // Manejo de eventos del teclado
      this.handlePlayerControls();

      // Línea de meta
      const finshLine = height * 6 - 100;

      if (player.positionY > finshLine) {
        gameState = 2;
        player.rank += 1;
        Player.updateCarsAtEnd(player.rank);
        player.update();
        this.showRank();
      }

      drawSprites();

      this.showLife();
      this.showFuel();
      this.showLeaderboard();
    }
  }

  handlePlayerControls() {
    if (!this.blast) {
      if (keyIsDown(UP_ARROW)) {
        this.playerMoving = true;

        player.positionY += 10;
        player.update();
      }

      if (keyIsDown(LEFT_ARROW) && player.positionX > width / 3 - 50) {
        this.leftKeyActive = true;

        player.positionX -= 5;
        player.update();
      }

      if (keyIsDown(RIGHT_ARROW) && player.positionX < width / 2 + 300) {
        this.leftKeyActive = false;

        player.positionX += 5;
        player.update();
      }
    }
  }

  showLeaderboard() {
    var leader1, leader2;
    var players = Object.values(allPlayers);
    if (
      (players[0].rank === 0 && players[1].rank === 0) ||
      players[0].rank === 1
    ) {
      // &emsp;    Esta etiqueta es utilizada para mostrar cuatro espacios.
      leader1 =
        players[0].rank +
        "&emsp;" +
        players[0].name +
        "&emsp;" +
        players[0].score;

      leader2 =
        players[1].rank +
        "&emsp;" +
        players[1].name +
        "&emsp;" +
        players[1].score;
    }

    if (players[1].rank === 1) {
      leader1 =
        players[1].rank +
        "&emsp;" +
        players[1].name +
        "&emsp;" +
        players[1].score;

      leader2 =
        players[0].rank +
        "&emsp;" +
        players[0].name +
        "&emsp;" +
        players[0].score;
    }

    this.leader1.html(leader1);
    this.leader2.html(leader2);
  }

  handleFuel(index) {
    // Agregar combustible
    cars[index - 1].overlap(fuels, function(collector, collected) {
      player.fuel = 185;
      //"collected" es el sprite en el grupo de coleccionables que detonó
      //el evento 
      collected.remove();
    });

    // Reducir combustible en el auto del jugador
    if (player.fuel > 0 && this.playerMoving) {
      player.fuel -= 0.3;
    }

    if (player.fuel <= 0) {
      gameState = 2;
      player.update();
      this.gameOver();
    }
  }

  handlePowerCoins(index) {
    cars[index - 1].overlap(powerCoins, function(collector, collected) {
      player.score += 21;
      player.update();
      //"collected" es el sprite en el grupo de coleccionables que detonó
      //el evento
      collected.remove();
    });
  }

  handleCarACollisionWithCarB(index) {
    if (index === 1) {
      if (cars[index - 1].collide(cars[1])) {
        if (this.leftKeyActive) {
          player.positionX += 100;
        } else {
          player.positionX -= 100;
        }

        //Reducir la vida del jugador
        if (player.life > 0) {
          player.life -= 46.25;
        }

        player.update();
      }
    }

    if (index === 2) {
      if (cars[index - 1].collide(cars[0])) {
        if (this.leftKeyActive) {
          player.positionX += 100;
        } else {
          player.positionX -= 100;
        }

        //Reducir la vida del jugador
        if (player.life > 0) {
          player.life -= 185 / 4;
        }

        player.update();
      }
    }
  }

  handleObstacleCollision(index) {
    if (cars[index - 1].collide(obstacles)) {
      if (this.leftKeyActive) {
        player.positionX += 100;
      } else {
        player.positionX -= 100;
      }

      //Reducir la vida del jugador
      if (player.life > 0) {
        player.life -= 185 / 4;
      }

      player.update();
    }
  }

  showRank() {
    swal({
      title: `¡Increíble!${"\n"}Posición${"\n"}${player.rank}`,
      text: "Llegaste a la línea de meta con éxito",
      imageUrl:
        "https://raw.githubusercontent.com/vishalgaddam873/p5-multiplayer-car-race-game/master/assets/cup.png",
      imageSize: "100x100",
      confirmButtonText: "Ok"
    });
  }

  gameOver() {
    swal({
      title: `Juego Terminado`,
      text: "¡Uy!¡Perdiste la carrera!",
      imageUrl:
        "https://cdn.shopify.com/s/files/1/1061/1924/products/Thumbs_Down_Sign_Emoji_Icon_ios10_grande.png",
      imageSize: "100x100",
      confirmButtonText: "¡Gracias por jugar!"
    });
  }

  end() {
    console.log("¡Fin del juego!");
  }
}
