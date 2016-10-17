/*
 * MIT License

 * Copyright (c) 2016 Garrett Vargas

 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

module.exports = {
    // Recommended actions follow Basic Strategy, based on the rules currently in play
    GetRecommendedPlayerAction: function(playerCards, dealerCard, handCount, dealerCheckedBlackjack, options)
    {
        const playerOptions = ExtractOptions(options);

        // If early surrender is allowed, check that now (that's what early surrender means - before dealer checks for blackjack
        if ((playerOptions.surrender == "early") && (ShouldPlayerSurrender(playerCards, dealerCard, handCount, playerOptions)))
        {
            return "surrender";
        }

        // OK, if an ace is showing it's easy - never take insurance
        if ((dealerCard == 1) && !dealerCheckedBlackjack && playerOptions.offerInsurance)
        {
            return "noinsurance";    
        }

        // Check each situation
        if (ShouldPlayerSplit(playerCards, dealerCard, handCount, playerOptions))
        {
            return "split";
        }
        else if (ShouldPlayerDouble(playerCards, dealerCard, handCount, playerOptions))
        {
            return "double";
        }
        // Note if early surrender is allowed we already checked, so no need to check again
        else if ((playerOptions.surrender != "early") && ShouldPlayerSurrender(playerCards, dealerCard, handCount, playerOptions))
        {
            return "surrender";
        }
        else if (ShouldPlayerStand(playerCards, dealerCard, handCount, playerOptions))
        {
            return "stand";
        }
        else if (ShouldPlayerHit(playerCards, dealerCard, handCount, playerOptions))
        {
            return "hit";
        }

        // I got nothing
        return "none";
    }
}; 

/*
 * Internal functions
 */

function ExtractOptions(options)
{
    const playerOptions = { hitSoft17: true, surrender: "late", double: "any", doubleAfterSplit: true, 
                            resplitAces: false, offerInsurance: true, numberOfDecks: 6, maxSplitHands: 4, 
                            strategyComplexity: "basic"};

    // Override defaults where set
    if (options)
    {
        if (options.hasOwnProperty("hitSoft17"))
        {
            playerOptions.hitSoft17 = options.hitSoft17;
        }
        if (options.hasOwnProperty("surrender"))
        {
            playerOptions.surrender = options.surrender;
        }
        if (options.hasOwnProperty("double"))
        {
            playerOptions.double = options.double;
        }
        if (options.hasOwnProperty("doubleAfterSplit"))
        {
            playerOptions.doubleAfterSplit = options.doubleAfterSplit;
        }
        if (options.hasOwnProperty("resplitAces"))
        {
            playerOptions.resplitAces = options.resplitAces;
        }
        if (options.hasOwnProperty("offerInsurance"))
        {
            playerOptions.offerInsurance = options.offerInsurance;
        }
        if (options.hasOwnProperty("numberOfDecks"))
        {
            playerOptions.numberOfDecks = options.numberOfDecks;
        }
        if (options.hasOwnProperty("maxSplitHands"))
        {
            playerOptions.maxSplitHands = options.maxSplitHands;
        }
        if (options.hasOwnProperty("strategyComplexity"))
        {
            playerOptions.strategyComplexity = options.strategyComplexity;
        }
    }

    return playerOptions;
}
function HandTotal(cards) 
{
    var retval = { total: 0, soft: false };
    var hasAces = false;

    for (var i = 0; i < cards.length; i++) {
        retval.total += cards[i];

        // Note if there's an ace
        if (cards[i] == 1) {
            hasAces = true;
        }
    }

    // If there are aces, add 10 to the total (unless it would go over 21)
    // Note that in this case the hand is soft
    if ((retval.total <= 11) && hasAces) {
        retval.total += 10;
        retval.soft = true;
    }

    return retval;
}

