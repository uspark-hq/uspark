// oxlint-disable require-hook

import { RuleTester } from '@typescript-eslint/rule-tester'
import { computedConstArgsPackageScope } from '../computed-const-args-package-scope'
import { noCatchAbort } from '../no-catch-abort'
import { noExportState } from '../no-export-state'
import { noGetSignal } from '../no-get-signal'
import { noPackageVariable } from '../no-package-variable'
import { noStoreInParams } from '../no-store-in-params'
import { signalCheckAwait } from '../signal-check-await'
import { signalDollarSuffix } from '../signal-dollar-suffix'
import { testContextInHooks } from '../test-context-in-hooks'
import { tsxInViews } from '../tsx-in-views'

// ethan@paraflow.com
const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts', '*.tsx'],
      },
    },
  },
})

ruleTester.run('tsx-in-views', tsxInViews, {
  valid: [
    {
      code: 'const x = 1;',
      filename: 'test.ts',
    },
  ],
  invalid: [
    {
      code: `function Component() {
                return <div>Hello World</div>
            }`,
      filename: 'Component.tsx',
      errors: [
        { messageId: 'tsxInViews', data: { filename: 'Component.tsx' } },
      ],
    },
  ],
})

ruleTester.run('no-export-state', noExportState, {
  valid: [],
  invalid: [
    {
      code: `
                import { state } from 'ccstate';
                export const counter = state(0);
            `,
      errors: [{ messageId: 'noExportState', data: { name: 'counter' } }],
    },
    // 先声明后导出状态
    {
      code: `
                import { state } from 'ccstate';
                const counter = state(0);
                export { counter };
            `,
      errors: [{ messageId: 'noExportState', data: { name: 'counter' } }],
    },
    // 使用别名导入并导出状态
    {
      code: `
                import { state as createState } from 'ccstate';
                const counter = createState(0);
                export { counter };
            `,
      errors: [{ messageId: 'noExportState', data: { name: 'counter' } }],
    },
    // 重命名变量并导出
    {
      code: `
                import { state } from 'ccstate';
                const counter = state(0);
                const counterAlias = counter;
                export { counterAlias };
            `,
      errors: [{ messageId: 'noExportState', data: { name: 'counterAlias' } }],
    },
    // 导出多个变量，包含状态
    {
      code: `
                import { state } from 'ccstate';
                const counter = state(0);
                const normalVar = 42;
                export { counter, normalVar };
            `,
      errors: [{ messageId: 'noExportState', data: { name: 'counter' } }],
    },
  ],
})

ruleTester.run('signal-dollar-suffix', signalDollarSuffix, {
  valid: [
    {
      code: `
                import { state } from 'ccstate';
                const counter$ = state(0);
            `,
    },
    {
      code: `
                const normalVar = 42;
            `,
    },
    {
      code: `
                import { state as createState } from 'ccstate';
                const counter$ = createState(0);
            `,
    },
    {
      code: `
                import { state } from 'ccstate';
                function process(value) {
                    const result = value * 2;
                    return result;
                }
            `,
    },
    {
      // 测试其他信号函数
      code: `
                import { command, computed } from 'ccstate';
                const handler$ = command(() => {});
                const doubled$ = computed(() => 0);
            `,
    },
  ],
  invalid: [
    {
      code: `
                import { state } from 'ccstate';
                const counter = state(0);
            `,
      errors: [
        {
          messageId: 'dollarSuffix',
          data: { name: 'counter' },
        },
      ],
    },
    {
      code: `
                import { state, command, computed } from 'ccstate';
                const counter = state(0);
                const handler = command(() => {});
                const value = computed(() => 0);
            `,
      errors: [
        {
          messageId: 'dollarSuffix',
          data: { name: 'counter' },
        },
        {
          messageId: 'dollarSuffix',
          data: { name: 'handler' },
        },
        {
          messageId: 'dollarSuffix',
          data: { name: 'value' },
        },
      ],
    },
    {
      code: `
                import { state as createState } from 'ccstate';
                const counter = createState(0);
            `,
      errors: [
        {
          messageId: 'dollarSuffix',
          data: { name: 'counter' },
        },
      ],
    },
    {
      code: `
                import { state } from 'ccstate';
                const counter = (x => x)(state(0));
                `,
      errors: [
        {
          messageId: 'dollarSuffix',
          data: { name: 'counter' },
        },
      ],
    },
  ],
})

