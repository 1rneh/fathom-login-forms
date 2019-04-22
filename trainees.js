import {ruleset, rule, dom, type, score, out} from 'fathom-web';
import {euclidean} from 'fathom-web/clusters';
import {isVisible, min} from 'fathom-web/utilsForFrontend';


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
        ['emailKeywordsGte1', 0.25459080934524536],
        ['emailKeywordsGte2', 0.8482664227485657],
        ['emailKeywordsGte3', 0.23385368287563324],
        ['emailKeywordsGte4', 0.24192124605178833],
        ['loginKeywordsGte1', 4.621892929077148],
        ['loginKeywordsGte2', 1.0190210342407227],
        ['loginKeywordsGte3', 1.0752729177474976],
        ['loginKeywordsGte4', 2.0910520553588867],
        ['headerRegistrationKeywordsGte1', -1.3342167139053345],
        ['headerRegistrationKeywordsGte2', 0.08143582940101624],
        ['headerRegistrationKeywordsGte3', -0.18398119509220123],
        ['headerRegistrationKeywordsGte4', 0.16558906435966492],
    ]),
    // Bias: -3.9037985801696777

     viewportSize: {width: 1100, height: 900},
     // The content-area size to use while training.

     vectorType: 'username',
     // The type of node to extract features from when using the Vectorizer

     rulesetMaker:
        function () {
            const loginRegex = /login|log-in|log_in|signon|sign-on|sign_on|username/gi;  // no 'user-name' or 'user_name' found in first 20 training samples
            const registerRegex = /create|register|reg/gi;

            /**
             * Return the number of occurrences of a string or regex in another
             * string.
             */
            function numMatches(regex, string) {
                return (string.match(regex) || []).length;  // Optimization: split() benchmarks faster.
            }

            /**
             * Return the number of matches to the given regex in the attribute
             * values of the given element.
             */
            function numAttrMatches(regex, element, attrs = []) {
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
                return rule(type(inType), score(fnode => Number(numAttrMatches(keywordRegex, fnode.element) >= num)),  // === drops accuracy on first 20 training samples from 95% to 70%.
                            {name: baseName + num})
            }

            /**
             * Return the <hN> element Euclidean-wise above and center-point-
             * nearest the given element, null if there is none.
             */
            function closestHeaderAbove(element) {  // TODO: Impose a distance limit?
                const body = element.ownerDocument.body;
                if (body !== null) {
                    const headers = Array.from(body.querySelectorAll('h1,h2,h3,h4,h5,h6'));
                    if (headers.length) {
                        headers.filter(h => isAbove(h, element));
                        return min(headers, h => euclidean(h, element));
                    }
                }
                return null;
            }

            /**
             * Return whether element A is non-overlappingly above B: that is,
             * A's bottom is above or equal to B's top.
             */
            function isAbove(a, b) {
                return a.getBoundingClientRect().bottom <= b.getBoundingClientRect().top;
            }

            function numContentMatches(regex, element) {
                if (element === null) {
                    return 0;
                }
                return numMatches(regex, element.innerText);
            }

            const rules = ruleset([
                rule(dom('input[type=email],input[type=text],input[type=""],input:not([type])').when(isVisible), type('username')),
                // Look at "login"-like keywords on the <input>:
                // TODO: If slow, lay down the count as a note.
                ...[1, 2, 3, 4].map(gte => keywordCountRule('username', gte, loginRegex, 'loginKeywordsGte')),
                // Look at "email"-like keywords on the <input>:
                ...[1, 2, 3, 4].map(gte => keywordCountRule('username', gte, /email/gi, 'emailKeywordsGte')),
                // Maybe also try the 2 closest headers, within some limit.
                ...[1, 2, 3, 4].map(gte => rule(type('username'), score(fnode => Number(numContentMatches(registerRegex, closestHeaderAbove(fnode.element)) >= gte)), {name: 'headerRegistrationKeywordsGte' + gte})),
                rule(type('username').max(), out('username'))
            ]);
            return rules;
        }
    }
);

export default trainees;