function ShouldPlayerSplit(playerCards, dealerCard, handCount, options)
{
    var shouldSplit = false;

    // It needs to be a possible action
    if ((playerCards.length != 2) || (handCount == options.maxSplitHands) || (playerCards[0] != playerCards[1]))
    {
        return false;
    }

    // OK, it's a possibility
    switch (playerCards[0])
    {
        case 1:
            // Always split aces
            shouldSplit = true;
            break;
        case 2:
        case 3:
            // Against 4-7, or 2 and 3 if you can double after split
            shouldSplit = ((dealerCard > 3) && (dealerCard < 8)) || (((dealerCard == 2) || (dealerCard == 3)) && (options.doubleAfterSplit));
            break;
        case 4:
            // Against 5 or 6, and only if you can double after split
            shouldSplit = ((dealerCard == 5) || (dealerCard == 6)) && (options.doubleAfterSplit);
            break;
        case 6:
            // Split 3-6, or against a 2 if double after split is allowed
            shouldSplit = ((dealerCard > 2) && (dealerCard < 7)) || ((dealerCard == 2) && (options.doubleAfterSplit));
            break;
        case 7:
            // Split on 2-7
            shouldSplit = ((dealerCard > 1) && (dealerCard < 8));
            break;
        case 8:
            // The basic rule is always split 8s - there are exceptions where we will surrender instead, which are covered in 
            // the case where the player should surrender.  Check if they should surrender, if not they should split
            shouldSplit = !ShouldPlayerSurrender(playerCards, dealerCard, handCount, options);
            break;
        case 9:
            // Split against 2-9 except 7
            shouldSplit = ((dealerCard > 1) && (dealerCard < 10) && (dealerCard != 7));
            break;
        case 5:
        case 10:
        default:
            // Don't split 5s or 10s ... or cards I don't know
            break;
    }

    return shouldSplit;
}

function ShouldPlayerDouble(playerCards, dealerCard, handCount, options)
{
    var shouldDouble = false;
    var handValue = HandTotal(playerCards);
    const doubleRange = {low: 0, high: 0};

    // Convert double option to range - eventually we may replace options.double string with a range for more flexibility
    if (options.double == "any") {
        doubleRange.low = 0;
        doubleRange.high = 21;
    } else if (options.double === "10or11") {
        doubleRange.low = 10;
        doubleRange.high = 11;
    } else if (options.double === "9or10or11") {
        doubleRange.low = 9;
        doubleRange.high = 11;
    }

    // It needs to be a possible action
    if ((playerCards.length != 2) || ((handCount > 1) && !options.doubleAfterSplit))
    {
        return false;
    }
    if ((handValue.total < doubleRange.low) || (handValue.total > doubleRange.high))
    {
        return false;
    }

    // OK, looks like you can double
    if (handValue.soft)
    {
        // Let's look at the non-ace card to determine what to do (get this by the total)
        switch (handValue.total)
        {
            case 13:
            case 14:
                // Double against dealer 5 or 6
                shouldDouble = (dealerCard == 5) || (dealerCard == 6);
                break;
            case 15:
            case 16:
                // Double against dealer 4-6
                shouldDouble = (dealerCard >= 4) && (dealerCard <= 6);
                break;
            case 17:
                // Double against 3-6
                shouldDouble = (dealerCard >= 3) && (dealerCard <= 6);
                break;
            case 18:
                // Double against 3-6 - also 2 if the dealer hits soft 17
                shouldDouble = (dealerCard >= 3 && (dealerCard <= 6)) || ((dealerCard == 2) && options.hitSoft17);
                break;
            case 19:
                // Double against 6 if the dealer hits soft 17
                shouldDouble = (dealerCard == 6) && options.hitSoft17;
                break;
            default:
                // Don't double
                break;
        }
    }
    else
    {
        // Double on 9, 10, or 11 only
        switch (handValue.total)
        {
            case 9:
                // Double 3-6
                shouldDouble = (dealerCard >= 3) && (dealerCard <= 6);
                break;
            case 10:
                // Double 2-9
                shouldDouble = (dealerCard >= 2) && (dealerCard <= 9);
                break;
            case 11:
                // Double anything except an ace (and then only if the dealer doesn't hit soft 17)
                shouldDouble = !((dealerCard == 1) && !options.hitSoft17);
                break;
            default:
                break;
        }
    }

    return shouldDouble;
}

