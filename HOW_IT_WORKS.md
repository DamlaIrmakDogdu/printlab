# HOW THE LABS WORK

A technical overview of the rendering, calculations, and animations behind the educational simulations in PrintLab.

## 1. Halftone Lab

### Halftone calculation and rendering

The halftone pattern is drawn using the **HTML Canvas 2D API**. The simulation represents a fixed physical print area rather than treating screen pixels as printer dots.

1. JavaScript converts DPI (printer addressability) and LPI (screen frequency) into printer positions and halftone cells within that area.
2. Each printer position is assigned to its nearest screen cell.
3. The positions in each cell are ordered from the center outward.
4. Ink coverage determines how many of those discrete positions are filled.
5. Filling positions in that order produces a clustered, amplitude-modulated (AM) halftone pattern.
6. Optional overlays display the individual printer-position boundaries and the screen-cell boundaries.

The number of available printer positions per screen cell is approximately **(DPI / LPI)²**. This is an average area ratio, not a guarantee that every cell contains the same integer number of positions. Coverage is quantized into discrete filled positions, so small coverage adjustments may leave the drawing unchanged until the next position is added or removed.

### Technical reference: clustered-dot screening

The halftone model follows the general principle of **ordered, clustered-dot screening**: addressable output positions are activated in a defined spatial order so that neighboring printed positions form a growing dot as tone coverage increases. This concept is described in C. A. Bouman’s *Digital Halftoning* lecture notes (Purdue University, 2019), particularly the sections on ordered dithering, clustered-dot screens, and the trade-off between tone levels and spatial resolution (pp. 5–10).

**Reference:** Bouman, C. A. (2019). *Digital Halftoning*. ECE 637: Digital Image Processing, Purdue University. [Lecture notes (PDF)](https://engineering.purdue.edu/~bouman/ece637/previous/ece637S2019/notes/pdf/Halftoning.pdf).

This reference supports the **underlying screening principle**, not a claim that PrintLab reproduces Bouman’s particular threshold matrices or implementation. PrintLab calculates its own DPI/LPI-dependent cell geometry and center-outward fill order; fractional-grid behavior and browser Canvas rendering are implementation-specific and are not established by the lecture notes.

### Canvas pixels and fractional values

**Printer DPI, screen LPI, CSS pixels, and Canvas bitmap pixels are different units.** The browser displays the computed pattern by mapping its coordinates into a raster bitmap and then presenting that bitmap at a CSS-defined size. The Canvas backing-store resolution, device-pixel ratio, browser zoom, and any CSS scaling can affect the apparent sharpness of edges and fine grid lines; they do not change the underlying DPI/LPI calculations.

When DPI/LPI is fractional, halftone-cell boundaries generally do not align evenly with the printer-position grid. Neighboring cells can therefore contain different arrangements of addressable positions, and clustered dots may look slightly asymmetric or vary in shape. This is a consequence of representing continuous cell geometry with a discrete grid, not necessarily a calculation error. Additional visual differences can arise when Canvas rasterizes fractional coordinates and antialiases or scales the resulting image.

Geometry is cached by DPI/LPI combination because changing only ink coverage does not require recalculating the cells. Redrawing is scheduled with `requestAnimationFrame()` to keep rapid slider changes responsive. The Explore panel and both Compare panels share the same state and rendering functions to avoid inconsistent calculations.

## 2. Folding Lab

### Fold calculation

The model tracks the original sheet using material coordinates from its leading edge to its trailing edge. Each folded layer records its original material interval, position in the packet, direction, and which face (A or B) points upward.

An active buckle plate folds the incoming packet at its stop distance. The calculation splits layers crossed by the fold, reflects the folded portion around the crease, adjusts layer order, and changes the exposed face. The resulting state determines crease positions, packet width, layer order, panel labels, and face directions.

Fold presets are configuration data, not separately authored animations. Each preset specifies active plates and stop distances as fractions of sheet length. The same calculation engine supports half folds, Z-folds, letter folds, double-parallel folds, accordion folds, and custom settings.

### SVG geometry and paper transport

The machine is drawn as **SVG**, which supports scalable paths, circles, labels, and precisely positioned technical components. Paper movement is calculated along a route consisting of straight segments, circular roller arcs, and tangent transitions.

Where a straight connection would intersect a roller, the route calculation considers tangent–arc–tangent alternatives and selects the shorter exterior route. Material sample points remain associated with their positions on the original sheet as they travel, preserving the represented sheet length rather than replacing the sheet with an arbitrarily shortened shape.

### Animation sequence

The timeline represents feeding, entry into or bypass of a buckle plate, contact with the plate stop, buckle formation, capture by the next roller nip, passage of the folded layers through the rollers, and final packet delivery.

A shared transport distance coordinates successive stations so material leaving one station enters the next continuously. `requestAnimationFrame()` advances the animation, while the timeline slider, step control, playback speed, pause/replay control, and focused camera use the same timeline state.

## 3. Screen Printing Lab

### Exposure arrangement and visual states

The screen-printing simulation uses a layered technical illustration to distinguish the frame, mesh with dried photoemulsion, film positive, and exposure arrangement. Film orientation and contact are important because the image must be transferred to the intended side of the screen without unwanted reversal or separation. The printed image side of the film is positioned toward the emulsion; the transparent film support faces the exposure glass/light side in the illustrated arrangement.

The exposure stage represents the difference between areas that receive UV light and areas shielded by opaque film artwork. For a conventional **positive-working stencil process using a negative-working photopolymer emulsion**, illuminated emulsion hardens while masked regions remain removable. During washout, the unexposed regions are cleared to form ink-permeable openings. The washing view is represented from the back (squeegee) side of the screen.

The illustrations and transitions communicate **orientation, sequence, and cause and effect**, rather than calculating UV dose, optical transmission, emulsion curing kinetics, water pressure, or actual stencil durability. The exact behavior depends on the emulsion and exposure system used in practice.

## 4. Implementation and validation

The labs use browser-native graphics and animation concepts: Canvas 2D for the raster halftone display, SVG for scalable technical machine drawings, JavaScript for calculation and state changes, and `requestAnimationFrame()` where frame-based updates are needed. **Canvas and SVG are browser technologies, not third-party libraries.** External libraries should only be listed as dependencies if they are actually imported by the corresponding project.

Validation covers two distinct levels:

- **Structural checks:** JavaScript syntax and resolution of local HTML links, stylesheets, scripts, and image assets.
- **Folding geometry checks:** sampled frames can be checked for represented sheet-length preservation, expected crease counts, phase continuity, stop contact, packet dimensions, roller exclusion, circular wrapping, and tangent joins.

These are **educational models**, not comprehensive engineering simulations. Their purpose is to make selected printing and postpress principles visible and interactive. Visual correctness does not by itself establish quantitative agreement with physical equipment or materials.

Thank you for your time. I am always open to feedback and criticism.

Sincerely,  
Damla
