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

// const DEVELOPMENT = true;

const loginRegex =
  /login|log-in|log_in|signon|sign-on|sign_on|signin|sign-in|sign_in/gi;
const registerRegex = /create|register|reg|sign up|signup|join|new/gi;

function formMethodPost(fnode) {
  return fnode.element.method == "post";
}
function formActionSignUpLike(fnode) {
  return registerRegex.test(fnode.element.action);
}

function formActionNotLogin(fnode) {
  return !loginRegex.test(fnode.element.action);
}
//  function hasEmailField();
//  function hasUsernameField();
//  function hasEmailAndUsernameField();
//  function hasPasswordField(); // type=password
//  function hasConfirmPasswordField();
//  function passwordFieldHasACFieldnameNewPassword(); // autocomplete=new-password
//  function nextInputIsConfirm();

const coefficients = {
  signup: [
    ["formMethodIsPost", 1],
    ["formActionIsSignUpLike", 1],
    ["formMethodNotLoginLike", 1],
  ],
};

const biases = [["signup", 1]];

const rules = ruleset([
  rule(dom("form").when(isVisible), type("signup")),

  rule(type("signup"), score(formMethodPost), { name: "formMethodIsPost" }),
  rule(type("signup"), score(formActionSignUpLike), {
    name: "formActionIsSignUpLike",
  }),
  rule(type("signup"), score(formActionNotLogin), {
    name: "formMethodNotLoginLike",
  }),
  coefficients,
  biases,
]);

const trainees = new Map();
const VIEWPORT_SIZE = {
  width: 1366,
  height: 768,
};

const signupTrainee = {
  coeffs: new Map([coefficients["signup"]]),
  viewportSize: VIEWPORT_SIZE,
  vectorType: "signup",
  rulesetMaker: () => {
    return rules;
  },
};

trainees.set("signup", signupTrainee);

export default trainees;