ruleTester.run('signal-check-after-await', signalCheckAwait, {
  valid: [
    {
      code: `
                async function test(signal: AbortSignal) {
                    await Promise.resolve()
                    signal.throwIfAborted()
                }
                    `,
    },
    {
      code: `
                async function test(signal: AbortSignal) {
                    await Promise.resolve()
                    signal.throwIfAborted()
                }
                async function test2(signal: AbortSignal) {
                    await test(signal)
                }
            `,
    },
    {
      code: `
            async function test({signal} : {signal: AbortSignal}) {
                await Promise.resolve()
                signal.throwIfAborted()
            }
            async function test2(signal: AbortSignal) {
                await test({signal})
            }
            `,
    },
    {
      code: `
                async function test(signal: AbortSignal) {
                    await Promise.resolve()
                    signal.throwIfAborted()
                }
                async function test2(signal: AbortSignal) {
                    const ret = test(signal)
                    return await ret
                }
            `,
    },
    {
      code: `
                import { computed } from 'ccstate'
                const user$ = computed(async (get) => {
                    await Promise.resolve()
                })
            `,
    },
    {
      name: 'catch in inner function',
      code: `
                async function test(signal: AbortSignal) {
                    const whens = await Promise.all([1].map(async num => {
                        await Promise.resolve(num)
                        signal.throwIfAborted()
                    }))
                    signal.throwIfAborted()
                }
            `,
    },
  ],
  invalid: [
    {
      code: `
        async function test() {
            await Promise.resolve()
        }
        `,
      errors: [{ messageId: 'signalCheckAwait' }],
    },
    {
      code: `
                async function test({signal}: {signal: AbortSignal}) {
                    await Promise.resolve()
                    signal.throwIfAborted()
                }
                async function test2(signal: AbortSignal) {
                    await test()
                }
            `,
      errors: [{ messageId: 'signalCheckAwait' }],
    },
    {
      code: `
                async function test() {
                    await Promise.resolve()
                }
            `,
      errors: [{ messageId: 'signalCheckAwait' }],
    },
    {
      code: `
                async function test() {
                    const ret = await Promise.resolve()
                    console.log(ret)
                    return ret
                }
            `,
      errors: [{ messageId: 'signalCheckAwait' }],
    },
    {
      code: `
                async function test() {
                    return await Promise.resolve()
                }
            `,
      errors: [{ messageId: 'signalCheckAwait' }],
    },
    {
      code: `
                async function test(signal: AbortSignal) {
                    await Promise.resolve()
                    await Promise.resolve()
                    signal.throwIfAborted()
                }
                    `,
      errors: [
        {
          messageId: 'signalCheckAwait',
        },
      ],
    },
    {
      code: `
                async function test(signal: AbortSignal) {
                    const whens = await Promise.race(Promise.resolve())
                }
            `,
      errors: [
        {
          messageId: 'signalCheckAwait',
        },
      ],
    },
    {
      name: 'catch inner throw',
      code: `
                async function test(signal: AbortSignal) {
                    const whens = await Promise.all([1].map(async num => {
                        await Promise.resolve(num)
                    }))
                    signal.throwIfAborted()
                }
            `,
      errors: [
        {
          messageId: 'signalCheckAwait',
        },
      ],
    },
  ],
})

ruleTester.run('noCatchAbort', noCatchAbort, {
  valid: [
    {
      code: `
            try {
                foo()
            } catch (e) {
                throwIfAbort(e)
            }
        `,
    },
  ],
  invalid: [
    {
      code: `
            try {
                foo()
            } catch {}
        `,
      errors: [{ messageId: 'noCatchAbort' }],
    },
    {
      code: `
            try {
                foo()
            } catch (e) {
                throwIfAbort()
            }
        `,
      errors: [{ messageId: 'noCatchAbort' }],
    },
    {
      code: `
            try {
                foo()
            } catch (e) {
                throwIfAbort(error)
            }
        `,
      errors: [{ messageId: 'noCatchAbort' }],
    },
    {
      code: `
            try {
                foo()
            } catch (e) {
                console.log(e)
                throwIfAbort(e)
            }
        `,
      errors: [{ messageId: 'noCatchAbort' }],
    },
  ],
})

