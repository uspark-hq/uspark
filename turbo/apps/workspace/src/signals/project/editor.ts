import { markdown } from '@codemirror/lang-markdown'
import { EditorState, type Extension } from '@codemirror/state'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import { command, computed } from 'ccstate'
import { selectedFileContent$, selectedFileItem$ } from './project'

// 编辑器初始化配置
export const editorStateConfig$ = computed(async (get) => {
  const file = await get(selectedFileItem$)

  if (!file || file.type === 'directory' || !file.path.endsWith('.md')) {
    return null
  }

  const content = await get(selectedFileContent$)
  if (!content) {
    return null
  }

  // 编辑器扩展配置
  const editorExtensions: Extension[] = [
    markdown(),
    oneDark,
    EditorView.lineWrapping,
    EditorView.editable.of(true), // 编辑模式
  ]

  return {
    doc: content,
    extensions: editorExtensions,
  }
})

// 挂载编辑器
export const mountEditor$ = command(
  async ({ get }, container: HTMLElement, signal: AbortSignal) => {
    // 获取配置
    const config = await get(editorStateConfig$)
    signal.throwIfAborted()

    if (!config) {
      return
    }

    // 创建 EditorView
    const state: EditorState = EditorState.create({
      doc: config.doc,
      extensions: config.extensions,
    })

    const view: EditorView = new EditorView({
      state,
      parent: container,
    })

    // 监听 signal abort 事件，清理编辑器
    signal.addEventListener('abort', () => {
      view.destroy()
    })
  },
)
