type RemoteAction = 'advance' | 'back' | 'faster' | 'slower' | 'play' | 'reset'

declare global {
  interface Window {
    teleprompterDesktop?: {
      setGlobalShortcuts: (enabled: boolean, bindings: Record<string, string>) => void
      openPresenter: () => void
      onRemoteAction: (callback: (action: RemoteAction) => void) => () => void
    }
  }
}

export {}
