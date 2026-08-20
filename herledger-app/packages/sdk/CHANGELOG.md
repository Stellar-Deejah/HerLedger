# Changelog

All notable changes to `@herledger/sdk` are documented in this file.

## [Unreleased]

### Changed

- **Type tightening: `encodeBytes32` now accepts only `HexString32`.** The new
  `toHexString32(input)` validator (exported from the package root) throws a
  `ValidationError` for non-hex or wrong-length input before any encoding
  happens, so a caller can no longer silently truncate or zero-pad a
  non-32-byte value into an invalid XDR transaction. The public contract
  client functions still accept plain `string` and validate internally, so
  this is not a breaking change to the SDK's call surface.
- `hexToBytes` now throws a descriptive `ValidationError` for odd-length or
  non-hex input instead of surfacing an opaque runtime error from the XDR
  library.
- `decodeI128` / `decodeU64` remain typed as `bigint` throughout; all call
  sites use `bigint` arithmetic with no implicit `Number()` coercions.