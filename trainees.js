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
const VIEWPORT_SIZE = {width: 1100, height: 900};

/**
 * Return the number of occurrences of a string or regex in another
 * string.
 */
function numRegexMatches(regex, string) {
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
                    num += numRegexMatches(regex, eachValue);
                }
            } else {
                num += numRegexMatches(regex, attr);
            }
        }
    }
    return num;
}

function numContentMatches(regex, element) {
    if (element === null) {
        return 0;
    }
    return numRegexMatches(regex, element.innerText);
}

trainees.set(
    'next',
    {coeffs: new Map([  // [rule name, coefficient]
        ['nextTypeSubmit', 2.7297091484069824],
        ['nextLoginAttrs', -0.20297829806804657],
        ['nextButtonContents', 4.865756511688232],
    ]),
    // Bias: -5.656163215637207

     viewportSize: VIEWPORT_SIZE,
     // The content-area size to use while training.

     vectorType: 'next',
     // The type of node to extract features from when using the Vectorizer

     rulesetMaker:
        function () {
            const rules = ruleset([
                rule(dom('button').when(isVisible), type('next')),
                rule(type('next'), score(fnode => fnode.element.getAttribute('type') === 'submit' ? 1 : 0), {name: 'nextTypeSubmit'}),
                rule(type('next'), score(fnode => numAttrMatches(/login|log-in|log_in|signon|sign-on|sign_on|signin|sign-in|sign_in/gi, fnode.element)), {name: 'nextLoginAttrs'}),
                rule(type('next'), score(fnode => numContentMatches(/sign in|signin|log in|login/gi, fnode.element)), {name: 'nextButtonContents'}),
            ]);
            return rules;
        }
    }
);

trainees.set(
    'username',
    {coeffs: new Map([  // [rule name, coefficient]
        ['emailKeywords', 1.2665141820907593],
        ['loginKeywords', 7.138837814331055],
        ['headerRegistrationKeywords', -0.8720579147338867],
        ['buttonRegistrationKeywordsGte1', -2.178023338317871],
        ['formPasswordFieldsGte2', -4.264151096343994],
        ['formTextFields', -1.4122109413146973],
    ]),
    // Bias: -2.891770362854004

     viewportSize: VIEWPORT_SIZE,
     // The content-area size to use while training.

     vectorType: 'username',
     // The type of node to extract features from when using the Vectorizer

     rulesetMaker:
        function () {
            const loginRegex = /login|log-in|log_in|signon|sign-on|sign_on|username/gi;  // no 'user-name' or 'user_name' found in first 20 training samples
            const registerRegex = /create|register|reg|sign up|signup|join/gi;

            /**
             * Return a rule which is 1 if the number of keyword occurrences on
             * the fnode is >= ``num``.
             */
            function keywordCountRule(inType, keywordRegex, baseName) {
                return rule(type(inType), score(fnode => numAttrMatches(keywordRegex, fnode.element)),  // === drops accuracy on first 20 training samples from 95% to 70%.
                            {name: baseName})
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

            /**
             * Return the number of registration keywords found on buttons in
             * the same form as the username element.
             */
            function numRegistrationKeywordsOnButtons(usernameElement) {
                let num = 0;
                const form = ancestorForm(usernameElement);
                if (form !== null) {
                    for (const button of Array.from(form.querySelectorAll('button'))) {
                        num += numContentMatches(registerRegex, button) + numAttrMatches(registerRegex, button);
                    }
                    for (const input of Array.from(form.querySelectorAll('input[type=submit],input[type=button]'))) {
                        num += numAttrMatches(registerRegex, input);
                    }
                }
                return num;
            }

            function first(iterable, defaultValue = null) {
                for (const i of iterable) {
                    return i;
                }
                return defaultValue;
            }

            function *filter(iterable, predicate) {
                for (const i of iterable) {
                    if (predicate(i)) {
                        yield i;
                    }
                }
            }

            function ancestorForm(element) {
                // TOOD: Could probably be turned into upUntil(el, pred or selector), to go with plain up().
                return first(filter(ancestors(element), e => e.tagName === 'FORM'));
            }

            /**
             * Return the number of matches to a selector within a parent
             * element. Obey my convention of null meaning nothing returned,
             * for functions expected to return 1 or 0 elements.
             */
            function numSelectorMatches(element, selector) {
                // TODO: Could generalize to within(element, predicate or selector).length.
                //console.log('ELE, QSA:', (element === null) ? null : typeof element, (element === null) ? null : element.tagName, element.querySelectorAll);
                // element is a non-null thing whose qsa prop is undefined.
                return (element === null) ? 0 : element.querySelectorAll(selector).length;
            }

            const rules = ruleset([
                rule(dom('input[type=email],input[type=text],input[type=""],input:not([type])').when(isVisible), type('username')),
                // Look at "login"-like keywords on the <input>:
                // TODO: If slow, lay down the count as a note.
                keywordCountRule('username', loginRegex, 'loginKeywords'),
                // Look at "email"-like keywords on the <input>:
                keywordCountRule('username', /email/gi, 'emailKeywords'),
                // Maybe also try the 2 closest headers, within some limit.
                rule(type('username'), score(fnode => numContentMatches(registerRegex, closestHeaderAbove(fnode.element))), {name: 'headerRegistrationKeywords'}),
                // If there is a Create or Join or Sign Up button in the form,
                // it's probably an account creation form, not a login one.
                // TODO: This is O(n * m). In a Prolog solution, we would first find all the forms, then characterize them as Sign-In-having or not, etc.:
                // signInForm(F) :- tagName(F, 'form'), hasSignInButtons(F).
                // Then this rule would say: contains(F, U), signInForm(F).
                rule(type('username'), score(fnode => numRegistrationKeywordsOnButtons(fnode.element) >= 1), {name: 'buttonRegistrationKeywordsGte1'}),
                // If there is more than one password field, it's more likely a sign-up form.
                rule(type('username'), score(fnode => numSelectorMatches(ancestorForm(fnode.element), 'input[type=password]') >= 2), {name: 'formPasswordFieldsGte2'}),
                // Login forms are short. Many fields smells like a sign-up form or payment form.
                rule(type('username'), score(fnode => numSelectorMatches(ancestorForm(fnode.element), 'input[type=text]')), {name: 'formTextFields'}),
                rule(type('username').max(), out('username'))
            ]);
            return rules;
        }
    }
);

export default trainees;
