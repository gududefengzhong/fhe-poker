/**
 * Game action utilities for Texas Hold'em poker
 */

export enum Action {
  Fold = 1,
  Check = 2,
  Call = 3,
  Raise = 4,
}

export interface ActionAvailability {
  canFold: boolean;
  canCheck: boolean;
  canCall: boolean;
  canRaise: boolean;
  foldReason?: string;
  checkReason?: string;
  callReason?: string;
  raiseReason?: string;
}

/**
 * Calculate which actions are available for the current player
 * @param playerCurrentBet - The player's current bet in this round
 * @param gameCurrentBet - The current highest bet in this round
 * @param playerChips - The player's remaining chips
 * @param isPlayerTurn - Whether it's currently this player's turn
 * @returns Object indicating which actions are available and why
 */
export function getAvailableActions(
  playerCurrentBet: bigint,
  gameCurrentBet: bigint,
  playerChips: bigint,
  isPlayerTurn: boolean,
): ActionAvailability {
  // Ensure all values are BigInt
  const playerBet = BigInt(playerCurrentBet);
  const gameBet = BigInt(gameCurrentBet);
  const chips = BigInt(playerChips);

  const result: ActionAvailability = {
    canFold: true,
    canCheck: false,
    canCall: false,
    canRaise: false,
  };

  // If it's not the player's turn, disable all actions
  if (!isPlayerTurn) {
    result.canFold = false;
    result.foldReason = "Not your turn";
    result.checkReason = "Not your turn";
    result.callReason = "Not your turn";
    result.raiseReason = "Not your turn";
    return result;
  }

  // Fold is always available when it's your turn
  result.canFold = true;

  // Check is only available when player's bet equals the current bet
  if (playerBet === gameBet) {
    result.canCheck = true;
  } else {
    const diff = gameBet - playerBet;
    result.checkReason = `You must call ${diff.toString()} chips first`;
  }

  // Call is only available when player's bet is less than the current bet
  if (playerBet < gameBet) {
    const callAmount = gameBet - playerBet;
    if (chips >= callAmount) {
      result.canCall = true;
    } else {
      result.canCall = false;
      result.callReason = `Not enough chips (need ${callAmount.toString()}, have ${chips.toString()})`;
    }
  } else {
    result.callReason = "You've already matched the current bet";
  }

  // Raise is available if player has enough chips
  const minRaiseAmount = gameBet - playerBet + 10n; // Minimum raise is current bet + 10
  if (chips >= minRaiseAmount) {
    result.canRaise = true;
  } else {
    result.raiseReason = `Not enough chips (need at least ${minRaiseAmount.toString()}, have ${chips.toString()})`;
  }

  return result;
}

/**
 * Get a human-readable description of an action
 */
export function getActionDescription(action: Action): string {
  switch (action) {
    case Action.Fold:
      return "Fold - Give up this hand";
    case Action.Check:
      return "Check - Pass without betting";
    case Action.Call:
      return "Call - Match the current bet";
    case Action.Raise:
      return "Raise - Increase the bet";
    default:
      return "Unknown action";
  }
}