ruleTester.run('noPackageVariable', noPackageVariable, {
  valid: [
    {
      code: `
        const A = 1`,
    },
    {
      name: 'freezed object',
      code: `
            const A = Object.freezed({})
            `,
    },
    {
      name: 'readonly array',
      code: `
            const readonlyArray: Readonly<number[]> = [1, 2, 3];
            `,
    },
    {
      name: 'ccstate type',
      code: `
            import { state } from 'ccstate';
            const a$ = state(1);
            `,
      options: [
        {
          allowedMutableTypes: [
            {
              from: 'package',
              name: 'State',
              package: 'ccstate',
            },
          ],
        },
      ],
    },
    {
      // 使用 options 传递配置参数的测试用例
      name: 'allowed mutable type via options',
      code: `
            const customMap = new Map();
            `,
      options: [
        {
          allowedMutableTypes: [
            {
              from: 'lib',
              name: 'Map',
            },
          ],
        },
      ],
    },
    {
      // 自定义对象测试
      name: 'allowed custom object type',
      code: `
            interface CustomType {}
            const customObj: CustomType = {};
            `,
      options: [
        {
          allowedMutableTypes: [
            {
              from: 'file',
              name: 'CustomType',
            },
          ],
        },
      ],
    },
  ],
  invalid: [
    {
      code: `
        let A = 1
        `,
      errors: [
        {
          messageId: 'noPackageVariable',
        },
      ],
    },
    {
      code: `
            const A = []
            `,
      errors: [
        {
          messageId: 'noPackageVariable',
        },
      ],
    },
    {
      code: `
            const A = {foo: 1}
            `,
      errors: [
        {
          messageId: 'noPackageVariable',
        },
      ],
    },
    {
      code: `
            const A = {}
            `,
      errors: [
        {
          messageId: 'noPackageVariable',
        },
      ],
    },
    {
      code: `
            const A = new Map()
            `,
      errors: [
        {
          messageId: 'noPackageVariable',
        },
      ],
    },
    {
      code: `
            const A = new Set()
            `,
      errors: [
        {
          messageId: 'noPackageVariable',
        },
      ],
    },
    {
      code: `
            const A = new WeakMap()
            `,
      errors: [
        {
          messageId: 'noPackageVariable',
        },
      ],
    },
    {
      code: `
            const A = new WeakSet()
            `,
      errors: [
        {
          messageId: 'noPackageVariable',
        },
      ],
    },
    // 测试带有特定配置但仍不允许的类型
    {
      name: 'restricted type despite other allowed types',
      code: `
            const mySet = new Set();
            `,
      options: [
        {
          allowedMutableTypes: [
            {
              from: 'lib',
              name: 'Map', // 只允许 Map，不允许 Set
            },
          ],
        },
      ],
      errors: [
        {
          messageId: 'noPackageVariable',
        },
      ],
    },
    // 测试复杂的配置
    {
      name: 'object still not allowed with other configs',
      code: `
            interface AllowedType {}
            const obj = {};
            const customObj: AllowedType = {};
            `,
      options: [
        {
          allowedMutableTypes: [
            {
              from: 'file',
              name: 'AllowedType',
            },
          ],
        },
      ],
      errors: [
        {
          messageId: 'noPackageVariable',
        },
      ],
    },
  ],
})

