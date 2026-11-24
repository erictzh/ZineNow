## Intro

**Otsu's method** (Nobuyuki Otsu, 1979) is a classic way to pick a **threshold** that separates a picture's values into two groups, here "background" and "subject", by looking at the **histogram** (a count of how many values fall in each range). Ai Tools computes it for every mask the model produces and **writes it in the log**, as a hint about where an automatic cut-off would fall. It does not change the cut-off by itself.

## How to use

Open the **Log** after pressing **Find subject**. Under *Find subject* you will find `maskStats` with: the smallest, largest and average score, how many scores fall below 0.0001, 0.001, 0.01, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9; the 5th, 25th, 50th, 75th and 95th **percentiles**; and `otsu`. If the background is not fully removed, these numbers show why (for instance, most background scores sitting at 0.02, above a cut-off of 0.001).

A percentile is the value below which that share of the numbers lies: the **50th** is the median (the middle value).

## How it works

1. **Histogram:** scores (0 to 1) are counted into **2000 bins**, then merged into **256** bins.
2. **Try every threshold** `t` from 0 to 255. It splits the bins into a lower group (`B`) and an upper group (`F`) and measures:
   - `wB`, `wF`: how many values are in each group,
   - `mB`, `mF`: the average bin number of each group,
   - **between-class variance** = `wB × wF × (mB − mF)²`.
3. The `t` with the **largest** between-class variance wins: the split that makes the two groups as different from each other as possible.
4. It is reported as `(bestT + 1) / 256`, a number between 0 and 1.

Big groups far apart score high; a muddled middle scores low. A model's mask is typically a hump near 0 (background) and another near 1 (subject), which is exactly what Otsu is built for.

## Code

Below is the real code, copied from the repository when the wiki is built. The grey numbers are the file's own **line numbers**; the header of each block names the file and the lines. A **function** is a named, reusable recipe: it takes inputs (its **parameters**), does some work, and gives back a result with `return`.

### `maskStats`

```js file=shared/js/ai/segment.js fn=maskStats
```

**The Logic:**
- One pass over the mask finds `lo`, `hi` and the sum (for the mean); `while (v >= BUCKETS[b]) b++` finds which bucket a value belongs to (`counts[b]++`); `hist[...]` counts it in a 2000-bin histogram (`Math.floor(v × BINS)` is the bin number).
- `pct(p)` walks the bins adding counts until the running total `acc` reaches `p × n`: that bin's middle `(b + 0.5) / BINS` is the percentile.
- `h2` folds the 2000 bins into 256 (`b × 256 / BINS`). `total` is the number of values and `wsum` the sum of `bin × count`.
- The loop over `t`: `wB` grows as bins are added; `sB` is the sum of `bin × count` below; `mB = sB / wB` and `mF = (wsum − sB) / wF` are the two averages. `between` is the between-class variance; the **first** `t` with the largest value stays (`>` not `>=`).

**Worked example.** A mask of 1000 values: 600 background scores between 0.020 and 0.038, 400 subject scores between 0.900 and 0.945. The result (by running the real code): min 0.02, max 0.945, mean **0.3864**, median (p50) **0.0358**, 95th percentile **0.9398**, and **otsu = 0.039**. Every split inside the empty gap between 0.04 and 0.9 separates the two groups equally well; the code keeps the first one, just above the background's top bin, so Otsu says "everything at or below about 0.04 is background". Compare with the tool's default cut-off of 0.001: it would leave all 600 background pixels fully visible (their scores are at least 0.02), which is exactly what the log helps you notice.
