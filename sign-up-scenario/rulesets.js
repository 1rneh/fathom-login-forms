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

//  function hasEmailField();
//  function hasUsernameField();
//  function hasEmailAndUsernameField();
//  function hasPasswordField(); // type=password
//  function hasConfirmPasswordField();
//  function passwordFieldHasACFieldnameNewPassword(); // autocomplete=new-password
//  function nextInputIsConfirm();

const coefficients = {
  signup: new Map([
    ["formMethodIsPost", 1],
    ["formActionIsSignUpLike", 1],
    ["formMethodNotLoginLike", 1],
  ]),
};

const biases = [["signup", 1]];

function createRuleset() {
  function formMethodPost(fnode) {
    return fnode.element.method === "post";
  }
  function formActionSignUpLike(fnode) {
    return checkValueAgainstRegex(fnode.element.action, registerRegex);
  }

  function formActionNotLogin(fnode) {
    return !checkValueAgainstRegex(fnode.element.action, loginRegex);
  }
  // helper functions
  function checkValueAgainstRegex(value, regexExp) {
    return regexExp.test(value);
  }
  const rules = ruleset([
    rule(dom("form").when(isVisible), type("signup")),

    rule(type("signup"), score(formMethodPost), { name: "formMethodIsPost" }),
    rule(type("signup"), score(formActionSignUpLike), {
      name: "formActionIsSignUpLike",
    }),
    rule(type("signup"), score(formActionNotLogin), {
      name: "formMethodNotLoginLike",
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
