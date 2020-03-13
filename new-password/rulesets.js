/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-disable import/no-unresolved */
import {dom, out, rule, ruleset, score, type} from "fathom-web";
import {euclidean} from "fathom-web/clusters";
import {identity, isVisible, min} from "fathom-web/utilsForFrontend";

// Whether this is running in the Vectorizer, rather than in-application, in a
// privileged Chrome context
const DEVELOPMENT = true;

const coefficients = {
  "new": [
    ["hasPasswordLabel", 2.7149229049682617],
    ["hasNewLabel", 0.45097795128822327],
    ["hasConfirmLabel", 2.2106854915618896],
    ["hasConfirmEmailLabel", -3.2878189086914062],
    ["closestLabelMatchesPassword", 1.6291762590408325],
    ["closestLabelMatchesNew", -0.1162780150771141],
    ["closestLabelMatchesConfirm", 1.3217304944992065],
    ["closestLabelMatchesConfirmEmail", -2.3257358074188232],
    ["hasPasswordAriaLabel", 3.0113303661346436],
    ["hasNewAriaLabel", 0.8805380463600159],
    ["hasConfirmAriaLabel", 3.4130001068115234],
    ["hasPasswordPlaceholder", 3.1426496505737305],
    ["hasNewPlaceholder", 1.1650742292404175],
    ["hasConfirmPlaceholder", 1.077685832977295],
    ["hasConfirmEmailPlaceholder", 0.08717037737369537],
    ["forgotPasswordLinkInnerText", -2.1632297039031982],
    ["forgotPasswordLinkHref", -2.6421539783477783],
    ["forgotPasswordLinkTitle", -3.9319965839385986],
    ["idIsPassword1Or2", 1.8374722003936768],
    ["nameIsPassword1Or2", 1.583190679550171],
    ["idMatchesPassword", 2.284926652908325],
    ["nameMatchesPassword", 2.0525405406951904],
    ["idMatchesPasswordy", 2.5396833419799805],
    ["nameMatchesPasswordy", 3.3658037185668945],
    ["classMatchesPasswordy", 3.812939405441284],
    ["idMatchesLogin", -3.6237170696258545],
    ["nameMatchesLogin", 1.6548441648483276],
    ["classMatchesLogin", -2.0910685062408447],
    ["containingFormHasLoginAction", -0.9044652581214905],
    ["containingFormHasLoginId", -1.7688874006271362],
    ["formButtonIsRegistery", -0.6545770764350891],
    ["formButtonIsLoginy", -3.6265504360198975]
  ]
};

const biases = [
  ["new", -3.018282175064087]
];

const passwordRegex = /password|passwort|رمز عبور|mot de passe|パスワード|신규 비밀번호|wachtwoord|senha|Пароль|parol|密码|contraseña|heslo/i;
const newRegex = /erstellen|create|choose|設定/i;
const confirmRegex = /wiederholen|wiederholung|confirm|repeat|confirmation|verify|retype|repite|確認|の確認|تکرار|re-enter|확인|bevestigen|confirme|Повторите|tassyklamak|再次输入/i;
const emailRegex = /e-mail|email|ایمیل|メールアドレス|이메일|邮箱/i;
const forgotPasswordInnerTextRegex = /vergessen|forgot|oublié|dimenticata|Esqueceu|Забыли|忘记|找回|Zapomenuté|lost/i;
const forgotPasswordHrefRegex = /forgot|reset|recovery|change|lost/i;
const password1Or2Regex = /password1|password2/i;
const passwordyRegex = /pw|pwd|passwd/i;
const loginRegex = /login|Войти|sign in|ورود|登录|Přihlásit se|Авторизоваться|signin|log in/i;
const registerButtonRegex = /create account|Zugang anlegen|Angaben prüfen|Konto erstellen|register|sign up|create an account|create my account|ثبت نام|登録|Cadastrar|Зарегистрироваться|Bellige alynmak/i;


