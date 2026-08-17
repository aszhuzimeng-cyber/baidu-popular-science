interface StepHeaderProps {
  current: number;
  total: number;
  label: string;
}

export function StepHeader({ current, total, label }: StepHeaderProps) {
  return <div className="sr-only">第 {current} / {total} 步 - {label}</div>;
}
