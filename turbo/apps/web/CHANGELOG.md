# Changelog

## [0.44.1](https://github.com/uspark-hq/uspark/compare/web-v0.44.0...web-v0.44.1) (2025-10-15)


### Bug Fixes

* remove unnecessary polling mechanism in project list ([#524](https://github.com/uspark-hq/uspark/issues/524)) ([7560def](https://github.com/uspark-hq/uspark/commit/7560def99b4864ead3aae5bad04fa639d3666977))

## [0.44.0](https://github.com/uspark-hq/uspark/compare/web-v0.43.0...web-v0.44.0) (2025-10-15)


### Features

* **web:** add initial scan progress tracking with real-time updates ([#515](https://github.com/uspark-hq/uspark/issues/515)) ([14a056c](https://github.com/uspark-hq/uspark/commit/14a056cf26ee5a97dd7f2169f4ff3912f5ce3e1e))


### Bug Fixes

* improve ci-check script portability and replace vercel checks with pnpm build ([#519](https://github.com/uspark-hq/uspark/issues/519)) ([b7e4a19](https://github.com/uspark-hq/uspark/commit/b7e4a19b75d859083b012eb98a52cc55905d5192))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.17.0

## [0.43.0](https://github.com/uspark-hq/uspark/compare/web-v0.42.0...web-v0.43.0) (2025-10-15)


### Features

* **web:** add optional github bootstrap with manual project creation ([#513](https://github.com/uspark-hq/uspark/issues/513)) ([f78d022](https://github.com/uspark-hq/uspark/commit/f78d022ca6bf7141b41df70416792f21a55ea2ae))

## [0.42.0](https://github.com/uspark-hq/uspark/compare/web-v0.41.0...web-v0.42.0) (2025-10-15)


### Features

* **web:** use shared claude token to simplify bootstrap flow ([#510](https://github.com/uspark-hq/uspark/issues/510)) ([cdb45a6](https://github.com/uspark-hq/uspark/commit/cdb45a6e60ce3e2a4455ca1eb2d634c25c8be6cf))

## [0.41.0](https://github.com/uspark-hq/uspark/compare/web-v0.40.1...web-v0.41.0) (2025-10-14)


### Features

* add project name field with unique constraint per user ([#500](https://github.com/uspark-hq/uspark/issues/500)) ([f16f41d](https://github.com/uspark-hq/uspark/commit/f16f41d7d3e7afe74a49e53161f76b5d5e2a87ea))
* **projects:** optimize new user bootstrap with github-first onboarding ([#503](https://github.com/uspark-hq/uspark/issues/503)) ([a6bccfc](https://github.com/uspark-hq/uspark/commit/a6bccfc64908aa57a903231c4c64d02616b3cb75))

## [0.40.1](https://github.com/uspark-hq/uspark/compare/web-v0.40.0...web-v0.40.1) (2025-10-13)


### Bug Fixes

* **web:** improve projects page ui and import shadcn styles ([#495](https://github.com/uspark-hq/uspark/issues/495)) ([462b78c](https://github.com/uspark-hq/uspark/commit/462b78cfd69eb48e4ce861ae832ef9777909d649))

## [0.40.0](https://github.com/uspark-hq/uspark/compare/web-v0.39.1...web-v0.40.0) (2025-10-13)


### Features

* **ui:** improve projects list and create project modal design ([#494](https://github.com/uspark-hq/uspark/issues/494)) ([9512371](https://github.com/uspark-hq/uspark/commit/95123715290e3cd124453f9cae8ee924f3ad7929))


### Bug Fixes

* **e2b:** replace direct node_env access with dev token check ([#490](https://github.com/uspark-hq/uspark/issues/490)) ([ebfb284](https://github.com/uspark-hq/uspark/commit/ebfb2840bccee62f71793f6c171063c6da6f5b0a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.16.0

## [0.39.1](https://github.com/uspark-hq/uspark/compare/web-v0.39.0...web-v0.39.1) (2025-10-11)


### Bug Fixes

* **e2b:** disable timeout for sandbox command execution ([#486](https://github.com/uspark-hq/uspark/issues/486)) ([e53b0db](https://github.com/uspark-hq/uspark/commit/e53b0dba7a7824998db0af6c5cd17b56cd163680))

## [0.39.0](https://github.com/uspark-hq/uspark/compare/web-v0.38.4...web-v0.39.0) (2025-10-11)


### Features

* implement github repository initial scan ([#483](https://github.com/uspark-hq/uspark/issues/483)) ([ea34603](https://github.com/uspark-hq/uspark/commit/ea34603b63886a321487ccaef86ecb54dcc4d622))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.15.0

## [0.38.4](https://github.com/uspark-hq/uspark/compare/web-v0.38.3...web-v0.38.4) (2025-10-11)


### Bug Fixes

* **e2b:** use home directory workspace to avoid permission issues ([#479](https://github.com/uspark-hq/uspark/issues/479)) ([2c56371](https://github.com/uspark-hq/uspark/commit/2c56371e7cba1b56bebe287822e4ba5e3a1d76c9))

## [0.38.3](https://github.com/uspark-hq/uspark/compare/web-v0.38.2...web-v0.38.3) (2025-10-11)


### Bug Fixes

* **e2b:** use home directory workspace to avoid permission issues ([#476](https://github.com/uspark-hq/uspark/issues/476)) ([bf8328a](https://github.com/uspark-hq/uspark/commit/bf8328aaedd0ee0ace8c52997b249dcf008d946b))

## [0.38.2](https://github.com/uspark-hq/uspark/compare/web-v0.38.1...web-v0.38.2) (2025-10-11)


### Bug Fixes

* **e2b:** fix workspace directory permissions and execution context ([#474](https://github.com/uspark-hq/uspark/issues/474)) ([1ca2e99](https://github.com/uspark-hq/uspark/commit/1ca2e99cc88d78ff9c518189c1739c8ba5b5661a))

## [0.38.1](https://github.com/uspark-hq/uspark/compare/web-v0.38.0...web-v0.38.1) (2025-10-11)


### Bug Fixes

* **e2b:** update cli versions and add command logging ([#472](https://github.com/uspark-hq/uspark/issues/472)) ([5c271ff](https://github.com/uspark-hq/uspark/commit/5c271ffddf544d8a6c5912d214d0be6e718b14a4))

## [0.38.0](https://github.com/uspark-hq/uspark/compare/web-v0.37.1...web-v0.38.0) (2025-10-11)


### Features

* **e2b:** add development environment configuration support ([#470](https://github.com/uspark-hq/uspark/issues/470)) ([5bef3c0](https://github.com/uspark-hq/uspark/commit/5bef3c05550ff8eadc771acf11e97cabe92f2718))

## [0.37.1](https://github.com/uspark-hq/uspark/compare/web-v0.37.0...web-v0.37.1) (2025-10-11)


### Bug Fixes

* **cli,web:** improve E2B reliability and token management ([#468](https://github.com/uspark-hq/uspark/issues/468)) ([5ff2da6](https://github.com/uspark-hq/uspark/commit/5ff2da639637e22909e5e115688dae38f283a6ec))

## [0.37.0](https://github.com/uspark-hq/uspark/compare/web-v0.36.1...web-v0.37.0) (2025-10-10)


### Features

* **web:** add verbose logging for e2b sandbox initialization ([#463](https://github.com/uspark-hq/uspark/issues/463)) ([35ed253](https://github.com/uspark-hq/uspark/commit/35ed253b5ab16c5676b917550940920f8683141e))

## [0.36.1](https://github.com/uspark-hq/uspark/compare/web-v0.36.0...web-v0.36.1) (2025-10-10)


### Bug Fixes

* add permissions skip and file sync to e2b executor ([#452](https://github.com/uspark-hq/uspark/issues/452)) ([f2faad2](https://github.com/uspark-hq/uspark/commit/f2faad26a6df6fd79de2e65dacc619de5d2abe95))

## [0.36.0](https://github.com/uspark-hq/uspark/compare/web-v0.35.2...web-v0.36.0) (2025-10-09)


### Features

* add terminal-style landing page ([#446](https://github.com/uspark-hq/uspark/issues/446)) ([3bee197](https://github.com/uspark-hq/uspark/commit/3bee197fa469ba3513650ec1a5ac89ff600ca546))

## [0.35.2](https://github.com/uspark-hq/uspark/compare/web-v0.35.1...web-v0.35.2) (2025-10-09)


### Bug Fixes

* improve CLI sync reliability and CORS handling ([#441](https://github.com/uspark-hq/uspark/issues/441)) ([eeb2ec1](https://github.com/uspark-hq/uspark/commit/eeb2ec14aad4c69cf2cb4272501800302483f2ee))

## [0.35.1](https://github.com/uspark-hq/uspark/compare/web-v0.35.0...web-v0.35.1) (2025-10-01)


### Bug Fixes

* improve sandbox initialization error logging ([#420](https://github.com/uspark-hq/uspark/issues/420)) ([2c57430](https://github.com/uspark-hq/uspark/commit/2c574309f6c27288564f97d5900c8be587e222ce))

## [0.35.0](https://github.com/uspark-hq/uspark/compare/web-v0.34.0...web-v0.35.0) (2025-10-01)


### Features

* add project deletion functionality ([#418](https://github.com/uspark-hq/uspark/issues/418)) ([486e326](https://github.com/uspark-hq/uspark/commit/486e326929ebecbe1f9a3bc806435572ca5a351e))


### Bug Fixes

* allow organization selection in github app installation ([#417](https://github.com/uspark-hq/uspark/issues/417)) ([9dc2b3a](https://github.com/uspark-hq/uspark/commit/9dc2b3a04560dc0e5c03e8b5d52aae38e42890c4))

## [0.34.0](https://github.com/uspark-hq/uspark/compare/web-v0.33.0...web-v0.34.0) (2025-10-01)


### Features

* allow selecting existing repositories for github sync ([#415](https://github.com/uspark-hq/uspark/issues/415)) ([4ca8560](https://github.com/uspark-hq/uspark/commit/4ca85603c0110586676647cc01d0ff2d46c14d1b))


### Bug Fixes

* sync github files to /spec directory with base_tree ([#412](https://github.com/uspark-hq/uspark/issues/412)) ([08e5b7f](https://github.com/uspark-hq/uspark/commit/08e5b7f1538e51090900117c0dbb0c8de9127c90))

## [0.33.0](https://github.com/uspark-hq/uspark/compare/web-v0.32.0...web-v0.33.0) (2025-10-01)


### Features

* add commit SHA tracking to github sync ([#395](https://github.com/uspark-hq/uspark/issues/395)) ([4cdf021](https://github.com/uspark-hq/uspark/commit/4cdf0214546201d44145dbb8639b38f2a39a8138))
* migrate turns and updates endpoints to use contracts (part 2) ([#402](https://github.com/uspark-hq/uspark/issues/402)) ([f5b18d0](https://github.com/uspark-hq/uspark/commit/f5b18d016b4c5645ab0d2c5263ea6533dc5f0f6e))


### Bug Fixes

* resolve hydration mismatch in data flow illustration component ([#409](https://github.com/uspark-hq/uspark/issues/409)) ([a3b3701](https://github.com/uspark-hq/uspark/commit/a3b370124ccf4f7ad83e32e57bd77163c3850d07))

## [0.32.0](https://github.com/uspark-hq/uspark/compare/web-v0.31.3...web-v0.32.0) (2025-09-30)


### Features

* integrate project files signal into project page view ([#390](https://github.com/uspark-hq/uspark/issues/390)) ([45f873a](https://github.com/uspark-hq/uspark/commit/45f873a5ae4bd0eb3b168107224ca7db3e0d133b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.14.0

## [0.31.3](https://github.com/uspark-hq/uspark/compare/web-v0.31.2...web-v0.31.3) (2025-09-26)


### Bug Fixes

* remove eslint suppression from use-session-polling hook ([#387](https://github.com/uspark-hq/uspark/issues/387)) ([0848407](https://github.com/uspark-hq/uspark/commit/0848407615e7c23e49964e751c3475f990baa335))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.13.0

## [0.31.2](https://github.com/uspark-hq/uspark/compare/web-v0.31.1...web-v0.31.2) (2025-09-25)


### Bug Fixes

* resolve infinite polling abort requests in session polling ([#384](https://github.com/uspark-hq/uspark/issues/384)) ([419f9bf](https://github.com/uspark-hq/uspark/commit/419f9bfcd4ffc74d992658b42e9977aa2e510f86))

## [0.31.1](https://github.com/uspark-hq/uspark/compare/web-v0.31.0...web-v0.31.1) (2025-09-25)


### Bug Fixes

* eliminate all TypeScript any types in production code ([#381](https://github.com/uspark-hq/uspark/issues/381)) ([b1521d9](https://github.com/uspark-hq/uspark/commit/b1521d963dc94d1f7756d1fd9ab01ec907ee93a0))

## [0.31.0](https://github.com/uspark-hq/uspark/compare/web-v0.30.0...web-v0.31.0) (2025-09-25)


### Features

* add session selector for chat interface ([#379](https://github.com/uspark-hq/uspark/issues/379)) ([f7a0fc1](https://github.com/uspark-hq/uspark/commit/f7a0fc1cc2b5d6b31cc5c677458530869105b5e0))

## [0.30.0](https://github.com/uspark-hq/uspark/compare/web-v0.29.2...web-v0.30.0) (2025-09-25)


### Features

* reuse existing sessions instead of creating new ones every time ([#377](https://github.com/uspark-hq/uspark/issues/377)) ([ec8a810](https://github.com/uspark-hq/uspark/commit/ec8a81032f1c2cfba9bc0ecae9d8b15badbb25ae))


### Bug Fixes

* remove artificial delays from test files ([#375](https://github.com/uspark-hq/uspark/issues/375)) ([388a8f1](https://github.com/uspark-hq/uspark/commit/388a8f16447653aee5e275f99066ac5e7ac0b947))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.12.2

## [0.29.2](https://github.com/uspark-hq/uspark/compare/web-v0.29.1...web-v0.29.2) (2025-09-24)


### Bug Fixes

* use standard CLI tokens for E2B sandbox authentication ([#373](https://github.com/uspark-hq/uspark/issues/373)) ([c4b8bbd](https://github.com/uspark-hq/uspark/commit/c4b8bbd5fb92fb7d9abd090fa7a7adc8e35017ef))

## [0.29.1](https://github.com/uspark-hq/uspark/compare/web-v0.29.0...web-v0.29.1) (2025-09-23)


### Bug Fixes

* use consistent sha256 content hash in web interface ([#363](https://github.com/uspark-hq/uspark/issues/363)) ([e5ab12a](https://github.com/uspark-hq/uspark/commit/e5ab12a1cdd00c4feb9fa253e55bb04105241ec4))

## [0.29.0](https://github.com/uspark-hq/uspark/compare/web-v0.28.1...web-v0.29.0) (2025-09-23)


### Features

* implement e2b claude execution with oauth tokens ([#357](https://github.com/uspark-hq/uspark/issues/357)) ([806c693](https://github.com/uspark-hq/uspark/commit/806c6934d62a3f9c73885d937a5fcce13eda5f8f))


### Bug Fixes

* correct test environment variable priority in web app ([#360](https://github.com/uspark-hq/uspark/issues/360)) ([5bcdaaa](https://github.com/uspark-hq/uspark/commit/5bcdaaa7cb1dfa63a2a04444bdacf38f939358fb))

## [0.28.1](https://github.com/uspark-hq/uspark/compare/web-v0.28.0...web-v0.28.1) (2025-09-22)

### Bug Fixes

- require CLAUDE_TOKEN_ENCRYPTION_KEY env var and update workflows ([#354](https://github.com/uspark-hq/uspark/issues/354)) ([d63bc90](https://github.com/uspark-hq/uspark/commit/d63bc90707bcd0241bde9aa26ca3a04a6e00a8b9))

## [0.28.0](https://github.com/uspark-hq/uspark/compare/web-v0.27.0...web-v0.28.0) (2025-09-22)

### Features

- implement claude oauth token storage for e2b execution ([#347](https://github.com/uspark-hq/uspark/issues/347)) ([a40a280](https://github.com/uspark-hq/uspark/commit/a40a280bbd1dc081d2fe42b1aa4e6475e32b8e8d))

### Bug Fixes

- cli e2e authentication path issue in github actions ([#351](https://github.com/uspark-hq/uspark/issues/351)) ([906a8ec](https://github.com/uspark-hq/uspark/commit/906a8ecb0a2b97c6d31a27cdb155c2e7aa85b63d))

## [0.27.0](https://github.com/uspark-hq/uspark/compare/web-v0.26.2...web-v0.27.0) (2025-09-20)

### Features

- implement vercel blob client token upload for CLI ([#343](https://github.com/uspark-hq/uspark/issues/343)) ([0c89919](https://github.com/uspark-hq/uspark/commit/0c89919e38add1c7610575991eb5b2e4e49407c9))

## [0.26.2](https://github.com/uspark-hq/uspark/compare/web-v0.26.1...web-v0.26.2) (2025-09-20)

### Bug Fixes

- remove console.error + throw anti-pattern ([#337](https://github.com/uspark-hq/uspark/issues/337)) ([ea3687c](https://github.com/uspark-hq/uspark/commit/ea3687cad315b0f0aef85e40818bd83d29dd5647))
- replace fetch mock with MSW in route.test.ts ([#339](https://github.com/uspark-hq/uspark/issues/339)) ([8543548](https://github.com/uspark-hq/uspark/commit/85435484643d5fa9920818d90aaa3a325d643442))

## [0.26.1](https://github.com/uspark-hq/uspark/compare/web-v0.26.0...web-v0.26.1) (2025-09-20)

### Bug Fixes

- replace mock file content with real content from YJS and blob storage ([#333](https://github.com/uspark-hq/uspark/issues/333)) ([ac288bd](https://github.com/uspark-hq/uspark/commit/ac288bd7a743c1457b23558e65833fad0def15b9))

## [0.26.0](https://github.com/uspark-hq/uspark/compare/web-v0.25.0...web-v0.26.0) (2025-09-20)

### Features

- update landing page to align with MVP specification and product positioning ([#328](https://github.com/uspark-hq/uspark/issues/328)) ([958e734](https://github.com/uspark-hq/uspark/commit/958e734186fd526c29304bc7fe0d7cca11cfb913))

### Bug Fixes

- add cli token authentication support to blob-token and project apis ([#329](https://github.com/uspark-hq/uspark/issues/329)) ([ca7e4d3](https://github.com/uspark-hq/uspark/commit/ca7e4d30a3c5473c17dfad20f8109a3d58d2e444))

## [0.25.0](https://github.com/uspark-hq/uspark/compare/web-v0.24.0...web-v0.25.0) (2025-09-20)

### Features

- add frontend chat interface with interruption and error handling ([#312](https://github.com/uspark-hq/uspark/issues/312)) ([fac8e49](https://github.com/uspark-hq/uspark/commit/fac8e4939ba553f270ee1bfde33b8830b3de98f6))
- implement simplified long polling for real-time session updates ([#320](https://github.com/uspark-hq/uspark/issues/320)) ([2f01238](https://github.com/uspark-hq/uspark/commit/2f0123867318a69fd926d8ff69cbcc98e1423d3c))
- integrate yjs filesystem with mock-execute and enable real-time file synchronization ([#315](https://github.com/uspark-hq/uspark/issues/315)) ([08e45bf](https://github.com/uspark-hq/uspark/commit/08e45bf67d727267397fb222819c1bd4e292da4a))

### Bug Fixes

- apply prettier formatting to test files ([#327](https://github.com/uspark-hq/uspark/issues/327)) ([4e5b592](https://github.com/uspark-hq/uspark/commit/4e5b592203723568567de0223ac42439ac73c2e1))
- cli authentication and ydoc sync issues ([#321](https://github.com/uspark-hq/uspark/issues/321)) ([e474fe1](https://github.com/uspark-hq/uspark/commit/e474fe14eee09265d222b8685cda82e3a83582c6))
- format ([#324](https://github.com/uspark-hq/uspark/issues/324)) ([b2f2d6f](https://github.com/uspark-hq/uspark/commit/b2f2d6fbb5838493b8812359bacb04c32bbbc97f))
- resolve test memory leaks and failures by removing fetch mocks ([#326](https://github.com/uspark-hq/uspark/issues/326)) ([ede6fb8](https://github.com/uspark-hq/uspark/commit/ede6fb8837f113bfb1c167f009b57a18ba2c82b9))
- resolve timeout cleanup issue causing test failures ([#318](https://github.com/uspark-hq/uspark/issues/318)) ([5f8225e](https://github.com/uspark-hq/uspark/commit/5f8225e2a62626aed532e9b240bb7625dae141b7))
- use correct GitHub API endpoint for installation details ([#313](https://github.com/uspark-hq/uspark/issues/313)) ([f5e787a](https://github.com/uspark-hq/uspark/commit/f5e787a39394dcb28da5161196f5287662638bfb))

## [0.24.0](https://github.com/uspark-hq/uspark/compare/web-v0.23.0...web-v0.24.0) (2025-09-18)

### Features

- add mock claude executor for testing execution flow ([#309](https://github.com/uspark-hq/uspark/issues/309)) ([515860a](https://github.com/uspark-hq/uspark/commit/515860a95f11a1434293b418f1bcbc23d0822347))

### Bug Fixes

- add detailed error logging for github repository creation ([#311](https://github.com/uspark-hq/uspark/issues/311)) ([efac93d](https://github.com/uspark-hq/uspark/commit/efac93de4afa86d52764c0dd1f2c314dc562a252))

## [0.23.0](https://github.com/uspark-hq/uspark/compare/web-v0.22.4...web-v0.23.0) (2025-09-18)

### Features

- implement session API endpoints for claude execution ([#305](https://github.com/uspark-hq/uspark/issues/305)) ([a6d02af](https://github.com/uspark-hq/uspark/commit/a6d02af8e4e4d1316aa7402e20f3beea3d6c92e3))

## [0.22.4](https://github.com/uspark-hq/uspark/compare/web-v0.22.3...web-v0.22.4) (2025-09-15)

### Bug Fixes

- resolve test failures from environment setup and React imports ([#297](https://github.com/uspark-hq/uspark/issues/297)) ([1c3bb7a](https://github.com/uspark-hq/uspark/commit/1c3bb7adee1da8bf29e88aa4fedab9969b3f5639))
- use correct GitHub API endpoint for repository creation based on account type ([#291](https://github.com/uspark-hq/uspark/issues/291)) ([3744acc](https://github.com/uspark-hq/uspark/commit/3744accac93285361d795a9188814dd1dc9c8e7f))

## [0.22.3](https://github.com/uspark-hq/uspark/compare/web-v0.22.2...web-v0.22.3) (2025-09-14)

### Bug Fixes

- resolve flaky test in /api/claude/turns route ([#289](https://github.com/uspark-hq/uspark/issues/289)) ([90fb5f9](https://github.com/uspark-hq/uspark/commit/90fb5f93652ce181613a0bd8bb5a60d4303f8359))

## [0.22.2](https://github.com/uspark-hq/uspark/compare/web-v0.22.1...web-v0.22.2) (2025-09-14)

### Bug Fixes

- decode base64 encoded github app private key ([#287](https://github.com/uspark-hq/uspark/issues/287)) ([b8e7259](https://github.com/uspark-hq/uspark/commit/b8e7259ab5d759135ff9f9bdb2e641d87ef34b30))

## [0.22.1](https://github.com/uspark-hq/uspark/compare/web-v0.22.0...web-v0.22.1) (2025-09-14)

### Bug Fixes

- enable auth protection in middleware to redirect unauthorized users to login ([#285](https://github.com/uspark-hq/uspark/issues/285)) ([6130fc3](https://github.com/uspark-hq/uspark/commit/6130fc3a508357a19b0dc86e12d2f4f0e356e73a))
- resolve github integration management link and repository linking issues ([#284](https://github.com/uspark-hq/uspark/issues/284)) ([16a8908](https://github.com/uspark-hq/uspark/commit/16a8908eeaff7edd03589168338c04d1677f78d9))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.12.1

## [0.22.0](https://github.com/uspark-hq/uspark/compare/web-v0.21.0...web-v0.22.0) (2025-09-13)

### Features

- implement claude sessions and turns api endpoints ([#279](https://github.com/uspark-hq/uspark/issues/279)) ([6d692cd](https://github.com/uspark-hq/uspark/commit/6d692cd248846364f7e3fb0e32afa18a649b2154))

## [0.21.0](https://github.com/uspark-hq/uspark/compare/web-v0.20.0...web-v0.21.0) (2025-09-13)

### Features

- add local development proxy with caddy and update domain urls ([#269](https://github.com/uspark-hq/uspark/issues/269)) ([fc304d9](https://github.com/uspark-hq/uspark/commit/fc304d9b0c9481ff174279d464596ee7fb36b0f4))
- implement github settings ui component (task 7) ([#267](https://github.com/uspark-hq/uspark/issues/267)) ([a0f27c9](https://github.com/uspark-hq/uspark/commit/a0f27c9ecc4033ed08209ca568027263b4208737))

### Bug Fixes

- remove broad try-catch block from github sync function ([#271](https://github.com/uspark-hq/uspark/issues/271)) ([ae37307](https://github.com/uspark-hq/uspark/commit/ae3730749031c4c52bf9a645bd6cb61cfb74758c))
- resolve timer cleanup issue in github sync button ([#270](https://github.com/uspark-hq/uspark/issues/270)) ([dfa9311](https://github.com/uspark-hq/uspark/commit/dfa9311ef23899950151ef7a20140de19ec79fa3))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.12.0

## [0.20.0](https://github.com/uspark-hq/uspark/compare/web-v0.19.0...web-v0.20.0) (2025-09-12)

### Features

- implement web to github content sync mechanism (task 6) ([#255](https://github.com/uspark-hq/uspark/issues/255)) ([5744c7c](https://github.com/uspark-hq/uspark/commit/5744c7c039128baf9047669e2711aa2757544ff4))

### Bug Fixes

- remove typescript any type violations in projects page ([#257](https://github.com/uspark-hq/uspark/issues/257)) ([deefd95](https://github.com/uspark-hq/uspark/commit/deefd957ccd62f56d02b049a949e40a35f40bfb3))

## [0.19.0](https://github.com/uspark-hq/uspark/compare/web-v0.18.0...web-v0.19.0) (2025-09-12)

### Features

- add authentication and fetch signals for workspace app ([#248](https://github.com/uspark-hq/uspark/issues/248)) ([f3bca17](https://github.com/uspark-hq/uspark/commit/f3bca17b8ad8b8c8d086974c44741f16fa3ad724))
- implement github app installation token management (task 4) ([#250](https://github.com/uspark-hq/uspark/issues/250)) ([2f89326](https://github.com/uspark-hq/uspark/commit/2f89326cab93719621705cf5bae0f63756b5ea2e))
- implement github repository creation and management (task 5) ([#252](https://github.com/uspark-hq/uspark/issues/252)) ([3640aa8](https://github.com/uspark-hq/uspark/commit/3640aa8dcd9229e3d61fdcbd123203d79e50a186))

### Bug Fixes

- implement unique user IDs for database test isolation ([#261](https://github.com/uspark-hq/uspark/issues/261)) ([4089c6b](https://github.com/uspark-hq/uspark/commit/4089c6b4558c235f5d989d28ff3e3a844a0020c3))
- replace hardcoded url with env.app_url in device auth ([#259](https://github.com/uspark-hq/uspark/issues/259)) ([ba94a73](https://github.com/uspark-hq/uspark/commit/ba94a73d6909505c4ef1e929fdba51f47ded6b9e))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.11.0

## [0.18.0](https://github.com/uspark-hq/uspark/compare/web-v0.17.1...web-v0.18.0) (2025-09-12)

### Features

- add comprehensive api constraints for all routes ([#222](https://github.com/uspark-hq/uspark/issues/222)) ([55cad60](https://github.com/uspark-hq/uspark/commit/55cad6022f8f08e6276dab316b51cf1995830c7f))
- add contract-fetch utility for type-safe API calls ([#240](https://github.com/uspark-hq/uspark/issues/240)) ([5addbbc](https://github.com/uspark-hq/uspark/commit/5addbbcfdc4986870ba4c94c2218d808063de96c))
- add github app setup and dependencies (task 1) ([#241](https://github.com/uspark-hq/uspark/issues/241)) ([3200688](https://github.com/uspark-hq/uspark/commit/32006884d0e7f43f606c4002927ade9b3af7e92a))
- add github database schema (task 2) ([#243](https://github.com/uspark-hq/uspark/issues/243)) ([b9638b3](https://github.com/uspark-hq/uspark/commit/b9638b36dd02b8dd833454d33ff42a37bee23927))
- add shadcn/ui component library to packages/ui ([#238](https://github.com/uspark-hq/uspark/issues/238)) ([1e91c40](https://github.com/uspark-hq/uspark/commit/1e91c40c886361662dda6400fd74bc994d1189f0))
- implement github app installation flow (task 3) ([#244](https://github.com/uspark-hq/uspark/issues/244)) ([57b1757](https://github.com/uspark-hq/uspark/commit/57b175714bbb9d003aab635877e8262b66ee024d))
- replace native html elements with shadcn/ui components ([#242](https://github.com/uspark-hq/uspark/issues/242)) ([1ba085d](https://github.com/uspark-hq/uspark/commit/1ba085d84a32e238bea6e4ef4c09942c23c86d6e))

### Bug Fixes

- migrate projects page to real api and fix all typescript test errors ([#216](https://github.com/uspark-hq/uspark/issues/216)) ([82c458e](https://github.com/uspark-hq/uspark/commit/82c458e270d3f0f87d92c0b93e3971fd5ebab9e9))
- remove artificial delays and timestamp tests from test files ([#221](https://github.com/uspark-hq/uspark/issues/221)) ([fe46879](https://github.com/uspark-hq/uspark/commit/fe46879319ac5e2b4d6c196acc378e913b9ec9a2))
- update domain from uspark.dev to uspark.ai and add centralized URL config ([#223](https://github.com/uspark-hq/uspark/issues/223)) ([87bb41f](https://github.com/uspark-hq/uspark/commit/87bb41fde1602a8d6111d6f4e5f954684a42cbcd))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.10.0

## [0.17.1](https://github.com/uspark-hq/uspark/compare/web-v0.17.0...web-v0.17.1) (2025-09-08)

### Bug Fixes

- install claude-code cli properly in e2b dockerfile ([#214](https://github.com/uspark-hq/uspark/issues/214)) ([7f9e068](https://github.com/uspark-hq/uspark/commit/7f9e068c9effb246dc6d7c28ed52c6debd62f28f))

## [0.17.0](https://github.com/uspark-hq/uspark/compare/web-v0.16.0...web-v0.17.0) (2025-09-08)

### Features

- add E2B API key to deployment workflows ([#209](https://github.com/uspark-hq/uspark/issues/209)) ([bf3fd21](https://github.com/uspark-hq/uspark/commit/bf3fd212e6c755081762b2ad490c1981d407b885))
- redesign homepage based on Product Hunt landing page insights ([#206](https://github.com/uspark-hq/uspark/issues/206)) ([b2428f7](https://github.com/uspark-hq/uspark/commit/b2428f7429dea786cc773969920339bf74aaa8ee))

### Bug Fixes

- align animated demo content to left for better visual consistency ([#211](https://github.com/uspark-hq/uspark/issues/211)) ([4a2cc72](https://github.com/uspark-hq/uspark/commit/4a2cc72bb29256dde9d649ff8524e257d1eaf7b9))
- update all urls from app.uspark.com to uspark.ai ([#208](https://github.com/uspark-hq/uspark/issues/208)) ([5f50e4b](https://github.com/uspark-hq/uspark/commit/5f50e4b3588569d0000fd2873569d1780c4cfab5))

## [0.16.0](https://github.com/uspark-hq/uspark/compare/web-v0.15.0...web-v0.16.0) (2025-09-08)

### Features

- implement share management functionality ([#173](https://github.com/uspark-hq/uspark/issues/173)) ([36dd0e4](https://github.com/uspark-hq/uspark/commit/36dd0e4d688fd002bbb67a5a98a4318f5496ed78))

## [0.15.0](https://github.com/uspark-hq/uspark/compare/web-v0.14.0...web-v0.15.0) (2025-09-07)

### Features

- update claude workflow to use project toolchain container ([#192](https://github.com/uspark-hq/uspark/issues/192)) ([33a0991](https://github.com/uspark-hq/uspark/commit/33a0991aed4ce2ad3b08e3ead71df28a653a2ab1))

## [0.14.0](https://github.com/uspark-hq/uspark/compare/web-v0.13.0...web-v0.14.0) (2025-09-06)

### Features

- implement claude session management system ([#175](https://github.com/uspark-hq/uspark/issues/175)) ([4685547](https://github.com/uspark-hq/uspark/commit/4685547f5b7368655ec11ce73219fb01c2f2617d))
- implement complete document share management system ([#171](https://github.com/uspark-hq/uspark/issues/171)) ([d50b99c](https://github.com/uspark-hq/uspark/commit/d50b99c6a64706793c6802a98d88c4bef8eaabbe))
- implement complete document share management system ([#185](https://github.com/uspark-hq/uspark/issues/185)) ([4ade8bc](https://github.com/uspark-hq/uspark/commit/4ade8bca9ff5f97c7bce3b848742288bb0890ce2))

### Bug Fixes

- correct technical debt cleanup keeping ts-rest/core ([#177](https://github.com/uspark-hq/uspark/issues/177)) ([87c676f](https://github.com/uspark-hq/uspark/commit/87c676f57a5a5c51ceb22d7f9d2600e521f6518c))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.9.2

## [0.13.0](https://github.com/uspark-hq/uspark/compare/web-v0.12.0...web-v0.13.0) (2025-09-05)

### Features

- implement blob storage security with project isolation ([#159](https://github.com/uspark-hq/uspark/issues/159)) ([ea6c094](https://github.com/uspark-hq/uspark/commit/ea6c0945c39b908666a176c8d3385e6b76b580ef))

## [0.12.0](https://github.com/uspark-hq/uspark/compare/web-v0.11.1...web-v0.12.0) (2025-09-05)

### Features

- **cli:** enhance push command with batch upload support ([#113](https://github.com/uspark-hq/uspark/issues/113)) ([be8f842](https://github.com/uspark-hq/uspark/commit/be8f842929d1c2f8cd45073083f92a159ec8be88))

## [0.11.1](https://github.com/uspark-hq/uspark/compare/web-v0.11.0...web-v0.11.1) (2025-09-05)

### Bug Fixes

- replace hardcoded delay with dynamic polling interval in cli auth ([#132](https://github.com/uspark-hq/uspark/issues/132)) ([e5a6aed](https://github.com/uspark-hq/uspark/commit/e5a6aeda27cdf0678c0dc56ce4c16435621d1c47))
- replace hardcoded userId with Clerk authentication in project API ([#131](https://github.com/uspark-hq/uspark/issues/131)) ([12dcb26](https://github.com/uspark-hq/uspark/commit/12dcb261180fc424afbf67c6c0efcc77da4c45bd))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.9.1

## [0.11.0](https://github.com/uspark-hq/uspark/compare/web-v0.10.0...web-v0.11.0) (2025-09-04)

### Features

- add agent_sessions and share_links database tables ([#102](https://github.com/uspark-hq/uspark/issues/102)) ([7799ed0](https://github.com/uspark-hq/uspark/commit/7799ed070cfbfd1834cedf3aa4f8f2109e24bc7c))
- add cli token management page ([#103](https://github.com/uspark-hq/uspark/issues/103)) ([ca4cd76](https://github.com/uspark-hq/uspark/commit/ca4cd76b54435d6f6145c48e34ad7cad019a6178))
- implement document sharing apis with single-file support ([#101](https://github.com/uspark-hq/uspark/issues/101)) ([8b39a74](https://github.com/uspark-hq/uspark/commit/8b39a74c78858480a09b55873fc2313c0ed27900))
- implement file explorer component with YJS integration ([#107](https://github.com/uspark-hq/uspark/issues/107)) ([9b8f8ed](https://github.com/uspark-hq/uspark/commit/9b8f8ed515fc943d989ed66d256a096293f073e3))
- implement project management apis with client-side file parsing ([#99](https://github.com/uspark-hq/uspark/issues/99)) ([f5aef77](https://github.com/uspark-hq/uspark/commit/f5aef7756b699ef3c4c69b422fb8fab093fa5012))
- implement public document share viewer page ([#106](https://github.com/uspark-hq/uspark/issues/106)) ([41e4ac8](https://github.com/uspark-hq/uspark/commit/41e4ac84f76c49aa780f7b5b4ead52dc4a820e6d))

### Bug Fixes

- improve test stability by fixing cleanup and assertions ([#124](https://github.com/uspark-hq/uspark/issues/124)) ([39488b8](https://github.com/uspark-hq/uspark/commit/39488b8465a9b835485c2798cb73591fc07ff28d))
- remove hardcoded delays from production code and tests ([#117](https://github.com/uspark-hq/uspark/issues/117)) ([a1ef57b](https://github.com/uspark-hq/uspark/commit/a1ef57befdd10f3a2006e9f136a9195938d84a1b))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.9.0

## [0.10.0](https://github.com/uspark-hq/uspark/compare/web-v0.9.0...web-v0.10.0) (2025-09-04)

### Features

- add cli authentication with device flow ([#89](https://github.com/uspark-hq/uspark/issues/89)) ([2ebb970](https://github.com/uspark-hq/uspark/commit/2ebb970b11e303d45a2968839f9e7c05a0ca5e04))
- add vercel blob storage implementation with content-addressed deduplication ([#80](https://github.com/uspark-hq/uspark/issues/80)) ([e500dec](https://github.com/uspark-hq/uspark/commit/e500decc9c8c07fa8eb07aa1676e76c454e33c90))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.8.0

## [0.9.0](https://github.com/uspark-hq/uspark/compare/web-v0.8.0...web-v0.9.0) (2025-09-03)

### Features

- remove polling interval from cli auth flow ([#83](https://github.com/uspark-hq/uspark/issues/83)) ([f98a617](https://github.com/uspark-hq/uspark/commit/f98a6177a457cabd70373896ce5e8302beb7eae6))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.7.0

## [0.8.0](https://github.com/uspark-hq/uspark/compare/web-v0.7.0...web-v0.8.0) (2025-09-03)

### Features

- implement ydoc-based project sync api with get/patch endpoints ([#81](https://github.com/uspark-hq/uspark/issues/81)) ([1c0cc03](https://github.com/uspark-hq/uspark/commit/1c0cc03029ff94304590d0be467b0152f0688c3e))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.6.0

## [0.7.0](https://github.com/uspark-hq/uspark/compare/web-v0.6.0...web-v0.7.0) (2025-09-03)

### Features

- add beautiful ai tool waiting list landing page for uspark ([#73](https://github.com/uspark-hq/uspark/issues/73)) ([3f4c173](https://github.com/uspark-hq/uspark/commit/3f4c173578f310f0b0fc2547fa71732e6d77c975))

## [0.6.0](https://github.com/uspark-hq/uspark/compare/web-v0.5.0...web-v0.6.0) (2025-09-03)

### Features

- add clerk sign-in and sign-up pages for cli authentication ([#56](https://github.com/uspark-hq/uspark/issues/56)) ([ce9c4c7](https://github.com/uspark-hq/uspark/commit/ce9c4c731a9f51806d7a0a17284b64c36fd8b383))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.5.0

## [0.5.0](https://github.com/uspark-hq/uspark/compare/web-v0.4.0...web-v0.5.0) (2025-09-02)

### Features

- implement cli authentication web ui ([#48](https://github.com/uspark-hq/uspark/issues/48)) ([e0d067e](https://github.com/uspark-hq/uspark/commit/e0d067e3ae9a7f8e634064c0458fdf0834be5925))

## [0.4.0](https://github.com/uspark-hq/uspark/compare/web-v0.3.0...web-v0.4.0) (2025-09-02)

### Features

- implement cli auth token exchange api ([#42](https://github.com/uspark-hq/uspark/issues/42)) ([d0b4321](https://github.com/uspark-hq/uspark/commit/d0b4321cc9a513ee6e4dddf3c9b6559771354464))
- implement cli token generation api endpoint ([#45](https://github.com/uspark-hq/uspark/issues/45)) ([862c53d](https://github.com/uspark-hq/uspark/commit/862c53da230adc5aa6df545d62cb573ee00219b4))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.4.0

## [0.3.0](https://github.com/uspark-hq/uspark/compare/web-v0.2.4...web-v0.3.0) (2025-09-02)

### Features

- implement cli auth device code api with tdd approach ([#25](https://github.com/uspark-hq/uspark/issues/25)) ([224c386](https://github.com/uspark-hq/uspark/commit/224c386b22f5fff16c926cf06f1617032a616e40))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.3.0

## [0.2.4](https://github.com/uspark-hq/uspark/compare/web-v0.2.3...web-v0.2.4) (2025-09-01)

### Bug Fixes

- use process.env directly for database config in build scripts ([#13](https://github.com/uspark-hq/uspark/issues/13)) ([2a5e373](https://github.com/uspark-hq/uspark/commit/2a5e3733e8337f9e86324afbb65c947605bb5860))

## [0.2.3](https://github.com/uspark-hq/uspark/compare/web-v0.2.2...web-v0.2.3) (2025-09-01)

### Bug Fixes

- add build-time environment variables for vercel deployment ([#12](https://github.com/uspark-hq/uspark/issues/12)) ([ce55047](https://github.com/uspark-hq/uspark/commit/ce5504708ea5debcdc92b051307a68e08a494777))
- correct release-please output format for monorepo packages ([#9](https://github.com/uspark-hq/uspark/issues/9)) ([9a941a9](https://github.com/uspark-hq/uspark/commit/9a941a9b78654a2f9df8410506e2583c8a63ae96))

## [0.2.2](https://github.com/uspark-hq/uspark/compare/web-v0.2.1...web-v0.2.2) (2025-08-31)

### Bug Fixes

- update package names from makita to uspark and fix deployment paths ([#7](https://github.com/uspark-hq/uspark/issues/7)) ([9f726a0](https://github.com/uspark-hq/uspark/commit/9f726a0fa74984124a1670ac91bf845db969a1cc))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.2.1

## [0.2.1](https://github.com/uspark-hq/uspark/compare/web-v0.2.0...web-v0.2.1) (2025-08-31)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.2.0

## [0.2.0](https://github.com/uspark-hq/uspark/compare/web-v0.1.0...web-v0.2.0) (2025-08-31)

### Features

- add clerk authentication with environment-based configuration ([#3](https://github.com/uspark-hq/uspark/issues/3)) ([ec5fcb6](https://github.com/uspark-hq/uspark/commit/ec5fcb607f9f9bc5de863a54705908f98402cd3a))

## [0.1.0](https://github.com/uspark-hq/uspark/compare/web-v0.0.1...web-v0.1.0) (2025-08-30)

### Features

- add database migration support with postgres driver ([#24](https://github.com/uspark-hq/uspark/issues/24)) ([3760efa](https://github.com/uspark-hq/uspark/commit/3760efae5a3cb47a6dfa56e13507dcddb58b92b6))
- add t3-env for type-safe environment variable validation ([#5](https://github.com/uspark-hq/uspark/issues/5)) ([10ac6ab](https://github.com/uspark-hq/uspark/commit/10ac6ab67e654b6fa8aeef8e6c63649f003f5656))
- implement centralized API contract system ([#13](https://github.com/uspark-hq/uspark/issues/13)) ([77bbbd9](https://github.com/uspark-hq/uspark/commit/77bbbd913b52341a7720e9bb711d889253d9681a))
- implement lightweight service container for dependency management ([#18](https://github.com/uspark-hq/uspark/issues/18)) ([ce6efe9](https://github.com/uspark-hq/uspark/commit/ce6efe9df914c0e2bc8de3ccc7a0af114a2b4037))
- initial commit - app template with turborepo monorepo structure ([4123914](https://github.com/uspark-hq/uspark/commit/41239143cdaea284f55a02c89fde348c2e3b53ff))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @uspark/core bumped to 0.1.0