function makeRuleset(coeffs, biases) {
  /**
   * Don't bother with the fairly expensive isVisible() call when we're in
   * production. We fire only when the user clicks an <input> field. They can't
   * very well click an invisible one.
   */
  function isVisibleInDev(fnodeOrElement) {
    return DEVELOPMENT ? isVisible(fnodeOrElement) : true;
  }

  function hasPasswordLabel(fnode) {
    return hasLabelMatchingRegex(fnode.element, passwordRegex);
  }

  function hasNewLabel(fnode) {
    return hasLabelMatchingRegex(fnode.element, newRegex);
  }

  function hasConfirmLabel(fnode) {
    return hasLabelMatchingRegex(fnode.element, confirmRegex);
  }

  function hasConfirmEmailLabel(fnode) {
    return hasConfirmLabel(fnode) && hasLabelMatchingRegex(fnode.element, emailRegex);
  }

  function hasLabelMatchingRegex(element, regex) {
    // Check element.labels
    const labels = element.labels;
    // TODO: Should I be concerned with multiple labels?
    if (labels !== null && labels.length > 0) {
      return regex.test(labels[0].innerText);
    }

    // Check element.aria-labelledby
    let labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy !== null) {
      labelledBy = labelledBy.split(" ").map(id => element.ownerDocument.getElementById(id));
      if (labelledBy.length === 1) {
        return regex.test(labelledBy[0].innerText);
      } else if (labelledBy.length > 1) {
        return regex.test(min(labelledBy, node => euclidean(node, element)).innerText);
      }
    }

    const parentElement = element.parentElement;
    // Check if the input is in a <td>, and, if so, check the innerText of the containing <tr>
    if (parentElement.tagName === "TD") {
      // TODO: How bad is the assumption that the <tr> won't be the parent of the <td>?
      return regex.test(parentElement.parentElement.innerText);
    }

    // Check if the input is in a <dd>, and, if so, check the innerText of the preceding <dt>
    if (parentElement.tagName === "DD") {
      return regex.test(parentElement.previousElementSibling.innerText);
    }
    return false;
  }

  function closestLabelMatchesPassword(fnode) {
    return closestLabelMatchesRegex(fnode.element, passwordRegex);
  }

  function closestLabelMatchesNew(fnode) {
    return closestLabelMatchesRegex(fnode.element, newRegex);
  }

  function closestLabelMatchesConfirm(fnode) {
    return closestLabelMatchesRegex(fnode.element, confirmRegex);
  }

  function closestLabelMatchesConfirmEmail(fnode) {
    return closestLabelMatchesConfirm(fnode) && closestLabelMatchesRegex(fnode.element, emailRegex);
  }

  function closestLabelMatchesRegex(element, regex) {
    const previousElementSibling = element.previousElementSibling;
    if (previousElementSibling !== null && previousElementSibling.tagName === "LABEL") {
      return regex.test(previousElementSibling.innerText);
    }

    const nextElementSibling = element.nextElementSibling;
    if (nextElementSibling !== null && nextElementSibling.tagName === "LABEL") {
      return regex.test(nextElementSibling.innerText);
    }

    const closestLabelWithinForm = closestSelectorElementWithinElement(element, element.form, "label");
    return containsRegex(regex, closestLabelWithinForm, closestLabelWithinForm => closestLabelWithinForm.innerText);
  }

  function containsRegex(regex, thingOrNull, thingToString=identity) {
    return thingOrNull !== null && regex.test(thingToString(thingOrNull));
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
    return hasAriaLabelMatchingRegex(fnode.element, passwordRegex);
  }

  function hasNewAriaLabel(fnode) {
    return hasAriaLabelMatchingRegex(fnode.element, newRegex);
  }

  function hasConfirmAriaLabel(fnode) {
    return hasAriaLabelMatchingRegex(fnode.element, confirmRegex);
  }

  function hasAriaLabelMatchingRegex(element, regex) {
    return containsRegex(regex, element.getAttribute("aria-label"));
  }

  function hasPasswordPlaceholder(fnode) {
    return hasPlaceholderMatchingRegex(fnode.element, passwordRegex);
  }

  function hasNewPlaceholder(fnode) {
    return hasPlaceholderMatchingRegex(fnode.element, newRegex);
  }

  function hasConfirmPlaceholder(fnode) {
    return hasPlaceholderMatchingRegex(fnode.element, confirmRegex);
  }

  function hasConfirmEmailPlaceholder(fnode) {
    return hasConfirmPlaceholder(fnode) && hasPlaceholderMatchingRegex(fnode.element, emailRegex);
  }

  function hasPlaceholderMatchingRegex(element, regex) {
    return containsRegex(regex, element.getAttribute("placeholder"));
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

  function forgotPasswordLinkTitle(fnode) {
    return hasFormAnchorMatchingPredicate(fnode.element, anchor => {
      return passwordRegex.test(anchor.title) && forgotPasswordInnerTextRegex.test(anchor.title);
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

  function idMatchesPasswordy(fnode) {
    return passwordyRegex.test(fnode.element.id)
  }

  function nameMatchesPasswordy(fnode) {
    return passwordyRegex.test(fnode.element.name)
  }

  function classMatchesPasswordy(fnode) {
    return passwordyRegex.test(fnode.element.className)
  }

  function idMatchesLogin(fnode) {
    return loginRegex.test(fnode.element.id)
  }

  function nameMatchesLogin(fnode) {
    return loginRegex.test(fnode.element.name)
  }

  function classMatchesLogin(fnode) {
    return loginRegex.test(fnode.element.className)
  }

  function containingFormHasLoginAction(fnode) {
    const form = fnode.element.form;
    return containsRegex(loginRegex, form, form => form.action);
  }

  function containingFormHasLoginId(fnode) {
    const form = fnode.element.form;
    return containsRegex(loginRegex, form, form => form.id);
  }

  function formButtonIsRegistery(fnode) {
    return testFormButtonsAgainst(fnode.element, registerButtonRegex);
  }

  function formButtonIsLoginy(fnode) {
    return testFormButtonsAgainst(fnode.element, loginRegex);
  }

  function testFormButtonsAgainst(element, stringRegex) {
    const form = element.form;
    if (form !== null) {
      let inputs = Array.from(form.querySelectorAll("input[type=submit],input[type=button]"));
      inputs = inputs.filter(input => {
        return stringRegex.test(input.value);
      });
      if (inputs.length) {
        return true;
      }

      let buttons = Array.from(form.querySelectorAll("button"));
      return buttons.some(button => {
        return stringRegex.test(button.value) || stringRegex.test(button.innerText);
      })
    }
    return false;
  }

  return ruleset([
      rule(dom("input[type=text],input[type=password],input[type=\"\"],input:not([type])").when(isVisibleInDev), type("new")),
      rule(type("new"), score(hasPasswordLabel), {name: "hasPasswordLabel"}),
      rule(type("new"), score(hasNewLabel), {name: "hasNewLabel"}),
      rule(type("new"), score(hasConfirmLabel), {name: "hasConfirmLabel"}),
      rule(type("new"), score(hasConfirmEmailLabel), {name: "hasConfirmEmailLabel"}),
      rule(type("new"), score(closestLabelMatchesPassword), {name: "closestLabelMatchesPassword"}),
      rule(type("new"), score(closestLabelMatchesNew), {name: "closestLabelMatchesNew"}),
      rule(type("new"), score(closestLabelMatchesConfirm), {name: "closestLabelMatchesConfirm"}),
      rule(type("new"), score(closestLabelMatchesConfirmEmail), {name: "closestLabelMatchesConfirmEmail"}),
      rule(type("new"), score(hasPasswordAriaLabel), {name: "hasPasswordAriaLabel"}),
      rule(type("new"), score(hasNewAriaLabel), {name: "hasNewAriaLabel"}),
      rule(type("new"), score(hasConfirmAriaLabel), {name: "hasConfirmAriaLabel"}),
      rule(type("new"), score(hasPasswordPlaceholder), {name: "hasPasswordPlaceholder"}),
      rule(type("new"), score(hasNewPlaceholder), {name: "hasNewPlaceholder"}),
      rule(type("new"), score(hasConfirmPlaceholder), {name: "hasConfirmPlaceholder"}),
      rule(type("new"), score(hasConfirmEmailPlaceholder), {name: "hasConfirmEmailPlaceholder"}),
      rule(type("new"), score(forgotPasswordLinkInnerText), {name: "forgotPasswordLinkInnerText"}),
      rule(type("new"), score(forgotPasswordLinkHref), {name: "forgotPasswordLinkHref"}),
      rule(type("new"), score(forgotPasswordLinkTitle), {name: "forgotPasswordLinkTitle"}),
      rule(type("new"), score(idIsPassword1Or2), {name: "idIsPassword1Or2"}),
      rule(type("new"), score(nameIsPassword1Or2), {name: "nameIsPassword1Or2"}),
      rule(type("new"), score(idMatchesPassword), {name: "idMatchesPassword"}),
      rule(type("new"), score(nameMatchesPassword), {name: "nameMatchesPassword"}),
      rule(type("new"), score(idMatchesPasswordy), {name: "idMatchesPasswordy"}),
      rule(type("new"), score(nameMatchesPasswordy), {name: "nameMatchesPasswordy"}),
      rule(type("new"), score(classMatchesPasswordy), {name: "classMatchesPasswordy"}),
      rule(type("new"), score(idMatchesLogin), {name: "idMatchesLogin"}),
      rule(type("new"), score(nameMatchesLogin), {name: "nameMatchesLogin"}),
      rule(type("new"), score(classMatchesLogin), {name: "classMatchesLogin"}),
      rule(type("new"), score(containingFormHasLoginAction), {name: "containingFormHasLoginAction"}),
      rule(type("new"), score(containingFormHasLoginId), {name: "containingFormHasLoginId"}),
      rule(type("new"), score(formButtonIsRegistery), {name: "formButtonIsRegistery"}),
      rule(type("new"), score(formButtonIsLoginy), {name: "formButtonIsLoginy"}),
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
