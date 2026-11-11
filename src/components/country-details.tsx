import type { RecordItem } from '../lib/records'
import { BottomSheet } from './bottom-sheet'
import { RecordList } from './record-list'

export function CountryDetails({ name, records, onClose }: { name: string; records: RecordItem[]; onClose: () => void }) {
  const title = `${name} · ${records.length} ${records.length === 1 ? 'registro' : 'registros'}`
  return <BottomSheet open onOpenChange={open => { if (!open) onClose() }} title={title}><RecordList records={records} /></BottomSheet>
}
