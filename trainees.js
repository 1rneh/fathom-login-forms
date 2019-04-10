import {ruleset, rule, dom, type, score, out} from 'fathom-web';
import {isVisible} from 'fathom-web/utilsForFrontend';


/**
 * Rulesets to train.
 *
 * More mechanically, a map of names to {coeffs, rulesetMaker, ...} objects.
 * rulesetMaker is a function that returns a ruleset. coeffs is typically the
 * best-yet-found set of coefficients for a ruleset. The rulesets you specify
 * here show up in the FathomFox Trainer UI, from which you can kick off a
 * training run. However, the neural-net-based trainer is a better bet these
 * days. The FathomFox Trainer remains because it is a useful debugging tool
 * when run for 1 iteration, showing what the ruleset chose wrong.
 */
const trainees = new Map();

trainees.set(
    // A ruleset that finds the full-screen, content-blocking overlays that
    // often go behind modal popups
    'username',
    {coeffs: new Map([  // [rule name, coefficient]
        ['emailKeywordsGte1', 1.6883251667022705],
        ['emailKeywordsGte2', -0.41830191016197205],
        ['emailKeywordsGte3', 0.09648159891366959],
        ['emailKeywordsGte4', -0.0839453637599945],
        ['loginKeywordsGte1', 3.430608034133911],
        ['loginKeywordsGte2', 2.2097525596618652],
        ['loginKeywordsGte3', 1.8574389219284058],
        ['loginKeywordsGte4', 2.074976682662964],
    ]),
    // Bias: -3.374068021774292

     viewportSize: {width: 1100, height: 900},
     // The content-area size to use while training.

     vectorType: 'username',
     // The type of node to extract features from when using the Vectorizer

     rulesetMaker:
        function () {
            const loginRegex = /login|log-in|log_in|signon|sign-on|sign_on|username/gi;  // no 'user-name' or 'user_name' found in first 20 training samples

            /**
             * Return the number of occurrences of a string or regex in another
             * string.
             */
            function numMatches(regex, string) {
                return (string.match(regex) || []).length;  // Optimization: split benchmarks faster.
            }

            /**
             * Return the number of matches to the given regex in the attribute
             * values of the given element.
             */
            function numAttrMatches(element, regex, attrs = []) {
                const attributes = attrs.length === 0 ? Array.from(element.attributes).map(a => a.name) : attrs;
                let num = 0;
                for (let i = 0; i < attributes.length; i++) {
                    const attr = element.getAttribute(attributes[i]);
                    // If the attribute is an array, apply the scoring function to each element
                    if (attr) {
                        if (Array.isArray(attr)) {
                            for (const eachValue of attr) {
                                num += numMatches(regex, eachValue);
                            }
                        } else {
                            num += numMatches(regex, attr);
                        }
                    }
                }
                return num;
            }

            /**
             * Return a rule which is 1 if the number of keyword occurrences on
             * the fnode is >= ``num``.
             */
            function keywordCountRule(inType, num, keywordRegex, baseName) {
                return rule(type(inType), score(fnode => Number(numAttrMatches(fnode.element, keywordRegex) >= num)),  // === drops accuracy on first 20 training samples from 95% to 70%.
                            {name: baseName + num})
            }

            const rules = ruleset([
                rule(dom('input[type=email],input[type=text],input[type=""],input:not([type])').when(isVisible), type('username')),
                // Look at "login"-like keywords on the <input>:
                // TODO: If slow, lay down the count as a note.
                ...([1, 2, 3, 4].map(num => keywordCountRule('username', num, loginRegex, 'loginKeywordsGte'))),
                // Look at "email"-like keywords on the <input>:
                ...([1, 2, 3, 4].map(num => keywordCountRule('username', num, /email/gi, 'emailKeywordsGte'))),
                rule(type('username').max(), out('username'))
            ]);
            return rules;
        }
    }
);

export default trainees;
