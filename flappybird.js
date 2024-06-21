// Initialize canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Constants
const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 600;
const PIPE_WIDTH = 100;
const PIPE_HEIGHT = 400;
const PIPE_GAP = 200;
const BIRD_WIDTH = 60;
const BIRD_HEIGHT = 40;
const GRAVITY = 0.4;
const JUMP = 12;
const PIPE_SPAWN_INTERVAL = 150; // Adjusted spawn interval
const OFFSCREEN_THRESHOLD = -200;
const FPS = 60;

// Slower pace multiplier
const PACE_MULTIPLIER = 0.6; // Adjust as needed

// Colors
const WHITE = "#FFFFFF";
const RED = "#FF0000";
const BLACK = "#000000";

// Images
const birdImg = new Image();
birdImg.src = 'bird.png'; // Adjust path
const pipeImg = new Image();
pipeImg.src = 'pipe.png'; // Adjust path
const backgroundImg = new Image();
backgroundImg.src = 'background.png'; // Adjust path
const baseImg = new Image();
baseImg.src = 'base.png'; // Adjust path

// Telegram bot credentials (replace with your actual values)
const BOT_TOKEN = 'your_bot_token';
const CHAT_ID = 'your_chat_id';

// Bird class
class Bird {
    constructor() {
        this.x = 50;
        this.y = SCREEN_HEIGHT / 2;
        this.vel = 0;
        this.width = BIRD_WIDTH;
        this.height = BIRD_HEIGHT;
        this.collisionRect = {
            x: this.x + 5,
            y: this.y + 5,
            width: this.width - 10,
            height: this.height - 10
        };
        this.image = birdImg;
        this.tilt = 0;
    }

    update() {
        this.vel += GRAVITY * PACE_MULTIPLIER; // Apply slower gravity
        this.y += this.vel * PACE_MULTIPLIER; // Adjusted y position based on slower velocity
        this.collisionRect.y = this.y + 5;

        // Reverse tilt the bird based on velocity
        if (this.vel < 0) {
            this.tilt = Math.min(this.tilt + 3, 25);
        } else {
            this.tilt = Math.max(this.tilt - 3, -25);
        }
    }

    jump() {
        this.vel = -JUMP * PACE_MULTIPLIER; // Adjusted jump velocity
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.tilt * Math.PI / 180);
        ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }

    getCollisionRect() {
        return this.collisionRect;
    }
}

// Pipe class
class Pipe {
    constructor(x) {
        this.x = x;
        this.passed = false;
        this.height = Math.floor(Math.random() * (400 - 100 + 1) + 100); // Random height between 100 and 400
        this.topPipeRect = {
            x: this.x + 3,
            y: this.height - PIPE_HEIGHT + 3,
            width: PIPE_WIDTH - 6,
            height: PIPE_HEIGHT - 6
        };
        this.bottomPipeRect = {
            x: this.x + 3,
            y: this.height + PIPE_GAP + 3,
            width: PIPE_WIDTH - 6,
            height: PIPE_HEIGHT - 6
        };
    }

    update() {
        this.x -= 5 * PACE_MULTIPLIER; // Adjusted pipe speed
        this.topPipeRect.x = this.x + 3;
        this.bottomPipeRect.x = this.x + 3;
    }

    offScreen() {
        return this.x < OFFSCREEN_THRESHOLD;
    }

    draw() {
        // Draw rotated top pipe
        ctx.save();
        ctx.translate(this.x + PIPE_WIDTH / 2, this.height - PIPE_HEIGHT / 2);
        ctx.rotate(Math.PI); // Rotate by 180 degrees (PI radians)
        ctx.drawImage(pipeImg, -PIPE_WIDTH / 2, -PIPE_HEIGHT / 2, PIPE_WIDTH, PIPE_HEIGHT);
        ctx.restore();

        // Draw bottom pipe
        ctx.drawImage(pipeImg, this.x, this.height + PIPE_GAP, PIPE_WIDTH, PIPE_HEIGHT);
    }

    getTopPipeRect() {
        return this.topPipeRect;
    }

    getBottomPipeRect() {
        return this.bottomPipeRect;
    }
}

// Game variables
let bird;
let pipes = [];
let score = 0;
let gameActive = false;
let firstJump = false;

// Font for score display
ctx.font = "24px Arial";

// Function to send score to Telegram bot
function sendScoreToTelegram(score) {
    const message = `Game Over!\nScore: ${score}`;

    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${CHAT_ID}&text=${encodeURIComponent(message)}`)
        .then(response => {
            if (!response.ok) {
                console.error('Failed to send message to Telegram:', response.status, response.statusText);
            }
        })
        .catch(error => {
            console.error('Error sending message to Telegram:', error.message);
        });
}

// Game loop
function gameLoop() {
    bird = new Bird();
    pipes = [];
    score = 0;
    gameActive = false;
    firstJump = false;

    function handleMouseClick() {
        if (!gameActive) {
            bird = new Bird();
            pipes = [];
            pipes.push(new Pipe(SCREEN_WIDTH + PIPE_SPAWN_INTERVAL));
            score = 0;
            gameActive = true;
            firstJump = true;
        }
        if (gameActive || firstJump) {
            bird.jump();
            firstJump = false;
        }
    }

    // Event listeners
    canvas.addEventListener('mousedown', handleMouseClick);

    function update() {
        if (gameActive) {
            bird.update();
            if (bird.y > SCREEN_HEIGHT - BIRD_HEIGHT || bird.y < 0) {
                console.log("Game over");
                gameActive = false;
                sendScoreToTelegram(score); // Send score to Telegram on game over
            }

            for (let i = pipes.length - 1; i >= 0; i--) {
                pipes[i].update();

                const birdRect = bird.getCollisionRect();
                const topPipeRect = pipes[i].getTopPipeRect();
                const bottomPipeRect = pipes[i].getBottomPipeRect();

                // Check collision using rectangles
                if (collisionCheck(birdRect, topPipeRect) || collisionCheck(birdRect, bottomPipeRect)) {
                    console.log("Collision detected");
                    gameActive = false;
                }

                if (!pipes[i].passed && pipes[i].x < bird.x) {
                    pipes[i].passed = true;
                    score++;
                    console.log(`Score: ${score}`);
                }

                if (pipes[i].offScreen()) {
                    pipes.splice(i, 1);
                }
            }

            if (pipes.length === 0 || pipes[pipes.length - 1].x < SCREEN_WIDTH - PIPE_SPAWN_INTERVAL) {
                pipes.push(new Pipe(SCREEN_WIDTH + PIPE_SPAWN_INTERVAL));
            }
        }

        // Clear canvas
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Draw background
        ctx.drawImage(backgroundImg, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

        // Draw bird
        bird.draw();

        // Draw pipes
        pipes.forEach(pipe => pipe.draw());

        // Draw base
        ctx.drawImage(baseImg, 0, SCREEN_HEIGHT - 50, SCREEN_WIDTH, 50);

        // Draw score
        ctx.fillStyle = BLACK;
        ctx.fillText(`Score: ${score}`, 10, 30);

        if (!gameActive && !firstJump) {
            ctx.font = "36px Arial";
            ctx.fillText("Game Over", SCREEN_WIDTH / 2 - 100, SCREEN_HEIGHT / 2 - 50);
            ctx.font = "24px Arial";
            ctx.fillText(`Score: ${score}`, SCREEN_WIDTH / 2 - 50, SCREEN_HEIGHT / 2 + 20);
        }

        // Request next frame
        requestAnimationFrame(update);
    }

    // Start game loop
    update();
}

// Helper function to check collision between two rectangles
function collisionCheck(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Start game
gameLoop();
