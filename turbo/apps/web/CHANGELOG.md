# Changelog

## [0.12.0](https://github.com/uspark-hq/uspark/compare/web-v0.11.1...web-v0.12.0) (2025-09-05)


### Features

* **cli:** enhance push command with batch upload support ([#113](https://github.com/uspark-hq/uspark/issues/113)) ([be8f842](https://github.com/uspark-hq/uspark/commit/be8f842929d1c2f8cd45073083f92a159ec8be88))

## [0.11.1](https://github.com/uspark-hq/uspark/compare/web-v0.11.0...web-v0.11.1) (2025-09-05)


### Bug Fixes

* replace hardcoded delay with dynamic polling interval in cli auth ([#132](https://github.com/uspark-hq/uspark/issues/132)) ([e5a6aed](https://github.com/uspark-hq/uspark/commit/e5a6aeda27cdf0678c0dc56ce4c16435621d1c47))
* replace hardcoded userId with Clerk authentication in project API ([#131](https://github.com/uspark-hq/uspark/issues/131)) ([12dcb26](https://github.com/uspark-hq/uspark/commit/12dcb261180fc424afbf67c6c0efcc77da4c45bd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.9.1

## [0.11.0](https://github.com/uspark-hq/uspark/compare/web-v0.10.0...web-v0.11.0) (2025-09-04)


### Features

* add agent_sessions and share_links database tables ([#102](https://github.com/uspark-hq/uspark/issues/102)) ([7799ed0](https://github.com/uspark-hq/uspark/commit/7799ed070cfbfd1834cedf3aa4f8f2109e24bc7c))
* add cli token management page ([#103](https://github.com/uspark-hq/uspark/issues/103)) ([ca4cd76](https://github.com/uspark-hq/uspark/commit/ca4cd76b54435d6f6145c48e34ad7cad019a6178))
* implement document sharing apis with single-file support ([#101](https://github.com/uspark-hq/uspark/issues/101)) ([8b39a74](https://github.com/uspark-hq/uspark/commit/8b39a74c78858480a09b55873fc2313c0ed27900))
* implement file explorer component with YJS integration ([#107](https://github.com/uspark-hq/uspark/issues/107)) ([9b8f8ed](https://github.com/uspark-hq/uspark/commit/9b8f8ed515fc943d989ed66d256a096293f073e3))
* implement project management apis with client-side file parsing ([#99](https://github.com/uspark-hq/uspark/issues/99)) ([f5aef77](https://github.com/uspark-hq/uspark/commit/f5aef7756b699ef3c4c69b422fb8fab093fa5012))
* implement public document share viewer page ([#106](https://github.com/uspark-hq/uspark/issues/106)) ([41e4ac8](https://github.com/uspark-hq/uspark/commit/41e4ac84f76c49aa780f7b5b4ead52dc4a820e6d))


### Bug Fixes

* improve test stability by fixing cleanup and assertions ([#124](https://github.com/uspark-hq/uspark/issues/124)) ([39488b8](https://github.com/uspark-hq/uspark/commit/39488b8465a9b835485c2798cb73591fc07ff28d))
* remove hardcoded delays from production code and tests ([#117](https://github.com/uspark-hq/uspark/issues/117)) ([a1ef57b](https://github.com/uspark-hq/uspark/commit/a1ef57befdd10f3a2006e9f136a9195938d84a1b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.9.0

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
