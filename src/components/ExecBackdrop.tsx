/**
 * Fixed animated backdrop for Executive mode — drifting red/gold blobs over a
 * faint console grid. Render once inside an `.exec-theme` page; it sits behind
 * the content (z-0) so the real UI must use `relative z-10`.
 */
export default function ExecBackdrop() {
  return (
    <>
      <div className="exec-bg-layer" aria-hidden />
      <div className="exec-bg-grid" aria-hidden />
    </>
  );
}
