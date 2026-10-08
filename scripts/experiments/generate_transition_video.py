#!/usr/bin/env python3
"""
Generate transition video from blackboard to digital math interface.
Creates frames that simulate the transformation from chaotic chalkboard to clean digital visualization.
"""

import os
import math
import subprocess
from PIL import Image, ImageDraw, ImageFont

# Configuration
WIDTH, HEIGHT = 1920, 1080
DURATION = 10
FPS = 30
NUM_FRAMES = DURATION * FPS

output_dir = "frames"
os.makedirs(output_dir, exist_ok=True)

def draw_chalkboard_scene(draw, frame_idx, phase):
    """Draw a chaotic blackboard scene with chalk marks."""
    # Dark chalkboard background
    draw.rectangle([0, 0, WIDTH, HEIGHT], fill=(15, 15, 25, 255))
    
    # Add chaotic chalk marks based on phase
    time = frame_idx / NUM_FRAMES
    
    # Multiple equation elements
    equations = [
        "∫₀^∞ f(x) dx",
        "∂f/∂x = lim",
        "Σ  n=1 ∞",
        "α + β = γ",
        "∃ x ∀ y",
        "∇ × B = μ₀J",
        "e^(iπ) = -1",
        "(a+b)² = a²+b²+2ab"
    ]
    
    # Draw chalk-like hand-drawn elements
    for i, eq in enumerate(equations):
        # Position changes over time
        x = int(200 + i * 150 + math.sin(time * 2 + i) * 30)
        y = int(200 + i * 80 + math.sin(time * 1.5 + i) * 20)
        size = int(24 + math.sin(time * 3 + i) * 5)
        
        # Chalk color (yellowish-white with variations)
        color = (int(245 + math.sin(time * 5 + i) * 10),
                 int(230 + math.sin(time * 4 + i) * 15),
                 int(180 + math.sin(time * 3 + i) * 20))
        
        # Draw equation with slight wobble/wiggle effect
        draw.text((x, y), eq, fill=color, font=None)
        
        # Add chalk smudges and arrows
        if time > 0.3:
            # Draw messy lines/arrows
            draw.line([x-20, y+10, x+30, y+30], fill=(200, 180, 150), width=2)
            draw.polygon([x+30, y+30, x+25, y+35, x+35, y+35], fill=(220, 200, 170))

def draw_digital_interface(draw, frame_idx, phase):
    """Draw the clean digital math interface."""
    # Clean white background with subtle grid
    draw.rectangle([0, 0, WIDTH, HEIGHT], fill=(250, 250, 255))
    
    # Draw coordinate grid
    for x in range(0, WIDTH, 50):
        draw.line([(x, 0), (x, HEIGHT)], fill=(220, 220, 220), width=1)
    for y in range(0, HEIGHT, 50):
        draw.line([(0, y), (WIDTH, y)], fill=(220, 220, 220), width=1)
    
    # Draw clean LaTeX-style equations
    time = frame_idx / NUM_FRAMES
    
    equations = [
        ("∫₀^∞ e^(-x²) dx = √π", (100, 100)),
        ("d/dx[sin(x)] = cos(x)", (100, 200)),
        ("∇ · E = ρ/ε₀", (100, 300)),
        ("e^(iθ) = cos(θ) + i·sin(θ)", (100, 400)),
    ]
    
    for text, (x, y) in equations:
        # Clean blue text for digital interface
        draw.text((x, y), text, fill=(0, 100, 200), font=None)
    
    # Draw knowledge tree structure
    if time > 0.3:
        # Main branches
        branches = [
            ("Math", 960, 550),
            ("Algebra", 700, 650),
            ("Calculus", 1220, 650),
            ("Geometry", 500, 750),
            ("Statistics", 1420, 750),
        ]
        
        # Draw branches
        for label, x, y in branches:
            draw.text((x, y), label, fill=(50, 50, 150), font=None)
        
        # Draw connecting lines
        draw.line([960, 600, 700, 700], fill=(100, 100, 200), width=3)
        draw.line([960, 600, 1220, 700], fill=(100, 100, 200), width=3)
        draw.line([700, 700, 500, 750], fill=(100, 100, 200), width=2)
        draw.line([1220, 700, 1420, 750], fill=(100, 100, 200), width=2)
    
    # Add nodes in the graph
    if time > 0.5:
        for i in range(20):
            x = 200 + (i % 10) * 150 + math.sin(time * 2 + i) * 20
            y = 500 + (i // 10) * 100 + math.sin(time * 1.5 + i) * 15
            r = 8 + math.sin(time * 3 + i) * 2
            draw.ellipse([x-r, y-r, x+r, y+r], fill=(100, 150, 255), outline=(50, 80, 150))

def create_frame(frame_idx):
    """Create a single frame transitioning from blackboard to digital."""
    img = Image.new('RGB', (WIDTH, HEIGHT), color=(0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    phase = frame_idx / NUM_FRAMES  # 0.0 to 1.0
    
    # Draw blackboard scene
    draw_chalkboard_scene(draw, frame_idx, phase)
    
    # Blend with digital interface based on phase
    if phase > 0.2:
        # Create digital overlay
        digital_img = Image.new('RGB', (WIDTH, HEIGHT), color=(250, 250, 255))
        digital_draw = ImageDraw.Draw(digital_img)
        draw_digital_interface(digital_draw, frame_idx, phase)
        
        # Blend images with alpha based on phase
        alpha = (phase - 0.2) / 0.8  # 0 at 20%, 1 at 100%
        blended = Image.blend(img, digital_img, alpha)
        return blended
    
    return img

def main():
    print(f"Generating {NUM_FRAMES} frames for transition video...")
    
    for i in range(NUM_FRAMES):
        if i % 50 == 0:
            print(f"Progress: {i}/{NUM_FRAMES} frames")
        
        frame = create_frame(i)
        frame_path = os.path.join(output_dir, f"frame_{i:05d}.png")
        frame.save(frame_path)
    
    print("All frames generated. Creating video...")
    
    # Use ffmpeg to create the final video
    output_video = "blackboard_to_digital.mp4"
    
    cmd = [
        "ffmpeg",
        "-y",  # Overwrite output file
        "-framerate", str(FPS),
        "-i", os.path.join(output_dir, "frame_%05d.png"),
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-crf", "18",  # High quality
        "-preset", "slow",
        output_video
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode == 0:
        print(f"Video created successfully: {output_video}")
    else:
        print(f"Error creating video: {result.stderr}")
    
    # Cleanup frames
    print("Cleaning up temporary frames...")
    for f in os.listdir(output_dir):
        os.remove(os.path.join(output_dir, f))
    os.rmdir(output_dir)

if __name__ == "__main__":
    main()