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

const lib = require('../src/suggestion');

var succeeded = 0;
var failed = 0;

function RunTest(testName, playerCards, dealerCard, handCount, dealerCheckedBlackjack, options, expectedResult)
{
    const result = lib.GetRecommendedPlayerAction(playerCards, dealerCard, handCount, dealerCheckedBlackjack, options);

    if (result == expectedResult)
    {
        console.log("SUCCESS: " + testName + " returned " + result);
        succeeded++;
    }
    else
    {
        console.log("FAIL: " + testName + " returned " + result + " rather than " + expectedResult);
        failed++;
    }
}

// Use the default options
RunTest("Stand on 16 against dealer 3", [9,7], 3, 1, true, null, "stand");
RunTest("Split 9s against dealer 5", [9,9], 5, 1, true, null, "split");
RunTest("Hit 16 against 10 after split", [9,7], 10, 2, true, null, "hit");
RunTest("Split pair of 8s against dealer Ace - basic", [8,8], 1, 1, true, null, "split");
RunTest("Surrender 15 against dealer 10",[10,5], 10, 1, true, null, "surrender");
RunTest("No insurance ever", [10,1], 1, 1, false, null, "noinsurance");
RunTest("Double soft 17 against 6", [1,6], 6, 2, true, null, "double");

// Advanced strategy
RunTest("Surrender pair of 8s against dealer Ace", [8,8], 1, 1, true, {strategyComplexity: "advanced"}, "surrender");
RunTest("Early Surrender pair of 8s against dealer 10 single deck", [8,8], 10, 1, false, {numberOfDecks:1, surrender:"early", strategyComplexity: "advanced"}, "surrender");

// Exact Composition tests
RunTest("Hit pair of 7s against dealer 10 single deck", [7,7], 10, 1, true, {numberOfDecks:1}, "hit");
RunTest("Surrender pair of 7s against dealer 0 single deck with exact composition", [7,7], 10, 1, true, {numberOfDecks:1, strategyComplexity:"exactComposition"}, "surrender");
RunTest("Surrender 10-7 against dealer Ace single deck", [7,10], 1, 1, true, {numberOfDecks:1, strategyComplexity: "exactComposition"}, "surrender");

// Final summary
console.log("\r\nRan " + (succeeded + failed) + " tests; " + succeeded + " passed and " + failed + " failed");