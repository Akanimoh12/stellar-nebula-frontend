# Contract Testing

The frontend calls the Nebula Nomad Soroban contract through `SorobanContractClient`
in `src/services/contracts/soroban.ts`. These tests check that the frontend and the
contract still agree on the call shape, so a contract change shows up as a failing
unit test rather than a runtime error.

## What is covered

- `src/__tests__/contracts/nebula-scan.test.ts`
  - The public method surface of `SorobanContractClient`.
  - `scan_nebula` is called with `nebulaId` as a `string` and the scanner key as an `address`.
  - Built transactions are returned as XDR strings.
  - Submission errors are surfaced as `ContractError`.
- `src/test/helpers/contract-helpers.ts`
  - `createScanParams()` builds valid scan parameters.
  - `EXPECTED_CLIENT_METHODS` lists the expected client methods. Update it when the client's methods change.

## What is not covered

- The client does not validate `nebulaId` or `scannerPublicKey` before building a transaction.
  Invalid values are forwarded to the network, so there is no parameter validation test yet.
- These tests mock `@stellar/stellar-sdk`. They do not check the contract's real return values or
  run against a deployed contract.

## When the contract changes

1. Update the `scan_nebula` argument types in `soroban.ts` and the matching assertions in `nebula-scan.test.ts`.
2. If a client method is added or removed, update `EXPECTED_CLIENT_METHODS`.
3. Run the contract tests with `npx vitest run src/__tests__/contracts`.