// Surrender rules - note we do not look at the exact composition of the hand
// as defined as http://wizardofodds.com/games/blackjack/appendix/6/, only the player's total
function ShouldPlayerSurrender(playerCards, dealerCard, handCount, options)
{
    var shouldSurrender = false;

    // You can only surrender on your first two cards, and it has to be an option
    if (((options.surrender != "early") && (options.surrender != "late")) || (playerCards.length != 2) || (handCount != 1))
    {
        return false;
    }

    var handValue = HandTotal(playerCards);

    // Don't surrender a soft hand
    if (handValue.soft)
    {
        return false;
    }

    if (options.surrender == "early")
    {
        if (dealerCard == 1)
        {
            // Surrender Dealer Ace vs. hard 5-7, hard 12-17, including pair of 3's, 6's, 7's or 8's
            // Also surender against pair of 2's if the dealer hits soft 17
            if (((handValue.total >= 5) && (handValue.total <= 7)) || ((handValue.total >= 12) && (handValue.total <= 17)))
            {
                shouldSurrender = true;
            }
            if ((playerCards[0] == 2) && (playerCards[1] == 2) && options.hitSoft17)
            {
                shouldSurrender = true;
            }
        }    
        else if (dealerCard == 10)
        {
            // Surrender dealer 10 against a hard 14-16, including pair of 7's or 8's    
            if ((handValue.total >= 14) && (handValue.total <= 16))
            {
                // UNLESS it's a pair of 8's in single deck and double after split is allowed
                // This is an advanced option (for basic, we will "always split 8s")
                if ((playerCards[0] == 8) && (playerCards[1] == 8))
                {
                    shouldSurrender = (options.strategyComplexity != "basic") && (options.numberOfDecks == 1) && (options.doubleAfterSplit);
                }
                else
                {
                    // Surrender unless we're looking at an exact composition - then don't surrender 10/4 or 5/9 in single deck, or 4/10 in double deck
                    shouldSurrender = true;
                    if ((handValue.total == 14) && (options.strategyComplexity == "exactComposition"))
                    {
                        if ((options.numberOfDecks == 1) && 
                            ((playerCards[0] == 4) || (playerCards[0] == 5) || (playerCards[0] == 9) || (playerCards[0] == 10)))
                        {
                            shouldSurrender = false;        
                        }
                        if ((options.numberOfDecks == 2) && ((playerCards[0] == 4) || (playerCards[0] == 10)))
                        {
                            shouldSurrender = false;
                        }
                    }
                }
            }
        }
        else if (dealerCard == 9)
        {
            // Surrender if we have 16, but no including a pair of 8's
            if ((handValue.total == 16) && (playerCards[0] != 8))
            {
                shouldSurrender = true;
            }
        }
    }
    // Late surrender against an Ace when dealer hits on soft 17
    else if ((options.hitSoft17) && (dealerCard == 1))
    {
        switch (handValue.total)
        {
            case 14:
                // If looking at exact composition, then surrender a pair of 7s in a single deck game only
                shouldSurrender = ((options.strategyComplexity == "exactComposition") && (options.numberOfDecks == 1) && (playerCards[0] == 7));
                break;
            case 15:
                // Surrender, unless we are looking at exact composition, then single or double deck 8/7 doesn't surrender
                shouldSurrender = !((options.strategyComplexity == "exactComposition") && (options.numberOfDecks <= 2) &&
                    ((playerCards[0] == 8) || (playerCards[0] == 7)));
                break;
            case 16:
                // Surrender unless it's a pair of 8s in a single deck game or a double deck game with no double after split
                // This is an advanced option (basic is "always split 8s")
                shouldSurrender = (playerCards[0] != 8);
                if ((options.strategyComplexity != "basic") && (playerCards[0] == 8))
                {
                    // Surrender pair of 8s if four or more decks or in a double-deck game where double after split isn't allowed
                    if ((options.numberOfDecks >= 4) || ((options.numberOfDecks == 2) && !options.doubleAfterSplit))
                    {
                        shouldSurrender = true;
                    }
                }
                break;
            case 17:
                // Surrender unless you are looking at exact composition, in which case a single-deck game should only surrender
                // 17 against Ace if it is a 10/7 hand
                shouldSurrender = true;
                if ((options.strageyComplexity == "exactComposition") && (options.numberOfDecks == 1))
                {
                    shouldSurrender = ((playerCards[0] == 10) || (playerCards[0] == 7));
                }
                break;
            default:
                // Don't surender
                break;
        }
    }
    // Late surrender against an Ace, dealer doesn't hit soft 17
    else if (dealerCard == 1)
    {
        // We only surrender a 16 in this case (not a pair of 8s).  Unless it is single deck, in which case only 10/6 surrenders
        shouldSurrender = (handValue.total == 16) && (playerCards[0] != 8);
        if (shouldSurrender)
        {
            if ((options.strategyComplexity == "exactComposition") && (options.numberOfDecks == 1) && ((playerCards[0] == 10) || (playerCards[0] == 6)))
            {
                shouldSurrender = false;
            }
        }
    }
    // Late surrender against a non-Ace
    else
    {
        // The basic rule is 15 against 10 if more than one deck, and 16 (non-8s) against 10 always or against 9 if 4 or more decks
        // If looking at advanced composition, 7s surrender against 10 in single deck and 8/7 against 10 doesn't surrender
        if (handValue.total == 14)
        {
            shouldSurrender = ((options.strategyComplexity == "exactComposition") && (playerCards[0] == 7) && (dealerCard == 10) && (options.numberOfDecks == 1));
        }
        else if (handValue.total == 15)
        {
            // Surrender against 10 unless it's a single deck game
            shouldSurrender = ((dealerCard == 10) && (options.numberOfDecks > 1));
            if ((options.strategyComplexity == "exactComposition") && (dealerCard == 10) && ((playerCards[0] == 8) || (playerCards[0] == 7)))
            {
                shouldSurrender = false;
            }
        }
        else if (handValue.total == 16)
        {
            // Surrender against 10 or Ace, and against 9 if there are more than 4 decks
            shouldSurrender = (playerCards[0] != 8) && ((dealerCard == 10) || ((dealerCard == 9) && (options.numberOfDecks >= 4)));
        }
    }

    return shouldSurrender;    
}

