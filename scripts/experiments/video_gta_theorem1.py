#!/usr/bin/env python3
"""
Generate GTA-Style Math Education Video 1
Video 1 - "Grand Theft Auto Style" of formulas:
- Professor writing on board with slow camera
- Formulas: Fundamental Theorem of Calculus, Euler's Identity, Stokes' Theorem, Bayes' Theorem
- Style: GTA-style cinematic (like The Simpsons Movie intro) with day-for-night
- Camera moving, vintage classroom lighting
- Duration: 15-20s, 1080p
"""

import os
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import random
import math

# Configuration
WIDTH, HEIGHT = 1920, 1080
DURATION = 18  # 18 seconds
FPS = 30
NUM_FRAMES = DURATION * FPS
OUTPUT_FILE = "gta_video1_theorems.mp4"
output_dir = "frames_v1"
os.makedirs(output_dir, exist_ok=True)

# Colors - GTA style palette
CHALKBOARD_DARK = (20, 20, 40, 255)      # Dark chalkboard
CHALK_COLOR = (245, 240, 210, 255)      # Chalk white/yellow
HIGHLIGHT_AMBER = (255, 191, 0, 255)    # Accent amber
HIGHLIGHT_BLUE = (100, 180, 255, 255)   # Accent blue
TIME_GLOW = (100, 80, 200, 150)         # Purple time glare

# Formulas to display (LaTeX style but rendered as text)
FORMULAS = [
    r"∫[a,b] f'(x) dx = f(b) - f(a)",                    # FTC
    r"e^(iπ) + 1 = 0",                                     # Euler's Identity
    r"∫∫_S (∇×F)·dS = ∮_{∂S} F·dr",                        # Stokes
    r"P(A|B) = P(B|A)·P(A) / P(B)",                         # Bayes
]

def draw_chalk_text(draw, x, y, text, size=48, color=CHALK_COLOR):
    """Draw text with chalk-like effect"""
    draw.text((x, y), text, fill=color, font=None)

