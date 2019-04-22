import {ruleset, rule, dom, type, score, out} from 'fathom-web';
import {euclidean} from 'fathom-web/clusters';
import {ancestors, isVisible, min} from 'fathom-web/utilsForFrontend';


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
        ['emailKeywordsGte1', 1.7506369352340698],
        ['emailKeywordsGte2', 0.3925047516822815],
        ['emailKeywordsGte3', 0.10444984585046768],
        ['emailKeywordsGte4', -0.1944221407175064],
        ['loginKeywordsGte1', 4.707931995391846],
        ['loginKeywordsGte2', 1.885134220123291],
        ['loginKeywordsGte3', 1.444320559501648],
        ['loginKeywordsGte4', 1.8948482275009155],
        ['headerRegistrationKeywordsGte1', -0.8698500990867615],
        ['headerRegistrationKeywordsGte2', -0.0502895712852478],
        ['headerRegistrationKeywordsGte3', -0.06126268208026886],
        ['headerRegistrationKeywordsGte4', -0.08957384526729584],
        ['buttonRegistrationKeywordsGte1', -2.887512683868408],
    ]),
    // Bias: -4.361201286315918

     viewportSize: {width: 1100, height: 900},
     // The content-area size to use while training.

     vectorType: 'username',
     // The type of node to extract features from when using the Vectorizer

     rulesetMaker:
        function () {
            const loginRegex = /login|log-in|log_in|signon|sign-on|sign_on|username/gi;  // no 'user-name' or 'user_name' found in first 20 training samples
            const registerRegex = /create|register|reg|sign up|signup|join/gi;

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

            /**
             * Return the number of registration keywords found on buttons in
             * the same form as the username element.
             */
            function numRegistrationKeywordsOnButtons(usernameElement) {
                let num = 0;
                for (const a of ancestors(usernameElement)) {
                    if (a.tagName === 'FORM') {
                        for (const button of Array.from(a.querySelectorAll('button'))) {
                            num += numContentMatches(registerRegex, button) + numAttrMatches(registerRegex, button);
                        }
                        for (const input of Array.from(a.querySelectorAll('input[type=submit],input[type=button]'))) {
                            num += numAttrMatches(registerRegex, input);
                        }
                        break;  // to save time
                    }
                }
                return num;
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
                // If there is a Create or Join or Sign Up button in the form,
                // it's probably an account creation form, not a login one.
                // TODO: This is O(n * m). In a Prolog solution, we would first find all the forms, then characterize them as Sign-In-having or not, etc.:
                // signInForm(F) :- tagName(F, 'form'), hasSignInButtons(F).
                // Then this rule would say: contains(F, U), signInForm(F).
                rule(type('username'), score(fnode => Number(numRegistrationKeywordsOnButtons(fnode.element) >= 1)), {name: 'buttonRegistrationKeywordsGte1'}),
                rule(type('username').max(), out('username'))
            ]);
            return rules;
        }
    }
);

export default trainees;