function ShouldPlayerStand(playerCards, dealerCard, handCount, options)
{
    var shouldStand = false;

    // Nnote this is last action so we already told them not to double/surrender/etc
    var handValue = HandTotal(playerCards);

    if (handValue.soft)
    {
        // Don't stand until you hit 18
        if (handValue.total > 18)
        {
            shouldStand = true;
        }
        else if (handValue.total == 18)
        {
            // Stand against dealer 2-8
            shouldStand = (handValue.total >= 2) && (handValue.total <= 8);
        }
    }
    else
    {
        // Stand on 17 or above
        if (handValue.total > 16)
        {
            shouldStand = true;
        }
        else if (handValue.total > 12)
        {
            // 13-16 you should stand against dealer 2-6
            shouldStand = (dealerCard >= 2) && (dealerCard <= 6);
        }
        else if (handValue.total == 12)
        {
            // Stand on dealer 4-6
            shouldStand = (dealerCard >= 4) && (dealerCard <= 6);
        }
    }

    return shouldStand;    
}

function ShouldPlayerHit(playerCards, dealerCard, handCount, options)
{
    // Note this is the last action we check (we told them not to do anything else), so by default you should hit
    // Since we don't have the full game state, it's assumed that the caller made sure not to call if the player
    // took an action where the player has no choice of play (e.g. doubled or split aces)
    // The only sanity check we'll do is that you haven't already busted
    var handValue = HandTotal(playerCards);
    return (handValue.total < 21);
}
