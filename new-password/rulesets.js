/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-disable import/no-unresolved */
import {dom, out, rule, ruleset, score, type} from "fathom-web";
import {euclidean} from "fathom-web/clusters";
import {min} from "fathom-web/utilsForFrontend";

const coefficients = {
  "new": [
    ["hasPasswordLabel", 0.0],
  ]
};

const biases = [
  ["new", 0.0]
];

const passwordRegex = /password|passwort|رمز عبور|mot de passe|パスワード|신규 비밀번호|wachtwoord|senha|Пароль|parol|密码|contraseña/gi;

function makeRuleset(coeffs, biases) {

  function hasPasswordLabel(fnode) {
    const element = fnode.element;

    // Check element.labels
    const labels = element.labels;
    // TODO: Should I be concerned with multiple labels?
    if (labels != null && labels.length > 0) {
      return !!labels[0].innerText.match(passwordRegex);
    }

    // Check element.aria-labelledby
    let labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy != null) {
      labelledBy = labelledBy.split(" ").map(id => element.ownerDocument.getElementById(id));
      if (labelledBy.length === 1) {
        console.log(labelledBy);
        return !!labelledBy[0].innerText.match(passwordRegex);
      } else if (labelledBy.length > 1) {
        console.log(labelledBy);
        return !!min(labelledBy, node => euclidean(node, element)).innerText.match(passwordRegex);
      }
    }

    // Check all text within the <td>'s of the <tr>

    // Check the closest label in the form as determined by euclidean distance
    const closestLabel = closestSelectorElementWithinElement(element, element.form, "label");
    if (closestLabel != null) {
      return !!closestLabel.innerText.match(passwordRegex);
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

  // Check aria-label text

  return ruleset([
      rule(dom("input[type=text],input[type=password],input[type=\"\"],input:not([type])"), type("new")),
      rule(type("new"), score(hasPasswordLabel), {name: "hasPasswordLabel"}),
      rule(type("new"), out("new"))
    ],
    coeffs,
    biases);
}

const trainees = new Map();
const VIEWPORT_SIZE = {width: 1366, height: 768};

const FEATURES = ["new"];
for (const feature of FEATURES) {
  const ruleset = {
    coeffs: new Map(coefficients[feature]),
    viewportSize: VIEWPORT_SIZE,
    vectorType: feature,
    rulesetMaker: () => makeRuleset([
        ...coefficients.new,
      ],
      biases),
  };
  trainees.set(feature, ruleset);
}

export default trainees;
