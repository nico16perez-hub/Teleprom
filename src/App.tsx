import { useEffect, useRef, useState, type CSSProperties } from 'react'
import * as mammoth from 'mammoth/mammoth.browser'
import './App.css'

const starterScript = `Bienvenidos.

Este es tu espacio para hablar con calma, mirar a cámara y mantener el ritmo. Escribe o pega aquí tu guion, ajusta la velocidad y comienza cuando estés listo.`
const isPresenter = new URLSearchParams(window.location.search).has('presenter')
type TeleprompterState = { script: string; isPlaying: boolean; speed: number; fontSize: number; isMirrored: boolean; message: string; messageVisible: boolean }
type UploadedFile = { name: string; content: string }
type KeyAction = 'advance' | 'back' | 'faster' | 'slower' | 'play' | 'reset'
type KeyBindings = Record<KeyAction, string>
const defaultBindings: KeyBindings = { advance: 'ArrowDown', back: 'ArrowUp', faster: 'BracketRight', slower: 'BracketLeft', play: 'Space', reset: 'KeyR' }
const keyLabels: Record<KeyAction, string> = { advance: 'avanzar', back: 'retroceder', faster: 'más velocidad', slower: 'menos velocidad', play: 'pausa / continuar', reset: 'volver al inicio' }
const messagePresets = ['Pausa', 'Más despacio', 'Repetir', 'Cierre']

