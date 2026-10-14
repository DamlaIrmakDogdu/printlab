# HOW THE LABS WORK

Here is a rundown of how all the labs work in case if you're curious.

## 1. Halftone Lab: rendering method

The pattern is drawn with the HTML Canvas 2D API.

1. JavaScript converts DPI and LPI into printer positions and halftone cells inside the fixed area.
2. Printer positions are assigned to their nearest screen cell.
3. Positions inside each cell are sorted from the center outward.
4. Ink coverage decides how many positions are filled.
5. Filling positions from the center outward creates a clustered amplitude-modulated halftone dot.
6. Optional overlays draw fine printer-dot boundaries and blue screen-cell boundaries.

Geometry is cached by DPI/LPI combination because changing only ink coverage does not require the cells to be calculated again. Drawing is scheduled with `requestAnimationFrame()` so rapid slider movement stays smooth.

The Explore panel and both Compare panels use the same state and rendering functions. This avoids three separate implementations producing inconsistent results.

## 2. Folding Lab: fold calculation

The folding model treats the original sheet as material coordinates running from the leading edge to the trailing edge. Each layer records:

- the original material interval it contains;
- its position in the folded packet;
- its direction;
- which face, A or B, points upward.

An active buckle plate folds the entering packet at its stop distance. The calculation splits any layer crossed by that fold position, reflects the folded part around the crease, reverses the appropriate layer order, and flips the exposed face. This produces the final crease positions, packet width, layer order, panel labels, and face directions.

Presets are configuration data rather than separately drawn animations. A preset specifies which plates are active and each stop distance as a fraction of sheet length. The same calculation engine therefore handles half folds, Z-folds, letter folds, double-parallel folds, accordion folds, and custom settings.

## 3. Folding Lab: motion geometry

The machine is drawn as SVG because SVG is well suited to exact paths, circles, labels, and scalable technical graphics.

Paper movement is based on physical travel distance along a route. The route contains:

- straight line segments;
- circular arcs around rollers;
- tangent transitions between straight paths and roller surfaces.

When a straight connection would cut through a roller, the code calculates two possible tangent–arc–tangent routes and selects the shorter exterior route. This keeps the paper outside the cylinder while allowing it to follow the cylinder's curvature.

Material sample points are tied to their positions on the original sheet. They travel through the route without being replaced by a shorter placeholder shape. That is the length-preservation principle that prevents the folded packet from shrinking or becoming corrupted.

## 4. Folding sequence and timing

The animation is organized as a timeline of meaningful phases:

1. Feed the sheet.
2. Enter an active plate, or bypass an inactive one.
3. Reach and hold at the plate stop.
4. Continue feeding material to form the buckle.
5. Let the next roller nip catch the buckle.
6. Pull both folded legs through while sending the new folded edge onward.
7. Deliver and inspect the packet.

A shared transport distance coordinates the stations. This allows one station to withdraw material while the next station receives the folded edge, rather than making unrelated shapes morph into one another.

Animation time is advanced with `requestAnimationFrame()`. The timeline slider, step control, playback speed, pause/replay button, and focused camera all read from the same timeline state.

## 5. Validation principles

The simulations are checked at two levels:

- **Structural checks:** JavaScript syntax is validated and every local HTML link, stylesheet, script, and image must resolve.
- **Folding geometry checks:** sampled animation frames verify material-length preservation, expected crease counts, phase continuity, stop contact, packet dimensions, roller exclusion, circular wrapping, and tangent joins.

These tests do not claim that the website is a complete engineering simulation of paper mechanics. It is an EDUCATIONAL MODEL designed to make the important production principles visible while remaining understandable and responsive in a browser.

Thank you for your time, I am always open to feedback and criticism.

Sincerely,
Damla