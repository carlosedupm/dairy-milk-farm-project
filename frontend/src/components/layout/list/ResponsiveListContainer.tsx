"use client";

type Props = {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
  className?: string;
};

/**
 * Separa vista mobile (cards) e desktop (tabela) com breakpoints md.
 */
export function ResponsiveListContainer({
  mobile,
  desktop,
  className,
}: Props) {
  return (
    <div className={className}>
      <div className="space-y-3 md:hidden">{mobile}</div>
      <div className="hidden md:block">{desktop}</div>
    </div>
  );
}
