/** Visible marker for layout-sample content that must be replaced. */
export default function SampleTag({ className = "" }) {
  return (
    <span
      className={`label-tech inline-flex items-center gap-2 border border-dashed border-line-strong px-2 py-1.5 text-[0.625rem] ${className}`}
      title="Sample entry — replace it in data/projects.js"
    >
      Sample entry
    </span>
  );
}
