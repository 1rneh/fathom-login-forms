/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-disable import/no-unresolved */
import {dom, out, rule, ruleset, score, type} from "fathom-web";
import {euclidean} from "fathom-web/clusters";
import {isVisible, min} from "fathom-web/utilsForFrontend";

const coefficients = {
  "new": [
    ["hasPasswordLabel", 4.429488182067871],
    ["hasPasswordAriaLabel", 14.41894817352295],
    ["hasPasswordPlaceholder", 3.6812350749969482],
    ["forgotPasswordLinkInnerText", -8.92212963104248],
    ["forgotPasswordLinkHref", -15.914643287658691],
    ["idIsPassword1Or2", 6.294931411743164],
    ["nameIsPassword1Or2", 6.619712829589844],
    ["idMatchesPassword", 4.032618045806885],
    ["nameMatchesPassword", 0.9834535717964172],
  ]
};

const biases = [
  ["new", -3.512035608291626]
];

const passwordRegex = /password|passwort|رمز عبور|mot de passe|パスワード|신규 비밀번호|wachtwoord|senha|Пароль|parol|密码|contraseña/i;
const forgotPasswordInnerTextRegex = /vergessen|forgot|oublié|dimenticata|Esqueceu|Забыли|忘记|找回/i;
const forgotPasswordHrefRegex = /forgot|reset|recovery|change/i;
const password1Or2Regex = /password1|password2/i;

function makeRuleset(coeffs, biases) {

  function hasPasswordLabel(fnode) {
    const element = fnode.element;

    // Check element.labels
    const labels = element.labels;
    // TODO: Should I be concerned with multiple labels?
    if (labels !== null && labels.length > 0) {
      return passwordRegex.test(labels[0].innerText);
    }

    // Check element.aria-labelledby
    let labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy !== null) {
      labelledBy = labelledBy.split(" ").map(id => element.ownerDocument.getElementById(id));
      if (labelledBy.length === 1) {
        return !!labelledBy[0].innerText.match(passwordRegex);
      } else if (labelledBy.length > 1) {
        return passwordRegex.test(min(labelledBy, node => euclidean(node, element)).innerText);
      }
    }

    const parentElement = element.parentElement;
    // Check if the input is in a <td>, and, if so, check the innerText of the containing <tr>
    if (parentElement.tagName === "TD") {
      // TODO: How bad is the assumption that the <tr> won't be the parent of the <td>?
      return passwordRegex.test(parentElement.parentElement.innerText);
    }

    // Check if the input is in a <dd>, and, if so, check the innerText of the preceding <dt>
    if (parentElement.tagName === "DD") {
      return passwordRegex.test(parentElement.previousElementSibling.innerText);
    }

    // Check the closest label in the form as determined by euclidean distance
    const closestLabel = closestSelectorElementWithinElement(element, element.form, "label");
    if (closestLabel !== null) {
      return passwordRegex.test(closestLabel.innerText);
    }

    return false;
  }

  function closestSelectorElementWithinElement(toElement, withinElement, querySelector) {
    if (withinElement !== null) {
      let nodeList = Array.from(withinElement.querySelectorAll(querySelector));
      if (nodeList.length) {
        return min(nodeList, node => euclidean(node, toElement));
      }
    }
    return null;
  }

  function hasPasswordAriaLabel(fnode) {
    const ariaLabel = fnode.element.getAttribute("aria-label");
    if (ariaLabel !== null) {
      return passwordRegex.test(ariaLabel);
    }
    return false;
  }

  function hasPasswordPlaceholder(fnode) {
    const placeholder = fnode.element.getAttribute("placeholder");
    if (placeholder !== null) {
      return passwordRegex.test(placeholder);
    }
    return false;
  }

  function forgotPasswordLinkInnerText(fnode) {
    return hasFormAnchorMatchingPredicate(fnode.element, anchor => {
      return passwordRegex.test(anchor.innerText) && forgotPasswordInnerTextRegex.test(anchor.innerText);
    });
  }

  function hasFormAnchorMatchingPredicate(element, matchingPredicate) {
    const form = element.form;
    if (form !== null) {
      const anchors = Array.from(form.querySelectorAll('a'));
      return anchors.some(matchingPredicate);
    }
    return false;
  }

  function forgotPasswordLinkHref(fnode) {
    return hasFormAnchorMatchingPredicate(fnode.element, anchor => {
      return passwordRegex.test(anchor.href) && forgotPasswordHrefRegex.test(anchor.href);
    });
  }

  function idIsPassword1Or2(fnode) {
    return password1Or2Regex.test(fnode.element.id);
  }

  function nameIsPassword1Or2(fnode) {
    return password1Or2Regex.test(fnode.element.name);
  }

  function idMatchesPassword(fnode) {
    return passwordRegex.test(fnode.element.id);
  }

  function nameMatchesPassword(fnode) {
    return passwordRegex.test(fnode.element.name);
  }

  return ruleset([
      rule(dom("input[type=text],input[type=password],input[type=\"\"],input:not([type])").when(isVisible), type("new")),
      rule(type("new"), score(hasPasswordLabel), {name: "hasPasswordLabel"}),
      rule(type("new"), score(hasPasswordAriaLabel), {name: "hasPasswordAriaLabel"}),
      rule(type("new"), score(hasPasswordPlaceholder), {name: "hasPasswordPlaceholder"}),
      rule(type("new"), score(forgotPasswordLinkInnerText), {name: "forgotPasswordLinkInnerText"}),
      rule(type("new"), score(forgotPasswordLinkHref), {name: "forgotPasswordLinkHref"}),
      rule(type("new"), score(idIsPassword1Or2), {name: "idIsPassword1Or2"}),
      rule(type("new"), score(nameIsPassword1Or2), {name: "nameIsPassword1Or2"}),
      rule(type("new"), score(idMatchesPassword), {name: "idMatchesPassword"}),
      rule(type("new"), score(nameMatchesPassword), {name: "nameMatchesPassword"}),
      rule(type("new"), out("new"))
    ],
    coeffs,
    biases);
}

const trainees = new Map();
const VIEWPORT_SIZE = {width: 1366, height: 768};

const FEATURES = ["new"];
for (const feature of FEATURES) {
  const trainee = {
    coeffs: new Map(coefficients[feature]),
    viewportSize: VIEWPORT_SIZE,
    vectorType: feature,
    rulesetMaker: () => makeRuleset([
        ...coefficients.new,
      ],
      biases),
    isTarget: fnode => (fnode.element.dataset.fathom === "new" ||
                        fnode.element.dataset.fathom === "confirm")
  };
  trainees.set(feature, trainee);
}

export default trainees;
