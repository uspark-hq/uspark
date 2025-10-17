import { command, computed } from 'ccstate'
import { editor } from 'monaco-editor'

// 编辑器容器元素状态
export const editorContainer$ = command(
  (_ctx, container: HTMLElement | null) => container,
)

// 获取编辑器实例，自动初始化并确保只创建一次
export const monacoEditor$ = computed((get) => {
  const container = get(editorContainer$)

  if (!container) {
    return null
  }

  // 创建新的编辑器实例（computed 的缓存机制确保只创建一次）
  const monacoEditor = editor.create(container, {
    value: '',
    language: 'typescript',
    theme: 'vs-dark',
    automaticLayout: true,
    readOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
  })

  return monacoEditor
})
