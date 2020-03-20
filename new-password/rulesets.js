/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint-disable import/no-unresolved */
import {dom, element, out, rule, ruleset, score, type} from "fathom-web";
import {euclidean} from "fathom-web/clusters";
import {identity, isVisible, min} from "fathom-web/utilsForFrontend";

// Whether this is running in the Vectorizer, rather than in-application, in a
// privileged Chrome context
const DEVELOPMENT = true;

const coefficients = {
  "new": [
    ["hasPasswordLabel", 2.9183719158172607],
    ["hasNewLabel", 0.6150888800621033],
    ["hasConfirmLabel", 2.808669328689575],
    ["hasConfirmEmailLabel", -2.981346607208252],
    ["closestLabelMatchesPassword", 0.8486418128013611],
    ["closestLabelMatchesNew", 0.42194581031799316],
    ["closestLabelMatchesConfirm", 1.8658995628356934],
    ["closestLabelMatchesConfirmEmail", -2.8981268405914307],
    ["hasPasswordAriaLabel", 3.3796801567077637],
    ["hasNewAriaLabel", 0.5124161839485168],
    ["hasConfirmAriaLabel", 3.8725030422210693],
    ["hasPasswordPlaceholder", 1.5083531141281128],
    ["hasNewPlaceholder", -0.4429008364677429],
    ["hasConfirmPlaceholder", 2.9611363410949707],
    ["hasConfirmEmailPlaceholder", 0.037077516317367554],
    ["forgotPasswordInFormLinkInnerText", -1.7754011154174805],
    ["forgotPasswordInFormLinkHref", -2.3083131313323975],
    ["forgotPasswordInFormLinkTitle", -3.072542667388916],
    ["forgotPasswordInFormButtonInnerText", -4.120485782623291],
    ["forgotPasswordOnPageLinkInnerText", -1.0720207691192627],
    ["forgotPasswordOnPageLinkHref", -0.9761485457420349],
    ["forgotPasswordOnPageLinkTitle", -2.0347630977630615],
    ["forgotPasswordOnPageButtonInnerText", 0.012258431874215603],
    ["idIsPassword1Or2", 1.5835304260253906],
    ["nameIsPassword1Or2", 2.62609601020813],
    ["idMatchesPassword", -0.3930097222328186],
    ["nameMatchesPassword", 1.0837440490722656],
    ["idMatchesPasswordy", 1.8807053565979004],
    ["nameMatchesPasswordy", 3.1303131580352783],
    ["classMatchesPasswordy", 0.7587248086929321],
    ["idMatchesLogin", -3.6833739280700684],
    ["nameMatchesLogin", 1.6447720527648926],
    ["classMatchesLogin", -3.4122109413146973],
    ["containingFormHasLoginId", -2.580232858657837],
    ["formButtonIsRegistery", -0.17331665754318237],
    ["formButtonIsLoginy", -3.766822099685669],
    ["hasAutocompleteCurrentPassword", -4.4371657371521],
  ]
};

const biases = [
  ["new", -3.127392292022705]
];

const passwordRegex = /password|passwort|رمز عبور|mot de passe|パスワード|비밀번호|암호|wachtwoord|senha|Пароль|parol|密码|contraseña|heslo/i;
const newRegex = /erstellen|create|choose|設定|신규/i;
const confirmRegex = /wiederholen|wiederholung|confirm|repeat|confirmation|verify|retype|repite|確認|の確認|تکرار|re-enter|확인|bevestigen|confirme|Повторите|tassyklamak|再次输入/i;
const emailRegex = /e-mail|email|ایمیل|メールアドレス|이메일|邮箱/i;
const forgotPasswordInnerTextRegex = /vergessen|forgot|oublié|dimenticata|Esqueceu|esqueci|Забыли|忘记|找回|Zapomenuté|lost|忘れた|忘れられた|忘れの方|재설정|찾기/i;
const forgotPasswordHrefRegex = /forgot|reset|recovery|change|lost|reminder|find/i;
const password1Or2Regex = /password1|password2/i;
const passwordyRegex = /pw|pwd|passwd|pass/i;
const loginRegex = /login|Войти|sign in|ورود|登录|Přihlásit se|Авторизоваться|signin|log in|sign\/in|sign-in|entrar|ログインする|로그인/i;
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

  function forgotPasswordInAnchorPropertyWithinElement(property, element, ...regexes) {
    return hasAnchorMatchingPredicateWithinElement(element, anchor => {
      const propertyValue = anchor[property];
      return regexes.every(regex => regex.test(propertyValue));
    })
  }

  function hasAnchorMatchingPredicateWithinElement(element, matchingPredicate) {
    if (element !== null) {
      const anchors = Array.from(element.querySelectorAll('a'));
      return anchors.some(matchingPredicate);
    }
    return false;
  }

  function forgotPasswordButtonWithinElement(element) {
    if (element !== null) {
      const buttons = Array.from(element.querySelectorAll('button'));
      return buttons.some(button => {
        const innerText = button.innerText;
        return passwordRegex.test(innerText) && forgotPasswordInnerTextRegex.test(innerText);
      });
    }
    return false;
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
      rule((DEVELOPMENT ? dom : element)("input[type=text],input[type=password],input[type=\"\"],input:not([type])").when(isVisibleInDev), type("new")),
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
      rule(type("new"), score(fnode => forgotPasswordInAnchorPropertyWithinElement("innerText", fnode.element.form, passwordRegex, forgotPasswordInnerTextRegex)), {name: "forgotPasswordInFormLinkInnerText"}),
      rule(type("new"), score(fnode => forgotPasswordInAnchorPropertyWithinElement("href", fnode.element.form, (new RegExp(passwordRegex.source + "|" + passwordyRegex.source, "i")), forgotPasswordHrefRegex)), {name: "forgotPasswordInFormLinkHref"}),
      rule(type("new"), score(fnode => forgotPasswordInAnchorPropertyWithinElement("title", fnode.element.form, passwordRegex, forgotPasswordInnerTextRegex)), {name: "forgotPasswordInFormLinkTitle"}),
      rule(type("new"), score(fnode => forgotPasswordButtonWithinElement(fnode.element.form)), {name: "forgotPasswordInFormButtonInnerText"}),
      rule(type("new"), score(fnode => forgotPasswordInAnchorPropertyWithinElement("innerText", fnode.element.ownerDocument, passwordRegex, forgotPasswordInnerTextRegex)), {name: "forgotPasswordOnPageLinkInnerText"}),
      rule(type("new"), score(fnode => forgotPasswordInAnchorPropertyWithinElement("href", fnode.element.ownerDocument, (new RegExp(passwordRegex.source + "|" + passwordyRegex.source, "i")), forgotPasswordHrefRegex)), {name: "forgotPasswordOnPageLinkHref"}),
      rule(type("new"), score(fnode => forgotPasswordInAnchorPropertyWithinElement("title", fnode.element.ownerDocument, passwordRegex, forgotPasswordInnerTextRegex)), {name: "forgotPasswordOnPageLinkTitle"}),
      rule(type("new"), score(fnode => forgotPasswordButtonWithinElement(fnode.element.ownerDocument)), {name: "forgotPasswordOnPageButtonInnerText"}),
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
