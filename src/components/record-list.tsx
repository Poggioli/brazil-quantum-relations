import { ExternalLink } from 'lucide-react'
import type { RecordItem } from '../lib/records'
import { formatDate } from '../lib/records'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { ScrollArea } from './ui/scroll-area'

export function RecordList({ records, compact = false }: { records: RecordItem[]; compact?: boolean }) {
  const content = records.map((record, index) => <div key={record.id}>
    {index > 0 && <Separator />}
    <article className={compact ? 'py-3' : 'py-4'}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Badge variant={record.type === 'news' ? 'secondary' : 'default'}>{record.type === 'news' ? 'Notícia' : 'Acordo'}</Badge>
        <time dateTime={record.date} className="text-xs text-slate-500 dark:text-slate-400">{formatDate(record.date)}</time>
      </div>
      <h4 className="text-sm font-semibold leading-snug">{record.title}</h4>
      {record.description && <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{record.description}</p>}
      {record.source && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Fonte: {record.source}</p>}
      <a href={record.link} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-blue-300">Visualizar publicação <ExternalLink size={14} /></a>
    </article>
  </div>)
  if (compact) return records.length > 2
    ? <ScrollArea className="h-[min(42dvh,360px)]"><div className="pr-3">{content}</div></ScrollArea>
    : <div className="pr-1">{content}</div>
  return records.length > 3
    ? <ScrollArea className="h-[min(55dvh,540px)]"><div className="pr-3">{content}</div></ScrollArea>
    : <div className="pr-1">{content}</div>
}
