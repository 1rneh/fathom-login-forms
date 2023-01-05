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
  attributesMatch,
  ancestors,
} from "fathom-web/utilsForFrontend";

const loginRegex =
  /login|log-in|log_in|signon|sign-on|sign_on|signin|sign-in|sign_in/gi;
const registerRegex =
  /create|register|reg|sign up|signup|sign-up|sign_up|join|new/gi; // When using RegExp.prototype.test() 'reg" also covers register, right?
const emailRegex = /email|e-mail|mail/gi; // When using RegExp.prototype.test() 'mail" also covers email and e-mail, right?
const usernameRegex = /user/gi;
const passwordRegex = /new|create|/gi;
const newPasswordRegex = /new|create|confirm/gi;
const currentPasswordRegex = /current/gi;

const coefficients = {
  signup: new Map([
    ["formMethodPost", 1],
    ["formAttributesSignUpLike", 1],
    ["formAttributesNotLoginLike", 1],
    ["formHasNoCurrentPassword", 1],
    ["formHasAcNewPassword", 1],
    ["formHasEmailField", 1],
    ["formHasUsernameAndEmailInputField", 1],
    ["formIsNotChangePassword", 1],
    // ["buttonLikeSignUpRank", 1],
  ]),
};

const biases = [["signup", 1]];

function createRuleset() {
  function formHasUsernameAndEmailInputField(fnode) {
    const possibleFields = fnode.element.querySelectorAll(
      "input[type='email'], input[type='text'], input:not([type])"
    );
    let containsEmail = false;
    let containsUsername = false;

    for (const field of possibleFields) {
      if (
        attributesMatch(field, (attr) =>
          checkValueAgainstRegex(attr, emailRegex)
        )
      ) {
        if (containsUsername) {
          return true;
        } else if (!containsEmail) {
          containsEmail = true;
        }
      } else if (
        attributesMatch(field, (attr) =>
          checkValueAgainstRegex(attr, usernameRegex)
        )
      ) {
        if (containsEmail) {
          return true;
        } else if (!containsUsername) {
          containsUsername = true;
        }
      }
    }
    return false;
  }
  function formHasEmailField(fnode) {
    const possibleEmailFields = fnode.element.querySelectorAll(
      "input[type='email'], input[type='text'],input:not([type])"
    );

    return atLeastOne(
      filter(possibleEmailFields, (pwField) => {
        attributesMatch(pwField, (attr) =>
          checkValueAgainstRegex(attr, emailRegex)
        );
      })
    );
  }

  function formHasNoCurrentPassword(fnode) {
    return !atLeastOne(
      fnode.element.querySelectorAll(
        "[input-type='password'][input-autocomplete='new-password']"
      )
    );
  }
  function formHasAcNewPassword(fnode) {
    return atLeastOne(
      fnode.element.querySelectorAll(
        "[input-type='password'][input-autocomplete='new-password']"
      )
    );
  }
  function formIsNotChangePassword(fnode) {
    return formHasAcNewPassword(fnode) && formHasNoCurrentPassword(fnode);
  }

  // function buttonLikeSignUpRank(fnode) {
  //   const RegisterLike = 1;
  //   const LoginLike = 0;
  //   const NoMatch = 0;

  //   const buttonsInForm = fnode.element.querySelectorAll(
  //     "button, input[type='button'], input[type='submit']"
  //   );
  //   let buttonCases = Array.from(buttonsInForm).map((button) => {
  //     if (
  //       attributesMatch(
  //         button,
  //         (attr) => checkValueAgainstRegex(attr, registerRegex),
  //         ["id", "name", "innerHTML"]
  //       )
  //     ) {
  //       return RegisterLike;
  //     } else if (
  //       attributesMatch(
  //         button,
  //         (attr) => checkValueAgainstRegex(attr, loginRegex),
  //         ["id", "name", "innerHTML"]
  //       )
  //     ) {
  //       return LoginLike;
  //     } else {
  //       return NoMatch;
  //     }
  //   });
  //   // count by case
  // }

  function formAttributesSignUpLike(fnode) {
    return attributesMatch(
      fnode.element,
      (attr) => checkValueAgainstRegex(attr, registerRegex),
      ["action", "id", "name"]
    );
  }

  function formAttributesNotLoginLike(fnode) {
    return !attributesMatch(
      fnode.element,
      (attr) => checkValueAgainstRegex(attr, registerRegex),
      ["action", "id", "name"]
    );
  }
  function formMethodPost(fnode) {
    return fnode.element.method === "post";
  }

  // helper functions
  function checkValueAgainstRegex(value, regexExp) {
    return regexExp.test(value.toLowerCase());
  }
  function atLeastOne(iter) {
    return iter.length >= 1;
  }
  function* filter(iterable, predicate) {
    for (const i of iterable) {
      if (predicate(i)) {
        yield i;
      }
    }
  }

  const rules = ruleset([
    rule(dom("form").when(isVisible), type("form")),
    rule(type("form"), score(formHasNoCurrentPassword), {
      name: "formHasNoCurrentPassword",
    }),
    rule(type("form"), score(formHasAcNewPassword), {
      name: "formHasAcNewPassword",
    }),
    rule(type("form"), score(formAttributesSignUpLike), {
      name: "formAttributesSignUpLike",
    }),
    rule(type("form"), score(formIsNotChangePassword), {
      name: "formIsNotChangePassword",
    }),
    rule(type("form"), score(formMethodPost), { name: "formMethodPost" }),
    rule(type("form"), score(formAttributesNotLoginLike), {
      name: "formAttributesNotLoginLike",
    }),
    rule(type("form"), score(formHasEmailField), {
      name: "formHasEmailField",
    }),
    rule(type("form"), score(formHasUsernameAndEmailInputField), {
      name: "formHasUsernameAndEmailInputField",
    }),
    rule(type("form"), out("form")),
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

trainees.set("form", signupTrainee);

export default trainees;
