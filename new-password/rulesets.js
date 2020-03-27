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
    ["hasNewLabel", 1.1475578546524048],
    ["hasConfirmLabel", 1.1088526248931885],
    ["closestLabelMatchesNew", 1.498863935470581],
    ["closestLabelMatchesConfirm", 0.9556789994239807],
    ["hasNewAriaLabel", 1.2129756212234497],
    ["hasConfirmAriaLabel", 1.2947739362716675],
    ["hasNewPlaceholder", 0.8625594973564148],
    ["hasConfirmPlaceholder", 0.8333195447921753],
    ["forgotPasswordInFormLinkTextContent", -0.5628496408462524],
    ["forgotPasswordInFormLinkHref", -1.0719348192214966],
    ["forgotPasswordInFormLinkTitle", -2.0197055339813232],
    ["forgotInFormLinkTextContent", -0.8784432411193848],
    ["forgotInFormLinkHref", -0.29903921484947205],
    ["forgotPasswordInFormButtonTextContent", -1.7987523078918457],
    ["forgotPasswordOnPageLinkTextContent", -1.4977914094924927],
    ["forgotPasswordOnPageLinkHref", 0.19559451937675476],
    ["forgotPasswordOnPageLinkTitle", 0.3964155614376068],
    ["forgotPasswordOnPageButtonTextContent", 0.28442490100860596],
    ["idIsPassword1Or2", 0.9458191990852356],
    ["nameIsPassword1Or2", 0.9060004949569702],
    ["idMatchesLogin", -1.4721583127975464],
    ["nameMatchesLogin", 2.4809982776641846],
    ["classMatchesLogin", -1.891852855682373],
    ["formHasRegisteryId", 1.226690649986267],
    ["formHasRegisteryName", 1.2698602676391602],
    ["formHasRegisteryClass", 0.7578275203704834],
    ["formHasRegisteryAction", 1.3507407903671265],
    ["formHasLoginyId", -0.9361934661865234],
    ["formHasLoginyName", -1.4802566766738892],
    ["formHasLoginyClass", -0.38017258048057556],
    ["formHasLoginyAction", -0.5359786748886108],
    ["formButtonIsRegistery", 1.449123740196228],
    ["formButtonIsLoginy", -1.7515889406204224],
    ["hasAutocompleteCurrentPassword", -1.8347175121307373],
  ]
};

const biases = [
  ["new", 1.4772255420684814]
];

const passwordRegex = /password|passwort|رمز عبور|mot de passe|パスワード|비밀번호|암호|wachtwoord|senha|Пароль|parol|密码|contraseña|heslo|كلمة السر|kodeord|Κωδικός|pass code|Kata sandi|hasło|รหัสผ่าน|Şifre/i;
const newRegex = /erstellen|create|choose|設定|신규/i;
const confirmRegex = /wiederholen|wiederholung|confirm|repeat|confirmation|verify|retype|repite|確認|の確認|تکرار|re-enter|확인|bevestigen|confirme|Повторите|tassyklamak|再次输入|ještě jednou|gentag|re-type|confirmar|Répéter|conferma|Repetaţi/i;
const forgotStringRegex = /vergessen|vergeten|forgot|oublié|dimenticata|Esqueceu|esqueci|Забыли|忘记|找回|Zapomenuté|lost|忘れた|忘れられた|忘れの方|재설정|찾기|help|فراموشی| را فراموش کرده اید|Восстановить|Unuttu|perdus|重新設定|reset|recover|change|remind|find|request|restore|trouble/i;
const forgotHrefRegex = /forgot|reset|recover|change|lost|remind|find|request|restore/i;
const password1Or2Regex = /password1|password2/i;
const passwordyRegex = /pw|pwd|passwd|pass/i;
const loginRegex = /login|Войти|sign in|ورود|登录|Přihlásit se|Авторизоваться|signin|log in|sign\/in|sign-in|entrar|ログイン|로그인|Anmelden|inloggen|Συνδέσου|accedi|ログオン|Giriş Yap|登入|connecter/i;
const registerButtonRegex = /create account|Zugang anlegen|Angaben prüfen|Konto erstellen|register|sign up|create an account|create my account|ثبت نام|登録|注册|Cadastrar|Зарегистрироваться|Bellige alynmak|تسجيل|Registrovat|ΕΓΓΡΑΦΗΣ|Εγγραφή|REGISTRARME|Registrarse|Créer mon compte|Mendaftar|Registrazione|Registrati|가입하기|inschrijving|Zarejestruj się|Deschideți un cont|Создать аккаунт|ร่วม|Üye Ol|create new account/i;
const registerActionRegex = /register|signup|sign-up|create-account|account\/create|join|new_account|user\/create|sign\/up|membership\/create/i;
const loginFormAttrRegex = /login|signin|sign-in/i;
const registerFormAttrRegex = /signup|join|register|regform|registration|new_user|AccountCreate|create_customer|CreateAccount|CreateAcct|create-account|reg-form|newuser|new-reg|new-form|new_membership/i;

