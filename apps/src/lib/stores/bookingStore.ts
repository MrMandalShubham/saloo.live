import { create } from 'zustand'
// import type { Tables } from '@saloo/types'

interface BookingDraft {
  shopId: string | null
  barberId: string | null
  serviceIds: string[]
  addonIds: string[]
  date: string | null
  startTime: string | null
  holdId: string | null
  totalAmount: number
  advanceAmount: number
  instructions: string
}

interface BookingStore {
  draft: BookingDraft
  setShop: (shopId: string) => void
  setBarber: (barberId: string | null) => void
  setServices: (serviceIds: string[], addonIds?: string[]) => void
  setSlot: (date: string, startTime: string) => void
  setHold: (holdId: string, totalAmount: number, advanceAmount: number) => void
  setInstructions: (instructions: string) => void
  reset: () => void
}

const defaultDraft: BookingDraft = {
  shopId: null,
  barberId: null,
  serviceIds: [],
  addonIds: [],
  date: null,
  startTime: null,
  holdId: null,
  totalAmount: 0,
  advanceAmount: 0,
  instructions: '',
}

export const useBookingStore = create<BookingStore>((set) => ({
  draft: defaultDraft,
  setShop:         (shopId) =>                    set(s => ({ draft: { ...s.draft, shopId } })),
  setBarber:       (barberId) =>                  set(s => ({ draft: { ...s.draft, barberId } })),
  setServices:     (serviceIds, addonIds = []) => set(s => ({ draft: { ...s.draft, serviceIds, addonIds } })),
  setSlot:         (date, startTime) =>           set(s => ({ draft: { ...s.draft, date, startTime } })),
  setHold:         (holdId, totalAmount, advanceAmount) =>
                                                  set(s => ({ draft: { ...s.draft, holdId, totalAmount, advanceAmount } })),
  setInstructions: (instructions) =>              set(s => ({ draft: { ...s.draft, instructions } })),
  reset:           () =>                          set({ draft: defaultDraft }),
}))
