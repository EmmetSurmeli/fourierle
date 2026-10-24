# Calibration review

The pipeline is deterministic. Run `npm run calibrate`, inspect `public/data/calibration.json`, and open `/?lab` in the development server. Never adjust the published v1 eligible pool in place.

The first review covered 20 diverse countries. It exposed two concrete problems: a promoted second harmonic could distort long thin countries (Chile, Norway), and geographically dispersed tiny islands could be almost invisible (Kiribati). The aspect gate now prevents gross width/height changes; six unsuitable archipelagos were excluded. Mainland focus overrides corrected Netherlands and Portugal layouts dominated by distant islands.

For a trial, put `"stages": [3, 5, 9, 18, 36]` inside a country's override. Budgets must be strictly increasing and retain the global prefix order. Do not change the meaning of counted circles: the budget is total nonzero-frequency vectors across all independent polygon chains.

Magnitude selection minimizes total squared Fourier signal error. Low-frequency ordering can retain smoother overall features but spends terms on weak harmonics. The checked-in comparison records both at eight terms, while the hybrid optionally promotes an informative second harmonic. Coarse similarity is a review aid; normalized spectral signatures cannot predict whether a person knows a coastline.

For an actual playtest, recruit participants with varied geography familiarity and record (with consent) country, guess count, abandoned puzzles, mistaken countries, and perceived fairness. Use aggregate medians to revisit stages 2–4. Do not present geometric fidelity or the review flag as a human difficulty rating. Retain natural variation in difficulty.

The exact sixth-stage fallback is conservative. It protects recognizability relative to the retained 1:10m reference, not centimeter-level geography. In the explorer, the dashed reference and green Fourier curve are deliberately separate so the mathematical approximation is never misrepresented. The main game labels the source outline when this fallback is active.
