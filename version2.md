# Gym App - Home/Calendar UI Update & Dynamic Muscle Visualization

Execute this implementation in 4 sequential stages. Do not proceed to the next stage until the current one is fully functional and reviewed.

## Stage 1: Viewport Layout & Core DOM Structure
* Refactor the existing calendar to anchor to the top of the viewport, occupying exactly `3/5` (`60vh`) of the screen height in portrait mode.
* Allocate the remaining bottom `2/5` (`40vh`) into a 2-column layout.
* **Column 1:** Create a placeholder container for future workout metrics.
* **Column 2:** Establish the rendering container for the rotating 2D human body projection.

## Stage 2: CSS Masking & Theme Architecture
* Source assets are PNGs located in directories `b0` (0°/Front), `b1` (60°/Front-Quarter), `b2` (120°/Back-Quarter), and `b3` (180°/Back).
* Target specific isolated muscle groups (e.g., Adductors, Hip Flexors, Obliques). Exclude generic aggregate groupings (arms, back, mid, upper, legs). Note: Not all muscles exist in all angle views.
* **CRITICAL RENDERING RULE:** Do not render the muscle PNGs using standard `<img>` tags. The PNGs must be used strictly as alpha channels via the CSS `mask-image` property over `<div>` elements.
* Bind the `background-color` of these masked `<div>` elements directly to the global CSS variables controlling the user's active UI theme.

## Stage 3: Symmetrical Mirroring & State Interception
* The 240° and 300° views are missing from the source assets. Generate these dynamically by applying CSS `transform: scaleX(-1)` to the 120° (`b2`) and 60° (`b1`) DOM components, respectively.
* **JavaScript Interception:** Implement state management logic to handle asymmetrical data mapping during mirrored states.
* When the `scaleX(-1)` state is active, the script must intercept the data pipeline and dynamically swap the left/right muscle data mapping (e.g., mapping left bicep volume data to the right bicep CSS mask variable). Otherwise, asymmetrical highlights will physically render on the wrong side of the mirrored avatar.

## Stage 4: 14-Day Rolling Volume & Opacity Mathematics
* The CSS `opacity` of each muscle mask `<div>` must scale linearly from `0.0` to `1.0` based on a 14-day rolling window of decayed exercise volume.
* **Opacity Formula:** `Math.min(1, effective_volume / target_14d_volume)`
* **Daily Volume Degradation:** Calculate `effective_volume` by iterating through the user's last 14 days of workout data (where `d` = days ago, from `0` to `13`).
* For each day, calculate raw volume: `(primary_workout_volume * 1.0) + (secondary_workout_volume * 0.25)`. Volume is `weight * reps * sets`.
* Apply a linear decay multiplier to that day's raw volume: `multiplier = (14 - d) / 14`.
* Sum the decayed daily volumes to yield the total `effective_volume`.
* **Target Calibration:** Assume the backend/state provides a `target_14d_volume` that is already mathematically calibrated to this decay scale.
# Gym App - Home/Calendar UI Update (Part 2)




Execute these next stages sequentially to build upon the existing DOM and volume logic.

## Stage 5: Exercise Schema & Pre-Processing Interception
Update the raw volume calculation pipeline to intercept specific exercise types before applying the 14-day decay. Assume the global user state now contains a `user_bodyweight` integer/float.
* **Time-to-Reps Interception:** If the exercise object has `is_timed: true` (e.g., Planks), convert the duration to equivalent reps: `reps = Math.floor(duration_in_seconds / 3)`.
* **Bodyweight Interception:** If the exercise has `is_bodyweight: true`, ignore the standard external weight variable. Calculate the load dynamically: `weight = user_bodyweight * bodyweight_multiplier` (where the multiplier is a user-defined float on the exercise object, e.g., `0.5`, `0.75`, `1.0`).
* **Fallback:** If `user_bodyweight` is null or undefined, fallback to a static `100` to prevent zero-multiplication errors that would break the opacity logic.
* Proceed to calculate set volume as `weight * reps * sets`.

## Stage 6: Column 1 UI Construction (Metrics Stack)
Populate the empty Column 1 placeholder (left side of the bottom `40vh`) with a vertically stacked, highly scannable UI. Do not use charts or complex SVGs due to spatial constraints; stick to typography and active CSS theme variables.
Implement these four specific data points:
1. **Prime Target:** The string name of the single muscle group currently sitting at the lowest `effective_volume` (closest to `0.0` opacity).
2. **Overload Risk:** A warning UI listing any muscle group currently sitting at or above `1.0` opacity. If none, render a neutral state (e.g., "None").
3. **14-Day Consistency:** A fraction (e.g., `X/14 Days`) showing how many distinct days in the current 14-day rolling window contain at least one logged session.
4. **Volume Trajectory:** A dynamic percentage (e.g., `+4.2%` or `-1.5%`) indicating the trend of total systemic volume. 

## Stage 7: Metric Extraction & State Binding
Write the data extraction logic to populate the Stage 6 UI directly from the application's state.
* **Prime Target / Overload Risk:** Reduce the current muscle data array driving Column 2 to find the absolute minimum and maximum opacity values.
* **Trajectory Math:** Compare the sum of the current 14-day `effective_volume` across all muscles against the sum of the previous 14-day window (Days 14 to 27).

# Stage 8
I want a button that turns off the flashing inactive muscles in the settings menu