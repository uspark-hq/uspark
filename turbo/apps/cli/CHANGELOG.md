# Changelog

## [0.12.1](https://github.com/uspark-hq/uspark/compare/cli-v0.12.0...cli-v0.12.1) (2025-10-18)


### Bug Fixes

* **cli:** ensure directory creation on empty pull and complete callback delivery ([#581](https://github.com/uspark-hq/uspark/issues/581)) ([f835df1](https://github.com/uspark-hq/uspark/commit/f835df10047bfac7b734e3ba8fbaf605d5d6d8b5))

## [0.12.0](https://github.com/uspark-hq/uspark/compare/cli-v0.11.9...cli-v0.12.0) (2025-10-18)


### Features

* implement unified workspace directory structure and remove legacy github sync ([#568](https://github.com/uspark-hq/uspark/issues/568)) ([83041a7](https://github.com/uspark-hq/uspark/commit/83041a7372e035a145b8a386f8a0f5d7da5a9649))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.21.0

## [0.11.9](https://github.com/uspark-hq/uspark/compare/cli-v0.11.8...cli-v0.11.9) (2025-10-17)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.20.0

## [0.11.8](https://github.com/uspark-hq/uspark/compare/cli-v0.11.7...cli-v0.11.8) (2025-10-17)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.19.0

## [0.11.7](https://github.com/uspark-hq/uspark/compare/cli-v0.11.6...cli-v0.11.7) (2025-10-16)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.18.0

## [0.11.6](https://github.com/uspark-hq/uspark/compare/cli-v0.11.5...cli-v0.11.6) (2025-10-15)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.17.0

## [0.11.5](https://github.com/uspark-hq/uspark/compare/cli-v0.11.4...cli-v0.11.5) (2025-10-13)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.16.0

## [0.11.4](https://github.com/uspark-hq/uspark/compare/cli-v0.11.3...cli-v0.11.4) (2025-10-11)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.15.0

## [0.11.3](https://github.com/uspark-hq/uspark/compare/cli-v0.11.2...cli-v0.11.3) (2025-10-11)


### Bug Fixes

* **cli,web:** improve E2B reliability and token management ([#468](https://github.com/uspark-hq/uspark/issues/468)) ([5ff2da6](https://github.com/uspark-hq/uspark/commit/5ff2da639637e22909e5e115688dae38f283a6ec))

## [0.11.2](https://github.com/uspark-hq/uspark/compare/cli-v0.11.1...cli-v0.11.2) (2025-10-09)


### Bug Fixes

* correct tool_result event parsing in watch-claude ([#449](https://github.com/uspark-hq/uspark/issues/449)) ([bd8e795](https://github.com/uspark-hq/uspark/commit/bd8e7959882015bf933f43d439b91f925718c44d))
* ensure watch-claude waits for async file syncs to complete ([#444](https://github.com/uspark-hq/uspark/issues/444)) ([5cd7aa5](https://github.com/uspark-hq/uspark/commit/5cd7aa52c1137952a66f8159b86fe13a909a95f8))

## [0.11.1](https://github.com/uspark-hq/uspark/compare/cli-v0.11.0...cli-v0.11.1) (2025-10-09)


### Bug Fixes

* improve CLI sync reliability and CORS handling ([#441](https://github.com/uspark-hq/uspark/issues/441)) ([eeb2ec1](https://github.com/uspark-hq/uspark/commit/eeb2ec14aad4c69cf2cb4272501800302483f2ee))

## [0.11.0](https://github.com/uspark-hq/uspark/compare/cli-v0.10.5...cli-v0.11.0) (2025-09-30)


### Features

* integrate project files signal into project page view ([#390](https://github.com/uspark-hq/uspark/issues/390)) ([45f873a](https://github.com/uspark-hq/uspark/commit/45f873a5ae4bd0eb3b168107224ca7db3e0d133b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.14.0

## [0.10.5](https://github.com/uspark-hq/uspark/compare/cli-v0.10.4...cli-v0.10.5) (2025-09-26)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.13.0

## [0.10.4](https://github.com/uspark-hq/uspark/compare/cli-v0.10.3...cli-v0.10.4) (2025-09-25)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.12.2

## [0.10.3](https://github.com/uspark-hq/uspark/compare/cli-v0.10.2...cli-v0.10.3) (2025-09-23)


### Bug Fixes

* handle http redirects in cli fetch operations ([#368](https://github.com/uspark-hq/uspark/issues/368)) ([3a0cd1e](https://github.com/uspark-hq/uspark/commit/3a0cd1e4daced120d3ba053211cbe9bc2b139a85))

## [0.10.2](https://github.com/uspark-hq/uspark/compare/cli-v0.10.1...cli-v0.10.2) (2025-09-23)


### Bug Fixes

* resolve cli push bug that only uploaded one blob for multiple files ([#358](https://github.com/uspark-hq/uspark/issues/358)) ([e51d046](https://github.com/uspark-hq/uspark/commit/e51d04603b9278e1451d0316eb0f06ac045fc1f9))

## [0.10.1](https://github.com/uspark-hq/uspark/compare/cli-v0.10.0...cli-v0.10.1) (2025-09-22)


### Bug Fixes

* cli e2e authentication path issue in github actions ([#351](https://github.com/uspark-hq/uspark/issues/351)) ([906a8ec](https://github.com/uspark-hq/uspark/commit/906a8ecb0a2b97c6d31a27cdb155c2e7aa85b63d))

## [0.10.0](https://github.com/uspark-hq/uspark/compare/cli-v0.9.4...cli-v0.10.0) (2025-09-20)


### Features

* implement vercel blob client token upload for CLI ([#343](https://github.com/uspark-hq/uspark/issues/343)) ([0c89919](https://github.com/uspark-hq/uspark/commit/0c89919e38add1c7610575991eb5b2e4e49407c9))

## [0.9.4](https://github.com/uspark-hq/uspark/compare/cli-v0.9.3...cli-v0.9.4) (2025-09-20)


### Bug Fixes

* make blob upload failures fail fast in cli push command ([#331](https://github.com/uspark-hq/uspark/issues/331)) ([e27c63d](https://github.com/uspark-hq/uspark/commit/e27c63d50e7920dbd5bad715315eeaa871de9afd))
* replace mock file content with real content from YJS and blob storage ([#333](https://github.com/uspark-hq/uspark/issues/333)) ([ac288bd](https://github.com/uspark-hq/uspark/commit/ac288bd7a743c1457b23558e65833fad0def15b9))
* use correct blob storage url in cli pull command ([#332](https://github.com/uspark-hq/uspark/issues/332)) ([7d6da8c](https://github.com/uspark-hq/uspark/commit/7d6da8c5a47bc9ad44dcf5b8cf922deb4a247362))

## [0.9.3](https://github.com/uspark-hq/uspark/compare/cli-v0.9.2...cli-v0.9.3) (2025-09-20)


### Bug Fixes

* cli authentication and ydoc sync issues ([#321](https://github.com/uspark-hq/uspark/issues/321)) ([e474fe1](https://github.com/uspark-hq/uspark/commit/e474fe14eee09265d222b8685cda82e3a83582c6))

## [0.9.2](https://github.com/uspark-hq/uspark/compare/cli-v0.9.1...cli-v0.9.2) (2025-09-14)


### Bug Fixes

* resolve cli npx execution issue ([#293](https://github.com/uspark-hq/uspark/issues/293)) ([a3b16bf](https://github.com/uspark-hq/uspark/commit/a3b16bf3a2ab9a0ee9e2004cf4732d8fa9ff0034))

## [0.9.1](https://github.com/uspark-hq/uspark/compare/cli-v0.9.0...cli-v0.9.1) (2025-09-14)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.12.1

## [0.9.0](https://github.com/uspark-hq/uspark/compare/cli-v0.8.4...cli-v0.9.0) (2025-09-13)


### Features

* add local development proxy with caddy and update domain urls ([#269](https://github.com/uspark-hq/uspark/issues/269)) ([fc304d9](https://github.com/uspark-hq/uspark/commit/fc304d9b0c9481ff174279d464596ee7fb36b0f4))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.12.0

## [0.8.4](https://github.com/uspark-hq/uspark/compare/cli-v0.8.3...cli-v0.8.4) (2025-09-12)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.11.0

## [0.8.3](https://github.com/uspark-hq/uspark/compare/cli-v0.8.2...cli-v0.8.3) (2025-09-12)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.10.0

## [0.8.2](https://github.com/uspark-hq/uspark/compare/cli-v0.8.1...cli-v0.8.2) (2025-09-08)


### Bug Fixes

* update all urls from app.uspark.com to uspark.ai ([#208](https://github.com/uspark-hq/uspark/issues/208)) ([5f50e4b](https://github.com/uspark-hq/uspark/commit/5f50e4b3588569d0000fd2873569d1780c4cfab5))

## [0.8.1](https://github.com/uspark-hq/uspark/compare/cli-v0.8.0...cli-v0.8.1) (2025-09-06)


### Bug Fixes

* correct technical debt cleanup keeping ts-rest/core ([#177](https://github.com/uspark-hq/uspark/issues/177)) ([87c676f](https://github.com/uspark-hq/uspark/commit/87c676f57a5a5c51ceb22d7f9d2600e521f6518c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.9.2

## [0.8.0](https://github.com/uspark-hq/uspark/compare/cli-v0.7.0...cli-v0.8.0) (2025-09-05)


### Features

* implement blob storage security with project isolation ([#159](https://github.com/uspark-hq/uspark/issues/159)) ([ea6c094](https://github.com/uspark-hq/uspark/commit/ea6c0945c39b908666a176c8d3385e6b76b580ef))


### Bug Fixes

* **cli:** correct npm bin path for npx execution ([#155](https://github.com/uspark-hq/uspark/issues/155)) ([25ef8af](https://github.com/uspark-hq/uspark/commit/25ef8af8221b87bdd1a7b67d23fab1ef86e1b0ea))

## [0.7.0](https://github.com/uspark-hq/uspark/compare/cli-v0.6.1...cli-v0.7.0) (2025-09-05)


### Features

* **cli:** enhance push command with batch upload support ([#113](https://github.com/uspark-hq/uspark/issues/113)) ([be8f842](https://github.com/uspark-hq/uspark/commit/be8f842929d1c2f8cd45073083f92a159ec8be88))

## [0.6.1](https://github.com/uspark-hq/uspark/compare/cli-v0.6.0...cli-v0.6.1) (2025-09-05)


### Bug Fixes

* replace hardcoded delay with dynamic polling interval in cli auth ([#132](https://github.com/uspark-hq/uspark/issues/132)) ([e5a6aed](https://github.com/uspark-hq/uspark/commit/e5a6aeda27cdf0678c0dc56ce4c16435621d1c47))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.9.1

## [0.6.0](https://github.com/uspark-hq/uspark/compare/cli-v0.5.0...cli-v0.6.0) (2025-09-04)


### Features

* add cli api host environment variable support and e2e testing ([#98](https://github.com/uspark-hq/uspark/issues/98)) ([03baef4](https://github.com/uspark-hq/uspark/commit/03baef47a6e636086763126e93d5743cd34a3844))
* **cli:** implement uspark watch-claude command for real-time sync ([#100](https://github.com/uspark-hq/uspark/issues/100)) ([c2cfa2a](https://github.com/uspark-hq/uspark/commit/c2cfa2a8d1991af8df22b6e38195792dde36e5c6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.9.0

## [0.5.0](https://github.com/uspark-hq/uspark/compare/cli-v0.4.0...cli-v0.5.0) (2025-09-04)


### Features

* add cli authentication with device flow ([#89](https://github.com/uspark-hq/uspark/issues/89)) ([2ebb970](https://github.com/uspark-hq/uspark/commit/2ebb970b11e303d45a2968839f9e7c05a0ca5e04))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.8.0

## [0.4.0](https://github.com/uspark-hq/uspark/compare/cli-v0.3.0...cli-v0.4.0) (2025-09-03)


### Features

* remove polling interval from cli auth flow ([#83](https://github.com/uspark-hq/uspark/issues/83)) ([f98a617](https://github.com/uspark-hq/uspark/commit/f98a6177a457cabd70373896ce5e8302beb7eae6))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.7.0

## [0.3.0](https://github.com/uspark-hq/uspark/compare/cli-v0.2.0...cli-v0.3.0) (2025-09-03)


### Features

* **cli:** implement yjs pull command with mock server testing ([#76](https://github.com/uspark-hq/uspark/issues/76)) ([49ac7e9](https://github.com/uspark-hq/uspark/commit/49ac7e98d6df6fec9ca65ad8880e40e4b7d0881a))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.6.0

## [0.2.0](https://github.com/uspark-hq/uspark/compare/cli-v0.1.5...cli-v0.2.0) (2025-09-03)


### Features

* add msw testing infrastructure for cli package ([#60](https://github.com/uspark-hq/uspark/issues/60)) ([f1c3050](https://github.com/uspark-hq/uspark/commit/f1c3050746ead7cf7ebc6f007d486b1207d456fc))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.5.0

## [0.1.5](https://github.com/uspark-hq/uspark/compare/cli-v0.1.4...cli-v0.1.5) (2025-09-02)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.4.0

## [0.1.4](https://github.com/uspark-hq/uspark/compare/cli-v0.1.3...cli-v0.1.4) (2025-09-02)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.3.0

## [0.1.3](https://github.com/uspark-hq/uspark/compare/cli-v0.1.2...cli-v0.1.3) (2025-08-31)


### Bug Fixes

* replace remaining makita references with uspark ([#1](https://github.com/uspark-hq/uspark/issues/1)) ([64fafed](https://github.com/uspark-hq/uspark/commit/64fafed420bf195669898b8591f8fa663863fcf4))
* update package names from makita to uspark and fix deployment paths ([#7](https://github.com/uspark-hq/uspark/issues/7)) ([9f726a0](https://github.com/uspark-hq/uspark/commit/9f726a0fa74984124a1670ac91bf845db969a1cc))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.2.1

## [0.1.2](https://github.com/uspark-hq/uspark/compare/@uspark/cli-v0.1.1...@uspark/cli-v0.1.2) (2025-08-31)


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.2.0

## [0.1.1](https://github.com/uspark-hq/uspark/compare/@uspark/cli-v0.1.0...@uspark/cli-v0.1.1) (2025-08-31)


### Bug Fixes

* replace remaining makita references with uspark ([#1](https://github.com/uspark-hq/uspark/issues/1)) ([64fafed](https://github.com/uspark-hq/uspark/commit/64fafed420bf195669898b8591f8fa663863fcf4))

## [0.1.0](https://github.com/uspark-hq/uspark/compare/@uspark/cli-v0.0.1...@uspark/cli-v0.1.0) (2025-08-30)


### Features

* initial commit - app template with turborepo monorepo structure ([4123914](https://github.com/uspark-hq/uspark/commit/41239143cdaea284f55a02c89fde348c2e3b53ff))


### Bug Fixes

* cli e2e ([78276d7](https://github.com/uspark-hq/uspark/commit/78276d78308b5a8aec85cb9ce4d137299ff0587d))
* cli package ([4ab79ab](https://github.com/uspark-hq/uspark/commit/4ab79ab22e35966956080f2652f29692392bb041))
* update remaining @uspark/cli references to uspark-cli ([bd8a106](https://github.com/uspark-hq/uspark/commit/bd8a106f36b95d8dcf1369e8831071f63f3ec80c))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @uspark/core bumped to 0.1.0

## Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