ruleTester.run('no-get-signal', noGetSignal, {
  invalid: [
    {
      name: 'get signal in computed',
      code: `
            import { state, computed } from 'ccstate';
            const signal$ = state<AbortSignal>(AbortSignal.abort());
            computed(get => {
                get(signal$)
            })
            `,
      errors: [
        {
          messageId: 'noGetSignal',
        },
      ],
    },
    {
      name: 'get computed signal in computed',
      code: `
            import { computed } from 'ccstate';
            const signal$ = computed<AbortSignal>(() => {
                return AbortSignal.abort()
            });
            computed(get => {
                get(signal$)
            })
            `,
      errors: [
        {
          messageId: 'noGetSignal',
        },
      ],
    },
    {
      name: 'get signal in command',
      code: `
            import { computed, command } from 'ccstate';
            const signal$ = computed<AbortSignal>(() => {
                return AbortSignal.abort()
            });
            command(({get}) => {
                get(signal$)
            })
            `,
      errors: [
        {
          messageId: 'noGetSignal',
        },
      ],
    },
    {
      name: 'get AbortSignal | undefined state',
      code: `
            import { state, command } from 'ccstate';
            const signal$ = state<AbortSignal | undefined>(undefined);
            command(({get}) => {
                get(signal$)
            })
            `,
      errors: [
        {
          messageId: 'noGetSignal',
        },
      ],
    },
    {
      name: 'get undefined | AbortSignal state',
      code: `
            import { state, command } from 'ccstate';
            const signal$ = state<undefined | AbortSignal>(undefined);
            command(({get}) => {
                get(signal$)
            })
            `,
      errors: [
        {
          messageId: 'noGetSignal',
        },
      ],
    },
    {
      name: 'get Map<string, AbortSignal> state',
      code: `
            import { state, command } from 'ccstate';
            const mapSignal$ = state(new Map<string, AbortSignal>());
            command(({get}) => {
                get(mapSignal$)
            })
            `,
      errors: [
        {
          messageId: 'noGetSignal',
        },
      ],
    },
    {
      name: 'get Computed<Map<string, AbortSignal>>',
      code: `
            import { computed, command } from 'ccstate';
            const mapSignal$ = computed(() => new Map<string, AbortSignal>());
            command(({get}) => {
                get(mapSignal$)
            })
            `,
      errors: [
        {
          messageId: 'noGetSignal',
        },
      ],
    },
    {
      name: 'get State<Map<string, AbortSignal | undefined>>',
      code: `
            import { state, command } from 'ccstate';
            const mapSignal$ = state(new Map<string, AbortSignal | undefined>());
            command(({get}) => {
                get(mapSignal$)
            })
            `,
      errors: [
        {
          messageId: 'noGetSignal',
        },
      ],
    },
  ],
  valid: [
    {
      name: 'get signal by store',
      code: `
            import { state } from 'ccstate';
            const signal$ = state<AbortSignal>(AbortSignal.abort());
            store.get(signal$)
            `,
    },
    {
      name: 'get nested AbortSignal in Map',
      code: `
            import { state, command } from 'ccstate';
            type ToggleContext = { initContext$: any };
            const contextMap$ = state(new Map<string, ToggleContext>());
            command(({get}) => {
                const map = get(contextMap$)
                return map.get('key')
            })
            `,
    },
    {
      name: 'get nested AbortSignal in Array',
      code: `
            import { state, command } from 'ccstate';
            const contextArray$ = state<{ signal: AbortSignal }[]>([]);
            command(({get}) => {
                const array = get(contextArray$)
                return array[0]
            })
            `,
    },
    {
      name: 'get nested AbortSignal in object',
      code: `
            import { state, command } from 'ccstate';
            const contextObj$ = state<{ setup$: (signal: AbortSignal) => void } | null>(null);
            command(({get}) => {
                const obj = get(contextObj$)
                return obj
            })
            `,
    },
    {
      name: 'get complex nested AbortSignal in Command type (should not be detected)',
      code: `
            import { state, command } from 'ccstate';
            type ToggleContext = { initContext$: Command<void, [AbortSignal]> };
            const complexMap$ = state(new Map<string, ToggleContext>());
            command(({get}) => {
                const map = get(complexMap$)
                return map.get('key')
            })
            `,
    },
  ],
})

