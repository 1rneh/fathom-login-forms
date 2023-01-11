/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Machine learning model for identifying sign-up scenarios using Fathom.
 */

import { dom, element, out, rule, ruleset, score, type } from "fathom-web";
import { isVisible, attributesMatch, min } from "fathom-web/utilsForFrontend";
import { euclidean } from "fathom-web/clusters";

const loginRegex =
  /login|log-in|log_in|signon|sign-on|sign_on|signin|sign-in|sign_in/gi;
const registerRegex =
  /create|register|reg|sign up|signup|sign-up|sign_up|join|new/gi; // When using RegExp.prototype.test() 'reg" also covers register, right?
const emailRegex = /email|e-mail|mail/gi; // When using RegExp.prototype.test() 'mail" also covers email and e-mail, right?
const usernameRegex = /user/gi;
const newPasswordRegex = /new|create|confirm/gi;
// const currentPasswordRegex = /current/gi;

const coefficients = {
  signup: new Map([
    ["formMethodPost", 1],
    ["formAttributesSignUpLike", 1],
    ["formAttributesNotLoginLike", 1],
    ["formHasNoAcCurrentPassword", 1],
    ["formHasAcNewPassword", 1],
    ["formHasEmailField", 1],
    ["formHasUsernameAndEmailInputField", 1],
    ["formIsNotChangePassword", 1],
    ["fromHasRegisterButton", 1],
    ["fromHasNoLoginButton", 1],
    ["closestElementIsEmailLabelLike", 1],
    ["closestElementIsNewPasswordLabelLike", 1],
  ]),
};

const biases = [["signup", 1]];

// const coefficients = {
//   signup: new Map([
//     ["formMethodPost", 0.0001942964008776471],
//     ["formAttributesSignUpLike", 7.4411773681640625],
//     ["formAttributesNotLoginLike", -9.358631134033203],
//     ["formHasNoAcCurrentPassword", 4.367221832275391],
//     ["formHasAcNewPassword", 0.12834930419921875],
//     ["formHasEmailField", -0.14734987914562225],
//     ["formHasUsernameAndEmailInputField", 7.023597240447998],
//     ["formIsNotChangePassword", -0.1772853583097458],
//     ["fromHasRegisterButton", -0.05808427929878235],
//     ["fromHasNoLoginButton", -9.9032564163208],
//   ]),
// };

// const biases = [["signup", 3.892904043197632]];

function createRuleset() {
  // function confirmEmail

  function closestElementIsNewPasswordLabelLike(fnode) {
    // Should we also consider autocomplete="new-password"
    const passwordFields = fnode.element.querySelectorAll(
      "input[type=password][autocomplete=new-password]"
    );
    return atLeastOne(
      filter(passwordFields, (passwordField) => {
        const previousElem = passwordField.previousElementSibling;
        const closestLabel = closestSelectorElementWithinElement(
          passwordField,
          previousElem,
          "label"
        );
        return (
          closestLabel &&
          checkValueAgainstRegex(closestLabel.textContext, newPasswordRegex)
        );
      })
    );
  }
  function closestElementIsEmailLabelLike(fnode) {
    const emailFields = getEmailInputElements(fnode.element);
    return atLeastOne(
      filter(emailFields, (emailField) => {
        const previousElem = emailField.previousElementSibling;
        const closestLabel = closestSelectorElementWithinElement(
          emailField,
          previousElem,
          "label"
        );
        return closestLabel && emailRegex.test(closestLabel.textConext);
      })
    );
  }

  function fromHasRegisterButton(fnode) {
    const buttons = getButtons(fnode.element);
    return atLeastOne(
      filter(buttons, (button) =>
        attributesMatch(button, (attr) =>
          checkValueAgainstRegex(attr, registerRegex)
        )
      )
    );
  }
  function fromHasNoLoginButton(fnode) {
    const buttons = getButtons(fnode.element);
    return atLeastOne(
      filter(buttons, (button) =>
        attributesMatch(button, (attr) =>
          checkValueAgainstRegex(attr, loginRegex)
        )
      )
    );
  }
  function formHasUsernameAndEmailInputField(fnode) {
    const possibleFields = fnode.element.querySelectorAll(
      "input[type=email], input[type=text]"
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
    return atLeastOne(getEmailInputElements(fnode.element));
  }

  function formHasNoAcCurrentPassword(fnode) {
    return !atLeastOne(
      fnode.element.querySelectorAll(
        "input[type=password], input[autocomplete=current-password]"
      )
    );
  }
  function formHasAcNewPassword(fnode) {
    return atLeastOne(
      fnode.element.querySelectorAll(
        "input[type=password], input[autocomplete=new-password]"
      )
    );
  }
  // Should it be avoided to have rules depend on others rules?
  function formIsNotChangePassword(fnode) {
    return formHasAcNewPassword(fnode) && formHasNoAcCurrentPassword(fnode);
  }

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
  function closestSelectorElementWithinElement(
    toElement,
    withinElement,
    querySelector
  ) {
    if (withinElement) {
      let matchingElements = Array.from(
        withinElement.querySelectorAll(querySelector)
      );
      if (matchingElements.length) {
        return min(matchingElements, (match) => euclidean(match, toElement));
      }
    }
    return null;
  }
  function getEmailInputElements(element) {
    const possibleEmailFields = element.querySelectorAll(
      "input[type=email], input[type=text]"
    );

    return filter(possibleEmailFields, (field) => {
      attributesMatch(field, (attr) =>
        checkValueAgainstRegex(attr, emailRegex)
      );
    });
  }
  function getButtons(element) {
    return element.querySelectorAll("input[type=submit],input[type=button]");
  }
  function checkValueAgainstRegex(value, regexExp) {
    return regexExp.test(value.toLowerCase());
  }
  function atLeastOne(iterable) {
    return iterable.length >= 1;
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
    rule(type("form"), score(formHasNoAcCurrentPassword), {
      name: "formHasNoAcCurrentPassword",
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
    rule(type("form"), score(fromHasRegisterButton), {
      name: "fromHasRegisterButton",
    }),
    rule(type("form"), score(fromHasNoLoginButton), {
      name: "fromHasNoLoginButton",
    }),
    rule(type("form"), score(closestElementIsEmailLabelLike), {
      name: "closestElementIsEmailLabelLike",
    }),
    rule(type("form"), score(closestElementIsNewPasswordLabelLike), {
      name: "closestElementIsNewPasswordLabelLike",
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
