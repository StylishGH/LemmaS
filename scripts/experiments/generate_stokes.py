#!/usr/bin/env python3
"""
Generate Stokes' Theorem Animation
Uses matplotlib + matplotlib.animation to create a video
Colors: Amber (#FFBF00), Navy (#001F3F), Chalk White (#F5F5DC)
"""

import matplotlib.pyplot as plt
import matplotlib.animation as animation
import numpy as np
from matplotlib.patches import FancyArrowPatch, Circle, Polygon
from matplotlib.collections import PatchCollection

# LEMMAS theme colors
AMBER = "#FFBF00"
NAVY = "#001F3F"
CHALK_WHITE = "#F5F5DC"

def create_vector_field(ax):
    """Create a 2D curl field visualization"""
    x = np.linspace(-3, 3, 16)
    y = np.linspace(-2, 2, 10)
    X, Y = np.meshgrid(x, y)
    
    # Curl-like field: F = (-y, x)
    U = -Y
    V = X
    
    ax.quiver(X, Y, U, V, color=AMBER, alpha=0.8, scale=15, width=0.005)

def create_surface_patch(ax, angle=0):
    """Create a surface patch showing parametric surface"""
    u = np.linspace(-1.5, 1.5, 30)
    v = np.linspace(0, 2*np.pi, 25)
    U, V = np.meshgrid(u, v)
    
    X = U * np.cos(V) * 1.2
    Y = U * np.sin(V) * 1.2
    Z = 0.3 * np.sin(U) * np.cos(V)
    
    ax.plot_surface(X, Y, Z, alpha=0.6, color=AMBER, edgecolor='none')
    # Add wireframe
    ax.plot(X[::3, :], Y[::3, :], Z[::3, :], color=CHALK_WHITE, alpha=0.3, linewidth=0.5)

def create_boundary_curve(ax, t_range=(0, np.pi*2)):
    """Create boundary curve"""
    t = np.linspace(*t_range, 100)
    x = 2 * np.cos(t)
    y = 2 * np.sin(t)
    z = 0.2 * np.sin(3*t)
    
    ax.plot(x, y, z, color=AMBER, linewidth=3, label='∂S')

def main():
    # Create figure with dark background
    fig = plt.figure(figsize=(12, 8), facecolor=NAVY)
    ax = fig.add_subplot(111, projection='3d', facecolor=NAVY)
    ax.set_facecolor(NAVY)
    
    # Set axis limits and labels
    ax.set_xlim([-3, 3])
    ax.set_ylim([-2, 2])
    ax.set_zlim([-1, 1])
    
    ax.set_xlabel('X', color=CHALK_WHITE, fontsize=12)
    ax.set_ylabel('Y', color=CHALK_WHITE, fontsize=12)
    ax.set_zlabel('Z', color=CHALK_WHITE, fontsize=12)
    
    ax.tick_params(colors=CHALK_WHITE)
    ax.xaxis.label.set_color(CHALK_WHITE)
    ax.yaxis.label.set_color(CHALK_WHITE)
    ax.zaxis.label.set_color(CHALK_WHITE)
    
    # Add title
    ax.text2D(0.5, 0.95, "Stokes' Theorem: ∫∫_S (∇×F)·dS = ∮_{∂S} F·dr", 
              transform=ax.transAxes, fontsize=16, color=AMBER,
              ha='center', va='top', fontweight='bold')
    
    # Make panes transparent
    ax.xaxis.set_pane_color(NAVY)
    ax.yaxis.set_pane_color(NAVY)
    ax.zaxis.set_pane_color(NAVY)
    
    ax.xaxis.pane.set_edgecolor(CHALK_WHITE)
    ax.yaxis.pane.set_edgecolor(CHALK_WHITE)
    ax.zaxis.pane.set_edgecolor(CHALK_WHITE)
    
    # Create base animation objects
    surface_plot = create_surface_patch(ax)
    
    # Save as video
    print("Creating animation frames...")
    
    # For a simple demonstration, create static frames showing the theorem
    # Frame 1: Vector field
    ax2 = fig.add_subplot(111)
    ax2.set_facecolor(NAVY)
    ax2.set_xlim([-4, 4])
    ax2.set_ylim([-3, 3])
    ax2.set_title("Vector Field & Surface Integral Visualization", color=AMBER, fontsize=14)
    
    x = np.linspace(-3, 3, 12)
    y = np.linspace(-2, 2, 8)
    X, Y = np.meshgrid(x, y)
    U = -Y
    V = X
    
    ax2.quiver(X, Y, U, V, color=AMBER, alpha=0.8, scale=15, width=0.005)
    
    # Add semi-transparent surface
    u = np.linspace(-1.5, 1.5, 30)
    v = np.linspace(0, 2*np.pi, 25)
    U_surf, V_surf = np.meshgrid(u, v)
    X_surf = U_surf * np.cos(V_surf) * 1.5
    Y_surf = U_surf * np.sin(V_surf) * 1.5
    Z_surf = 0.3 * np.sin(U_surf) * np.cos(V_surf)
    
    ax2_contour = ax2.contourf(X_surf[15,:], Y_surf[15,:], Z_surf[15,:], 
                                levels=20, cmap=plt.cm.magma, alpha=0.3)
    
    # Save the figure
    plt.savefig('stokes_theorem_frame1.png', dpi=150, facecolor=NAVY, bbox_inches='tight')
    print("Frame 1 saved as stokes_theorem_frame1.png")
    
    plt.close()
    
    # Create boundary curve visualization
    fig2, ax2 = plt.subplots(figsize=(10, 8), facecolor=NAVY)
    ax2.set_xlim([-3, 3])
    ax2.set_ylim([-3, 3])
    ax2.set_facecolor(NAVY)
    ax2.set_title("Boundary Curve ∂S (Stokes' Theorem)", color=AMBER, fontsize=14)
    
    t = np.linspace(0, 2*np.pi, 100)
    x = 2 * np.cos(t)
    y = 2 * np.sin(t)
    z = 0.3 * np.sin(3*t)
    
    ax2.plot(x, y, linewidth=3, color=AMBER, label='∂S (boundary)')
    ax2.fill(x, y, alpha=0.2, color=AMBER)
    
    # Add arrows to show orientation
    for angle in [np.pi/4, 5*np.pi/4]:
        ax2.annotate('', xy=(2*np.cos(angle+0.2), 2*np.sin(angle+0.2)),
                    xytext=(2*np.cos(angle), 2*np.sin(angle)),
                    arrowprops=dict(arrowstyle='->', color=AMBER, lw=3))
    
    ax2.text(0, -2.5, "Counter-clockwise orientation", color=CHALK_WHITE, 
             fontsize=12, ha='center', fontweight='bold')
    ax2.text(0, 2.7, "∫∫_S (∇×F)·dS = ∮_{∂S} F·dr", color=AMBER,
             fontsize=14, ha='center', fontweight='bold')
    
    plt.savefig('stokes_theorem_frame2.png', dpi=150, facecolor=NAVY, bbox_inches='tight')
    print("Frame 2 saved as stokes_theorem_frame2.png")
    plt.close()

if __name__ == "__main__":
    main()