function App() {
  const [script, setScript] = useState(() => localStorage.getItem('teleprompter-draft') || localStorage.getItem('teleprompter-script') || starterScript)
  const [liveScript, setLiveScript] = useState(() => localStorage.getItem('teleprompter-script') || starterScript)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(2)
  const [fontSize, setFontSize] = useState(42)
  const [isMirrored, setIsMirrored] = useState(false)
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [selectedFile, setSelectedFile] = useState('')
  const [bindings, setBindings] = useState<KeyBindings>(() => ({ ...defaultBindings, ...JSON.parse(localStorage.getItem('teleprompter-key-bindings') || '{}') }))
  const [learningAction, setLearningAction] = useState<KeyAction | null>(null)
  const [globalShortcuts] = useState(() => window.teleprompterDesktop ? localStorage.getItem('teleprompter-global-shortcuts') !== 'false' : false)
  const [message, setMessage] = useState('')
  const [liveMessage, setLiveMessage] = useState('')
  const [messageVisible, setMessageVisible] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)

  const publish = (next: Partial<TeleprompterState> = {}) => channelRef.current?.postMessage({ script: liveScript, isPlaying, speed, fontSize, isMirrored, message: liveMessage, messageVisible, ...next })
  useEffect(() => {
    channelRef.current = new BroadcastChannel('teleprompter-session')
    const channel = channelRef.current
    channel.onmessage = (event: MessageEvent<TeleprompterState & { command?: string; amount?: number }>) => {
      if (event.data.command === 'reset') previewRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      if (event.data.command === 'advance') previewRef.current?.scrollBy({ top: event.data.amount || 0, behavior: 'smooth' })
      if (event.data.script !== undefined) { setLiveScript(event.data.script); setIsPlaying(event.data.isPlaying); setSpeed(event.data.speed); setFontSize(event.data.fontSize); setIsMirrored(event.data.isMirrored); setLiveMessage(event.data.message || ''); setMessageVisible(Boolean(event.data.messageVisible)) }
    }
    return () => channel.close()
  }, [])
  useEffect(() => { localStorage.setItem('teleprompter-draft', script) }, [script])
  useEffect(() => { localStorage.setItem('teleprompter-script', liveScript) }, [liveScript])
  useEffect(() => {
    if (!isPlaying) return
    const timer = window.setInterval(() => previewRef.current?.scrollBy({ top: speed, behavior: 'auto' }), 50)
    return () => window.clearInterval(timer)
  }, [isPlaying, speed])
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (learningAction) { event.preventDefault(); const next = { ...bindings, [learningAction]: event.code }; setBindings(next); localStorage.setItem('teleprompter-key-bindings', JSON.stringify(next)); setLearningAction(null); return }
      if (event.target instanceof HTMLElement && event.target.tagName === 'TEXTAREA') return
      if (event.code === bindings.play) { event.preventDefault(); const next = !isPlaying; setIsPlaying(next); publish({ isPlaying: next }) }
      if (event.code === bindings.reset) { previewRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); channelRef.current?.postMessage({ command: 'reset' }) }
      if (event.code === bindings.advance) { previewRef.current?.scrollBy({ top: 260, behavior: 'smooth' }); channelRef.current?.postMessage({ command: 'advance', amount: 260 }) }
      if (event.code === bindings.back) { previewRef.current?.scrollBy({ top: -260, behavior: 'smooth' }); channelRef.current?.postMessage({ command: 'advance', amount: -260 }) }
      if (event.code === bindings.faster) { const next = Math.min(6, speed + 1); setSpeed(next); publish({ speed: next }) }
      if (event.code === bindings.slower) { const next = Math.max(1, speed - 1); setSpeed(next); publish({ speed: next }) }
      if (event.key === 'Escape') setIsFocusMode(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [bindings, isPlaying, learningAction, speed])
  useEffect(() => {
    const removeListener = window.teleprompterDesktop?.onRemoteAction((action) => {
      if (action === 'advance') previewRef.current?.scrollBy({ top: 260, behavior: 'smooth' })
      if (action === 'back') previewRef.current?.scrollBy({ top: -260, behavior: 'smooth' })
      if (action === 'reset') previewRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
      if (action === 'play') { const next = !isPlaying; setIsPlaying(next); publish({ isPlaying: next }) }
      if (action === 'faster') { const next = Math.min(6, speed + 1); setSpeed(next); publish({ speed: next }) }
      if (action === 'slower') { const next = Math.max(1, speed - 1); setSpeed(next); publish({ speed: next }) }
    })
    return removeListener
  }, [isPlaying, speed])
  useEffect(() => { window.teleprompterDesktop?.setGlobalShortcuts(globalShortcuts, bindings) }, [globalShortcuts, bindings])

  const update = (next: Partial<TeleprompterState>) => {
    if (next.script !== undefined) setScript(next.script)
    if (next.isPlaying !== undefined) setIsPlaying(next.isPlaying)
    if (next.speed !== undefined) setSpeed(next.speed)
    if (next.fontSize !== undefined) setFontSize(next.fontSize)
    if (next.isMirrored !== undefined) setIsMirrored(next.isMirrored)
    publish(next.script !== undefined ? { ...next, script: liveScript } : next)
  }
  const applyDraft = () => { setLiveScript(script); publish({ script }) }
  const discardDraft = () => setScript(liveScript)
  const resetScroll = () => { setIsPlaying(false); previewRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); publish({ isPlaying: false }) }
  const openPresenter = () => { if (window.teleprompterDesktop) window.teleprompterDesktop.openPresenter(); else { const presenter = window.open(`${window.location.pathname}?presenter=1`, 'teleprompter-presenter', 'popup=yes,width=1200,height=800'); presenter?.focus() }; window.setTimeout(() => publish(), 100) }
  const startLearning = (action: KeyAction) => { setLearningAction(action); window.teleprompterDesktop?.setGlobalShortcuts(false, bindings) }
  const loadFiles = async (selected: FileList | null) => {
    if (!selected) return
    const loaded: UploadedFile[] = []
    for (const file of Array.from(selected)) { const lowerName = file.name.toLowerCase(); const content = lowerName.endsWith('.docx') ? (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value : await file.text(); loaded.push({ name: file.name, content }) }
    setFiles((current) => [...current, ...loaded]); if (loaded[0]) { setSelectedFile(loaded[0].name); setScript(loaded[0].content) }
  }
  const sendMessage = () => { setLiveMessage(message); setMessageVisible(Boolean(message)); publish({ message, messageVisible: Boolean(message) }) }
  const hideMessage = () => { setMessageVisible(false); publish({ messageVisible: false }) }
  const selectFile = (file: UploadedFile) => { setSelectedFile(file.name); setScript(file.content) }
  const reader = <div className={isMirrored ? 'teleprompter mirrored' : 'teleprompter'} ref={previewRef} style={{ fontSize, '--teleprompter-font-size': `${fontSize}px` } as CSSProperties}><div className="teleprompter-spacer" />{liveScript.split('\n').map((line, index) => <p key={`${line}-${index}`}>{line || '\u00a0'}</p>)}<div className="teleprompter-spacer" /></div>
  if (isPresenter) return <main className="app presenter-app"><div className="presenter-label">teleprompter / pantalla de lectura</div><div className="teleprompter-shell"><div className="guide-line top-line" /><div className="guide-line bottom-line" />{reader}<div className="center-marker" />{messageVisible && <div className="presenter-message">{liveMessage}</div>}</div></main>

  return <main className={isFocusMode ? 'app focus-mode' : 'app'}>
    <header className="topbar"><div className="brand"><span className="brand-mark">/</span><span>teleprompter</span></div><div className="status"><span className="status-dot" /> conexión local</div><button className="icon-button" type="button" onClick={() => setIsFocusMode((focus) => !focus)} aria-label="Alternar modo enfoque" title="Modo enfoque">◐</button></header>
    <section className="control-room"><aside className="files-panel"><div className="panel-title"><span className="eyebrow">01</span><h2>Archivos</h2></div><label className="upload-button" htmlFor="files">＋ cargar Word o texto<input id="files" type="file" accept=".docx,.txt,.md" multiple onChange={(event) => loadFiles(event.target.files)} /></label><div className="file-list">{files.length === 0 && <span className="empty-state">No hay guiones cargados</span>}{files.map((file) => <button className={selectedFile === file.name ? 'file-item selected' : 'file-item'} type="button" key={file.name} onClick={() => selectFile(file)}><span>▧</span>{file.name}</button>)}</div><div className="panel-foot">{files.length} archivo(s) en sesión</div></aside>
      <section className="editor-panel"><div className="panel-title"><span className="eyebrow">02</span><h2>Editor de texto</h2><span className="draft-badge">borrador</span></div><textarea className="main-editor" aria-label="Editor del guion" value={script} onChange={(event) => update({ script: event.target.value })} spellCheck="false" /><div className="editor-footer"><span>{script.trim() ? script.trim().split(/\s+/).length : 0} palabras</span><div className="draft-actions"><button type="button" onClick={applyDraft}>↑ aplicar al aire</button><button type="button" onClick={discardDraft}>descartar</button></div></div></section>
      <section className="output-panel"><div className="panel-title"><span className="eyebrow">03</span><h2>Teleprompter</h2><button className="screen-button" type="button" onClick={openPresenter}>▣ pantalla</button></div><div className="teleprompter-shell">{reader}<div className="guide-line top-line" /><div className="guide-line bottom-line" /><div className="center-marker" /></div><div className="controls"><button className={isPlaying ? 'play-button playing' : 'play-button'} type="button" onClick={() => update({ isPlaying: !isPlaying })}>{isPlaying ? 'Ⅱ' : '▶'} <span>{isPlaying ? 'pausar' : 'comenzar'}</span></button><div className="control-group"><span>velocidad</span><button type="button" onClick={() => update({ speed: Math.max(1, speed - 1) })}>−</button><strong>{speed}</strong><button type="button" onClick={() => update({ speed: Math.min(6, speed + 1) })}>+</button></div><div className="control-group"><span>tamaño</span><button type="button" onClick={() => update({ fontSize: Math.max(28, fontSize - 2) })}>−</button><strong>{fontSize}</strong><button type="button" onClick={() => update({ fontSize: Math.min(64, fontSize + 2) })}>+</button></div><button className={isMirrored ? 'toggle active' : 'toggle'} type="button" onClick={() => update({ isMirrored: !isMirrored })}>⇄ espejo</button><button className="reset-button" type="button" onClick={resetScroll}>↺</button></div></section>
    </section>
    <section className="bottom-tools"><div className="message-panel"><div className="panel-title"><span className="eyebrow">04</span><h2>Mensajes al aire</h2><span className="message-status">{messageVisible ? 'visible en pantalla' : 'oculto'}</span></div><div className="message-row"><div className="preset-list">{messagePresets.map((preset) => <button type="button" key={preset} onClick={() => setMessage(preset)}>{preset}</button>)}</div><input value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribí un aviso para el periodista..." /><button className="send-button" type="button" onClick={sendMessage}>mostrar</button><button className="hide-button" type="button" onClick={hideMessage}>ocultar</button></div></div><div className="keys-panel"><div className="panel-title"><span className="eyebrow">05</span><h2>Asignaciones</h2></div><div className="key-grid">{(Object.keys(keyLabels) as KeyAction[]).map((action) => <button className={learningAction === action ? 'key-binding listening' : 'key-binding'} type="button" key={action} onClick={() => startLearning(action)}><span>{keyLabels[action]}</span><kbd>{learningAction === action ? 'presioná una tecla' : bindings[action]}</kbd></button>)}</div></div></section>
  </main>
}
export default App