ruleTester.run('test-context-in-hooks', testContextInHooks, {
  valid: [
    {
      name: 'testContext called at top level without destructuring',
      code: `
            import { testContext } from '../../__tests__/app-context'
            const context = testContext()
            `,
    },
    {
      name: 'testContext called outside describe without destructuring',
      code: `
            import { testContext } from '../../__tests__/app-context'
            const context = testContext()
            describe('test suite', () => {
                it('should work', () => {
                    const { store, signal } = context
                })
            })
            `,
    },
    {
      name: 'testContext called in describe but not in hook without destructuring',
      code: `
            import { testContext } from '../../__tests__/app-context'
            describe('test suite', () => {
                const context = testContext()
                it('should work', () => {
                    const { store, signal } = context
                })
            })
            `,
    },
    {
      name: 'testContext called in beforeEach',
      code: `
            import { testContext } from '../../__tests__/app-context'
            describe('test suite', () => {
                let context: any
                beforeEach(() => {
                    context = testContext()
                })
                it('should work', () => {
                    const { store, signal } = context
                })
            })
            `,
    },
    {
      name: 'testContext destructured in it',
      code: `
            import { testContext } from '../../__tests__/app-context'
            it('should work', () => {
                const { store, signal } = testContext()
            })
            `,
    },
    {
      name: 'testContext destructured in test',
      code: `
            import { testContext } from '../../__tests__/app-context'
            test('should work', () => {
                const { store, signal } = testContext()
            })
            `,
    },
    {
      name: 'testContext destructured in beforeEach',
      code: `
            import { testContext } from '../../__tests__/app-context'
            describe('test suite', () => {
                let store: any, signal: any
                beforeEach(() => {
                    const { store: s, signal: sig } = testContext()
                    store = s
                    signal = sig
                })
            })
            `,
    },
    {
      name: 'testContext called in afterEach',
      code: `
            import { testContext } from '../../__tests__/app-context'
            afterEach(() => {
                const context = testContext()
            })
            `,
    },
    {
      name: 'testContext called in beforeAll',
      code: `
            import { testContext } from '../../__tests__/app-context'
            beforeAll(() => {
                const context = testContext()
            })
            `,
    },
    {
      name: 'testContext called in afterAll',
      code: `
            import { testContext } from '../../__tests__/app-context'
            afterAll(() => {
                const context = testContext()
            })
            `,
    },
  ],
  invalid: [
    {
      name: 'testContext destructured at top level',
      code: `
            import { testContext } from '../../__tests__/app-context'
            const { store, signal } = testContext()
            `,
      errors: [
        {
          messageId: 'testContextDestructuringOutsideHook',
        },
      ],
    },
    {
      name: 'testContext destructured outside describe',
      code: `
            import { testContext } from '../../__tests__/app-context'
            const { store, signal } = testContext()
            describe('test suite', () => {
                it('should work', () => {
                    store.get()
                })
            })
            `,
      errors: [
        {
          messageId: 'testContextDestructuringOutsideHook',
        },
      ],
    },
    {
      name: 'testContext destructured in describe but not in hook',
      code: `
            import { testContext } from '../../__tests__/app-context'
            describe('test suite', () => {
                const { store, signal } = testContext()
                it('should work', () => {
                    store.get()
                })
            })
            `,
      errors: [
        {
          messageId: 'testContextDestructuringOutsideHook',
        },
      ],
    },
  ],
})

