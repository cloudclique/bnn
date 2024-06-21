import pygame
import random
import os

# Initialize Pygame
pygame.init()

# Constants
SCREEN_WIDTH = 400
SCREEN_HEIGHT = 600
PIPE_WIDTH = 100
PIPE_HEIGHT = 400
PIPE_GAP = 200
BIRD_WIDTH = 60  # Updated size
BIRD_HEIGHT = 40  # Updated size
GRAVITY = 0.9
JUMP = 12
PIPE_SPAWN_INTERVAL = 250
OFFSCREEN_THRESHOLD = -200
FPS = 60

# Colors
WHITE = (255, 255, 255)
RED = (255, 0, 0)
BLACK = (0, 0, 0)

# Determine the directory where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
image_path = os.path.join(script_dir, '')  # Ensure this points to the same directory as the script

# Set up display
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Flappy Bird")

# Load images
BIRD_IMG = pygame.image.load(os.path.join(image_path, "bird.png")).convert_alpha()
BIRD_IMG = pygame.transform.scale(BIRD_IMG, (BIRD_WIDTH, BIRD_HEIGHT))

PIPE_IMG = pygame.image.load(os.path.join(image_path, "pipe.png")).convert_alpha()
PIPE_IMG = pygame.transform.scale(PIPE_IMG, (PIPE_WIDTH, PIPE_HEIGHT))
PIPE_TOP_IMG = pygame.transform.rotate(PIPE_IMG, 180)

BG_IMG = pygame.image.load(os.path.join(image_path, "background.png")).convert()
BG_IMG = pygame.transform.scale(BG_IMG, (SCREEN_WIDTH, SCREEN_HEIGHT))

BASE_IMG = pygame.image.load(os.path.join(image_path, "base.png")).convert_alpha()

clock = pygame.time.Clock()

# Bird class
class Bird:
    def __init__(self):
        self.x = 50
        self.y = SCREEN_HEIGHT // 2
        self.vel = 0
        self.width = BIRD_WIDTH
        self.height = BIRD_HEIGHT
        self.collision_rect = pygame.Rect(self.x + 5, self.y + 5, self.width - 10, self.height - 10)
        self.image = BIRD_IMG
        self.tilt = 0

    def update(self):
        self.vel += GRAVITY
        self.y += self.vel
        self.collision_rect.y = self.y + 5

        # Reverse tilt the bird based on velocity
        if self.vel < 0:
            self.tilt = min(self.tilt + 3, 25)
        else:
            self.tilt = max(self.tilt - 3, -25)

    def jump(self):
        self.vel = -JUMP

    def draw(self, screen):
        rotated_image = pygame.transform.rotate(self.image, self.tilt)
        new_rect = rotated_image.get_rect(center=self.image.get_rect(topleft=(self.x, self.y)).center)
        screen.blit(rotated_image, new_rect.topleft)

    def get_collision_rect(self):
        return self.collision_rect

# Pipe class
class Pipe:
    def __init__(self, x):
        self.x = x
        self.passed = False
        self.height = random.randint(100, 400)
        self.top_pipe_rect = pygame.Rect(self.x + 3, self.height - PIPE_HEIGHT + 3, PIPE_WIDTH - 6, PIPE_HEIGHT - 6)
        self.bottom_pipe_rect = pygame.Rect(self.x + 3, self.height + PIPE_GAP + 3, PIPE_WIDTH - 6, PIPE_HEIGHT - 6)

    def update(self):
        self.x -= 5
        self.top_pipe_rect.x = self.x + 3
        self.bottom_pipe_rect.x = self.x + 3

    def off_screen(self):
        return self.x < OFFSCREEN_THRESHOLD

    def draw(self, screen):
        screen.blit(PIPE_TOP_IMG, (self.x, self.height - PIPE_HEIGHT))
        screen.blit(PIPE_IMG, (self.x, self.height + PIPE_GAP))

    def get_top_pipe_rect(self):
        return self.top_pipe_rect

    def get_bottom_pipe_rect(self):
        return self.bottom_pipe_rect

# Game loop
def game_loop():
    bird = Bird()
    pipes = []
    score = 0
    game_active = False
    first_jump = False

    # Font initialization for the score display
    font = pygame.font.Font(None, 36)

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                return
            if event.type == pygame.MOUSEBUTTONDOWN:
                if not game_active:
                    bird = Bird()
                    pipes = []
                    pipes.append(Pipe(SCREEN_WIDTH + PIPE_SPAWN_INTERVAL))
                    score = 0
                    game_active = True
                    first_jump = True
                if game_active or first_jump:
                    bird.jump()
                    first_jump = False

        if game_active:
            bird.update()
            if bird.y > SCREEN_HEIGHT - BIRD_HEIGHT:
                print("Bird hit the ground")
                game_active = False
            if bird.y < 0:
                print("Bird went out of bounds")
                game_active = False

            for pipe in pipes[:]:
                pipe.update()

                bird_rect = bird.get_collision_rect()
                top_pipe_rect = pipe.get_top_pipe_rect()
                bottom_pipe_rect = pipe.get_bottom_pipe_rect()

                # Check collision using rectangles
                if (bird_rect.colliderect(top_pipe_rect) or
                    bird_rect.colliderect(bottom_pipe_rect)):
                    print("Collision detected")
                    game_active = False

                if not pipe.passed and pipe.x < bird.x:
                    pipe.passed = True
                    score += 1
                    print(f"Score: {score}")

                if pipe.off_screen():
                    pipes.remove(pipe)

                if pipes and pipes[-1].x < SCREEN_WIDTH - PIPE_SPAWN_INTERVAL:
                    pipes.append(Pipe(pipes[-1].x + PIPE_SPAWN_INTERVAL))

        screen.blit(BG_IMG, (0, 0))
        bird.draw(screen)
        for pipe in pipes:
            pipe.draw(screen)
        screen.blit(BASE_IMG, (0, SCREEN_HEIGHT - 50))

        # Display the score in the top-left corner
        score_text = font.render(f"Score: {score}", True, BLACK)
        screen.blit(score_text, (10, 10))

        if not game_active and not first_jump:
            font_game_over = pygame.font.Font(None, 55)
            text = font_game_over.render("Game Over", True, BLACK)
            score_text = font_game_over.render(f"Score: {score}", True, BLACK)
            screen.blit(text, (SCREEN_WIDTH // 2 - text.get_width() // 2, SCREEN_HEIGHT // 2 - text.get_height() // 2))
            screen.blit(score_text, (SCREEN_WIDTH // 2 - score_text.get_width() // 2, SCREEN_HEIGHT // 2 + text.get_height()))

        pygame.display.flip()
        clock.tick(FPS)

if __name__ == "__main__":
    game_loop()
