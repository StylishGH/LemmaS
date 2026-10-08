"""Stokes' Theorem Animated Proof - LEMMAS Theme (Amber, Navy, Chalk White)"""

from manim import *
import numpy as np

# LEMMAS theme colors
AMBER = "#FFBF00"
NAVY = "#001F3F"
CHALK_WHITE = "#F5F5DC"


class StokesTheorem(Scene):
    def construct(self):
        self.title = Text("Stokes' Theorem Proof", font_size=36, color=AMBER, weight=BOLD)
        self.title.to_edge(UP, buff=0.5)
        self.play(FadeIn(self.title, shift=UP))
        self.wait(0.5)