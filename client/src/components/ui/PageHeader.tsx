interface PageHeaderProps {
  title: string;
  action?: React.ReactNode;
  search?: React.ReactNode;
}

export function PageHeader({ title, action, search }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      <div className="flex items-center gap-3">
        {search}
        {action}
      </div>
    </div>
  );
}