ruleTester.run(
  'computed-const-args-package-scope',
  computedConstArgsPackageScope,
  {
    valid: [
      {
        name: 'localStorageSignal with constant arg at package scope',
        code: `
                import { computed } from 'ccstate';
                function localStorageSignal(key: string) {
                    return computed(get => {
                        return localStorage.getItem(key);
                    });
                }
                const userPreference$ = localStorageSignal('user-preference');
            `,
      },
      {
        name: 'localStorageSignal with non-constant arg in function',
        code: `
                import { computed } from 'ccstate';
                function localStorageSignal(key: string) {
                    return computed(get => {
                        return localStorage.getItem(key);
                    });
                }
                function setupPreferences(prefKey: string) {
                    const pref$ = localStorageSignal(prefKey);
                    return pref$;
                }
            `,
      },
      {
        name: 'function returning non-constant type in function (should be valid)',
        code: `
                function mutableFunction(value: string) {
                    return { mutable: value }; // returns mutable object
                }
                function test() {
                    const result = mutableFunction('hello');
                }
            `,
      },
      {
        name: 'computed-returning function with variable argument',
        code: `
                import { computed } from 'ccstate';
                function createComputed(key: string) {
                    return computed(() => key);
                }
                function test() {
                    const dynamicKey = Math.random() > 0.5 ? 'a' : 'b';
                    const result$ = createComputed(dynamicKey);
                }
            `,
      },
      {
        name: 'direct computed call with non-constant (closure over parameter)',
        code: `
                import { computed } from 'ccstate';
                function test(value: number) {
                    const result$ = computed(() => value);
                }
            `,
      },
      {
        name: 'function defined in non-package scope can be called anywhere',
        code: `
                import { computed } from 'ccstate';
                function outer() {
                    function localCreateComputed(key: string) {
                        return computed(() => key);
                    }
                    
                    function inner() {
                        const result$ = localCreateComputed('constant');
                        return result$;
                    }
                    return inner;
                }
            `,
      },
      {
        name: 'function returning object with Computed/Command properties at package scope',
        code: `
                import { computed, command } from 'ccstate';
                function createSignals(key: string) {
                    return {
                        get$: computed(() => localStorage.getItem(key)),
                        set$: command(({}, value: string) => localStorage.setItem(key, value)),
                        other: 'constant'
                    };
                }
                const signals = createSignals('user-pref');
            `,
      },
      {
        name: 'function returning object with only constants',
        code: `
                function createConfig(key: string) {
                    return {
                        name: key,
                        version: 1,
                        enabled: true
                    };
                }
                function test() {
                    const config = createConfig('my-config');
                }
            `,
      },
      {
        name: 'no-argument function returning constant (factory pattern)',
        code: `
                function isSupported() {
                    return typeof Window !== 'undefined';
                }
                function test() {
                    const supported = isSupported();
                }
            `,
      },
      {
        name: 'enum member as constant argument at package scope',
        code: `
                import { computed } from 'ccstate';
                enum StorageKey {
                    Theme = 'theme'
                }
                function getStorage(key: string) {
                    return computed(() => localStorage.getItem(key));
                }
                const theme$ = getStorage(StorageKey.Theme);
            `,
      },
      {
        name: 'dynamic property access should not be treated as constant',
        code: `
                function formatNodeId(nodeId: string) {
                    return nodeId.toUpperCase();
                }
                function inspectNode(nodeChange: { id: string }) {
                    const formatted = formatNodeId(nodeChange.id);  // nodeChange.id is NOT constant
                    return formatted;
                }
            `,
      },
    ],
    invalid: [
      {
        name: 'function returning constant type with literal args in function',
        code: `
                function normalFunction(value: string) {
                    return value.toUpperCase();
                }
                function test() {
                    const result = normalFunction('hello');
                }
            `,
        errors: [
          {
            messageId: 'mustBePackageScope',
            data: { name: 'normalFunction' },
          },
        ],
      },
      {
        name: 'localStorageSignal with constant arg in function',
        code: `
                import { computed } from 'ccstate';
                function localStorageSignal(key: string) {
                    return computed(get => {
                        return localStorage.getItem(key);
                    });
                }
                function setupApp() {
                    const userPreference$ = localStorageSignal('user-preference');
                    return userPreference$;
                }
            `,
        errors: [
          {
            messageId: 'mustBePackageScope',
            data: { name: 'localStorageSignal' },
          },
        ],
      },
      {
        name: 'localStorageSignal with constant arg in method',
        code: `
                import { computed } from 'ccstate';
                function localStorageSignal(key: string) {
                    return computed(get => {
                        return localStorage.getItem(key);
                    });
                }
                class Store {
                    setupPreferences() {
                        const theme$ = localStorageSignal('theme');
                        return theme$;
                    }
                }
            `,
        errors: [
          {
            messageId: 'mustBePackageScope',
            data: { name: 'localStorageSignal' },
          },
        ],
      },
      {
        name: 'computed-returning function with constant in arrow function',
        code: `
                import { computed } from 'ccstate';
                function getSignal(defaultValue: number) {
                    return computed(() => defaultValue);
                }
                const setupSignals = () => {
                    const counter$ = getSignal(0);
                    return counter$;
                };
            `,
        errors: [
          {
            messageId: 'mustBePackageScope',
            data: { name: 'getSignal' },
          },
        ],
      },
      {
        name: 'computed-returning function with string constant in nested function',
        code: `
                import { computed } from 'ccstate';
                function apiSignal(endpoint: string) {
                    return computed(async get => {
                        const response = await fetch(endpoint);
                        return response.json();
                    });
                }
                function outer() {
                    function inner() {
                        const users$ = apiSignal('/api/users');
                        return users$;
                    }
                    return inner;
                }
            `,
        errors: [
          {
            messageId: 'mustBePackageScope',
            data: { name: 'apiSignal' },
          },
        ],
      },
      {
        name: 'computed-returning function with object constant',
        code: `
                import { computed } from 'ccstate';
                function configSignal(config: { key: string, default: string }) {
                    return computed(() => config.default);
                }
                function Component() {
                    const setting$ = configSignal({ key: 'theme', default: 'dark' });
                    return setting$;
                }
            `,
        errors: [
          {
            messageId: 'mustBePackageScope',
            data: { name: 'configSignal' },
          },
          // Note: computed(() => config.default) is NOT flagged because config.default is dynamic
        ],
      },
      {
        name: 'function returning object with Computed/Command properties called in function',
        code: `
                import { computed, command } from 'ccstate';
                function localStorageSignals(key: string) {
                    const get$ = computed(() => localStorage.getItem(key));
                    const set$ = command(({}, value: string) => localStorage.setItem(key, value));
                    return { get$, set$ };
                }
                function setupApp() {
                    const userPref = localStorageSignals('user-preference');
                    return userPref;
                }
            `,
        errors: [
          {
            messageId: 'mustBePackageScope',
            data: { name: 'localStorageSignals' },
          },
        ],
      },
      {
        name: 'enum member as constant argument in function',
        code: `
                import { computed } from 'ccstate';
                enum StorageKey {
                    Theme = 'theme'
                }
                function getStorage(key: string) {
                    return computed(() => localStorage.getItem(key));
                }
                function setupTheme() {
                    const theme$ = getStorage(StorageKey.Theme);
                    return theme$;
                }
            `,
        errors: [
          {
            messageId: 'mustBePackageScope',
            data: { name: 'getStorage' },
          },
        ],
      },
    ],
  },
)

