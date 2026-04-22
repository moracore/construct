import { registerPlugin } from '@capacitor/core'

interface WidgetSyncPlugin {
  syncCalendar(options: { entries: { date: string; color: string }[] }): Promise<void>
}

export const WidgetSync = registerPlugin<WidgetSyncPlugin>('WidgetSync')
