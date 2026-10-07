export function BackgroundAnimation() {
  return (
    <div className="lemmas-formula-layer" aria-hidden="true">
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcSet="/assets/lemmas-chalk-writing.png" />
        <source srcSet="/assets/lemmas-chalk-writing.gif" />
        <img className="lemmas-formula-gif lemmas-formula-gif-dark" src="/assets/lemmas-chalk-writing.gif" alt="" />
      </picture>
      <picture>
        <source media="(prefers-reduced-motion: reduce)" srcSet="/assets/lemmas-marker-writing.png" />
        <source srcSet="/assets/lemmas-marker-writing.gif" />
        <img className="lemmas-formula-gif lemmas-formula-gif-light" src="/assets/lemmas-marker-writing.gif" alt="" />
      </picture>
    </div>
  );
}