ruleTester.run('no-store-in-params', noStoreInParams, {
  valid: [
    {
      name: 'function without Store parameter',
      code: `
                function processData(data: string) {
                    return data.toUpperCase();
                }
            `,
    },
    {
      name: 'function with other types',
      code: `
                interface User {
                    id: string;
                    name: string;
                }
                function processUser(user: User) {
                    return user.name;
                }
            `,
    },
    {
      name: 'arrow function without Store',
      code: `
                const handler = (value: number) => {
                    return value * 2;
                }
            `,
    },
    {
      name: 'method without Store',
      code: `
                class Service {
                    process(data: string[]): void {
                        console.log(data);
                    }
                }
            `,
    },
  ],
  invalid: [
    {
      name: 'function with Store parameter',
      code: `
                import { Store } from 'ccstate';
                function processStore(store: Store) {
                    store.get();
                }
            `,
      errors: [
        {
          messageId: 'noStoreInParams',
          data: { param: 'store' },
        },
      ],
    },
    {
      name: 'arrow function with Store parameter',
      code: `
                import { Store } from 'ccstate';
                const handler = (store: Store) => {
                    store.set();
                }
            `,
      errors: [
        {
          messageId: 'noStoreInParams',
          data: { param: 'store' },
        },
      ],
    },
    {
      name: 'function with Store in object parameter',
      code: `
                import { Store } from 'ccstate';
                interface Config {
                    store: Store;
                    name: string;
                }
                function setup(config: Config) {
                    config.store.get();
                }
            `,
      errors: [
        {
          messageId: 'noStoreInObjectParams',
          data: { param: 'config', property: 'store' },
        },
      ],
    },
    {
      name: 'function with nested Store in object',
      code: `
                import { Store } from 'ccstate';
                interface DeepConfig {
                    settings: {
                        store: Store;
                    };
                }
                function configure(config: DeepConfig) {
                    config.settings.store.get();
                }
            `,
      errors: [
        {
          messageId: 'noStoreInObjectParams',
          data: { param: 'config', property: 'settings.store' },
        },
      ],
    },
    {
      name: 'method with Store parameter',
      code: `
                import { Store } from 'ccstate';
                class Service {
                    process(store: Store): void {
                        store.get();
                    }
                }
            `,
      errors: [
        {
          messageId: 'noStoreInParams',
          data: { param: 'store' },
        },
      ],
    },
    {
      name: 'function with Store array parameter',
      code: `
                import { Store } from 'ccstate';
                function processStores(stores: Store[]) {
                    stores.forEach(s => s.get());
                }
            `,
      errors: [
        {
          messageId: 'noStoreInObjectParams',
          data: { param: 'stores', property: '[]' },
        },
        {
          messageId: 'noStoreInParams',
          data: { param: 's' },
        },
      ],
    },
  ],
})
