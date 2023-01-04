/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Machine learning model for identifying sign-up scenarios using Fathom.
 */

const EXPORTED_SYMBOLS = ["SignUpRuleset"];

import { dom, element, out, rule, ruleset, score, type } from "fathom-web";
import {
  identity,
  isVisible,
  min,
  setDefault,
} from "fathom-web/utilsForFrontend";

const loginRegex =
  /login|log-in|log_in|signon|sign-on|sign_on|signin|sign-in|sign_in/gi;
const registerRegex = /create|register|reg|sign up|signup|join|new/gi;

const coefficients = {
  signup: new Map([
    ["formMethodPost", 1],
    ["formActionSignUpLike", 1],
    ["formActionNotLoginLike", 1],
    ["formHasInputChildren", 1],
    ["formAttributesSignupLike", 1],
    ["formHasChildrenWithAutocompleteNewPassword", 1],
    ["hasTwoChildrenWithAutocompleteNewPassword", 1],
    ["formHasNoCurrentPassword", 1],
  ]),
};

const biases = [["signup", 1]];

function createRuleset() {
  function formHasNoCurrentPassword(fnode) {
    return !atLeastOne(
      fnode.element.querySelectorAll("input[autocomplete='current-password']")
    );
  }
  function formHasTwoChildrenWithAutocompleteNewPassword(fnode) {
    return atLeastOne(
      fnode.element.querySelectorAll(
        "input[type='password'][autocomplete='new-password']"
      )
    );
  }
  function formHasChildrenWithAutocompleteNewPassword(fnode) {
    return atLeastOne(
      fnode.element.querySelectorAll(
        "input[type='password'][autocomplete='new-password']"
      )
    );
  }
  function formAttributesSignupLike(fnode) {
    const formAttr = fnode.element.attributes;
    return (
      checkValueAgainstRegex(formAttr.name, registerRegex) ||
      checkValueAgainstRegex(formAttr.id, registerRegex)
    );
  }
  function formHasInputChildren(fnode) {
    return atLeastOne(fnode.element.querySelectorAll("input"));
  }
  function formActionSignUpLike(fnode) {
    return checkValueAgainstRegex(fnode.element.action, registerRegex);
  }

  function formActionNotLoginLike(fnode) {
    return !checkValueAgainstRegex(fnode.element.action, loginRegex);
  }
  function formMethodPost(fnode) {
    return fnode.element.method === "post";
  }

  // helper functions
  function checkValueAgainstRegex(value, regexExp) {
    return regexExp.test(value);
  }
  function atLeastOne(iter) {
    return iter.length >= 1;
  }

  const rules = ruleset([
    rule(dom("form").when(isVisible), type("signup")),
    rule(type("signup"), score(formHasNoCurrentPassword), {
      name: "formHasNoCurrentPassword",
    }),
    rule(type("signup"), score(formHasTwoChildrenWithAutocompleteNewPassword), {
      name: "hasTwoChildrenWithAutocompleteNewPassword",
    }),
    rule(type("signup"), score(formHasChildrenWithAutocompleteNewPassword), {
      name: "formHasChildrenWithAutocompleteNewPassword",
    }),
    rule(type("signup"), score(formAttributesSignupLike), {
      name: "formAttributesSignupLike",
    }),
    rule(type("signup"), score(formHasInputChildren), {
      name: "formHasInputChildren",
    }),
    rule(type("signup"), score(formMethodPost), { name: "formMethodPost" }),
    rule(type("signup"), score(formActionSignUpLike), {
      name: "formActionSignUpLike",
    }),
    rule(type("signup"), score(formActionNotLoginLike), {
      name: "formActionNotLoginLike",
    }),
    rule(type("signup"), out("signup")),
  ]);
  return rules;
}

const trainees = new Map();

const signupTrainee = {
  coeffs: coefficients.signup,
  viewportSize: { width: 1024, height: 768 },
  // vectorType: "signup",
  rulesetMaker: () => createRuleset(),
};

trainees.set("signup", signupTrainee);

export default trainees;