function makeRuleset(coeffs, biases) {
  function hasLabelMatchingRegex(element, regex) {
    // Check element.labels
    const labels = element.labels;
    // TODO: Should I be concerned with multiple labels?
    if (labels !== null && labels.length > 0) {
      return regex.test(labels[0].textContent);
    }

    // Check element.aria-labelledby
    let labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy !== null) {
      labelledBy = labelledBy.split(" ").map(id => element.ownerDocument.getElementById(id));
      if (labelledBy.length === 1) {
        return regex.test(labelledBy[0].textContent);
      } else if (labelledBy.length > 1) {
        return regex.test(min(labelledBy, node => euclidean(node, element)).textContent);
      }
    }

    const parentElement = element.parentElement;
    // Check if the input is in a <td>, and, if so, check the textContent of the containing <tr>
    if (parentElement.tagName === "TD") {
      // TODO: How bad is the assumption that the <tr> won't be the parent of the <td>?
      return regex.test(parentElement.parentElement.textContent);
    }

    // Check if the input is in a <dd>, and, if so, check the textContent of the preceding <dt>
    if (parentElement.tagName === "DD") {
      return regex.test(parentElement.previousElementSibling.textContent);
    }
    return false;
  }

  function closestLabelMatchesRegex(element, regex) {
    const previousElementSibling = element.previousElementSibling;
    if (previousElementSibling !== null && previousElementSibling.tagName === "LABEL") {
      return regex.test(previousElementSibling.textContent);
    }

    const nextElementSibling = element.nextElementSibling;
    if (nextElementSibling !== null && nextElementSibling.tagName === "LABEL") {
      return regex.test(nextElementSibling.textContent);
    }

    const closestLabelWithinForm = closestSelectorElementWithinElement(element, element.form, "label");
    return containsRegex(regex, closestLabelWithinForm, closestLabelWithinForm => closestLabelWithinForm.textContent);
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

  function hasPlaceholderMatchingRegex(element, regex) {
    return containsRegex(regex, element.getAttribute("placeholder"));
  }

  function testRegexesAgainstAnchorPropertyWithinElement(property, element, ...regexes) {
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
        const textContent = button.textContent;
        return passwordRegex.test(textContent) && forgotStringRegex.test(textContent);
      });
    }
    return false;
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
        return stringRegex.test(button.value) || stringRegex.test(button.textContent) || stringRegex.test(button.id) || stringRegex.test(button.title);
      })
    }
    return false;
  }

  function hasAutocompleteCurrentPassword(fnode) {
    return fnode.element.autocomplete === "current-password";
  }

  return ruleset([
      rule((DEVELOPMENT ? dom("input[type=password]").when(isVisible) : element("input")), type("new")),
      rule(type("new"), score(fnode => hasLabelMatchingRegex(fnode.element, newRegex)), {name: "hasNewLabel"}),
      rule(type("new"), score(fnode => hasLabelMatchingRegex(fnode.element, confirmRegex)), {name: "hasConfirmLabel"}),
      rule(type("new"), score(fnode => closestLabelMatchesRegex(fnode.element, newRegex)), {name: "closestLabelMatchesNew"}),
      rule(type("new"), score(fnode => closestLabelMatchesRegex(fnode.element, confirmRegex)), {name: "closestLabelMatchesConfirm"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, newRegex)), {name: "hasNewAriaLabel"}),
      rule(type("new"), score(fnode => hasAriaLabelMatchingRegex(fnode.element, confirmRegex)), {name: "hasConfirmAriaLabel"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, newRegex)), {name: "hasNewPlaceholder"}),
      rule(type("new"), score(fnode => hasPlaceholderMatchingRegex(fnode.element, confirmRegex)), {name: "hasConfirmPlaceholder"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("textContent", fnode.element.form, passwordRegex, forgotStringRegex)), {name: "forgotPasswordInFormLinkTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.form, (new RegExp(passwordRegex.source + "|" + passwordyRegex.source, "i")), forgotHrefRegex)), {name: "forgotPasswordInFormLinkHref"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("title", fnode.element.form, passwordRegex, forgotStringRegex)), {name: "forgotPasswordInFormLinkTitle"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("textContent", fnode.element.form, forgotStringRegex)), {name: "forgotInFormLinkTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.form, forgotHrefRegex)), {name: "forgotInFormLinkHref"}),
      rule(type("new"), score(fnode => forgotPasswordButtonWithinElement(fnode.element.form)), {name: "forgotPasswordInFormButtonTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("textContent", fnode.element.ownerDocument, passwordRegex, forgotStringRegex)), {name: "forgotPasswordOnPageLinkTextContent"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("href", fnode.element.ownerDocument, (new RegExp(passwordRegex.source + "|" + passwordyRegex.source, "i")), forgotHrefRegex)), {name: "forgotPasswordOnPageLinkHref"}),
      rule(type("new"), score(fnode => testRegexesAgainstAnchorPropertyWithinElement("title", fnode.element.ownerDocument, passwordRegex, forgotStringRegex)), {name: "forgotPasswordOnPageLinkTitle"}),
      rule(type("new"), score(fnode => forgotPasswordButtonWithinElement(fnode.element.ownerDocument)), {name: "forgotPasswordOnPageButtonTextContent"}),
      rule(type("new"), score(fnode => password1Or2Regex.test(fnode.element.id)), {name: "idIsPassword1Or2"}),
      rule(type("new"), score(fnode => password1Or2Regex.test(fnode.element.name)), {name: "nameIsPassword1Or2"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.id)), {name: "idMatchesLogin"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.name)), {name: "nameMatchesLogin"}),
      rule(type("new"), score(fnode => loginRegex.test(fnode.element.className)), {name: "classMatchesLogin"}),
      rule(type("new"), score(fnode => containsRegex(registerFormAttrRegex, fnode.element.form, form => form.id)), {name: "formHasRegisteryId"}),
      rule(type("new"), score(fnode => containsRegex(registerFormAttrRegex, fnode.element.form, form => form.name)), {name: "formHasRegisteryName"}),
      rule(type("new"), score(fnode => containsRegex(registerFormAttrRegex, fnode.element.form, form => form.className)), {name: "formHasRegisteryClass"}),
      rule(type("new"), score(fnode => containsRegex(registerActionRegex, fnode.element.form, form => form.action)), {name: "formHasRegisteryAction"}),
      rule(type("new"), score(fnode => containsRegex(loginFormAttrRegex, fnode.element.form, form => form.id)), {name: "formHasLoginyId"}),
      rule(type("new"), score(fnode => containsRegex(loginFormAttrRegex, fnode.element.form, form => form.name)), {name: "formHasLoginyName"}),
      rule(type("new"), score(fnode => containsRegex(loginFormAttrRegex, fnode.element.form, form => form.className)), {name: "formHasLoginyClass"}),
      rule(type("new"), score(fnode => containsRegex(loginRegex, fnode.element.form, form => form.action)), {name: "formHasLoginyAction"}),
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
