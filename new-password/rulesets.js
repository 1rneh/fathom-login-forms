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
    ["hasPasswordLabel", 2.7623579502105713],
    ["hasNewLabel", 1.0651295185089111],
    ["hasConfirmLabel", 2.4560494422912598],
    ["hasConfirmEmailLabel", -3.114009141921997],
    ["closestLabelMatchesPassword", 1.4361990690231323],
    ["closestLabelMatchesNew", -0.7361185550689697],
    ["closestLabelMatchesConfirm", 2.1508877277374268],
    ["closestLabelMatchesConfirmEmail", -2.516772985458374],
    ["hasPasswordAriaLabel", 2.8223166465759277],
    ["hasNewAriaLabel", 0.13192127645015717],
    ["hasConfirmAriaLabel", 3.5093069076538086],
    ["hasPasswordPlaceholder", 1.8705768585205078],
    ["hasNewPlaceholder", -0.03505579009652138],
    ["hasConfirmPlaceholder", 2.0368564128875732],
    ["hasConfirmEmailPlaceholder", -0.07769383490085602],
    ["forgotPasswordLinkInnerText", -2.4892215728759766],
    ["forgotPasswordLinkHref", -2.424119472503662],
    ["forgotPasswordLinkTitle", -3.055131435394287],
    ["forgotPasswordButtonInnerText", -3.905683994293213],
    ["idIsPassword1Or2", 1.301217794418335],
    ["nameIsPassword1Or2", 2.4112308025360107],
    ["idMatchesPassword", 1.410742163658142],
    ["nameMatchesPassword", 2.820852518081665],
    ["idMatchesPasswordy", 1.6908514499664307],
    ["nameMatchesPasswordy", 3.1803979873657227],
    ["classMatchesPasswordy", 3.7167775630950928],
    ["idMatchesLogin", -2.7033438682556152],
    ["nameMatchesLogin", 1.1064482927322388],
    ["classMatchesLogin", -0.5029125809669495],
    ["containingFormHasLoginAction", -1.5007621049880981],
    ["containingFormHasLoginId", -1.5585191249847412],
    ["formButtonIsRegistery", -0.0805213451385498],
    ["formButtonIsLoginy", -3.4002349376678467],
    ["hasAutocompleteCurrentPassword", -3.7337944507598877],
  ]
};

const biases = [
  ["new", -2.985649347305298]
];

