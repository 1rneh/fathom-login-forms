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
    ["hasPasswordLabel", 2.3833765983581543],
    ["hasNewLabel", 0.48126065731048584],
    ["hasConfirmLabel", 1.9799463748931885],
    ["hasConfirmEmailLabel", -2.9743504524230957],
    ["closestLabelMatchesPassword", 1.5385273694992065],
    ["closestLabelMatchesNew", 0.033577289432287216],
    ["closestLabelMatchesConfirm", 1.4472700357437134],
    ["closestLabelMatchesConfirmEmail", -2.307504415512085],
    ["hasPasswordAriaLabel", 3.0719003677368164],
    ["hasNewAriaLabel", 0.8545650243759155],
    ["hasConfirmAriaLabel", 3.3399014472961426],
    ["hasPasswordPlaceholder", 2.742359161376953],
    ["hasNewPlaceholder", 1.0603445768356323],
    ["hasConfirmPlaceholder", 1.064456820487976],
    ["hasConfirmEmailPlaceholder", 0.14425905048847198],
    ["forgotPasswordLinkInnerText", -2.0089941024780273],
    ["forgotPasswordLinkHref", -2.365290641784668],
    ["forgotPasswordLinkTitle", -3.4189813137054443],
    ["idIsPassword1Or2", 1.6477850675582886],
    ["nameIsPassword1Or2", 1.5114083290100098],
    ["idMatchesPassword", 2.09035325050354],
    ["nameMatchesPassword", 1.9379414319992065],
    ["idMatchesPasswordy", 2.7130038738250732],
    ["nameMatchesPasswordy", 2.728764057159424],
    ["classMatchesPasswordy", 3.2804055213928223],
    ["idMatchesLogin", -3.3479135036468506],
    ["nameMatchesLogin", 1.527779459953308],
    ["classMatchesLogin", -1.8222365379333496],
    ["containingFormHasLoginAction", -0.9223688244819641],
    ["containingFormHasLoginId", -2.533879041671753],
    ["formButtonIsRegistery", -0.4845658838748932],
    ["formButtonIsLoginy", -3.3155627250671387],
  ]
};

const biases = [
  ["new", -2.9617109298706055]
];

const passwordRegex = /password|passwort|رمز عبور|mot de passe|パスワード|신규 비밀번호|wachtwoord|senha|Пароль|parol|密码|contraseña|heslo/i;
const newRegex = /erstellen|create|choose|設定/i;
const confirmRegex = /wiederholen|wiederholung|confirm|repeat|confirmation|verify|retype|repite|確認|の確認|تکرار|re-enter|확인|bevestigen|confirme|Повторите|tassyklamak|再次输入/i;
const emailRegex = /e-mail|email|ایمیل|メールアドレス|이메일|邮箱/i;
const forgotPasswordInnerTextRegex = /vergessen|forgot|oublié|dimenticata|Esqueceu|Забыли|忘记|找回|Zapomenuté/i;
const forgotPasswordHrefRegex = /forgot|reset|recovery|change/i;
const password1Or2Regex = /password1|password2/i;
const passwordyRegex = /pw|pwd|passwd/i;
const loginRegex = /login|Войти|sign in|ورود|登录|Přihlásit se|Авторизоваться|signin/i;
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
