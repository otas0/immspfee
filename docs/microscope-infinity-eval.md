# Infinity-corrected tube — evaluation (not shipped)

Classroom compound microscopes in this lab use **finite tube** conjugates
(Hecht): lateral magnification of the objective is

\[
m_\mathrm{obj} \approx -\frac{L}{f_\mathrm{obj}}
\]

with a fixed design tube length \(L = 160\,\mathrm{mm}\). Coarse / fine focus
screws change the **objective–stage gap** (working distance), not \(L\).

## Infinity-corrected variant

Modern infinity systems place a **tube lens** of focal length \(f_\mathrm{tube}\)
after the objective. The specimen sits at the front focal plane of the
objective; the intermediate image forms at the rear focal plane of the tube
lens:

\[
m_\mathrm{obj} = -\frac{f_\mathrm{tube}}{f_\mathrm{obj}}
\]

Here \(L\) no longer enters \(m_\mathrm{obj}\). Focus still moves the stage /
nosepiece (gap / WD); the mechanical tube length is set by the tube lens, not
by stretching a finite tube.

## Why we keep finite tube for now

| Criterion | Finite (shipped) | Infinity (eval) |
| --- | --- | --- |
| High-school / intro lab match | Common Chinese classroom scopes | Lab / research stands |
| Authority already wired | Hecht finite-tube chapter | Need tube-lens \(f_\mathrm{tube}\) param + new diagram |
| Focus UX | Gap via coarse/fine — same | Same (no change to knobs) |
| Risk | Stretching \(L\) looked like focus (fixed) | Extra param confusion if both modes live |

**Decision:** stay on finite tube. Revisit infinity only if a course asks for
tube-lens / DIC / epi modules; then add `tubeMode: 'finite' | 'infinity'` with
`f_tube_mm` and leave gap/focus unchanged.
