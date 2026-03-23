import {
  Account,
  BASE_FEE,
  Contract,
  TimeoutInfinite,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { z } from "zod";
import {
  ArenaCapacitySchema,
  HorizonAccountResponseSchema,
  PositiveAmountSchema,
  PoolCurrencySchema,
  RoundChoiceSchema,
  RoundNumberSchema,
  RoundSpeedSchema,
  SignedXdrSchema,
  StellarContractIdSchema,
  StellarPublicKeySchema,
} from "@/shared-d/utils/security-validation";
import {
  STELLAR_NETWORK,
  TRANSACTION_CONFIG,
} from "@/components/hook-d/arenaConstants";
import {
  ContractError,
  ContractErrorCode,
  parseContractError,
} from "@/shared-d/utils/contract-error";
import {
  encodeAddress,
  encodeAmount,
  encodeChoice,
  encodeRound,
} from "@/shared-d/utils/scval-helpers";

// Re-export so consumers can import from one place
export { ContractError, ContractErrorCode, parseContractError } from "@/shared-d/utils/contract-error";

// Constants (Replace with real Contract IDs in production/env)
export const FACTORY_CONTRACT_ID = STELLAR_NETWORK.CONTRACTS.FACTORY;
export const XLM_CONTRACT_ID = STELLAR_NETWORK.CONTRACTS.XLM;
export const USDC_CONTRACT_ID = STELLAR_NETWORK.CONTRACTS.USDC;

const STAKING_CONTRACT_PLACEHOLDER =
  STELLAR_NETWORK.CONTRACTS.STAKING_PLACEHOLDER;
export const STAKING_CONTRACT_ID =
  process.env.NEXT_PUBLIC_STAKING_CONTRACT_ID || STAKING_CONTRACT_PLACEHOLDER;

export const NETWORK_PASSPHRASE = STELLAR_NETWORK.PASSPHRASE;
export const HORIZON_URL = STELLAR_NETWORK.HORIZON_URL.replace(/\/+$/, "");
export const SOROBAN_RPC_URL = STELLAR_NETWORK.SOROBAN_RPC_URL;

const CreatePoolParamsSchema = z.object({
  stakeAmount: PositiveAmountSchema,
  currency: PoolCurrencySchema,
  roundSpeed: RoundSpeedSchema,
  arenaCapacity: ArenaCapacitySchema,
});

/**
 * Helper to get the latest sequence number for an account.
 */
async function getAccount(publicKey: string, fn: string): Promise<Account> {
  try {
    const validatedPublicKey = StellarPublicKeySchema.parse(publicKey);

    const res = await fetch(
      `${HORIZON_URL}/accounts/${validatedPublicKey}`,
    );
    if (!res.ok) {
      throw new ContractError({
        code: ContractErrorCode.ACCOUNT_NOT_FOUND,
        fn,
      });
    }

    const rawData: unknown = await res.json();
    const data = HorizonAccountResponseSchema.parse(rawData);

    return new Account(validatedPublicKey, data.sequence);
  } catch (error) {
    throw parseContractError(error, fn);
  }
}

/**
 * Build a transaction to create a new pool using the Factory contract.
 */
export async function buildCreatePoolTransaction(
  publicKey: string,
  params: {
    stakeAmount: number;
    currency: string;
    roundSpeed: string;
    arenaCapacity: number;
  },
) {
  const FN = "buildCreatePoolTransaction";
  try {
    const validatedParams = CreatePoolParamsSchema.parse(params);
    const account = await getAccount(publicKey, FN);
    const factory = new Contract(FACTORY_CONTRACT_ID);

    // Convert stake amount to stroops/units (7 decimals).
    const amountBigInt = BigInt(
      Math.floor(validatedParams.stakeAmount * 10_000_000),
    );

    const currencyContractId =
      validatedParams.currency === "USDC" ? USDC_CONTRACT_ID : XLM_CONTRACT_ID;
    const roundSpeedSeconds =
      validatedParams.roundSpeed === "30S"
        ? 30
        : validatedParams.roundSpeed === "1M"
          ? 60
          : 300;

    const args = [
      encodeAmount(amountBigInt),
      encodeAddress(currencyContractId),
      encodeRound(roundSpeedSeconds),
      encodeRound(validatedParams.arenaCapacity),
    ];

    const callOperation = factory.call("create_pool", ...args);

    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(callOperation)
      .setTimeout(TimeoutInfinite)
      .build();
  } catch (error) {
    throw parseContractError(error, FN);
  }
}

/**
 * Build an unsigned transaction to stake XLM via the protocol contract.
 * Uses Soroban prepareTransaction for correct footprint and fees.
 */
export async function buildStakeProtocolTransaction(
  publicKey: string,
  amount: number,
) {
  const FN = "buildStakeProtocolTransaction";
  try {
    const validatedPublicKey = StellarPublicKeySchema.parse(publicKey);
    const validatedAmount = PositiveAmountSchema.parse(amount);

    if (
      !STAKING_CONTRACT_ID ||
      STAKING_CONTRACT_ID === STAKING_CONTRACT_PLACEHOLDER ||
      STAKING_CONTRACT_ID.includes("...")
    ) {
      throw new ContractError({
        code: ContractErrorCode.CONFIG_MISSING,
        message:
          "Staking contract not configured. Add NEXT_PUBLIC_STAKING_CONTRACT_ID to .env.local with your Soroban contract address.",
        fn: FN,
      });
    }

    const server = new Server(SOROBAN_RPC_URL);
    const account = await getAccount(validatedPublicKey, FN);
    const stakingContract = new Contract(STAKING_CONTRACT_ID);

    const amountStroops = BigInt(Math.floor(validatedAmount * 10_000_000));

    const callOperation = stakingContract.call(
      "stake",
      encodeAddress(validatedPublicKey),
      encodeAmount(amountStroops),
    );

    const builtTx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(callOperation)
      .setTimeout(TimeoutInfinite)
      .build();

    return server.prepareTransaction(builtTx);
  } catch (error) {
    throw parseContractError(error, FN);
  }
}

/**
 * Build transaction to join an arena.
 */
export async function buildJoinArenaTransaction(
  publicKey: string,
  poolId: string,
  amount: number,
) {
  const FN = "buildJoinArenaTransaction";
  try {
    const validatedPublicKey = StellarPublicKeySchema.parse(publicKey);
    const validatedPoolId = StellarContractIdSchema.parse(poolId);
    PositiveAmountSchema.parse(amount);

    const account = await getAccount(validatedPublicKey, FN);
    const poolContract = new Contract(validatedPoolId);
    const callOperation = poolContract.call("join");

    return new TransactionBuilder(account, {
      fee: TRANSACTION_CONFIG.JOIN_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(callOperation)
      .setTimeout(TRANSACTION_CONFIG.TIMEOUT_SECONDS)
      .build();
  } catch (error) {
    throw parseContractError(error, FN);
  }
}

/**
 * Submit choice (Heads/Tails).
 */
export async function buildSubmitChoiceTransaction(
  publicKey: string,
  poolId: string,
  choice: "Heads" | "Tails",
  roundNumber: number,
) {
  const FN = "buildSubmitChoiceTransaction";
  try {
    const validatedPublicKey = StellarPublicKeySchema.parse(publicKey);
    const validatedPoolId = StellarContractIdSchema.parse(poolId);
    const validatedChoice = RoundChoiceSchema.parse(choice);
    const validatedRoundNumber = RoundNumberSchema.parse(roundNumber);

    const account = await getAccount(validatedPublicKey, FN);
    const poolContract = new Contract(validatedPoolId);

    const callOperation = poolContract.call(
      "submit_choice",
      encodeRound(validatedRoundNumber),
      encodeChoice(validatedChoice),
    );

    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(callOperation)
      .setTimeout(TRANSACTION_CONFIG.TIMEOUT_SECONDS)
      .build();
  } catch (error) {
    throw parseContractError(error, FN);
  }
}

/**
 * Claim winnings.
 */
export async function buildClaimWinningsTransaction(
  publicKey: string,
  poolId: string,
) {
  const FN = "buildClaimWinningsTransaction";
  try {
    const validatedPublicKey = StellarPublicKeySchema.parse(publicKey);
    const validatedPoolId = StellarContractIdSchema.parse(poolId);

    const account = await getAccount(validatedPublicKey, FN);
    const poolContract = new Contract(validatedPoolId);
    const callOperation = poolContract.call("claim");

    return new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(callOperation)
      .setTimeout(30)
      .build();
  } catch (error) {
    throw parseContractError(error, FN);
  }
}

/**
 * Parse Stellar / Soroban errors for display in the UI.
 *
 * Delegates to `parseContractError` so copy stays aligned with
 * `contract/ERRORS.md` and `DEFAULT_MESSAGES` in `contract-error.ts`.
 * On-chain numeric codes are resolved via `contract-error-registry.ts`.
 */
export function parseStellarError(error: unknown): string {
  if (error instanceof ContractError) {
    return error.message;
  }
  return parseContractError(error, "parseStellarError").message;
}

/**
 * Arena state response type
 */
export interface ArenaStateResponse {
  arenaId: string;
  survivorsCount: number;
  maxCapacity: number;
  isUserIn: boolean;
  hasWon: boolean;
  currentStake: number;
  potentialPayout: number;
  roundNumber: number;
}

/**
 * Fetch the latest arena state from the contract.
 * Queries the Soroban arena contract for live state data.
 */
export async function fetchArenaState(
  arenaId: string,
  userAddress?: string
): Promise<ArenaStateResponse> {
  const FN = "fetchArenaState";
  try {
    const validatedArenaId = StellarContractIdSchema.parse(arenaId);
    const validatedUserAddress = userAddress
      ? StellarPublicKeySchema.parse(userAddress)
      : undefined;

    const server = new Server(SOROBAN_RPC_URL);
    const arenaContract = new Contract(validatedArenaId);

    // Build a dummy account for simulation (no actual signing needed for reads)
    const dummyAccount = new Account(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      "0"
    );

    // Query arena state - adjust method names based on your contract
    const getStateOperation = arenaContract.call("get_arena_state");

    const stateTx = new TransactionBuilder(dummyAccount, {
      fee: BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(getStateOperation)
      .setTimeout(30)
      .build();

    // Simulate to read state without submitting
    const stateSimulation = await server.simulateTransaction(stateTx);

    // Type guard: check if simulation was successful
    if (
      "error" in stateSimulation ||
      !("result" in stateSimulation) ||
      !stateSimulation.result ||
      stateSimulation.result.retval === undefined
    ) {
      const errorMsg =
        "error" in stateSimulation ? stateSimulation.error : "Unknown error";
      throw new ContractError({
        code: ContractErrorCode.SIMULATION_FAILED,
        message: `Failed to fetch arena state: ${errorMsg}`,
        fn: FN,
      });
    }

    // Parse the contract response
    const stateData = stateSimulation.result.retval;

    // Extract values from the contract response
    const survivorsCount = extractU32FromScVal(stateData, "survivors_count") || 0;
    const maxCapacity = extractU32FromScVal(stateData, "max_capacity") || 0;
    const roundNumber = extractU32FromScVal(stateData, "round_number") || 0;
    const currentStake = extractI128FromScVal(stateData, "current_stake") || 0;
    const potentialPayout = extractI128FromScVal(stateData, "potential_payout") || 0;

    let isUserIn = false;
    let hasWon = false;

    // If user address provided, check user-specific state
    if (validatedUserAddress) {
      const userStateOperation = arenaContract.call(
        "get_user_state",
        encodeAddress(validatedUserAddress),
      );

      const userStateTx = new TransactionBuilder(dummyAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(userStateOperation)
        .setTimeout(30)
        .build();

      const userSimulation = await server.simulateTransaction(userStateTx);

      if (
        !("error" in userSimulation) &&
        "result" in userSimulation &&
        userSimulation.result?.retval
      ) {
        const userData = userSimulation.result.retval;
        isUserIn = extractBoolFromScVal(userData, "is_active") || false;
        hasWon = extractBoolFromScVal(userData, "has_won") || false;
      }
    }

    return {
      arenaId: validatedArenaId,
      survivorsCount,
      maxCapacity,
      isUserIn,
      hasWon,
      currentStake,
      potentialPayout,
      roundNumber,
    };
  } catch (error) {
    throw parseContractError(error, FN);
  }
}

/**
 * Helper to extract u32 value from ScVal
 */
function extractU32FromScVal(scVal: xdr.ScVal, fieldName?: string): number | null {
  try {
    if (fieldName && scVal.switch().name === "scvMap") {
      const map = scVal.map();
      if (!map) return null;

      for (const entry of map) {
        const key = entry.key();
        if (key.switch().name === "scvSymbol" && key.sym().toString() === fieldName) {
          const val = entry.val();
          if (val.switch().name === "scvU32") {
            return val.u32();
          }
        }
      }
      return null;
    }

    if (scVal.switch().name === "scvU32") {
      return scVal.u32();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper to extract i128 value from ScVal
 */
function extractI128FromScVal(scVal: xdr.ScVal, fieldName?: string): number | null {
  try {
    if (fieldName && scVal.switch().name === "scvMap") {
      const map = scVal.map();
      if (!map) return null;

      for (const entry of map) {
        const key = entry.key();
        if (key.switch().name === "scvSymbol" && key.sym().toString() === fieldName) {
          const val = entry.val();
          if (val.switch().name === "scvI128") {
            const i128Parts = val.i128();
            // Convert i128 to number (may lose precision for very large values)
            const hi = i128Parts.hi().toBigInt();
            const lo = i128Parts.lo().toBigInt();
            const value = (hi << 64n) | lo;
            return Number(value) / 10_000_000; // Convert from stroops
          }
        }
      }
      return null;
    }

    if (scVal.switch().name === "scvI128") {
      const i128Parts = scVal.i128();
      const hi = i128Parts.hi().toBigInt();
      const lo = i128Parts.lo().toBigInt();
      const value = (hi << 64n) | lo;
      return Number(value) / 10_000_000;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper to extract boolean value from ScVal
 */
function extractBoolFromScVal(scVal: xdr.ScVal, fieldName?: string): boolean | null {
  try {
    if (fieldName && scVal.switch().name === "scvMap") {
      const map = scVal.map();
      if (!map) return null;

      for (const entry of map) {
        const key = entry.key();
        if (key.switch().name === "scvSymbol" && key.sym().toString() === fieldName) {
          const val = entry.val();
          if (val.switch().name === "scvBool") {
            return val.b();
          }
        }
      }
      return null;
    }

    if (scVal.switch().name === "scvBool") {
      return scVal.b();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Submit a signed transaction to the network.
 */
export async function submitSignedTransaction(signedXdr: string) {
  const FN = "submitSignedTransaction";
  try {
    const validatedSignedXdr = SignedXdrSchema.parse(signedXdr);
    const server = new Server(SOROBAN_RPC_URL);

    const tx = TransactionBuilder.fromXDR(validatedSignedXdr, NETWORK_PASSPHRASE);
    const response = await server.sendTransaction(tx);

    if (response.status !== "PENDING") {
      throw new ContractError({
        code: ContractErrorCode.TRANSACTION_FAILED,
        message: `Transaction rejected by network: ${response.status}`,
        fn: FN,
      });
    }

    const hash = response.hash;
    let getTxResponse: Awaited<ReturnType<Server["getTransaction"]>> | undefined;

    const MAX_RETRIES = TRANSACTION_CONFIG.MAX_RETRIES;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      await new Promise((resolve) =>
        setTimeout(resolve, TRANSACTION_CONFIG.RETRY_INTERVAL_MS),
      );
      try {
        getTxResponse = await server.getTransaction(hash);
        if (getTxResponse.status !== "NOT_FOUND") {
          break;
        }
      } catch {
        // Ignore transient fetch failures while polling.
      }
      retries++;
    }

    if (!getTxResponse) {
      throw new ContractError({
        code: ContractErrorCode.TRANSACTION_TIMEOUT,
        fn: FN,
      });
    }

    if (getTxResponse.status !== "SUCCESS") {
      throw new ContractError({
        code: ContractErrorCode.TRANSACTION_FAILED,
        message: `Transaction confirmation failed: ${getTxResponse.status}`,
        fn: FN,
      });
    }

    return getTxResponse;
  } catch (error) {
    throw parseContractError(error, FN);
  }
}