def create_frame(frame_idx, phase):
    """Create a single frame for GTA-style video"""
    
    # Calculate time position in video
    time_progress = frame_idx / NUM_FRAMES
    
    # Create base image
    img = Image.new('RGB', (WIDTH, HEIGHT), color=(30, 30, 50))
    draw = ImageDraw.Draw(img)
    
    # Background: vintage classroom with day-for-night
    # Dark blue background with subtle texture
    for i in range(HEIGHT):
        for j in range(WIDTH):
            noise = random.randint(-5, 5)
            value = int(30 + noise)
            img.putpixel((j, i), (value, value - 10, value + 20))
    
    # Camera pan effect (subtle)
    offset_x = int(20 * math.sin(time_progress * math.pi * 2))
    
    # Projection matrix for 3D effect (GTA-style)
    def project_3d(x, y, z):
        """Simple 3D projection for GTA-style camera"""
        scale = 400 / (z + 600)
        return int(WIDTH/2 + x * scale + offset_x), int(HEIGHT/2 + y * scale)
    
    # Draw professor at chalkboard (left side)
    professor_x, professor_y = 400, 500
    professor_z = 0
    
    # Professor silhouette
    draw.rectangle([professor_x - 50, professor_y, professor_x + 50, professor_y - 200], 
                   fill=(80, 70, 60))
    
    # Chalkboard (right side of professor)
    board_x, board_y = 600, 450
    board_width, board_height = 600, 400
    
    # Chalkboard border with glow
    for i in range(3):
        draw.rectangle([board_x - i, board_y - i, board_x + board_width + i, board_y + board_height + i],
                      fill=(60, 50, 40))
    
    # Chalkboard surface
    draw.rectangle([board_x, board_y, board_x + board_width, board_y + board_height],
                   fill=(25, 25, 55))
    
    # Draw formulas on board with slow writing effect
    current_formula_idx = int(time_progress * 4) % 4
    
    for i, formula in enumerate(FORMULAS):
        # Determine if this formula should be visible (writing/erasing effect)
        formula_time = (i + 0.5) / 4.0
        writing_progress = max(0, min(1, (time_progress - formula_time + 0.5) * 2))
        erasing_progress = max(0, min(1, abs(time_progress - formula_time) * 4))
        
        # Position formula on board
        fx, fy = board_x + 80, board_y + 80 + i * 80
        
        # Drawing speed (slow writing)
        if writing_progress > 0.1:
            # Chalk text effect
            for char_idx, char in enumerate(formula):
                if char_idx / len(formula) < writing_progress * 0.8:
                    glitch_offset = random.randint(-2, 2) if random.random() < 0.1 else 0
                    draw.text((fx + char_idx * 20 + glitch_offset, fy + 10), 
                             char, fill=(255, 240, 180))
        
        # Highlighted formula (GTA-style glow)
        if current_formula_idx == i and time_progress > formula_time:
            # Draw glow effect
            glow_centers = [(fx + 40, fy + 10), (fx + 60, fy + 30)]
            for gx, gy in glow_centers:
                for r in range(15, 0, -2):
                    glow_color = (100, 80, 200, 200 - r * 10)
                    # Simulate glow with multiple circles
                    for _ in range(3):
                        xx = gx + random.randint(-r, r)
                        yy = gy + random.randint(-r, r)
                        if 0 <= xx < WIDTH and 0 <= yy < HEIGHT:
                            draw.ellipse([xx - r//2, yy - r//2, xx + r//2, yy + r//2],
                                       fill=HIGHLIGHT_AMBER)
    
    # GTA-style time indicator (top left)
    time_display = f"{int(time_progress * 60):02d}:{int((time_progress * 60) % 1 * 60):02d}"
    draw.text((50, 50), "TIME", fill=(200, 200, 255), font=None)
    draw.text((50, 80), time_display, fill=(255, 191, 0), font=None)
    
    # GTA subtitle (like movie credits)
    subtitle = "LEMMA: MATEMÁTICA CINEMATOGRÁFICA"
    draw.text((WIDTH//2 - 150, HEIGHT - 80), subtitle, fill=(100, 80, 200), font=None)
    
    # Film grain effect (subtle)
    if random.random() < 0.1:
        for _ in range(50):
            x, y = random.randint(0, WIDTH), random.randint(0, HEIGHT)
            img.putpixel((x, y), (255, 255, 255))
    
    # Color grade for day-for-night
    pixels = img.load()
    for i in range(HEIGHT):
        for j in range(WIDTH):
            r, g, b = pixels[j, i]
            # Blue tint for night
            new_r = int(r * 0.8 + 20)
            new_g = int(g * 0.8 + 20)
            new_b = int(b * 0.9 + 60)
            pixels[j, i] = (max(0, min(255, new_r)), 
                          max(0, min(255, new_g)), 
                          max(0, min(255, new_b)))
    
    return img

def main():
    print(f"Generating GTA-style Video 1: {NUM_FRAMES} frames...")
    
    for i in range(NUM_FRAMES):
        if i % 50 == 0:
            progress = i / NUM_FRAMES * 100
            print(f"Progress: {i}/{NUM_FRAMES} frames ({progress:.1f}%)")
        
        phase = i / NUM_FRAMES
        frame = create_frame(i, phase)
        
        frame_path = os.path.join(output_dir, f"frame_{i:05d}.png")
        frame.save(frame_path)
    
    print("All frames generated. Creating video...")
    
    # Create video using ffmpeg
    cmd = [
        "ffmpeg",
        "-y",
        "-framerate", str(FPS),
        "-i", os.path.join(output_dir, "frame_%05d.png"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-crf", "18",
        "-preset", "slow",
        OUTPUT_FILE
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"Video created successfully: {OUTPUT_FILE}")
    else:
        print(f"Error creating video: {result.stderr}")
    
    # Cleanup frames
    print("Cleaning up temporary frames...")
    for f in os.listdir(output_dir):
        os.remove(os.path.join(output_dir, f))
    os.rmdir(output_dir)

if __name__ == "__main__":
    main()