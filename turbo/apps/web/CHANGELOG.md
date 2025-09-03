# Changelog

## [0.8.0](https://github.com/uspark-hq/uspark/compare/web-v0.7.0...web-v0.8.0) (2025-09-03)


### Features

* implement ydoc-based project sync api with get/patch endpoints ([#81](https://github.com/uspark-hq/uspark/issues/81)) ([1c0cc03](https://github.com/uspark-hq/uspark/commit/1c0cc03029ff94304590d0be467b0152f0688c3e))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.6.0

## [0.7.0](https://github.com/uspark-hq/uspark/compare/web-v0.6.0...web-v0.7.0) (2025-09-03)


### Features

* add beautiful ai tool waiting list landing page for uspark ([#73](https://github.com/uspark-hq/uspark/issues/73)) ([3f4c173](https://github.com/uspark-hq/uspark/commit/3f4c173578f310f0b0fc2547fa71732e6d77c975))

## [0.6.0](https://github.com/uspark-hq/uspark/compare/web-v0.5.0...web-v0.6.0) (2025-09-03)


### Features

* add clerk sign-in and sign-up pages for cli authentication ([#56](https://github.com/uspark-hq/uspark/issues/56)) ([ce9c4c7](https://github.com/uspark-hq/uspark/commit/ce9c4c731a9f51806d7a0a17284b64c36fd8b383))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.5.0

## [0.5.0](https://github.com/uspark-hq/uspark/compare/web-v0.4.0...web-v0.5.0) (2025-09-02)


### Features

* implement cli authentication web ui ([#48](https://github.com/uspark-hq/uspark/issues/48)) ([e0d067e](https://github.com/uspark-hq/uspark/commit/e0d067e3ae9a7f8e634064c0458fdf0834be5925))

## [0.4.0](https://github.com/uspark-hq/uspark/compare/web-v0.3.0...web-v0.4.0) (2025-09-02)


### Features

* implement cli auth token exchange api ([#42](https://github.com/uspark-hq/uspark/issues/42)) ([d0b4321](https://github.com/uspark-hq/uspark/commit/d0b4321cc9a513ee6e4dddf3c9b6559771354464))
* implement cli token generation api endpoint ([#45](https://github.com/uspark-hq/uspark/issues/45)) ([862c53d](https://github.com/uspark-hq/uspark/commit/862c53da230adc5aa6df545d62cb573ee00219b4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.4.0

## [0.3.0](https://github.com/uspark-hq/uspark/compare/web-v0.2.4...web-v0.3.0) (2025-09-02)


### Features

* implement cli auth device code api with tdd approach ([#25](https://github.com/uspark-hq/uspark/issues/25)) ([224c386](https://github.com/uspark-hq/uspark/commit/224c386b22f5fff16c926cf06f1617032a616e40))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.3.0

## [0.2.4](https://github.com/uspark-hq/uspark/compare/web-v0.2.3...web-v0.2.4) (2025-09-01)


### Bug Fixes

* use process.env directly for database config in build scripts ([#13](https://github.com/uspark-hq/uspark/issues/13)) ([2a5e373](https://github.com/uspark-hq/uspark/commit/2a5e3733e8337f9e86324afbb65c947605bb5860))

## [0.2.3](https://github.com/uspark-hq/uspark/compare/web-v0.2.2...web-v0.2.3) (2025-09-01)


### Bug Fixes

* add build-time environment variables for vercel deployment ([#12](https://github.com/uspark-hq/uspark/issues/12)) ([ce55047](https://github.com/uspark-hq/uspark/commit/ce5504708ea5debcdc92b051307a68e08a494777))
* correct release-please output format for monorepo packages ([#9](https://github.com/uspark-hq/uspark/issues/9)) ([9a941a9](https://github.com/uspark-hq/uspark/commit/9a941a9b78654a2f9df8410506e2583c8a63ae96))

## [0.2.2](https://github.com/uspark-hq/uspark/compare/web-v0.2.1...web-v0.2.2) (2025-08-31)


### Bug Fixes

* update package names from makita to uspark and fix deployment paths ([#7](https://github.com/uspark-hq/uspark/issues/7)) ([9f726a0](https://github.com/uspark-hq/uspark/commit/9f726a0fa74984124a1670ac91bf845db969a1cc))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.2.1

## [0.2.1](https://github.com/uspark-hq/uspark/compare/web-v0.2.0...web-v0.2.1) (2025-08-31)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.2.0

## [0.2.0](https://github.com/uspark-hq/uspark/compare/web-v0.1.0...web-v0.2.0) (2025-08-31)


### Features

* add clerk authentication with environment-based configuration ([#3](https://github.com/uspark-hq/uspark/issues/3)) ([ec5fcb6](https://github.com/uspark-hq/uspark/commit/ec5fcb607f9f9bc5de863a54705908f98402cd3a))

## [0.1.0](https://github.com/uspark-hq/uspark/compare/web-v0.0.1...web-v0.1.0) (2025-08-30)


### Features

* add database migration support with postgres driver ([#24](https://github.com/uspark-hq/uspark/issues/24)) ([3760efa](https://github.com/uspark-hq/uspark/commit/3760efae5a3cb47a6dfa56e13507dcddb58b92b6))
* add t3-env for type-safe environment variable validation ([#5](https://github.com/uspark-hq/uspark/issues/5)) ([10ac6ab](https://github.com/uspark-hq/uspark/commit/10ac6ab67e654b6fa8aeef8e6c63649f003f5656))
* implement centralized API contract system ([#13](https://github.com/uspark-hq/uspark/issues/13)) ([77bbbd9](https://github.com/uspark-hq/uspark/commit/77bbbd913b52341a7720e9bb711d889253d9681a))
* implement lightweight service container for dependency management ([#18](https://github.com/uspark-hq/uspark/issues/18)) ([ce6efe9](https://github.com/uspark-hq/uspark/commit/ce6efe9df914c0e2bc8de3ccc7a0af114a2b4037))
* initial commit - app template with turborepo monorepo structure ([4123914](https://github.com/uspark-hq/uspark/commit/41239143cdaea284f55a02c89fde348c2e3b53ff))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.1.0
