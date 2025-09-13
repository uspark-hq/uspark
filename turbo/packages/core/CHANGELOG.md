# Changelog

## [0.12.0](https://github.com/uspark-hq/uspark/compare/core-v0.11.0...core-v0.12.0) (2025-09-13)


### Features

* add local development proxy with caddy and update domain urls ([#269](https://github.com/uspark-hq/uspark/issues/269)) ([fc304d9](https://github.com/uspark-hq/uspark/commit/fc304d9b0c9481ff174279d464596ee7fb36b0f4))

## [0.11.0](https://github.com/uspark-hq/uspark/compare/core-v0.10.0...core-v0.11.0) (2025-09-12)


### Features

* add custom fetch support to contractfetch and integrate with workspace ([#254](https://github.com/uspark-hq/uspark/issues/254)) ([55d9520](https://github.com/uspark-hq/uspark/commit/55d9520e008de21e021fb4a8affb0963e59174fa))

## [0.10.0](https://github.com/uspark-hq/uspark/compare/core-v0.9.2...core-v0.10.0) (2025-09-12)


### Features

* add comprehensive api constraints for all routes ([#222](https://github.com/uspark-hq/uspark/issues/222)) ([55cad60](https://github.com/uspark-hq/uspark/commit/55cad6022f8f08e6276dab316b51cf1995830c7f))
* add contract-fetch utility for type-safe API calls ([#240](https://github.com/uspark-hq/uspark/issues/240)) ([5addbbc](https://github.com/uspark-hq/uspark/commit/5addbbcfdc4986870ba4c94c2218d808063de96c))


### Bug Fixes

* update domain from uspark.dev to uspark.ai and add centralized URL config ([#223](https://github.com/uspark-hq/uspark/issues/223)) ([87bb41f](https://github.com/uspark-hq/uspark/commit/87bb41fde1602a8d6111d6f4e5f954684a42cbcd))

## [0.9.2](https://github.com/uspark-hq/uspark/compare/core-v0.9.1...core-v0.9.2) (2025-09-06)


### Bug Fixes

* correct technical debt cleanup keeping ts-rest/core ([#177](https://github.com/uspark-hq/uspark/issues/177)) ([87c676f](https://github.com/uspark-hq/uspark/commit/87c676f57a5a5c51ceb22d7f9d2600e521f6518c))

## [0.9.1](https://github.com/uspark-hq/uspark/compare/core-v0.9.0...core-v0.9.1) (2025-09-05)


### Bug Fixes

* replace hardcoded delay with dynamic polling interval in cli auth ([#132](https://github.com/uspark-hq/uspark/issues/132)) ([e5a6aed](https://github.com/uspark-hq/uspark/commit/e5a6aeda27cdf0678c0dc56ce4c16435621d1c47))

## [0.9.0](https://github.com/uspark-hq/uspark/compare/core-v0.8.0...core-v0.9.0) (2025-09-04)


### Features

* implement document sharing apis with single-file support ([#101](https://github.com/uspark-hq/uspark/issues/101)) ([8b39a74](https://github.com/uspark-hq/uspark/commit/8b39a74c78858480a09b55873fc2313c0ed27900))
* implement project management apis with client-side file parsing ([#99](https://github.com/uspark-hq/uspark/issues/99)) ([f5aef77](https://github.com/uspark-hq/uspark/commit/f5aef7756b699ef3c4c69b422fb8fab093fa5012))

## [0.8.0](https://github.com/uspark-hq/uspark/compare/core-v0.7.0...core-v0.8.0) (2025-09-04)


### Features

* add vercel blob storage implementation with content-addressed deduplication ([#80](https://github.com/uspark-hq/uspark/issues/80)) ([e500dec](https://github.com/uspark-hq/uspark/commit/e500decc9c8c07fa8eb07aa1676e76c454e33c90))

## [0.7.0](https://github.com/uspark-hq/uspark/compare/core-v0.6.0...core-v0.7.0) (2025-09-03)


### Features

* remove polling interval from cli auth flow ([#83](https://github.com/uspark-hq/uspark/issues/83)) ([f98a617](https://github.com/uspark-hq/uspark/commit/f98a6177a457cabd70373896ce5e8302beb7eae6))

## [0.6.0](https://github.com/uspark-hq/uspark/compare/core-v0.5.0...core-v0.6.0) (2025-09-03)


### Features

* **cli:** implement yjs pull command with mock server testing ([#76](https://github.com/uspark-hq/uspark/issues/76)) ([49ac7e9](https://github.com/uspark-hq/uspark/commit/49ac7e98d6df6fec9ca65ad8880e40e4b7d0881a))

## [0.5.0](https://github.com/uspark-hq/uspark/compare/core-v0.4.0...core-v0.5.0) (2025-09-03)


### Features

* add first test for yjs filesystem implementation ([#53](https://github.com/uspark-hq/uspark/issues/53)) ([58f690e](https://github.com/uspark-hq/uspark/commit/58f690e199427283b827ea39ee42cddab890b79b))

## [0.4.0](https://github.com/uspark-hq/uspark/compare/core-v0.3.0...core-v0.4.0) (2025-09-02)


### Features

* implement cli token generation api endpoint ([#45](https://github.com/uspark-hq/uspark/issues/45)) ([862c53d](https://github.com/uspark-hq/uspark/commit/862c53da230adc5aa6df545d62cb573ee00219b4))

## [0.3.0](https://github.com/uspark-hq/uspark/compare/core-v0.2.1...core-v0.3.0) (2025-09-02)


### Features

* implement cli auth device code api with tdd approach ([#25](https://github.com/uspark-hq/uspark/issues/25)) ([224c386](https://github.com/uspark-hq/uspark/commit/224c386b22f5fff16c926cf06f1617032a616e40))

## [0.2.1](https://github.com/uspark-hq/uspark/compare/core-v0.2.0...core-v0.2.1) (2025-08-31)


### Bug Fixes

* update package names from makita to uspark and fix deployment paths ([#7](https://github.com/uspark-hq/uspark/issues/7)) ([9f726a0](https://github.com/uspark-hq/uspark/commit/9f726a0fa74984124a1670ac91bf845db969a1cc))

## [0.2.0](https://github.com/uspark-hq/uspark/compare/core-v0.1.0...core-v0.2.0) (2025-08-31)


### Features

* **core:** add BAR constant for testing release automation ([#5](https://github.com/uspark-hq/uspark/issues/5)) ([2f65cca](https://github.com/uspark-hq/uspark/commit/2f65ccae970620cc202dbf078fc908ded8a68f6a))

## [0.1.0](https://github.com/uspark-hq/uspark/compare/core-v0.0.1...core-v0.1.0) (2025-08-30)


### Features

* implement centralized API contract system ([#13](https://github.com/uspark-hq/uspark/issues/13)) ([77bbbd9](https://github.com/uspark-hq/uspark/commit/77bbbd913b52341a7720e9bb711d889253d9681a))
* initial commit - app template with turborepo monorepo structure ([4123914](https://github.com/uspark-hq/uspark/commit/41239143cdaea284f55a02c89fde348c2e3b53ff))

## Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
