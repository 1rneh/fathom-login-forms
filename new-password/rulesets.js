/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-disable import/no-unresolved */
import {dom, out, rule, ruleset, score, type} from 'fathom-web';
import {euclidean} from 'fathom-web/clusters';
import {min} from 'fathom-web/utilsForFrontend';

const coefficients = {
  "newPassword": [
    ["hasPasswordLabel", 0.0],
  ]
};

const biases = [
  ["newPassword", 0.0]
];

const passwordRegex = /password|passwort/gi;

function makeRuleset(coeffs, biases) {

  function hasPasswordLabel(fnode) {
    let labels = fnode.element.labels;
    // TODO: Should I be concerned with multiple labels?
    if (labels != null && labels.length > 0) {
      return !!labels[0].innerText.match(passwordRegex);
    }
    const closestLabel = closestSelectorAboveElementWithinElement(fnode.element, fnode.element.form, 'label');
    if (closestLabel != null) {
      return !!closestLabel.innerText.match(passwordRegex);
    }
    return false;
  }

  function closestSelectorAboveElementWithinElement(toElement, withinElement, querySelector) {
    if (withinElement !== null) {
      const nodeList = Array.from(withinElement.querySelectorAll(querySelector));
      if (nodeList.length) {
        nodeList.filter(node => isAbove(node, toElement));
        return min(nodeList, node => euclidean(node, toElement));
      }
    }
    return null;
  }

  function isAbove(a, b) {
    return a.getBoundingClientRect().bottom <= b.getBoundingClientRect().top;
  }

  return ruleset([
      rule(dom('input'), type('newPassword')),
      rule(type('newPassword'), score(hasPasswordLabel), {name: 'hasPasswordLabel'}),
      rule(type('newPassword'), out('newPassword'))
    ],
    coeffs,
    biases);
}

const trainees = new Map();
const VIEWPORT_SIZE = {width: 1366, height: 768};

const FEATURES = ['newPassword'];
for (const feature of FEATURES) {
  const ruleset = {
    coeffs: new Map(coefficients[feature]),
    viewportSize: VIEWPORT_SIZE,
    vectorType: feature,
    rulesetMaker: () => makeRuleset([
        ...coefficients.newPassword,
      ],
      biases),
  };
  trainees.set(feature, ruleset);
}

export default trainees;
