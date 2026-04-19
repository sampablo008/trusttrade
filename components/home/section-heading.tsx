interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
}: SectionHeadingProps) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand">
        {eyebrow}
      </p>
      <div className="space-y-2">
        <h2 className="font-display text-3xl tracking-tight text-foreground sm:text-4xl">
          {title}
        </h2>
        <p className="max-w-xl text-sm leading-7 text-muted sm:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}
