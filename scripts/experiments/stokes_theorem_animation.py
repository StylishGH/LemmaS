"""
Stokes' Theorem Animated Proof Visualization
Colors: Amber (#FFBF00), Navy (#001F3F), Chalk White (#F5F5DC)
"""

from manim import *
import numpy as np

class StokesTheorem(Scene):
    def construct(self):
        # Define LEMMAS theme colors
        amber = "#FFBF00"      # Amber - for highlights and arrows
        navy = "#001F3F"       # Navy - for main elements and background
        chalk_white = "#F5F5DC"  # Chalk White - for text and accents

        # Fade in title
        title = Text("Stokes' Theorem Proof", font_size=36, color=amber, weight=BOLD)
        title.to_edge(UP, buff=0.5)
        title.set_color(amber)
        self.play(FadeIn(title, shift=UP))
        self.wait(0.5)

        # Create coordinate system
        axes = Axes(
            x_range=[-5, 5, 1],
            y_range=[-5, 5, 1],
            x_length=8,
            y_length=6,
            axis_config={"color": chalk_white, "include_numbers": True},
            labelling_axis=False
        ).add_coordinates()
        
        # Style the axes with navy background
        axes.background_color = navy
        axes.get_grid().set_color(navy, opacity=0.3)

        # Scene 1: Vector Field Visualization
        vector_field_label = Text("1. Vector Field F", font_size=28, color=amber)
        vector_field_label.next_to(axes, DOWN, buff=0.5)

        # Create vector field arrows (simplified 2D projection)
        vectors = VGroup()
        for i in np.linspace(-3, 3, 8):
            for j in np.linspace(-2, 2, 5):
                # Curl-like vector field: F = (-y, x) for demonstration
                # This creates a rotational pattern
                angle = np.arctan2(j, i) + np.pi/2
                length = 0.4
                dx = -j * length
                dy = i * length
                arrow = Arrow(
                    start=[i, j, 0],
                    end=[i + dx, j + dy, 0],
                    color=amber,
                    stroke_width=2,
                    tip_width=0.2,
                    tip_length=0.2
                )
                vectors.add(arrow)

        self.play(Create(axes), run_time=1.5)
        self.play(Create(vectors, lag_ratio=0.1))
        self.play(Write(vector_field_label))
        self.wait(1)

        # Highlight some vectors with color
        highlighted_vectors = VGroup()
        for v in vectors[::3]:  # Every third vector
            highlighted_vectors.add(v.copy().set_color(chalk_white))
        
        self.play(FadeIn(highlighted_vectors, scale=1.2), run_time=1)
        self.wait(0.5)

        # Scene 2: Surface Integral Visualization
        self.play(FadeOut(vector_field_label), FadeOut(vectors), run_time=1)

        # Create a curved surface (representing the surface of integration)
        surface_points = []
        for i, u in enumerate(np.linspace(-2, 2, 20)):
            for j, v in enumerate(np.linspace(-1.5, 1.5, 12)):
                x = u * np.cos(v * 0.5)
                y = u * np.sin(v * 0.5)
                z = 0.3 * u * np.sin(i * 0.5)
                surface_points.append([x, y, z])

        surface = Surface(
            lambda u, v: np.array([
                u * np.cos(v * 0.5),
                u * np.sin(v * 0.5),
                0.2 * np.sin(u) * np.cos(v)
            ]),
            u_range=[-2, 2],
            v_range=[0, np.pi],
            fill_color=gradient_color(amber, navy),
            fill_opacity=0.6,
            stroke_color=chalk_white,
            stroke_width=0.5
        )
        
        surface.set_color_by_gradient(amber, navy)

        surface_label = Text("Surface S with boundary ∂S", font_size=26, color=chalk_white)
        surface_label.next_to(surface, UP, buff=0.3)

        self.play(Create(surface, run_time=2))
        self.play(Write(surface_label))
        self.wait(1)

        # Scene 3: Boundary Curve (Green's Theorem connection)
        boundary_curve = ParametricFunction(
            lambda t: np.array([
                2 * np.cos(t),
                2 * np.sin(t),
                0.2 * np.sin(3 * t)
            ]),
            t_range=[0, TAU],
            color=amber,
            stroke_width=4
        )

        boundary_label = Text("Boundary Curve ∂S", font_size=28, color=amber)
        boundary_label.next_to(boundary_curve, UP, buff=0.3)

        # Add orientation arrow on boundary
        orientation_arrow = Arrow(
            start=boundary_curve.get_start(),
            end=boundary_curve.get_start() + 0.5 * RIGHT,
            color=amber,
            stroke_width=3
        )
        orientation_text = Text("counter-clockwise", font_size=14, color=chalk_white)
        orientation_text.next_to(orientation_arrow, UP, buff=0.1)

        self.play(Create(boundary_curve, run_time=2))
        self.play(Write(boundary_label))
        self.play(Create(orientation_arrow), Write(orientation_text))
        self.wait(0.5)

        # Fade to Stokes' theorem equation
        theorem_label = Text("∫∫_S (∇ × F) · dS = ∮_{∂S} F · dr", font_size=32, color=amber)
        theorem_label.set_color(amber)
        
        self.play(FadeOut(surface, scale=1.5), FadeOut(surface_label), FadeOut(boundary_curve))
        self.play(FadeOut(boundary_label), FadeOut(orientation_arrow), FadeOut(orientation_text))
        self.play(Write(theorem_label), run_time=2)
        self.wait(1.5)

        # Final animation: Demonstrate the equivalence
        # Show surface with highlighted curl vectors
        curl_vectors = VGroup()
        for theta in np.linspace(0, TAU, 12, endpoint=False):
            x, y = 1.5 * np.cos(theta), 1.5 * np.sin(theta)
            # Curl points in z-direction for this field
            arrow = Arrow3D(
                start=[x, y, 0],
                end=[x, y, 0.5],
                color=amber,
                stroke_width=3
            )
            curl_vectors.add(arrow)

        surface2 = ParametricSurface(
            lambda u, v: np.array([
                u * 0.8 * np.cos(v),
                u * 0.8 * np.sin(v),
                u * 0.3
            ]),
            u_range=[-1.5, 1.5],
            v_range=[0, TAU],
            fill_color=navy,
            fill_opacity=0.7,
            stroke_color=chalk_white
        )

        self.play(FadeOut(theorem_label))
        self.play(Create(surface2, run_time=1.5), FadeIn(curl_vectors, scale=1.2))
        
        # Highlight the connection
        connection = Text("Curl through\nsurface = Circulation\nboundary", font_size=18, color=chalk_white)
        connection.next_to(surface2, RIGHT, buff=0.5)
        
        self.play(Write(connection, run_time=2))
        self.wait(1)

        # Final frame with complete statement
        self.play(
            FadeOut(connection),
            FadeOut(curl_vectors),
            FadeOut(surface2),
            FadeOut(surface_label),
            FadeOut(boundary_label),
            FadeOut(orientation_arrow),
            FadeOut(orientation_text),
            FadeOut(theorem_label),
            run_time=1.5
        )

        final_statement = Text(
            "Stokes' Theorem\n\nFor a vector field F\nand oriented surface S\nwith boundary ∂S,\n\n∬_S (∇ × F) · dS = ∮_{∂S} F · dr",
            font_size=24,
            color=chalk_white,
            alignment="CENTER"
        )
        final_statement.move_to(ORIGIN)

        self.play(Write(final_statement, run_time=3))
        self.wait(2)