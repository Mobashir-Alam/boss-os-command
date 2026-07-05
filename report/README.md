# Founder OS — Final-Year Project Report

This folder generates the project report as a Microsoft Word `.docx` that meets
the college formatting spec (A4, Times New Roman 12 pt, 1.5 spacing, 1.5" left /
1" other margins, justified, lowercase-roman → Arabic page numbers, auto
Table of Contents / List of Figures / List of Tables).

## Layout
- `build_report.py` — the generator (python-docx) + a small Markdown→docx converter.
- `content/*.md` — the editable prose, one file per section. **Edit these to change wording.**
- `figures/*.mmd` — diagram sources (Mermaid). `figures/*.png` — rendered images.
- `render_figures.ps1` — renders every `.mmd` to a `.png` via mermaid-cli.
- `Founder_OS_Report.docx` — the build output.

## Build steps
1. Install the one dependency:
   ```
   pip install python-docx
   ```
2. (Once, or whenever a diagram changes) render the figures:
   ```
   pwsh report/render_figures.ps1
   ```
   No Node.js? Paste each `figures/*.mmd` into https://mermaid.live and export a PNG
   with the same base name. The build still works without PNGs — it inserts a
   labelled placeholder where each figure should go.
3. Build the document:
   ```
   python report/build_report.py
   ```
4. Open `Founder_OS_Report.docx` in Word, press **Ctrl+A** then **F9**, and choose
   "Update entire table" when prompted — this fills the Table of Contents, List of
   Figures, and List of Tables and finalises the page numbers.

## Before you submit
- Edit the `CONFIG` block at the top of `build_report.py` with your real name, roll
  number, college, guide, etc. Anything left as «...» is a placeholder.
- Capture the Chapter 5 screenshots into `figures/` using the names referenced in
  `content/50_results.md` (e.g. `screenshot_github.png`).
- Optionally drop a `figures/logo.png` for the title page.
