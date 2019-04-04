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
        ['1Keyword', 3.6806068420410156],
        ['2Keywords', 5.163995742797852],
        ['3Keywords', 1.2049275636672974],
        ['4Keywords', 0.9653778076171875],
        ['visible', 9.1512451171875]]),
    // Bias: -18.908517837524414

     viewportSize: {width: 1100, height: 900},
     // The content-area size to use while training.

     vectorType: 'username',
     // The type of node to extract features from when using the Vectorizer

     rulesetMaker:
        function () {
            const usernameKeywords = ['email', 'login', 'log-in', 'log_in', 'signon', 'sign-on', 'sign_on', 'username']  // no 'user-name' or 'user_name' found in first 20 training samples
            const keywordRegex = /email|login|log-in|log_in|signon|sign-on|sign_on|username/gi;

            /**
             * Return the number of occurrences of a string or regex in another
             * string.
             */
            function numMatches(regex, string) {
                return (string.match(regex) || []).length;
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

            const rules = ruleset([
                rule(dom('input[type=email],input[type=text]'), type('username')),
                // TODO: If slow, lay down the count as a note.
                rule(type('username'), score(fnode => Number(numAttrMatches(fnode.element, keywordRegex) >= 1)), {name: '1Keyword'}),
                rule(type('username'), score(fnode => Number(numAttrMatches(fnode.element, keywordRegex) >= 2)), {name: '2Keywords'}),
                rule(type('username'), score(fnode => Number(numAttrMatches(fnode.element, keywordRegex) >= 3)), {name: '3Keywords'}),
                rule(type('username'), score(fnode => Number(numAttrMatches(fnode.element, keywordRegex) >= 4)), {name: '4Keywords'}),
                // TODO: Turn this into a when():
                rule(type('username'), score(fnode => Number(isVisible(fnode.element))), {name: 'visible'}),
                rule(type('username').max(), out('username'))
            ]);
            return rules;
        }
    }
);

export default trainees;
