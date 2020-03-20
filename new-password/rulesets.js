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
    ["hasPasswordLabel", 2.968064546585083],
    ["hasNewLabel", 0.7594536542892456],
    ["hasConfirmLabel", 2.439701795578003],
    ["hasConfirmEmailLabel", -3.029898166656494],
    ["closestLabelMatchesPassword", 1.5179104804992676],
    ["closestLabelMatchesNew", -0.30970335006713867],
    ["closestLabelMatchesConfirm", 2.0037176609039307],
    ["closestLabelMatchesConfirmEmail", -2.5331287384033203],
    ["hasPasswordAriaLabel", 2.799894094467163],
    ["hasNewAriaLabel", 0.038915783166885376],
    ["hasConfirmAriaLabel", 3.2614080905914307],
    ["hasPasswordPlaceholder", 2.027423620223999],
    ["hasNewPlaceholder", -0.37510690093040466],
    ["hasConfirmPlaceholder", 2.3059158325195312],
    ["hasConfirmEmailPlaceholder", 0.036079466342926025],
    ["forgotPasswordInFormLinkInnerText", -2.156588077545166],
    ["forgotPasswordInFormLinkHref", -2.3104331493377686],
    ["forgotPasswordInFormLinkTitle", -2.577613592147827],
    ["forgotPasswordInFormButtonInnerText", -3.7721314430236816],
    ["forgotPasswordOnPageLinkInnerText", -0.9971450567245483],
    ["forgotPasswordOnPageLinkHref", -0.6044663190841675],
    ["forgotPasswordOnPageLinkTitle", -1.694409966468811],
    ["forgotPasswordOnPageButtonInnerText", -1.322546124458313],
    ["idIsPassword1Or2", 1.5874159336090088],
    ["nameIsPassword1Or2", 2.462693929672241],
    ["idMatchesPassword", 1.6404777765274048],
    ["nameMatchesPassword", 2.8984739780426025],
    ["idMatchesPasswordy", 2.0726428031921387],
    ["nameMatchesPasswordy", 3.2324259281158447],
    ["classMatchesPasswordy", 3.9044747352600098],
    ["idMatchesLogin", -3.210477352142334],
    ["nameMatchesLogin", 1.357595682144165],
    ["classMatchesLogin", -0.8762584924697876],
    ["containingFormHasLoginAction", -1.654552936553955],
    ["containingFormHasLoginId", -1.8303053379058838],
    ["formButtonIsRegistery", -0.21326696872711182],
    ["formButtonIsLoginy", -3.465413808822632],
    ["hasAutocompleteCurrentPassword", -4.1665520668029785],
  ]
};

const biases = [
  ["new", -2.7679519653320312]
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
      rule(type("new"), score(fnode => forgotPasswordInAnchorPropertyWithinElement("innerText", fnode.element.form, passwordRegex, forgotPasswordInnerTextRegex)), {name: "forgotPasswordInFormLinkInnerText"}),
      rule(type("new"), score(fnode => forgotPasswordInAnchorPropertyWithinElement("href", fnode.element.form, passwordRegex, forgotPasswordHrefRegex)), {name: "forgotPasswordInFormLinkHref"}),
      rule(type("new"), score(fnode => forgotPasswordInAnchorPropertyWithinElement("title", fnode.element.form, passwordRegex, forgotPasswordInnerTextRegex)), {name: "forgotPasswordInFormLinkTitle"}),
      rule(type("new"), score(fnode => forgotPasswordButtonWithinElement(fnode.element.form)), {name: "forgotPasswordInFormButtonInnerText"}),
      rule(type("new"), score(fnode => forgotPasswordInAnchorPropertyWithinElement("innerText", fnode.element.ownerDocument, passwordRegex, forgotPasswordInnerTextRegex)), {name: "forgotPasswordOnPageLinkInnerText"}),
      rule(type("new"), score(fnode => forgotPasswordInAnchorPropertyWithinElement("href", fnode.element.ownerDocument, passwordRegex, forgotPasswordHrefRegex)), {name: "forgotPasswordOnPageLinkHref"}),
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
