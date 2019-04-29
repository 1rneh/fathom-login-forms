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

function numAttrOrContentMatches(regex, element) {
    return numContentMatches(regex, element) + numAttrMatches(regex, element);
}

/**
 * Return the "boiled-down" inner text of a fnode, stripping off surrounding
 * space and lowercasing it for comparison.
 */
function boiledText(fnode) {
    return fnode.element.innerText.trim().toLowerCase();
}

function isButton(fnode) {
    return fnode.element.tagName === 'BUTTON';
}

function isInput(fnode) {
    return fnode.element.tagName === 'INPUT';
}

function isAnchor(fnode) {
    return fnode.element.tagName === 'A';
}

function isInputSubmit(fnode) {
    return isInput(fnode) && fnode.element.getAttribute('type') === 'submit';
}

function typeAttrIsSubmit(fnode) {
    return fnode.element.getAttribute('type') === 'submit';
}

/**
 * Return a function which &&s the passed-in functions together. The returned
 * function takes a single arg and passes it to each of the functions.
 */
function and(...functions) {
    return function (arg) {
        let ret = true;
        for (const f of functions) {
            if (!(ret = f(arg))) {
                return ret;
            }
        }
        return ret;
    }
}

/**
 * Return the given attr of a DOM node, "" if it is absent.
 *
 * Firefox returns null on absent elements, and that makes for more branches
 * downstream.
 */
function attr(element, attrName) {
    return element.getAttribute(attrName) || '';
}

/**
 * Return a big, fat ruleset that finds username fields, password fields, and Next buttons.
 */
function makeRuleset() {
    const coeffs = new Map([  // [rule name, coefficient]
        // Username field:
        ['emailKeywords', 1.2665141820907593],
        ['loginKeywords', 7.138837814331055],
        ['headerRegistrationKeywords', -0.8720579147338867],
        ['buttonRegistrationKeywordsGte1', -2.178023338317871],
        ['formPasswordFieldsGte2', -4.264151096343994],
        ['formTextFields', -1.4122109413146973],

        // "Next" button:
        ['nextAnchorIsJavaScript', -3.328075647354126],
        ['nextButtonTypeSubmit', 2.2774908542633057],
        ['nextInputTypeSubmit', 2.0744035243988037],
        ['nextInputTypeImage', 4.304122447967529],
        ['nextLoginAttrs', -0.10403445363044739],
        ['nextButtonContentContainsLogIn', 1.3002732992172241],
        ['nextButtonContentIsLogIn', 3.4924819469451904],
        ['nextInputContentContainsLogIn', 2.5252463817596436],
        ['nextInputContentIsLogIn', 2.5901713371276855],
        ['nextButtonContentIsNext', 0.24742576479911804],
    ]);

    const rules = ruleset([
        // Username fields:

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

        rule(type('username').max(), out('username')),


        // Next buttons:

        rule(dom('button,input[type=submit],input[type=image]').when(isVisible), type('next')),

        // Prune down the <a> candidates in the hopes of better speed and accuracy:
        rule(dom('a').when(fnode => numAttrOrContentMatches(/log|sign/gi, fnode.element) && isVisible(fnode)), type('next')),

        // <a href='javascript:...'>. Most login anchors are JS calls, often hard-coded. Other anchors tend to be links to a login page.
        rule(type('next'), score(and(isAnchor, fnode => attr(fnode.element, 'href').startsWith('javascript:'))), {name: 'nextAnchorIsJavaScript'}),

        // <button type=submit>:
        rule(type('next'), score(and(isButton, typeAttrIsSubmit)), {name: 'nextButtonTypeSubmit'}),

        // Weight type=submit on <input>s separately, in case they're different:
        rule(type('next'), score(and(isInput, typeAttrIsSubmit)), {name: 'nextInputTypeSubmit'}),

        // A few buttons are <input type=image>:
        rule(type('next'), score(fnode => isInput(fnode) && fnode.element.getAttribute('type') === 'image'), {name: 'nextInputTypeImage'}),

        // Login-smelling attrs on <button>s, <input>s and <a>s:
        rule(type('next'), score(fnode => numAttrMatches(/login|log-in|log_in|signon|sign-on|sign_on|signin|sign-in|sign_in/gi, fnode.element)), {name: 'nextLoginAttrs'}),

        // Login-smelling contents (on elements that have contents):
        // Maybe one of these can go away.
        rule(type('next'), score(fnode => numContentMatches(/sign in|signin|log in|login/gi, fnode.element)), {name: 'nextButtonContentContainsLogIn'}),
        rule(type('next'), score(fnode => ['log in', 'login', 'sign in'].includes(boiledText(fnode))), {name: 'nextButtonContentIsLogIn'}),

        // Login smell bonus on value attr, since that's the visible label on <input>s:
        // Maybe one of these can go away too.
        rule(type('next'), score(fnode => isInputSubmit(fnode) && numAttrMatches(/sign in|signin|log in|login/gi, fnode.element, ['value'])), {name: 'nextInputContentContainsLogIn'}),
        rule(type('next'), score(fnode => isInputSubmit(fnode) && ['log in', 'login', 'sign in'].includes(attr(fnode.element, 'value').trim().toLowerCase())), {name: 'nextInputContentIsLogIn'}),

        // "Next" is a more ambiguous button title than "Log In", so let it get a different weight:
        rule(type('next'), score(and(isButton, fnode => boiledText(fnode) === 'next')), {name: 'nextButtonContentIsNext'}),

        rule(type('next'), out('next')),
    ],
    {coeffs, biases: [['username', -2.891770362854004], ['next', -4.678980350494385]]});

    return rules;
}

trainees.set(
    'next',
    {coeffs: new Map([  // [rule name, coefficient]
        // These dummy values exist only to demarcate which rules to extract
        // weights from when vectorizing this type.
        ['nextAnchorIsJavaScript', 1],
        ['nextButtonTypeSubmit', 1],
        ['nextInputTypeSubmit', 1],
        ['nextInputTypeImage', 1],
        ['nextLoginAttrs', 1],
        ['nextButtonContentContainsLogIn', 1],
        ['nextButtonContentIsLogIn', 1],
        ['nextInputContentContainsLogIn', 1],
        ['nextInputContentIsLogIn', 1],
        ['nextButtonContentIsNext', 1],
     ]),

     viewportSize: VIEWPORT_SIZE,
     // The content-area size to use while training

     vectorType: 'next',
     // The type of node to extract features from when using the Vectorizer

     rulesetMaker: makeRuleset
    }
);

trainees.set(
    'username',
    {coeffs: new Map([  // [rule name, coefficient]
        ['emailKeywords', 1],
        ['loginKeywords', 1],
        ['headerRegistrationKeywords', 1],
        ['buttonRegistrationKeywordsGte1', 1],
        ['formPasswordFieldsGte2', 1],
        ['formTextFields', 1],
     ]),

     viewportSize: VIEWPORT_SIZE,
     // The content-area size to use while training.

     vectorType: 'username',
     // The type of node to extract features from when using the Vectorizer

     rulesetMaker: makeRuleset
    }
);

export default trainees;
