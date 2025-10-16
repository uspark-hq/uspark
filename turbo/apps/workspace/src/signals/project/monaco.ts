import { command, computed, state } from 'ccstate'
import { editor } from 'monaco-editor'

// Monaco 编辑器实例状态（内部）
const internalMonacoEditor$ = state<editor.IStandaloneCodeEditor | null>(null)

// 编辑器容器元素状态
const editorContainer$ = state<HTMLElement | null>(null)

// 注册容器元素并自动初始化编辑器
export const setEditorContainer$ = command(
  ({ get, set }, container: HTMLElement | null, signal: AbortSignal) => {
    if (!container) {
      return
    }

    set(editorContainer$, container)

    // 当容器设置时，自动初始化编辑器
    if (!get(internalMonacoEditor$)) {
      set(initMonacoEditor$, signal)
      signal.throwIfAborted()
    }
  },
)

// 初始化编辑器
export const initMonacoEditor$ = command(({ get, set }) => {
  const container = get(editorContainer$)
  if (!container) {
    return
  }

  // 如果已经存在编辑器，先清理
  const existingEditor = get(internalMonacoEditor$)
  if (existingEditor) {
    existingEditor.dispose()
  }

  const monacoEditor = editor.create(container, {
    value: '',
    language: 'typescript',
    theme: 'vs-dark',
    automaticLayout: true,
    readOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
  })

  set(internalMonacoEditor$, monacoEditor)
})

// 获取编辑器实例（供外部使用）
export const monacoEditor$ = computed((get) => get(internalMonacoEditor$))