const passwordRegex = /password|passwort|رمز عبور|mot de passe|パスワード|신규 비밀번호|wachtwoord|senha|Пароль|parol|密码|contraseña|heslo/i;
const newRegex = /erstellen|create|choose|設定/i;
const confirmRegex = /wiederholen|wiederholung|confirm|repeat|confirmation|verify|retype|repite|確認|の確認|تکرار|re-enter|확인|bevestigen|confirme|Повторите|tassyklamak|再次输入/i;
const emailRegex = /e-mail|email|ایمیل|メールアドレス|이메일|邮箱/i;
const forgotPasswordInnerTextRegex = /vergessen|forgot|oublié|dimenticata|Esqueceu|esqueci|Забыли|忘记|找回|Zapomenuté|lost|忘れた|忘れられた|忘れの方/i;
const forgotPasswordHrefRegex = /forgot|reset|recovery|change|lost|reminder/i;
const password1Or2Regex = /password1|password2/i;
const passwordyRegex = /pw|pwd|passwd/i;
const loginRegex = /login|Войти|sign in|ورود|登录|Přihlásit se|Авторизоваться|signin|log in|sign\/in|sign-in|entrar|ログインする/i;
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

  function hasAriaLabelMatchingRegex(element, regex) {
    return containsRegex(regex, element.getAttribute("aria-label"));
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

  function forgotPasswordButtonInnerText(fnode) {
    const form = fnode.element.form;
    if (form !== null) {
      const buttons = Array.from(form.querySelectorAll('button'));
      return buttons.some(button => {
        return passwordRegex.test(button.innerText) && forgotPasswordInnerTextRegex.test(button.innerText);
      })
    }
    return false;
  }

  function containingFormHasLoginAction(fnode) {
    const form = fnode.element.form;
    return containsRegex(loginRegex, form, form => form.action);
  }

  function containingFormHasLoginId(fnode) {
    const form = fnode.element.form;
    return containsRegex(loginRegex, form, form => form.id);
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
        return stringRegex.test(button.value) || stringRegex.test(button.innerText) || stringRegex.test(button.id);
      })
    }
    return false;
  }

  function hasAutocompleteCurrentPassword(fnode) {
    return fnode.element.autocomplete === "current-password";
  }

  return ruleset([
      rule(dom("input[type=text],input[type=password],input[type=\"\"],input:not([type])").when(isVisibleInDev), type("new")),
      rule(type("new"), score(fnode => hasLabelMatchingRegex(fnode.element, passwordRegex)), {name: "hasPasswordLabel"}),
      rule(type("new"), score(fnode => hasLabelMatchingRegex(fnode.element, newRegex)), {name: "hasNewLabel"}),
      rule(type("new"), score(hasConfirmLabel), {name: "hasConfirmLabel"}),
      rule(type("new"), score(hasConfirmEmailLabel), {name: "hasConfirmEmailLabel"}),
      rule(type("new"), score(fnode => closestLabelMatchesRegex(fnode.element, passwordRegex)), {name: "closestLabelMatchesPassword"}),
      rule(type("new"), score(fnode => closestLabelMatchesRegex(fnode.element, newRegex)), {name: "closestLabelMatchesNew"}),
      rule(type("new"), score(closestLabelMatchesConfirm), {name: "closestLabelMatchesConfirm"}),
      rule(type("new"), score(closestLabelMatchesConfirmEmail), {name: "closestLabelMatchesConfirmEmail"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, passwordRegex)), {name: "hasPasswordAriaLabel"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, newRegex)), {name: "hasNewAriaLabel"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, confirmRegex)), {name: "hasConfirmAriaLabel"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, passwordRegex)), {name: "hasPasswordPlaceholder"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, newRegex)), {name: "hasNewPlaceholder"}),
      rule(type("new"), score(hasConfirmPlaceholder), {name: "hasConfirmPlaceholder"}),
      rule(type("new"), score(hasConfirmEmailPlaceholder), {name: "hasConfirmEmailPlaceholder"}),
      rule(type("new"), score(forgotPasswordLinkInnerText), {name: "forgotPasswordLinkInnerText"}),
      rule(type("new"), score(forgotPasswordLinkHref), {name: "forgotPasswordLinkHref"}),
      rule(type("new"), score(forgotPasswordLinkTitle), {name: "forgotPasswordLinkTitle"}),
      rule(type("new"), score(forgotPasswordButtonInnerText), {name: "forgotPasswordButtonInnerText"}),
      rule(type("new"), score(fnode => password1Or2Regex.test(fnode.element.id)), {name: "idIsPassword1Or2"}),
      rule(type("new"), score(fnode => password1Or2Regex.test(fnode.element.name)), {name: "nameIsPassword1Or2"}),
      rule(type("new"), score(fnode => passwordRegex.test(fnode.element.id)), {name: "idMatchesPassword"}),
      rule(type("new"), score(fnode => passwordRegex.test(fnode.element.name)), {name: "nameMatchesPassword"}),
      rule(type("new"), score(fnode => passwordyRegex.test(fnode.element.id)), {name: "idMatchesPasswordy"}),
      rule(type("new"), score(fnode => passwordyRegex.test(fnode.element.name)), {name: "nameMatchesPasswordy"}),
      rule(type("new"), score(fnode => passwordyRegex.test(fnode.element.className)), {name: "classMatchesPasswordy"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.id)), {name: "idMatchesLogin"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.name)), {name: "nameMatchesLogin"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.className)), {name: "classMatchesLogin"}),
      rule(type("new"), score(containingFormHasLoginAction), {name: "containingFormHasLoginAction"}),
      rule(type("new"), score(containingFormHasLoginId), {name: "containingFormHasLoginId"}),
      rule(type("new"), score(fnode => testFormButtonsAgainst(fnode.element, registerButtonRegex)), {name: "formButtonIsRegistery"}),
      rule(type("new"), score(fnode => testFormButtonsAgainst(fnode.element, loginRegex)), {name: "formButtonIsLoginy"}),
      rule(type("new"), score(hasAutocompleteCurrentPassword), {name: "hasAutocompleteCurrentPassword"}),
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
